import Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'
import { InsightPayload } from './types'

const EXTRACTION_SYSTEM_PROMPT = `You are extracting structured insights from a camping trip debrief recording transcript.
Return ONLY valid JSON matching this exact schema — no prose, no markdown fences, no explanation:
{
  "whatWorked": [{ "text": "string" }],
  "whatDidnt": [{ "text": "string" }],
  "gearFeedback": [{ "text": "string", "gearName": "string or null" }],
  "spotRating": { "locationName": "string or null", "rating": number_1_to_5_or_null }
}

Rules:
- Extract only what the speaker explicitly mentioned
- gearName should be the gear item name if identifiable (e.g., "rain fly", "stove", "sleeping bag")
- spotRating.rating should be 1-5 if the speaker gave a rating, null otherwise
- If a category has no mentions, return an empty array (or null for spotRating fields)
- Keep text values concise — one sentence max per insight`

const InsightPayloadSchema = z.object({
  whatWorked: z.array(z.object({ text: z.string() })).default([]),
  whatDidnt: z.array(z.object({ text: z.string() })).default([]),
  gearFeedback: z.array(z.object({ text: z.string(), gearName: z.string().nullable() })).default([]),
  spotRating: z.object({
    locationName: z.string().nullable(),
    rating: z.number().min(1).max(5).nullable(),
  }).nullable().default(null),
})

export async function extractInsights(transcription: string): Promise<InsightPayload> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-20250514',
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: transcription }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const cleaned = text.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
  let parsed: unknown
  try {
    parsed = JSON.parse(cleaned)
  } catch {
    throw new Error('LLM returned non-JSON response')
  }
  const result = InsightPayloadSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error(`LLM response schema mismatch: ${result.error.issues.map((i) => i.message).join(', ')}`)
  }
  return result.data as InsightPayload
}
