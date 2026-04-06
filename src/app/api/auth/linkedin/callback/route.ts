import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const error = url.searchParams.get('error')

  if (error || !code) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.redirect(`${appUrl}/social?error=linkedin_denied`)
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.LINKEDIN_REDIRECT_URI!,
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
      }),
    })

    const tokenData = await tokenRes.json()

    if (!tokenData.access_token) {
      console.error('LinkedIn token error:', tokenData)
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
      return NextResponse.redirect(`${appUrl}/social?error=linkedin_token_failed`)
    }

    // Get user profile to store with token
    const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    })
    const profile = await profileRes.json()

    // Try to fetch administered organizations
    let organizations: { id: string; name: string }[] = []
    try {
      const orgRes = await fetch('https://api.linkedin.com/rest/organizationAcls?q=roleAssignee&role=ADMINISTRATOR&projection=(elements*(organization~(localizedName)))', {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          'LinkedIn-Version': '202401',
        },
      })
      if (orgRes.ok) {
        const orgData = await orgRes.json()
        if (orgData.elements) {
          organizations = orgData.elements.map((el: { organization: string; 'organization~'?: { localizedName: string } }) => ({
            id: el.organization.replace('urn:li:organization:', ''),
            name: el['organization~']?.localizedName || 'Organization',
          }))
        }
      }
    } catch (e) {
      console.error('Failed to fetch orgs:', e)
    }

    // Store token in Supabase
    const tokenRecord = {
      platform: 'linkedin',
      access_token: tokenData.access_token,
      expires_in: tokenData.expires_in,
      expires_at: new Date(Date.now() + tokenData.expires_in * 1000).toISOString(),
      profile_id: profile.sub,
      profile_name: profile.name || profile.email || 'LinkedIn User',
      organizations: JSON.stringify(organizations),
      created_at: new Date().toISOString(),
    }

    // Upsert — replace existing LinkedIn token
    const { data: existing } = await supabase
      .from('social_tokens')
      .select('id')
      .eq('platform', 'linkedin')
      .limit(1)

    if (existing && existing.length > 0) {
      await supabase.from('social_tokens').update(tokenRecord as never).eq('id', (existing[0] as { id: string }).id)
    } else {
      await supabase.from('social_tokens').insert({ id: `token-linkedin-${Date.now()}`, ...tokenRecord } as never)
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.redirect(`${appUrl}/social?connected=linkedin`)
  } catch (e) {
    console.error('LinkedIn callback error:', e)
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
    return NextResponse.redirect(`${appUrl}/social?error=linkedin_exception`)
  }
}
