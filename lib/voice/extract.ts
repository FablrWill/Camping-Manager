import Anthropic from '@anthropic-ai/sdk'
import { InsightPayload } from './types'
import { parseClaudeJSON, InsightPayloadSchema } from '@/lib/parse-claude'

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

export async function extractInsights(transcription: string): Promise<InsightPayload> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-20250514',
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: transcription }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const result = parseClaudeJSON(text, InsightPayloadSchema)
  if (!result.success) {
    throw new Error(`Voice insight extraction failed: ${result.error}`)
  }
  return result.data as InsightPayload
}
