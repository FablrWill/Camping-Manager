/**
 * Pure extraction functions for structured JSON blocks in chat messages.
 * Split from ChatBubble.tsx so tests can import without JSX transformation.
 */

export interface TripSummaryPayload {
  action: 'trip_summary'
  name: string
  startDate: string
  endDate: string
  locationId?: string | null
  notes?: string | null
  bringingDog?: boolean
}

export function extractTripSummary(content: string): TripSummaryPayload | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*?"action"\s*:\s*"trip_summary"[\s\S]*?})/m)
  if (!jsonMatch) return null
  const jsonStr = jsonMatch[1] || jsonMatch[2]
  if (!jsonStr) return null
  try {
    const parsed = JSON.parse(jsonStr)
    if (parsed.action === 'trip_summary' && parsed.name && parsed.startDate && parsed.endDate) {
      return parsed as TripSummaryPayload
    }
  } catch {
    // Malformed JSON — skip
  }
  return null
}
