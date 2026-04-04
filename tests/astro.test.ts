import { describe, it, expect } from 'vitest'
import { computeAstro, getMoonPhaseLabel, getMoonPhaseEmoji, getBortleLink } from '@/lib/astro'
import type { NightAstro, TripAstroData } from '@/lib/astro'

describe('getMoonPhaseLabel', () => {
  it('phase 0.0 returns "New Moon"', () => {
    expect(getMoonPhaseLabel(0.0)).toBe('New Moon')
  })

  it('phase 0.15 returns "Waxing Crescent"', () => {
    expect(getMoonPhaseLabel(0.15)).toBe('Waxing Crescent')
  })

  it('phase 0.25 returns "First Quarter"', () => {
    expect(getMoonPhaseLabel(0.25)).toBe('First Quarter')
  })

  it('phase 0.35 returns "Waxing Gibbous"', () => {
    expect(getMoonPhaseLabel(0.35)).toBe('Waxing Gibbous')
  })

  it('phase 0.5 returns "Full Moon"', () => {
    expect(getMoonPhaseLabel(0.5)).toBe('Full Moon')
  })

  it('phase 0.6 returns "Waning Gibbous"', () => {
    expect(getMoonPhaseLabel(0.6)).toBe('Waning Gibbous')
  })

  it('phase 0.75 returns "Last Quarter"', () => {
    expect(getMoonPhaseLabel(0.75)).toBe('Last Quarter')
  })

  it('phase 0.85 returns "Waning Crescent"', () => {
    expect(getMoonPhaseLabel(0.85)).toBe('Waning Crescent')
  })

  it('phase 0.99 returns "New Moon"', () => {
    expect(getMoonPhaseLabel(0.99)).toBe('New Moon')
  })
})

describe('getMoonPhaseEmoji', () => {
  it('phase 0.0 returns new moon emoji', () => {
    expect(getMoonPhaseEmoji(0.0)).toBe('\u{1F311}')
  })

  it('phase 0.5 returns full moon emoji', () => {
    expect(getMoonPhaseEmoji(0.5)).toBe('\u{1F315}')
  })

  it('phase 0.25 returns first quarter emoji', () => {
    expect(getMoonPhaseEmoji(0.25)).toBe('\u{1F313}')
  })

  it('phase 0.75 returns last quarter emoji', () => {
    expect(getMoonPhaseEmoji(0.75)).toBe('\u{1F317}')
  })
})

describe('getBortleLink', () => {
  it('returns string containing "lightpollutionmap.info"', () => {
    expect(getBortleLink(35.5, -82.5)).toContain('lightpollutionmap.info')
  })

  it('returns string containing "lat=35.5"', () => {
    expect(getBortleLink(35.5, -82.5)).toContain('lat=35.5')
  })

  it('returns string containing "lng=-82.5"', () => {
    expect(getBortleLink(35.5, -82.5)).toContain('lng=-82.5')
  })
})

describe('computeAstro', () => {
  it('2024-01-11 (known New Moon): moonLabel is "New Moon", goodForStars is true', () => {
    const result: TripAstroData = computeAstro({
      startDate: '2024-01-11',
      endDate: '2024-01-11',
    })
    const night: NightAstro = result.nights[0]
    expect(night.moonLabel).toBe('New Moon')
    expect(night.moonFraction).toBeLessThan(0.05)
    expect(night.goodForStars).toBe(true)
  })

  it('2024-01-25 (known Full Moon): moonLabel is "Full Moon", goodForStars is false', () => {
    const result: TripAstroData = computeAstro({
      startDate: '2024-01-25',
      endDate: '2024-01-25',
    })
    const night: NightAstro = result.nights[0]
    expect(night.moonLabel).toBe('Full Moon')
    expect(night.moonFraction).toBeGreaterThan(0.95)
    expect(night.goodForStars).toBe(false)
  })

  it('with no coords: bortleLink should be undefined', () => {
    const result = computeAstro({ startDate: '2024-01-11', endDate: '2024-01-11' })
    expect(result.bortleLink).toBeUndefined()
  })

  it('with coords (35.5, -82.5): bortleLink should contain "lightpollutionmap.info"', () => {
    const result = computeAstro({
      startDate: '2024-01-11',
      endDate: '2024-01-11',
      lat: 35.5,
      lon: -82.5,
    })
    expect(result.bortleLink).toContain('lightpollutionmap.info')
  })

  it('3-day trip returns 3 NightAstro entries', () => {
    const result = computeAstro({ startDate: '2024-01-11', endDate: '2024-01-13' })
    expect(result.nights).toHaveLength(3)
  })

  it('each entry has correct date string in YYYY-MM-DD format', () => {
    const result = computeAstro({ startDate: '2024-01-11', endDate: '2024-01-13' })
    expect(result.nights[0].date).toBe('2024-01-11')
    expect(result.nights[1].date).toBe('2024-01-12')
    expect(result.nights[2].date).toBe('2024-01-13')
  })

  it('merges sunrise/sunset from matching DayForecast entries', () => {
    const weatherDays = [
      {
        date: '2024-01-11',
        dayLabel: 'Thu',
        highF: 55,
        lowF: 35,
        precipProbability: 10,
        precipInches: 0,
        weatherCode: 0,
        weatherLabel: 'Clear',
        weatherEmoji: '\u2600\uFE0F',
        windMaxMph: 5,
        windGustMph: 8,
        uvIndexMax: 2,
        sunrise: '7:32 AM',
        sunset: '5:45 PM',
      },
    ]
    const result = computeAstro({
      startDate: '2024-01-11',
      endDate: '2024-01-11',
      weatherDays,
    })
    expect(result.nights[0].sunrise).toBe('7:32 AM')
    expect(result.nights[0].sunset).toBe('5:45 PM')
  })

  it('no sunrise/sunset when weatherDays is empty', () => {
    const result = computeAstro({
      startDate: '2024-01-11',
      endDate: '2024-01-11',
      weatherDays: [],
    })
    expect(result.nights[0].sunrise).toBeUndefined()
    expect(result.nights[0].sunset).toBeUndefined()
  })
})
