import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const SYSTEM_PROMPT = `You are an AI assistant for the Caruso Ventures operations portal. You interpret natural language commands and return structured JSON to execute database operations.

Available tables and their key fields:

MASTER_TASKS (real project tasks, assigned to a person):
- id (text), title (text), assignee (text, nullable), executive_lead (text: Cody/Joe/Sabrina, nullable), priority (text: ultra-high, high, medium, low, backlog), status (text: not-started, in-progress, review, blocked, complete), deadline (text YYYY-MM-DD, nullable), current_status (text — task detail/status body, nullable), dan_comments (text, nullable), links (text, nullable), initiative (text: brmf, bold-summit, ensuring-colorado, investments, loud-bear), milestone_id (text, nullable), deleted_at (timestamptz, nullable)

DAILY_PRIORITIES (lightweight personal notes / brain dumps, not yet tasks):
- id (text), owner (text — team member name), title (text), stream (text: brmf, bold-summit, ensuring-colorado, investments, loud-bear, nullable), priority (text: ultra-high, high, medium, low, backlog), deadline (text YYYY-MM-DD, nullable), notes (text, nullable), completed (boolean), master_task_id (text, nullable — set when promoted to a task), deleted_at (timestamptz, nullable)

MILESTONES:
- id (text), title (text), initiative (text), target_date (text), sort_order (int)

EVENTS:
- id (text), title (text), day (text), date (text), start_time (text), end_time (text), location (text), status (text), initiative (text)

BULLETIN_NOTES:
- id (text), title (text), body (text), author (text)

Team members (valid assignee/owner values): Cody, Sabrina, Joe, Bryan, Connor, Gib, Emily, Kendall, Alex, Liam

Respond with ONLY a JSON object in this exact shape — no prose, no markdown fences, no commentary:
{
  "type": "query" | "mutation" | "answer",
  "confirmation": "Human-readable description of what will happen",
  "operations": [
    {
      "action": "select" | "update" | "insert" | "delete",
      "table": "master_tasks" | "daily_priorities" | "milestones" | "events" | "bulletin_notes",
      "filters": { "column": "value" },
      "filterType": "eq" | "ilike",
      "updates": { "column": "value" },
      "insertData": { "column": "value" },
      "select": "column1, column2"
    }
  ],
  "answer": "For query-type responses, the answer text to show"
}

Guidance:
- "Send X a note / remind X / leave a message for X in their workspace" → insert into daily_priorities with owner=X, title=<the note text>, stream=<best-guess initiative if implied>. Set priority to 'medium' unless user specifies urgency.
- "Create a task for X" / "Assign X to do …" → insert into master_tasks with assignee=X, title=…, initiative=<best-guess or default brmf>, priority/deadline as specified.
- "Mark X as done" → update master_tasks where title ilike '%X%' set status='complete'.
- "Reassign task X to Y" → update master_tasks where title ilike '%X%' set assignee='Y'.
- "Change priority of X to high" → update master_tasks where title ilike '%X%' set priority='high'.
- Delete (except daily_priorities): set deleted_at to current ISO timestamp instead of hard delete.
- Match by title with ilike '%term%' for fuzziness.
- Include a concise confirmation field.
- NEVER output anything outside the JSON object — no backticks, no "Here is the JSON:", nothing.`

// Pull the first balanced {...} block out of any response, in case the model
// wraps it in prose or markdown fences despite instructions.
function extractJsonBlock(text: string): string | null {
  if (!text) return null
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fence?.[1]) return fence[1].trim()
  const start = text.indexOf('{')
  if (start === -1) return null
  let depth = 0
  let inString = false
  let escaped = false
  for (let i = start; i < text.length; i++) {
    const ch = text[i]
    if (escaped) { escaped = false; continue }
    if (ch === '\\') { escaped = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') depth++
    else if (ch === '}') {
      depth--
      if (depth === 0) return text.slice(start, i + 1)
    }
  }
  return null
}

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
    const jsonBlock = extractJsonBlock(text)
    try {
      parsed = JSON.parse(jsonBlock ?? text)
    } catch {
      return NextResponse.json({ error: 'Could not interpret command. Try rephrasing or being more specific.', raw: text })
    }

    // If not executing yet, return the interpretation for confirmation
    if (!execute) {
      return NextResponse.json({ interpreted: parsed })
    }

    // Step 2: Execute the operations
    const results: string[] = []

    for (const op of parsed.operations || []) {
      const table = op.table
      if (!['master_tasks', 'daily_priorities', 'milestones', 'events', 'bulletin_notes'].includes(table)) {
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
        if (table === 'master_tasks' || table === 'daily_priorities') {
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
