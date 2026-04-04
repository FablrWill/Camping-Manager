import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `You are a camping gear identification assistant. Given a product URL, webpage text, or photo, extract gear details.

Valid categories: shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc

Return ONLY valid JSON (no markdown) with this structure — omit fields you cannot determine:
{
  "name": "concise product name without brand prefix",
  "brand": "brand name or null",
  "category": "one of the valid categories above",
  "description": "1-2 sentence description of what it is and why it's useful for camping, or null",
  "weight": weight in pounds as a number or null,
  "price": price in USD as a number or null,
  "notes": "important specs or notes (dimensions, capacity, compatibility) or null",
  "wattage": power draw or output in watts as a number or null (only for electrical gear),
  "purchaseUrl": null
}`

interface IdentifyResult {
  name?: string
  brand?: string | null
  category?: string
  description?: string | null
  weight?: number | null
  price?: number | null
  notes?: string | null
  wattage?: number | null
  purchaseUrl?: string | null
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { url, image, mimeType } = body as {
      url?: string
      image?: string
      mimeType?: string
    }

    if (!url && !image) {
      return NextResponse.json({ error: 'Provide a url or image' }, { status: 400 })
    }

    let messages: Anthropic.MessageParam[]

    if (image) {
      const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
      type ImageMediaType = typeof validMimeTypes[number]
      const mediaType: ImageMediaType = validMimeTypes.includes(mimeType as ImageMediaType)
        ? (mimeType as ImageMediaType)
        : 'image/jpeg'

      messages = [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'base64', media_type: mediaType, data: image },
            },
            {
              type: 'text',
              text: 'Identify this camping gear item and extract its details.',
            },
          ],
        },
      ]
    } else {
      // URL mode — attempt to fetch page text server-side
      let pageText = ''
      try {
        const res = await fetch(url!, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(6000),
        })
        if (res.ok) {
          const html = await res.text()
          pageText = html
            .replace(/<script[\s\S]*?<\/script>/gi, '')
            .replace(/<style[\s\S]*?<\/style>/gi, '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 4000)
        }
      } catch {
        // Fetch failed — proceed with URL alone
      }

      const userMessage = pageText
        ? `Product URL: ${url}\n\nPage content (truncated):\n${pageText}`
        : `Product URL: ${url}\n\nNote: the page could not be fetched. Identify the product from the URL if possible.`

      messages = [{ role: 'user', content: userMessage }]
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 600,
      system: SYSTEM_PROMPT,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''

    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Could not parse gear data' }, { status: 500 })
    }

    const data = JSON.parse(jsonMatch[0]) as IdentifyResult

    // Always stamp purchaseUrl with the original URL when one was provided
    if (url) {
      data.purchaseUrl = url
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Failed to identify gear:', error)
    return NextResponse.json({ error: 'Failed to identify gear' }, { status: 500 })
  }
}
