import { describe, it, expect, vi } from 'vitest'

// Mock the Anthropic SDK to prevent browser-environment error from module-level instantiation
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}))

import { buildClothingGuidance, buildWeatherSection } from '@/lib/claude'

interface WeatherDay {
  date: string
  dayLabel: string
  highF: number
  lowF: number
  precipProbability: number
  weatherLabel: string
  windMaxMph: number
  uvIndexMax: number
}

interface GearItem {
  id: string
  name: string
  brand: string | null
  category: string
  weight: number | null
  condition: string | null
}

function makeDay(overrides: Partial<WeatherDay> = {}): WeatherDay {
  return {
    date: '2026-04-10',
    dayLabel: 'Thursday',
    highF: 75,
    lowF: 55,
    precipProbability: 10,
    weatherLabel: 'Partly Cloudy',
    windMaxMph: 8,
    uvIndexMax: 4,
    ...overrides,
  }
}

function makeGear(overrides: Partial<GearItem> = {}): GearItem {
  return {
    id: 'gear-1',
    name: 'Rain Jacket',
    brand: 'Columbia',
    category: 'clothing',
    weight: 1.5,
    condition: 'good',
    ...overrides,
  }
}

describe('buildClothingGuidance', () => {
  it('returns empty string when weather is undefined', () => {
    expect(buildClothingGuidance(undefined, [])).toEqual('')
  })

  it('returns empty string when weather.days is empty', () => {
    expect(buildClothingGuidance({ days: [], alerts: [] }, [])).toEqual('')
  })

  it('returns empty string when no thresholds met', () => {
    const days = [makeDay({ precipProbability: 10, lowF: 65, uvIndexMax: 3 })]
    expect(buildClothingGuidance({ days, alerts: [] }, [])).toEqual('')
  })

  it('includes CLOTHING GUIDANCE header when rain threshold met', () => {
    const days = [makeDay({ precipProbability: 45 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result).toContain('CLOTHING GUIDANCE:')
  })

  it('includes rain directive when precipProbability >= 40', () => {
    const days = [makeDay({ precipProbability: 40 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result.toLowerCase()).toContain('rain gear')
  })

  it('includes cold layers directive when lowF <= 50', () => {
    const days = [makeDay({ lowF: 48 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result.toLowerCase()).toContain('layers')
  })

  it('includes UV protection directive when uvIndexMax >= 6', () => {
    const days = [makeDay({ uvIndexMax: 8 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result.toLowerCase()).toMatch(/sun protection|uv/)
  })

  it('includes all three directives when all conditions met', () => {
    const days = [makeDay({ precipProbability: 60, lowF: 40, uvIndexMax: 9 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result.toLowerCase()).toContain('rain gear')
    expect(result.toLowerCase()).toContain('layers')
    expect(result.toLowerCase()).toMatch(/sun protection|uv/)
  })

  it('cross-references owned clothing items when condition met', () => {
    const days = [makeDay({ precipProbability: 45 })]
    const clothingItems = [makeGear({ id: 'abc', name: 'Rain Jacket' })]
    const result = buildClothingGuidance({ days, alerts: [] }, clothingItems)
    expect(result).toContain('Rain Jacket')
    expect(result).toContain('[id:abc]')
  })

  it('omits spotlight when clothingItems is empty and condition met', () => {
    const days = [makeDay({ precipProbability: 45 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result).not.toContain('[id:')
  })

  it('triggers rain at boundary precipProbability of 40', () => {
    const days = [makeDay({ precipProbability: 40 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result).toContain('CLOTHING GUIDANCE:')
    expect(result.toLowerCase()).toContain('rain gear')
  })

  it('triggers cold at boundary lowF of 50', () => {
    const days = [makeDay({ lowF: 50 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result).toContain('CLOTHING GUIDANCE:')
    expect(result.toLowerCase()).toContain('layers')
  })

  it('triggers UV at boundary uvIndexMax of 6', () => {
    const days = [makeDay({ uvIndexMax: 6 })]
    const result = buildClothingGuidance({ days, alerts: [] }, [])
    expect(result).toContain('CLOTHING GUIDANCE:')
    expect(result.toLowerCase()).toMatch(/sun protection|uv/)
  })
})

describe('buildWeatherSection UV', () => {
  it('includes UV index in per-day line', () => {
    const days = [makeDay({ uvIndexMax: 7 })]
    const result = buildWeatherSection({ days, alerts: [] })
    expect(result).toContain('UV 7')
  })
})
