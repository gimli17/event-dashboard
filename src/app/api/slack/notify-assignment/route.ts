import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailForTeamMember, slackUserIdByEmail, slackDm } from '@/lib/slack'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://event-dashboard-two-delta.vercel.app'

const PRIORITY_LABELS: Record<string, string> = {
  'ultra-high': 'Very High',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  backlog: 'Backlog',
}

interface Payload {
  // Preferred: specify kind explicitly
  kind?: 'task' | 'note'
  taskId?: string
  noteId?: string
  actor?: string
}

export async function POST(req: Request) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: 'SLACK_BOT_TOKEN not configured' })
    }
    const body = (await req.json().catch(() => ({}))) as Payload
    const { taskId, noteId, actor } = body
    let kind = body.kind
    if (!kind) kind = noteId ? 'note' : 'task'

    let title: string
    let assignee: string | null = null
    let priority: string | null = null
    let deadline: string | null = null
    let blurb: string | null = null

    if (kind === 'task') {
      const id = taskId || noteId
      if (!id) return NextResponse.json({ ok: false, error: 'taskId required' }, { status: 400 })
      const { data: task } = await supabase
        .from('master_tasks')
        .select('title, assignee, priority, deadline, current_status, overview')
        .eq('id', id)
        .maybeSingle()
      if (!task) return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })
      title = task.title
      assignee = task.assignee ?? null
      priority = task.priority
      deadline = task.deadline
      blurb = (task.current_status || task.overview || '').replace(/<[^>]+>/g, '').trim() || null
    } else {
      if (!noteId) return NextResponse.json({ ok: false, error: 'noteId required' }, { status: 400 })
      const { data: note } = await supabase
        .from('daily_priorities')
        .select('title, owner, priority, deadline, notes')
        .eq('id', noteId)
        .maybeSingle()
      if (!note) return NextResponse.json({ ok: false, error: 'Note not found' }, { status: 404 })
      title = note.title
      assignee = note.owner
      priority = note.priority
      deadline = note.deadline
      blurb = note.notes?.replace(/<[^>]+>/g, '').trim() || null
    }

    const firstAssignee = assignee?.split(',')[0]?.trim()
    if (!firstAssignee) return NextResponse.json({ ok: false, error: 'No assignee on item' }, { status: 400 })

    // Don't DM yourself if you added something for yourself via the UI
    if (actor && actor.trim() === firstAssignee) {
      return NextResponse.json({ ok: true, skipped: 'self-assignment' })
    }

    const email = emailForTeamMember(firstAssignee)
    if (!email) return NextResponse.json({ ok: false, error: `No email mapping for ${firstAssignee}` }, { status: 400 })

    const userId = await slackUserIdByEmail(email)
    if (!userId) {
      return NextResponse.json({ ok: false, error: `No Slack user found for ${email}. Skipping.` })
    }

    const prioLabel = priority ? PRIORITY_LABELS[priority] ?? priority : null
    const dueText = deadline
      ? ` · Due ${new Date(deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : ''
    const from = actor ? ` from ${actor}` : ''
    const trimmedBlurb = blurb ? blurb.slice(0, 200) : null
    const label = kind === 'note' ? 'note' : 'task'

    const text = `🆕 *New ${label}${from}*: ${title}${prioLabel ? `\n${prioLabel}` : ''}${dueText}${trimmedBlurb ? `\n_${trimmedBlurb}${blurb && blurb.length > 200 ? '…' : ''}_` : ''}\n<${APP_URL}/team|Open in portal>`

    const blocks: unknown[] = [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `🆕 *New ${label}${from}*\n*${title}*` },
      },
    ]
    if (prioLabel || dueText) {
      blocks.push({
        type: 'context',
        elements: [{ type: 'mrkdwn', text: `${prioLabel ? `*Priority:* ${prioLabel}` : ''}${dueText}` }],
      })
    }
    if (trimmedBlurb) {
      blocks.push({
        type: 'section',
        text: { type: 'mrkdwn', text: `_${trimmedBlurb}${blurb && blurb.length > 200 ? '…' : ''}_` },
      })
    }
    blocks.push({
      type: 'actions',
      elements: [
        { type: 'button', text: { type: 'plain_text', text: 'Open in portal' }, url: `${APP_URL}/team` },
      ],
    })

    const sent = await slackDm(userId, text, blocks)
    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: `Slack error: ${sent.error}` })
    }
    return NextResponse.json({ ok: true, notified: firstAssignee, kind })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' })
  }
}
