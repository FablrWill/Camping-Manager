// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'

// extractTripSummary will be exported from ChatBubble.tsx in Plan 33-02 Task 2.
// Using require() so this file compiles even before the export exists.
// When the export is missing, require() throws at runtime — Vitest reports
// each test as a failure, which is the RED phase we want.
//
// import { extractTripSummary } from '../../components/ChatBubble'

describe('extractTripSummary', () => {
  it('extracts trip_summary from fenced JSON block', () => {
    // RED: Will pass after Plan 33-02 Task 2 exports extractTripSummary from ChatBubble.tsx
    const { extractTripSummary } = require('../../components/ChatBubble')
    const content =
      'Here is your trip:\n```json\n{"action":"trip_summary","name":"Pisgah Weekend","startDate":"2026-04-10","endDate":"2026-04-12"}\n```'
    const result = extractTripSummary(content)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Pisgah Weekend')
    expect(result?.startDate).toBe('2026-04-10')
    expect(result?.endDate).toBe('2026-04-12')
  })

  it('extracts trip_summary from inline JSON', () => {
    const { extractTripSummary } = require('../../components/ChatBubble')
    const content =
      'Looks good! {"action":"trip_summary","name":"Linville Gorge","startDate":"2026-05-01","endDate":"2026-05-03"}'
    const result = extractTripSummary(content)
    expect(result).not.toBeNull()
    expect(result?.name).toBe('Linville Gorge')
  })

  it('returns null when no trip_summary JSON exists', () => {
    const { extractTripSummary } = require('../../components/ChatBubble')
    const content = 'Just a regular message with no JSON.'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    const { extractTripSummary } = require('../../components/ChatBubble')
    const content = '```json\n{broken json here}\n```'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })

  it('returns null for JSON with wrong action type', () => {
    const { extractTripSummary } = require('../../components/ChatBubble')
    const content =
      '```json\n{"action":"confirm_delete","itemType":"gear","itemId":"123"}\n```'
    const result = extractTripSummary(content)
    expect(result).toBeNull()
  })
})
