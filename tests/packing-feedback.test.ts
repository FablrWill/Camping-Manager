import { describe, it, expect, vi } from 'vitest'

// Mock the Anthropic SDK to prevent browser-environment error from module-level instantiation
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}))

import { buildFeedbackSection, filterSignificantFeedback, type GearFeedbackSummary } from '@/lib/claude'

describe('buildFeedbackSection', () => {
  it('returns empty string when feedbackContext is undefined', () => {
    expect(buildFeedbackSection(undefined)).toEqual('')
  })

  it('returns empty string when feedbackContext is empty array', () => {
    expect(buildFeedbackSection([])).toEqual('')
  })

  it('returns GEAR HISTORY header when feedback exists', () => {
    const feedback: GearFeedbackSummary[] = [
      { gearName: 'Camp Chair', usedCount: 1, didntNeedCount: 3, forgotCount: 0, totalTrips: 4 },
    ]
    expect(buildFeedbackSection(feedback)).toContain('GEAR HISTORY FROM PAST TRIPS:')
  })

  it('includes didnt-need signal for items with didntNeedCount >= 2', () => {
    const feedback: GearFeedbackSummary[] = [
      { gearName: 'Camp Chair', usedCount: 1, didntNeedCount: 3, forgotCount: 0, totalTrips: 4 },
    ]
    expect(buildFeedbackSection(feedback)).toContain("didn't need\" on 3/4 trips")
  })

  it('includes forgot signal for items with forgotCount >= 1', () => {
    const feedback: GearFeedbackSummary[] = [
      { gearName: 'First Aid Kit', usedCount: 0, didntNeedCount: 0, forgotCount: 2, totalTrips: 3 },
    ]
    expect(buildFeedbackSection(feedback)).toContain('forgotten but needed on 2/3 trips')
  })

  it('includes used-only line when item has no negative signal', () => {
    const feedback: GearFeedbackSummary[] = [
      { gearName: 'Tent', usedCount: 5, didntNeedCount: 0, forgotCount: 0, totalTrips: 5 },
    ]
    expect(buildFeedbackSection(feedback)).toContain('used on 5/5 trips')
  })
})

describe('filterSignificantFeedback', () => {
  it('excludes items with only used status', () => {
    const input: GearFeedbackSummary[] = [
      { gearName: 'Tent', usedCount: 5, didntNeedCount: 0, forgotCount: 0, totalTrips: 5 },
    ]
    expect(filterSignificantFeedback(input)).toHaveLength(0)
  })

  it('includes items with didntNeedCount >= 2', () => {
    const input: GearFeedbackSummary[] = [
      { gearName: 'Camp Chair', usedCount: 1, didntNeedCount: 2, forgotCount: 0, totalTrips: 3 },
    ]
    expect(filterSignificantFeedback(input)).toHaveLength(1)
  })

  it('includes items with forgotCount >= 1', () => {
    const input: GearFeedbackSummary[] = [
      { gearName: 'First Aid Kit', usedCount: 0, didntNeedCount: 0, forgotCount: 1, totalTrips: 2 },
    ]
    expect(filterSignificantFeedback(input)).toHaveLength(1)
  })
})
