import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { prompt, platform } = await request.json()

  if (!prompt) {
    return NextResponse.json({ error: 'Prompt required' }, { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return NextResponse.json({ error: 'API key not configured' }, { status: 500 })
  }

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a social media manager for the Boulder Roots Music Fest 2026, a music festival in Boulder, Colorado running August 26-30, 2026. It features the Founders Experience, Bold Conversations, and live music performances.

Write a social media post for ${platform === 'all' ? 'multiple platforms' : platform}.

${prompt}

Respond with ONLY a JSON object (no markdown, no code blocks) with these fields:
- "copy": the post copy text
- "hashtags": relevant hashtags as a string
- "notes": any recommendations for timing, targeting, or boosting`
          }
        ],
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `Claude API error: ${err}` }, { status: 500 })
    }

    const data = await res.json()
    const text = data.content[0]?.text || ''

    try {
      const parsed = JSON.parse(text)
      return NextResponse.json(parsed)
    } catch {
      return NextResponse.json({ copy: text, hashtags: '', notes: '' })
    }
  } catch (e) {
    return NextResponse.json({ error: 'Failed to generate' }, { status: 500 })
  }
}
