import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Client } from '@notionhq/client'

// Map our priority keys to the Notion "Task Priority" select options.
const PRIORITY_MAP: Record<string, string> = {
  'ultra-high': '1. Very High',
  high: '2. High',
  medium: '3. Medium',
  low: '4. Low',
  backlog: '5. Very Low',
}

// Any assignee matching these (case-insensitive) is refused — never write a task to Dan's own bucket.
const DAN_RESERVED = new Set(['dan', 'dan task', 'dan-task', 'dantask'])

const notion = new Client({ auth: process.env.NOTION_TOKEN })
const DATA_SOURCE_ID = process.env.NOTION_DAN_DATA_SOURCE_ID || 'eb76d074-4d0e-4f0d-9d6d-987416ff3000'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

export async function POST(req: Request) {
  try {
    if (!process.env.NOTION_TOKEN) {
      return NextResponse.json({ error: 'NOTION_TOKEN not configured' }, { status: 500 })
    }

    const { taskId } = await req.json().catch(() => ({}))
    if (!taskId || typeof taskId !== 'string') {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const { data: task, error: fetchErr } = await supabase
      .from('master_tasks')
      .select('id, title, assignee, priority, status, deadline, current_status, overview, action_items, links, notion_page_url')
      .eq('id', taskId)
      .maybeSingle()

    if (fetchErr || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.notion_page_url) {
      // Already pushed — just return the existing URL
      return NextResponse.json({ ok: true, url: task.notion_page_url, already: true })
    }

    // Pick the first assignee name. assignee can be comma-separated.
    const rawAssignee = (task.assignee || '').split(',')[0]?.trim()
    if (!rawAssignee) {
      return NextResponse.json(
        { error: 'Task has no owner. Assign one before sending to Notion.' },
        { status: 400 },
      )
    }
    if (DAN_RESERVED.has(rawAssignee.toLowerCase())) {
      return NextResponse.json(
        { error: 'Owner cannot be Dan. Pick a different team member.' },
        { status: 400 },
      )
    }

    const priorityName = PRIORITY_MAP[task.priority] ?? 'Unranked'

    const notesText = [
      task.current_status,
      task.overview,
      task.action_items,
    ]
      .filter(Boolean)
      .map((s) => (s as string).replace(/<[^>]+>/g, '').trim())
      .join('\n\n')

    const linkBackUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://event-dashboard-two-delta.vercel.app'}/tasks`

    // Body children — paragraphs for context + a link back
    const children: Array<Record<string, unknown>> = []
    if (notesText) {
      // Notion rich_text blocks cap at 2000 chars each; split long text
      const chunks = chunkText(notesText, 1900)
      for (const chunk of chunks) {
        children.push({
          object: 'block',
          type: 'paragraph',
          paragraph: { rich_text: [{ type: 'text', text: { content: chunk } }] },
        })
      }
    }
    if (task.links) {
      children.push({
        object: 'block',
        type: 'heading_3',
        heading_3: { rich_text: [{ type: 'text', text: { content: 'Links' } }] },
      })
      for (const line of (task.links || '').split('\n').map((l: string) => l.trim()).filter(Boolean)) {
        const url = line.startsWith('http') ? line : `https://${line}`
        children.push({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: url, link: { url } } }],
          },
        })
      }
    }
    children.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [
          { type: 'text', text: { content: 'Source: ' } },
          {
            type: 'text',
            text: { content: `Portal task ${task.id}`, link: { url: linkBackUrl } },
          },
        ],
      },
    })

    // Notion API with data sources expects `parent: { type: 'data_source_id', data_source_id }`
    const properties: Record<string, unknown> = {
      Topic: { title: [{ type: 'text', text: { content: task.title } }] },
      Owner: { multi_select: [{ name: rawAssignee }] },
      'Task Priority': { select: { name: priorityName } },
    }
    if (task.deadline) {
      properties.Date = { date: { start: task.deadline } }
    }
    if (notesText) {
      properties.Notes = {
        rich_text: [{ type: 'text', text: { content: notesText.slice(0, 1900) } }],
      }
    }
    if (task.status === 'complete') {
      properties.Done = { checkbox: true }
    }

    const page = await notion.pages.create({
      parent: { type: 'data_source_id', data_source_id: DATA_SOURCE_ID } as never,
      properties: properties as never,
      children: children as never,
    })

    const pageUrl = (page as { url?: string }).url ?? null

    if (pageUrl) {
      await supabase
        .from('master_tasks')
        .update({ notion_page_url: pageUrl, updated_at: new Date().toISOString() } as never)
        .eq('id', taskId)
    }

    return NextResponse.json({ ok: true, url: pageUrl })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    console.error('[notion/create-task] failed:', err)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

function chunkText(text: string, size: number): string[] {
  const out: string[] = []
  for (let i = 0; i < text.length; i += size) out.push(text.slice(i, i + size))
  return out
}
