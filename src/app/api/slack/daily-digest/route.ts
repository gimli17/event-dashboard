import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { emailForTeamMember, slackUserIdByEmail, slackDm } from '@/lib/slack'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://event-dashboard-two-delta.vercel.app'
const TEAM = ['Cody', 'Sabrina', 'Joe', 'Connor', 'Kendall', 'Emily', 'Bryan', 'Gib', 'Alex', 'Liam']

async function runDigest() {
  const { data: tasks, error } = await supabase
    .from('master_tasks')
    .select('id, title, assignee, priority, deadline, status')
    .is('deleted_at', null)
    .neq('status', 'complete')

  if (error) return { ok: false, error: error.message }
  if (!tasks) return { ok: false, error: 'No tasks returned' }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const fmt = (iso: string) => new Date(iso + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })

  const results: Array<{ person: string; sent: boolean; reason?: string }> = []

  for (const person of TEAM) {
    const theirs = tasks.filter((t) => t.assignee?.split(',').map((s: string) => s.trim()).includes(person))
    if (theirs.length === 0) {
      results.push({ person, sent: false, reason: 'no open tasks' })
      continue
    }
    const email = emailForTeamMember(person)
    if (!email) { results.push({ person, sent: false, reason: 'no email mapping' }); continue }
    const userId = await slackUserIdByEmail(email)
    if (!userId) { results.push({ person, sent: false, reason: 'slack user not found' }); continue }

    const overdue = theirs.filter((t) => t.deadline && new Date(t.deadline + 'T00:00:00') < today)
    const dueToday = theirs.filter((t) => t.deadline && new Date(t.deadline + 'T00:00:00').getTime() === today.getTime())
    const lines: string[] = []
    if (overdue.length) lines.push(`*Overdue (${overdue.length}):*\n` + overdue.slice(0, 5).map((t) => `  • ${t.title}${t.deadline ? ` — was ${fmt(t.deadline)}` : ''}`).join('\n'))
    if (dueToday.length) lines.push(`*Due today (${dueToday.length}):*\n` + dueToday.slice(0, 5).map((t) => `  • ${t.title}`).join('\n'))
    if (!lines.length) lines.push(`*${theirs.length} open task${theirs.length === 1 ? '' : 's'}* — nothing overdue or due today. Good day 👌`)

    const text = `🌇 *End-of-day check*\n${lines.join('\n\n')}\n\n<${APP_URL}/team?person=${encodeURIComponent(person)}|Open your workspace>`
    const blocks: unknown[] = [
      { type: 'header', text: { type: 'plain_text', text: '🌇 End-of-day check' } },
      ...lines.map((ln) => ({ type: 'section', text: { type: 'mrkdwn', text: ln } })),
      {
        type: 'actions',
        elements: [
          { type: 'button', text: { type: 'plain_text', text: 'Open your workspace' }, url: `${APP_URL}/team?person=${encodeURIComponent(person)}` },
        ],
      },
    ]

    const sent = await slackDm(userId, text, blocks)
    results.push({ person, sent: sent.ok, reason: sent.ok ? undefined : (sent.error as string | undefined) })
  }

  return { ok: true, results }
}

// Vercel Cron triggers GET; also allow POST for manual testing.
export async function GET(req: Request) {
  // Optional: if CRON_SECRET is set, require it
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization') || ''
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 })
    }
  }
  const result = await runDigest()
  return NextResponse.json(result)
}

export async function POST(req: Request) {
  return GET(req)
}
