/**
 * Astronomical data computation for Outland OS
 * Uses suncalc for moon phase (pure math, no API key required).
 * Sunrise/sunset sourced from existing Open-Meteo DayForecast data.
 * Bortle class: placeholder deep link to lightpollutionmap.info.
 */

import * as SunCalc from 'suncalc'
import type { DayForecast } from '@/lib/weather'

export interface NightAstro {
  date: string          // YYYY-MM-DD
  moonPhase: number     // 0.0-1.0 (suncalc phase value)
  moonFraction: number  // 0.0-1.0 (illuminated fraction)
  moonLabel: string     // "Full Moon", "New Moon", etc.
  moonEmoji: string     // emoji character
  goodForStars: boolean // moonFraction < 0.25
  sunrise?: string      // "6:42 AM" from DayForecast
  sunset?: string       // "7:58 PM" from DayForecast
}

export interface TripAstroData {
  nights: NightAstro[]
  bortleLink?: string   // lightpollutionmap.info deep link if coords available
}

/**
 * Map a suncalc moon phase value (0.0-1.0) to a human-readable label.
 * Thresholds from RESEARCH.md D-01.
 */
export function getMoonPhaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

/**
 * Map a suncalc moon phase value (0.0-1.0) to the corresponding moon emoji.
 * Same threshold boundaries as getMoonPhaseLabel.
 */
export function getMoonPhaseEmoji(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return '\u{1F311}' // 🌑 New Moon
  if (phase < 0.22) return '\u{1F312}'                 // 🌒 Waxing Crescent
  if (phase < 0.28) return '\u{1F313}'                 // 🌓 First Quarter
  if (phase < 0.47) return '\u{1F314}'                 // 🌔 Waxing Gibbous
  if (phase < 0.53) return '\u{1F315}'                 // 🌕 Full Moon
  if (phase < 0.72) return '\u{1F316}'                 // 🌖 Waning Gibbous
  if (phase < 0.78) return '\u{1F317}'                 // 🌗 Last Quarter
  return '\u{1F318}'                                   // 🌘 Waning Crescent
}

/**
 * Return a deep link to lightpollutionmap.info pre-loaded with WA2015 overlay
 * at the given coordinates.
 */
export function getBortleLink(lat: number, lon: number): string {
  const state = 'eyJiYXNlbWFwIjoic3RlbGxhciIsIm92ZXJsYXkiOiJ3YTIwMTUiLCJvdmVybGF5T3BhY2l0eSI6ODV9'
  return `https://www.lightpollutionmap.info/#zoom=10&lat=${lat}&lng=${lon}&state=${state}`
}

/**
 * Compute per-night astronomical data for a date range.
 *
 * @param params.startDate  - Trip start date, YYYY-MM-DD
 * @param params.endDate    - Trip end date, YYYY-MM-DD
 * @param params.lat        - Optional latitude for Bortle deep link
 * @param params.lon        - Optional longitude for Bortle deep link
 * @param params.weatherDays - Optional DayForecast array for sunrise/sunset merge
 */
export function computeAstro(params: {
  startDate: string
  endDate: string
  lat?: number
  lon?: number
  weatherDays?: DayForecast[]
}): TripAstroData {
  const { startDate, endDate, lat, lon, weatherDays } = params

  const dates = buildDateRange(startDate, endDate)

  const nights: NightAstro[] = dates.map((date) => {
    // Use UTC noon to avoid DST/timezone drift across all system locales
    const illumination = SunCalc.getMoonIllumination(new Date(`${date}T12:00:00Z`))
    const { phase, fraction } = illumination

    const moonLabel = getMoonPhaseLabel(phase)
    const moonEmoji = getMoonPhaseEmoji(phase)
    const goodForStars = fraction < 0.25

    const matchingDay = weatherDays?.find((d) => d.date === date)

    const night: NightAstro = {
      date,
      moonPhase: phase,
      moonFraction: fraction,
      moonLabel,
      moonEmoji,
      goodForStars,
    }

    if (matchingDay !== undefined) {
      night.sunrise = matchingDay.sunrise
      night.sunset = matchingDay.sunset
    }

    return night
  })

  const bortleLink =
    lat !== undefined && lon !== undefined ? getBortleLink(lat, lon) : undefined

  return { nights, bortleLink }
}

/**
 * Generate an inclusive array of YYYY-MM-DD strings from startDate to endDate.
 */
function buildDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = []
  const current = new Date(`${startDate}T12:00:00Z`)
  const end = new Date(`${endDate}T12:00:00Z`)

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10))
    current.setUTCDate(current.getUTCDate() + 1)
  }

  return dates
}
