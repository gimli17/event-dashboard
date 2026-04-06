import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SYSTEM_PROMPT = `You are an AI assistant for the Caruso Ventures operations portal. You interpret natural language commands and return structured JSON to execute database operations.

Available tables and their key fields:

MASTER_TASKS:
- id (text), title (text), assignee (text, nullable), priority (text: ultra-high, high, medium, low, backlog), status (text: not-started, in-progress, review, blocked, complete), deadline (text, nullable), initiative (text: brmf, bold-summit, ensuring-colorado), milestone_id (text, nullable), deleted_at (timestamptz, nullable)

MILESTONES:
- id (text), title (text), initiative (text), target_date (text), sort_order (int)

EVENTS:
- id (text), title (text), day (text), date (text), start_time (text), end_time (text), location (text), status (text), initiative (text)

BULLETIN_NOTES:
- id (text), title (text), body (text), author (text)

ACTIVITY_LOG:
- id (text), actor (text), action (text), target_type (text), target_id (text), target_title (text), details (text)

Team members: Cody, Sabrina, Joe, Danny, Connor, Gib, Emily, Kendall, Alex, Liam, Dave, Tom, Kevin

Respond ONLY with valid JSON in this exact format:
{
  "type": "query" | "mutation" | "answer",
  "confirmation": "Human-readable description of what will happen",
  "operations": [
    {
      "action": "select" | "update" | "insert" | "delete",
      "table": "master_tasks" | "milestones" | "events" | "bulletin_notes",
      "filters": { "column": "value" },
      "filterType": "eq" | "ilike",
      "updates": { "column": "value" },
      "insertData": { "column": "value" },
      "select": "column1, column2"
    }
  ],
  "answer": "For query-type responses, the answer text to show"
}

For queries (like "how many tasks does Joe have?"), use type "query" with a select operation.
For mutations (like "mark X as done"), use type "mutation" with update/insert/delete operations.
For questions you can answer from context (like "what priorities are available?"), use type "answer".

When matching tasks by title, use ilike filterType for fuzzy matching with % wildcards.
When deleting tasks, set deleted_at to the current timestamp instead of actually deleting.
Always include the confirmation field describing what will happen.
Do NOT include any text outside the JSON object.`

export async function POST(req: Request) {
  try {
    const { command, userName, execute } = await req.json()

    if (!command) {
      return NextResponse.json({ error: 'No command provided' })
    }

    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      return NextResponse.json({ error: 'API key not configured' })
    }

    // Step 1: Interpret the command with Claude
    const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          { role: 'user', content: `${SYSTEM_PROMPT}\n\nUser command: "${command}"` },
        ],
      }),
    })

    const aiData = await aiResponse.json()
    const text = aiData.content?.[0]?.text || ''

    let parsed
    try {
      parsed = JSON.parse(text)
    } catch {
      return NextResponse.json({ error: 'Could not interpret command', raw: text })
    }

    // If not executing yet, return the interpretation for confirmation
    if (!execute) {
      return NextResponse.json({ interpreted: parsed })
    }

    // Step 2: Execute the operations
    const results: string[] = []

    for (const op of parsed.operations || []) {
      const table = op.table
      if (!['master_tasks', 'milestones', 'events', 'bulletin_notes'].includes(table)) {
        results.push(`Skipped invalid table: ${table}`)
        continue
      }

      if (op.action === 'select') {
        let query = supabase.from(table).select(op.select || '*')
        for (const [col, val] of Object.entries(op.filters || {})) {
          if (op.filterType === 'ilike') {
            query = query.ilike(col, val as string)
          } else {
            query = query.eq(col, val as string)
          }
        }
        if (table === 'master_tasks') {
          query = query.is('deleted_at', null)
        }
        const { data, error } = await query
        if (error) {
          results.push(`Error: ${error.message}`)
        } else {
          results.push(JSON.stringify(data))
        }
      }

      if (op.action === 'update') {
        let query = supabase.from(table).update({ ...op.updates, updated_at: new Date().toISOString() } as never)
        for (const [col, val] of Object.entries(op.filters || {})) {
          if (op.filterType === 'ilike') {
            query = query.ilike(col, val as string)
          } else {
            query = query.eq(col, val as string)
          }
        }
        const { error } = await query
        if (error) {
          results.push(`Error: ${error.message}`)
        } else {
          results.push('Updated successfully')
        }
      }

      if (op.action === 'insert') {
        const { error } = await supabase.from(table).insert(op.insertData as never)
        if (error) {
          results.push(`Error: ${error.message}`)
        } else {
          results.push('Created successfully')
        }
      }

      if (op.action === 'delete') {
        if (table === 'master_tasks') {
          // Soft delete
          let query = supabase.from(table).update({ deleted_at: new Date().toISOString() } as never)
          for (const [col, val] of Object.entries(op.filters || {})) {
            if (op.filterType === 'ilike') {
              query = query.ilike(col, val as string)
            } else {
              query = query.eq(col, val as string)
            }
          }
          const { error } = await query
          if (error) results.push(`Error: ${error.message}`)
          else results.push('Deleted (soft) successfully')
        } else {
          let query = supabase.from(table).delete()
          for (const [col, val] of Object.entries(op.filters || {})) {
            query = query.eq(col, val as string)
          }
          const { error } = await query
          if (error) results.push(`Error: ${error.message}`)
          else results.push('Deleted successfully')
        }
      }
    }

    // Log the action
    if (parsed.type === 'mutation' && userName) {
      await supabase.from('activity_log').insert({
        actor: userName,
        action: `AI command: ${command}`,
        target_type: 'command',
        details: parsed.confirmation,
      } as never)
    }

    // For queries, interpret the results
    if (parsed.type === 'query' && results.length > 0) {
      try {
        const data = JSON.parse(results[0])
        if (Array.isArray(data)) {
          // Ask Claude to summarize the query results
          const summaryResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKey,
              'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
              model: 'claude-sonnet-4-6',
              max_tokens: 512,
              messages: [
                { role: 'user', content: `The user asked: "${command}"\n\nThe database returned ${data.length} results:\n${JSON.stringify(data, null, 2)}\n\nProvide a brief, helpful answer. Be concise.` },
              ],
            }),
          })
          const summaryData = await summaryResponse.json()
          const answer = summaryData.content?.[0]?.text || `Found ${data.length} results`
          return NextResponse.json({ success: true, answer, resultCount: data.length })
        }
      } catch {
        // Fall through
      }
    }

    return NextResponse.json({
      success: true,
      confirmation: parsed.confirmation,
      results,
      answer: parsed.type === 'answer' ? parsed.answer : undefined,
    })
  } catch (e) {
    return NextResponse.json({ error: String(e) })
  }
}
