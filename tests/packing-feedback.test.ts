import { describe, it, expect, vi } from 'vitest'

// Mock the Anthropic SDK to prevent browser-environment error from module-level instantiation
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}))

import { buildFeedbackSection, filterSignificantFeedback, aggregateGearFeedback, type GearFeedbackSummary } from '@/lib/claude'

type PackingItemWithGear = {
  gearId: string
  usageStatus: string | null
  gear: { name: string }
}

type TripWithPackingItems = {
  id: string
  packingItems: PackingItemWithGear[]
}

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

describe('aggregateGearFeedback', () => {
  it('returns empty array when trips array is empty', () => {
    expect(aggregateGearFeedback([])).toEqual([])
  })

  it('counts usageStatus values correctly across trips', () => {
    const trips: TripWithPackingItems[] = [
      {
        id: 'trip-1',
        packingItems: [
          { gearId: 'gear-tent', usageStatus: 'used', gear: { name: 'Tent' } },
          { gearId: 'gear-chair', usageStatus: "didn't need", gear: { name: 'Chair' } },
        ],
      },
      {
        id: 'trip-2',
        packingItems: [
          { gearId: 'gear-tent', usageStatus: 'used', gear: { name: 'Tent' } },
          { gearId: 'gear-chair', usageStatus: "didn't need", gear: { name: 'Chair' } },
        ],
      },
    ]

    const result = aggregateGearFeedback(trips)
    const tent = result.find((r) => r.gearName === 'Tent')
    const chair = result.find((r) => r.gearName === 'Chair')

    expect(tent).toEqual({ gearName: 'Tent', usedCount: 2, didntNeedCount: 0, forgotCount: 0, totalTrips: 2 })
    expect(chair).toEqual({ gearName: 'Chair', usedCount: 0, didntNeedCount: 2, forgotCount: 0, totalTrips: 2 })
  })

  it('handles forgot but needed status', () => {
    const trips: TripWithPackingItems[] = [
      {
        id: 'trip-1',
        packingItems: [
          { gearId: 'gear-firstaid', usageStatus: 'forgot but needed', gear: { name: 'First Aid' } },
        ],
      },
    ]

    const result = aggregateGearFeedback(trips)
    const firstAid = result.find((r) => r.gearName === 'First Aid')
    expect(firstAid?.forgotCount).toEqual(1)
    expect(firstAid?.totalTrips).toEqual(1)
  })

  it('uses gear.name as gearName in output', () => {
    const trips: TripWithPackingItems[] = [
      {
        id: 'trip-1',
        packingItems: [
          { gearId: 'gear-ecoflow', usageStatus: 'used', gear: { name: 'EcoFlow Delta' } },
        ],
      },
    ]

    const result = aggregateGearFeedback(trips)
    expect(result[0].gearName).toEqual('EcoFlow Delta')
  })
})
