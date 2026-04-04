// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { extractTripSummary } from '../chat-extract'

// extractTripSummary is exported from lib/chat-extract.ts (Plan 33-02).
// ChatBubble.tsx re-exports it for callers that import from ChatBubble.
// Tests import from chat-extract.ts directly to avoid JSX transformation issues.

describe('extractTripSummary', () => {
  it('extracts trip_summary from fenced JSON block', () => {
    const content =
      'Here is your trip:\n```json\n{"action":"trip_summary","name":"Pisgah Weekend","startDate":"2026-04-10","endDate":"2026-04-12"}\n```'
    const result = extractTripSummary(content)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Pisgah Weekend')
    expect(result?.startDate).toBe('2026-04-10')
    expect(result?.endDate).toBe('2026-04-12')
  })

  it('extracts trip_summary from inline JSON', () => {
    const content =
      'Looks good! {"action":"trip_summary","name":"Linville Gorge","startDate":"2026-05-01","endDate":"2026-05-03"}'
    const result = extractTripSummary(content)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Linville Gorge')
  })

  it('returns null when no trip_summary JSON exists', () => {
    const content = 'Just a regular message with no JSON.'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    const content = '```json\n{broken json here}\n```'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })

  it('returns null for JSON with wrong action type', () => {
    const content =
      '```json\n{"action":"confirm_delete","itemType":"gear","itemId":"123"}\n```'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })
})
