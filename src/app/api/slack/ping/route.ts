import { NextResponse } from 'next/server'
import { slackAuthTest } from '@/lib/slack'

export async function GET() {
  const hasToken = !!process.env.SLACK_BOT_TOKEN
  if (!hasToken) {
    return NextResponse.json({ ok: false, hasToken: false, error: 'SLACK_BOT_TOKEN not set' })
  }
  const res = await slackAuthTest()
  return NextResponse.json({ ok: res.ok, hasToken, detail: res })
}
