// Slack Web API helpers — thin wrappers around fetch so we don't pull in a SDK.

const SLACK_API = 'https://slack.com/api'

interface SlackResponse<T = unknown> {
  ok: boolean
  error?: string
  [key: string]: unknown
  response?: T
}

async function slackCall<T = unknown>(method: string, init?: RequestInit): Promise<SlackResponse<T>> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN not configured' }
  const res = await fetch(`${SLACK_API}/${method}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init?.headers || {}),
    },
  })
  return (await res.json()) as SlackResponse<T>
}

// Map our internal team-member names to Slack-lookup emails.
// Default: firstname@carusoventures.com (lowercased). Override any name here if needed.
const EMAIL_OVERRIDES: Record<string, string> = {
  // Example: 'Bryan': 'bryan.jones@carusoventures.com',
}

export function emailForTeamMember(name: string): string | null {
  if (!name) return null
  const trimmed = name.trim()
  if (EMAIL_OVERRIDES[trimmed]) return EMAIL_OVERRIDES[trimmed]
  const first = trimmed.split(/\s+/)[0].toLowerCase()
  if (!first) return null
  return `${first}@carusoventures.com`
}

// Look up a Slack user ID by email.
export async function slackUserIdByEmail(email: string): Promise<string | null> {
  const url = new URL(`${SLACK_API}/users.lookupByEmail`)
  url.searchParams.set('email', email)
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return null
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })
  const data = await res.json() as { ok: boolean; user?: { id: string }; error?: string }
  if (!data.ok || !data.user) return null
  return data.user.id
}

export async function slackDm(userId: string, text: string, blocks?: unknown[]): Promise<SlackResponse> {
  return slackCall('chat.postMessage', {
    method: 'POST',
    body: JSON.stringify({ channel: userId, text, blocks }),
  })
}

export async function slackAuthTest(): Promise<SlackResponse> {
  return slackCall('auth.test', { method: 'POST' })
}
