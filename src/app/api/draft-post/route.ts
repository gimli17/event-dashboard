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
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a senior marketing strategist and copywriter for Boulder Roots Music Fest 2026 — a premium, community-driven music festival in Boulder, Colorado (August 26-30, 2026).

BRAND VOICE:
- SHORT. Every sentence earns its place. If you can say it in 5 words, don't use 10.
- Community-first. "Boulder together." We build this together with the community.
- Artistic and cultural — this is about music, art, ideas, and human connection.
- Create urgency through scarcity and limitedness — "limited spots", "only X left", "early access closing"
- Grounded, real, local. Boulder is home. Reference the mountains, Pearl Street, the culture.
- NO generic festival hype. NO excessive emojis. NO "don't miss out" or "you won't want to miss this."
- Think: Sundance meets local block party. Exclusive but inclusive. Curated but genuine.

EXAMPLE TONE:
"Boulder has always been a place where music, ideas, and community collide. This August, we're making that official. Limited founder spots remaining."
"The lineup is set. The conversations are curated. The only thing missing is you. Early bird closes Friday."
"This isn't just a festival. It's Boulder, together."

AUDIENCE: High-net-worth founders, entrepreneurs, creative leaders, and culturally engaged professionals aged 30-60 in Colorado. These are people who attend Sundance, Aspen Ideas, and TED — they respond to substance, not hype.

KEY FESTIVAL ELEMENTS:
- The Founders Experience (exclusive programming for founder-level sponsors)
- Bold Conversations That Matter (intimate roundtable discussions across Health & Well-Being, Culture & Community, and Tech & Innovation)
- Curated live music across multiple Boulder venues
- Private events and cultural experiences
- Community building and meaningful connections

PLATFORM: ${platform === 'all' ? 'Write for LinkedIn (the post should work across platforms but optimize for LinkedIn\'s professional audience)' : platform === 'instagram' ? 'Instagram — visual, warm, concise. Max 2 paragraphs + line breaks for readability' : platform === 'linkedin' ? 'LinkedIn — professional, thoughtful, slightly longer form. Position as a cultural/business event, not just a music fest' : 'TikTok — casual, authentic, hook in first line. Keep it short and genuine'}

TASK: ${prompt}

Write the post. Do NOT use generic festival language. Do NOT overuse emojis (1-2 max if any). Make every word count.

Respond with ONLY a JSON object (no markdown, no code blocks) with these fields:
- "copy": the post copy (clean text, use line breaks for readability, no emojis at the start of lines)
- "hashtags": 4-6 relevant hashtags (quality over quantity)
- "timing": when to post this (specific day of week, time, and why)
- "audience": who to target (demographics, interests, location specifics)
- "boosting": whether to boost, suggested budget, and duration
- "creative_direction": what type of visual/media should accompany this post
- "variations": one alternative version of the copy with a different angle`
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
