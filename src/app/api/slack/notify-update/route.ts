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

const STATUS_LABELS: Record<string, string> = {
  'not-started': 'Not Started',
  'in-progress': 'In Progress',
  review: 'Being Reviewed',
  blocked: 'Blocked',
  complete: 'Complete',
}

// Fields we care enough about to DM the assignee when they change.
type ChangeKey = 'dan_comments' | 'title' | 'status' | 'priority' | 'deadline' | 'assignee'

interface Payload {
  taskId?: string
  actor?: string
  changes?: Partial<Record<ChangeKey, unknown>>
}

function formatChange(field: ChangeKey, value: unknown): string | null {
  if (value === null || value === undefined || value === '') {
    if (field === 'deadline') return 'deadline cleared'
    if (field === 'assignee') return 'unassigned'
    return null
  }
  const str = typeof value === 'string' ? value : String(value)
  switch (field) {
    case 'dan_comments':
      return `Dan's comment: _${str.replace(/<[^>]+>/g, '').trim().slice(0, 300)}_`
    case 'title':
      return `title → *${str}*`
    case 'status':
      return `status → *${STATUS_LABELS[str] ?? str}*`
    case 'priority':
      return `priority → *${PRIORITY_LABELS[str] ?? str}*`
    case 'deadline':
      return `due → *${new Date(str + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}*`
    case 'assignee':
      return `owner → *${str}*`
  }
}

export async function POST(req: Request) {
  try {
    if (!process.env.SLACK_BOT_TOKEN) {
      return NextResponse.json({ ok: false, error: 'SLACK_BOT_TOKEN not configured' })
    }
    const { taskId, actor, changes } = (await req.json().catch(() => ({}))) as Payload
    if (!taskId) return NextResponse.json({ ok: false, error: 'taskId required' }, { status: 400 })
    if (!changes || Object.keys(changes).length === 0) {
      return NextResponse.json({ ok: true, skipped: 'no changes' })
    }

    const { data: task } = await supabase
      .from('master_tasks')
      .select('id, title, assignee')
      .eq('id', taskId)
      .maybeSingle()
    if (!task) return NextResponse.json({ ok: false, error: 'Task not found' }, { status: 404 })

    const firstAssignee = task.assignee?.split(',')[0]?.trim()
    if (!firstAssignee) return NextResponse.json({ ok: true, skipped: 'no assignee' })

    // Don't ping yourself for your own edits
    if (actor && actor.trim() === firstAssignee) {
      return NextResponse.json({ ok: true, skipped: 'self-update' })
    }

    const lines: string[] = []
    for (const [key, value] of Object.entries(changes)) {
      const line = formatChange(key as ChangeKey, value)
      if (line) lines.push(`• ${line}`)
    }
    if (lines.length === 0) return NextResponse.json({ ok: true, skipped: 'nothing to report' })

    const email = emailForTeamMember(firstAssignee)
    if (!email) return NextResponse.json({ ok: false, error: `No email mapping for ${firstAssignee}` })
    const userId = await slackUserIdByEmail(email)
    if (!userId) return NextResponse.json({ ok: false, error: `No Slack user for ${email}` })

    const from = actor ? ` from ${actor}` : ''
    const link = `${APP_URL}/team?task=${encodeURIComponent(taskId)}`
    const text = `✏️ *Update${from}* on *${task.title}*\n${lines.join('\n')}\n<${link}|Open task>`
    const sent = await slackDm(userId, text)
    if (!sent.ok) return NextResponse.json({ ok: false, error: `Slack error: ${sent.error}` })
    return NextResponse.json({ ok: true, notified: firstAssignee })
  } catch (err) {
    return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : 'unknown' })
  }
}
