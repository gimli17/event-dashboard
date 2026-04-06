import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export async function POST(req: Request) {
  try {
    const { text, organizationId } = await req.json()

    if (!text) {
      return NextResponse.json({ error: 'No text provided' }, { status: 400 })
    }

    // Get stored token
    const { data: tokens } = await supabase
      .from('social_tokens')
      .select('*')
      .eq('platform', 'linkedin')
      .limit(1)

    if (!tokens || tokens.length === 0) {
      return NextResponse.json({ error: 'LinkedIn not connected. Go to /api/auth/linkedin to connect.' }, { status: 401 })
    }

    const token = tokens[0] as { access_token: string; profile_id: string; expires_at: string; organizations: string | null }

    // Check if token is expired
    if (new Date(token.expires_at) < new Date()) {
      return NextResponse.json({ error: 'LinkedIn token expired. Please reconnect at /api/auth/linkedin.' }, { status: 401 })
    }

    // Determine author — personal or organization
    const author = organizationId
      ? `urn:li:organization:${organizationId}`
      : `urn:li:person:${token.profile_id}`

    // Post to LinkedIn
    const postRes = await fetch('https://api.linkedin.com/rest/posts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
        'LinkedIn-Version': '202401',
        'X-Restli-Protocol-Version': '2.0.0',
      },
      body: JSON.stringify({
        author,
        commentary: text,
        visibility: 'PUBLIC',
        distribution: {
          feedDistribution: 'MAIN_FEED',
          targetEntities: [],
          thirdPartyDistributionChannels: [],
        },
        lifecycleState: 'PUBLISHED',
        isReshareDisabledByAuthor: false,
      }),
    })

    if (postRes.status === 201 || postRes.status === 200) {
      const postId = postRes.headers.get('x-restli-id') || 'published'
      return NextResponse.json({ success: true, postId })
    }

    const errorData = await postRes.text()
    console.error('LinkedIn post error:', postRes.status, errorData)
    return NextResponse.json({ error: `LinkedIn API error: ${postRes.status}`, details: errorData }, { status: postRes.status })
  } catch (e) {
    console.error('Publish error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
