import { NextResponse } from 'next/server'

// Step 1: Redirect user to LinkedIn authorization
export async function GET() {
  const clientId = process.env.LINKEDIN_CLIENT_ID
  const redirectUri = process.env.LINKEDIN_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'LinkedIn not configured' })
  }

  const scopes = 'openid profile w_member_social'
  const state = Math.random().toString(36).slice(2)

  const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scopes)}&state=${state}`

  return NextResponse.redirect(url)
}
