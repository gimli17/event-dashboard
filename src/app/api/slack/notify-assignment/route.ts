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

export async function POST(req: Request) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: 'SLACK_BOT_TOKEN not configured' })
    }
    const body = await req.json().catch(() => ({}))
    const { taskId, actor } = body as { taskId?: string; actor?: string }
    if (!taskId) return NextResponse.json({ ok: false, error: 'taskId required' }, { status: 400 })

    const { data: task } = await supabase
      .from('master_tasks')
      .select('id, title, assignee, priority, deadline, initiative, current_status, overview')
      .eq('id', taskId)
      .maybeSingle()
    if (!task) return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })

    const firstAssignee = task.assignee?.split(',')[0]?.trim()
    if (!firstAssignee) return NextResponse.json({ ok: false, error: 'Task has no assignee' }, { status: 400 })

    const email = emailForTeamMember(firstAssignee)
    if (!email) return NextResponse.json({ ok: false, error: `No email mapping for ${firstAssignee}` }, { status: 400 })

    const userId = await slackUserIdByEmail(email)
    if (!userId) {
      return NextResponse.json({ ok: false, error: `No Slack user found for ${email}. Skipping.` })
    }

    const prioLabel = PRIORITY_LABELS[task.priority] ?? task.priority
    const dueText = task.deadline
      ? ` · Due ${new Date(task.deadline + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
      : ''
    const from = actor ? ` from ${actor}` : ''
    const blurb = (task.current_status || task.overview || '').replace(/<[^>]+>/g, '').trim().slice(0, 200)

    const text = `🆕 *New task${from}*: ${task.title}\n${prioLabel}${dueText}${blurb ? `\n_${blurb}${blurb.length === 200 ? '…' : ''}_` : ''}\n<${APP_URL}/team|Open in portal>`

    const sent = await slackDm(userId, text, [
      {
        type: 'section',
        text: { type: 'mrkdwn', text: `🆕 *New task${from}*\n*${task.title}*` },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: `*Priority:* ${prioLabel}${dueText}` },
        ],
      },
      ...(blurb ? [{ type: 'section', text: { type: 'mrkdwn', text: `_${blurb}${blurb.length === 200 ? '…' : ''}_` } }] : []),
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            text: { type: 'plain_text', text: 'Open in portal' },
            url: `${APP_URL}/team`,
          },
        ],
      },
    ])

    if (!sent.ok) {
      return NextResponse.json({ ok: false, error: `Slack error: ${sent.error}` })
    }
    return NextResponse.json({ ok: true, notified: firstAssignee })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' })
  }
}
