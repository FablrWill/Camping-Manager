import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { prisma } from '@/lib/db'
import { ingestFile, ingestChunks } from '@/lib/rag/ingest'
import { chunkPlainText } from '@/lib/rag/ingestText'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const CLASSIFY_PROMPT = `You are an assistant that classifies content sent to a personal camping app.

Given the message text, URL, page content, or image, classify the content type and extract relevant data.

Content types:
- "gear": A specific product (camping gear, vehicle gear, tools, etc.)
- "location": A specific campsite, park, trailhead, or outdoor area
- "article": A blog post, guide, how-to, gear review, or camping tips article
- "reddit": A Reddit thread about camping, overlanding, gear, or related topics
- "map": A map, route, or trail navigation link
- "other": Anything else camping-related

Return ONLY valid JSON (no markdown):
{
  "contentType": "gear" | "location" | "article" | "reddit" | "map" | "other",
  "title": "concise title or name",
  "summary": "2-3 sentence summary of the content and why it is relevant to camping",
  "region": "geographic region if mentioned (e.g. 'Western NC', 'Pisgah Forest'), or null",
  "extractedData": {
    // For gear:
    "name": "product name without brand",
    "brand": "brand or null",
    "category": "shelter|sleep|cook|power|clothing|tools|vehicle|hygiene|safety|misc",
    "weight": pounds as number or null,
    "price": USD as number or null,
    "notes": "key specs or null",
    "wattage": watts as number or null,
    // For location:
    "locationName": "place name",
    "locationType": "campsite|park|trailhead|area|other",
    "latitude": number or null,
    "longitude": number or null,
    "locationNotes": "access notes, highlights, amenities",
    // For article/reddit/map/other:
    "keyPoints": ["key point 1", "key point 2", "key point 3"]
  }
}`

const CATEGORY_EMOJIS: Record<string, string> = {
  shelter: '⛺', sleep: '🛏️', cook: '🍳', power: '🔋',
  clothing: '🧥', tools: '🔧', vehicle: '🚙', hygiene: '🧴',
  safety: '🩹', misc: '📦',
}

function extractUrls(text: string): string[] {
  return text.match(/https?:\/\/[^\s]+/g) ?? []
}

async function fetchPageText(url: string): Promise<string> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(7000),
    })
    if (!res.ok) return ''
    const html = await res.text()
    return html
      .replace(/<script[\s\S]*?<\/script>/gi, '')
      .replace(/<style[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 5000)
  } catch {
    return ''
  }
}

/**
 * Background ingest — fire and forget. Logs errors but never throws.
 * For URLs: uses the full RAG pipeline (fetch → chunk → embed → store).
 * For text/screenshots: chunks the provided text directly.
 */
function ingestInBackground(params: {
  url?: string
  text?: string
  title: string
  region?: string | null
}): void {
  const { url, text, title, region } = params

  const run = async () => {
    if (!process.env.VOYAGE_API_KEY) {
      console.log('[ingest] VOYAGE_API_KEY not set — skipping knowledge base ingest')
      return
    }

    if (url) {
      // Full web ingest pipeline
      const chunks = await ingestFile(url)
      if (chunks.length === 0) {
        console.log(`[ingest] No chunks extracted from ${url}`)
        return
      }
      // Stamp region metadata on all chunks if we detected one
      if (region) {
        for (const c of chunks) c.metadata.region = region
      }
      const result = await ingestChunks(chunks)
      console.log(`[ingest] Ingested ${result.inserted} chunks from ${url}`)
    } else if (text) {
      const chunks = chunkPlainText(text, title, 'imessage-screenshot', {
        topic: title,
        region: region ?? undefined,
        category: 'external',
      })
      if (chunks.length === 0) return
      const result = await ingestChunks(chunks)
      console.log(`[ingest] Ingested ${result.inserted} chunks from screenshot: ${title}`)
    }
  }

  run().catch((err: unknown) =>
    console.error('[ingest] Background ingest failed:', err)
  )
}

interface ClassifyResult {
  contentType: 'gear' | 'location' | 'article' | 'reddit' | 'map' | 'other'
  title: string
  summary: string
  region?: string | null
  extractedData?: Record<string, unknown>
}

export async function POST(request: NextRequest) {
  try {
    const secret = process.env.WEBHOOK_SECRET
    if (secret) {
      const authHeader = request.headers.get('x-webhook-secret')
      if (authHeader !== secret) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
    }

    const body = await request.json() as { text?: string; image?: string; mimeType?: string }
    const text = body.text?.trim() || null
    const image = body.image ?? null
    const mimeType = body.mimeType ?? 'image/jpeg'

    if (!text && !image) {
      return NextResponse.json({
        reply: 'Send me a link, screenshot, or message — gear, articles, campsites, whatever.',
      })
    }

    const urls = text ? extractUrls(text) : []
    const url = urls[0] ?? null
    const userNote = text?.replace(/https?:\/\/[^\s]+/g, '').trim() || null
    const pageText = url ? await fetchPageText(url) : ''

    // Build Claude message (vision or text)
    const validMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'] as const
    type ImageMediaType = typeof validMimeTypes[number]
    const safeMediaType: ImageMediaType = validMimeTypes.includes(mimeType as ImageMediaType)
      ? (mimeType as ImageMediaType)
      : 'image/jpeg'

    let claudeContent: Anthropic.MessageParam['content']

    if (image) {
      const textParts: string[] = []
      if (userNote) textParts.push(`User note: "${userNote}"`)
      if (url) textParts.push(`URL also provided: ${url}`)
      textParts.push('Classify this image and extract all relevant camping information.')
      claudeContent = [
        { type: 'image', source: { type: 'base64', media_type: safeMediaType, data: image } },
        { type: 'text', text: textParts.join('\n') },
      ]
    } else {
      const parts: string[] = []
      if (url) parts.push(`URL: ${url}`)
      if (userNote) parts.push(`User note: "${userNote}"`)
      if (pageText) parts.push(`Page content (truncated):\n${pageText}`)
      else if (url) parts.push('Note: page could not be fetched.')
      if (!url && text) parts.push(`Message: "${text}"`)
      claudeContent = parts.join('\n\n')
    }

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-20250514',
      max_tokens: 900,
      system: CLASSIFY_PROMPT,
      messages: [{ role: 'user', content: claudeContent }],
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)

    if (!jsonMatch) {
      return NextResponse.json({
        reply: "Got it but couldn't parse this. Try sending just the link with an optional note.",
      })
    }

    const result = JSON.parse(jsonMatch[0]) as ClassifyResult
    const data = result.extractedData ?? {}
    const voyageConfigured = !!process.env.VOYAGE_API_KEY

    switch (result.contentType) {
      case 'gear': {
        const name = typeof data.name === 'string' ? data.name : result.title
        const category = typeof data.category === 'string' ? data.category : 'misc'
        const gear = await prisma.gearItem.create({
          data: {
            name,
            brand: typeof data.brand === 'string' ? data.brand : null,
            category,
            description: result.summary ?? null,
            weight: typeof data.weight === 'number' ? data.weight : null,
            price: typeof data.price === 'number' ? data.price : null,
            notes: [
              typeof data.notes === 'string' ? data.notes : null,
              userNote ? `Note: ${userNote}` : null,
            ].filter(Boolean).join(' | ') || null,
            wattage: typeof data.wattage === 'number' ? data.wattage : null,
            purchaseUrl: url,
            isWishlist: true,
          },
        })
        const emoji = CATEGORY_EMOJIS[gear.category] ?? '📦'
        const priceStr = typeof data.price === 'number' ? ` — $${data.price}` : ''
        const weightStr = typeof data.weight === 'number' ? `, ${data.weight} lbs` : ''
        return NextResponse.json({
          reply: `${emoji} Added to wishlist: ${gear.name}${typeof data.brand === 'string' ? ` by ${data.brand}` : ''}${priceStr}${weightStr} [${gear.category}]`,
          contentType: 'gear',
          gearId: gear.id,
        })
      }

      case 'location': {
        const locationName = typeof data.locationName === 'string' ? data.locationName : result.title
        const location = await prisma.location.create({
          data: {
            name: locationName,
            type: typeof data.locationType === 'string' ? data.locationType : 'other',
            latitude: typeof data.latitude === 'number' ? data.latitude : 0,
            longitude: typeof data.longitude === 'number' ? data.longitude : 0,
            notes: [
              result.summary,
              typeof data.locationNotes === 'string' ? data.locationNotes : null,
              userNote ? `Note: ${userNote}` : null,
              url ? `Source: ${url}` : null,
            ].filter(Boolean).join('\n') || null,
          },
        })

        // Also ingest into knowledge base so the agent can recall full details
        if (url || result.summary) {
          ingestInBackground({
            url: url ?? undefined,
            text: url ? undefined : [result.summary, typeof data.locationNotes === 'string' ? data.locationNotes : ''].filter(Boolean).join('\n\n'),
            title: locationName,
            region: result.region,
          })
        }

        const kb = voyageConfigured ? ' Saving details to knowledge base.' : ''
        return NextResponse.json({
          reply: `📍 Saved location: ${location.name}\n${result.summary}${kb}`,
          contentType: 'location',
          locationId: location.id,
        })
      }

      case 'article':
      case 'reddit': {
        const typeLabel = result.contentType === 'reddit' ? 'Reddit post' : 'Article'
        const keyPoints = Array.isArray(data.keyPoints) ? (data.keyPoints as string[]) : []
        const keyPointsPreview = keyPoints.slice(0, 3).map((p) => `• ${p}`).join('\n')

        if (!voyageConfigured) {
          return NextResponse.json({
            reply: `📚 ${typeLabel}: "${result.title}"\n${result.summary}${keyPointsPreview ? `\n\n${keyPointsPreview}` : ''}\n\n⚠️ Set VOYAGE_API_KEY in .env to save this to your knowledge base.`,
            contentType: result.contentType,
          })
        }

        // Ingest in background — for screenshots use summary+key points as the content
        if (url) {
          ingestInBackground({ url, title: result.title, region: result.region })
        } else {
          const ingestText = [
            result.summary,
            keyPoints.length > 0 ? keyPoints.join('\n') : null,
            userNote,
          ].filter(Boolean).join('\n\n')
          ingestInBackground({ text: ingestText, title: result.title, region: result.region })
        }

        const sourceNote = url ? '' : ' (from screenshot)'
        return NextResponse.json({
          reply: `📚 Saved to knowledge base${sourceNote}: "${result.title}"\n${result.summary}${keyPointsPreview ? `\n\n${keyPointsPreview}` : ''}\n\nYour agent can now reference this when planning trips.`,
          contentType: result.contentType,
        })
      }

      case 'map': {
        const keyPoints = Array.isArray(data.keyPoints) ? (data.keyPoints as string[]) : []
        if (voyageConfigured && (url || keyPoints.length > 0)) {
          const ingestText = [result.summary, ...keyPoints].join('\n\n')
          ingestInBackground({
            url: url ?? undefined,
            text: url ? undefined : ingestText,
            title: result.title,
            region: result.region,
          })
        }
        return NextResponse.json({
          reply: `🗺️ Map: "${result.title}"\n${result.summary}${voyageConfigured ? '\n\nSaved to knowledge base.' : ''}`,
          contentType: 'map',
        })
      }

      default: {
        const keyPoints = Array.isArray(data.keyPoints) ? (data.keyPoints as string[]) : []
        if (voyageConfigured && (url || keyPoints.length > 0)) {
          const ingestText = [result.summary, ...keyPoints].join('\n\n')
          ingestInBackground({
            url: url ?? undefined,
            text: url ? undefined : ingestText,
            title: result.title,
            region: result.region,
          })
        }
        return NextResponse.json({
          reply: `Got it: "${result.title}"\n${result.summary}${voyageConfigured ? '\n\nSaved to knowledge base.' : ''}`,
          contentType: 'other',
        })
      }
    }
  } catch (error) {
    console.error('Failed to process incoming message:', error)
    return NextResponse.json(
      { reply: 'Something went wrong. Try again or add it manually in the app.' },
      { status: 500 }
    )
  }
}
