/**
 * Astronomy utilities for Outland OS — moon phase, golden hour, dark sky quality.
 * Pure computation, no external APIs. Moon phase uses the Conway/Tregenza algorithm.
 */

export interface MoonPhaseInfo {
  phase: number           // 0-29.53 (days into lunar cycle)
  illumination: number    // 0-100 (percentage)
  name: string            // "New Moon", "Waxing Crescent", etc.
  emoji: string
  darkSkyFriendly: boolean // true when illumination < 25%
}

export interface NightSkyInfo {
  moonPhase: MoonPhaseInfo
  goldenHour: {
    morning: { start: string; end: string } // "6:12 AM" — "6:42 AM"
    evening: { start: string; end: string } // "7:28 PM" — "7:58 PM"
  }
  astronomicalTwilight: {
    dusk: string   // when it gets truly dark
    dawn: string   // when sky starts brightening
  }
  darkHours: number // hours of true darkness (moon below 25% or set)
  stargazingQuality: 'excellent' | 'good' | 'fair' | 'poor'
  stargazingLabel: string
}

export interface BortleEstimate {
  bortle: number    // 1-9
  label: string
  description: string
  nakedEyeLimitMag: number // approximate limiting magnitude
}

// --- Moon Phase ---

/**
 * Calculate moon phase for a given date.
 * Uses a simplified algorithm based on known new moon reference.
 * Accurate to ±1 day, which is fine for camping planning.
 */
export function getMoonPhase(date: Date): MoonPhaseInfo {
  // Reference new moon: Jan 6, 2000 18:14 UTC
  const KNOWN_NEW_MOON = new Date('2000-01-06T18:14:00Z')
  const SYNODIC_MONTH = 29.53058770576 // days

  const diffMs = date.getTime() - KNOWN_NEW_MOON.getTime()
  const diffDays = diffMs / (1000 * 60 * 60 * 24)
  const phase = ((diffDays % SYNODIC_MONTH) + SYNODIC_MONTH) % SYNODIC_MONTH

  // Illumination: 0 at new moon, 100 at full moon
  const illumination = Math.round(
    (1 - Math.cos((phase / SYNODIC_MONTH) * 2 * Math.PI)) / 2 * 100
  )

  const { name, emoji } = getMoonPhaseName(phase, SYNODIC_MONTH)

  return {
    phase: Math.round(phase * 10) / 10,
    illumination,
    name,
    emoji,
    darkSkyFriendly: illumination < 25,
  }
}

function getMoonPhaseName(phase: number, synodicMonth: number): { name: string; emoji: string } {
  const fraction = phase / synodicMonth

  if (fraction < 0.0338)  return { name: 'New Moon',        emoji: '🌑' }
  if (fraction < 0.216)   return { name: 'Waxing Crescent', emoji: '🌒' }
  if (fraction < 0.284)   return { name: 'First Quarter',   emoji: '🌓' }
  if (fraction < 0.466)   return { name: 'Waxing Gibbous',  emoji: '🌔' }
  if (fraction < 0.534)   return { name: 'Full Moon',       emoji: '🌕' }
  if (fraction < 0.716)   return { name: 'Waning Gibbous',  emoji: '🌖' }
  if (fraction < 0.784)   return { name: 'Last Quarter',    emoji: '🌗' }
  if (fraction < 0.966)   return { name: 'Waning Crescent', emoji: '🌘' }
  return { name: 'New Moon', emoji: '🌑' }
}

// --- Golden Hour ---

/**
 * Calculate golden hour windows from sunrise/sunset times.
 * Golden hour: ~30 min before/after sunrise, ~30 min before sunset to sunset.
 */
export function getGoldenHour(
  sunrise: string,
  sunset: string
): { morning: { start: string; end: string }; evening: { start: string; end: string } } {
  const sunriseMin = parseTimeToMinutes(sunrise)
  const sunsetMin = parseTimeToMinutes(sunset)

  return {
    morning: {
      start: minutesToTimeStr(sunriseMin - 30),
      end: minutesToTimeStr(sunriseMin + 30),
    },
    evening: {
      start: minutesToTimeStr(sunsetMin - 30),
      end: minutesToTimeStr(sunsetMin),
    },
  }
}

/**
 * Estimate astronomical twilight (when sky is truly dark).
 * Astronomical twilight is ~90 minutes after sunset / before sunrise.
 */
export function getAstronomicalTwilight(
  sunrise: string,
  sunset: string
): { dusk: string; dawn: string } {
  const sunriseMin = parseTimeToMinutes(sunrise)
  const sunsetMin = parseTimeToMinutes(sunset)

  return {
    dusk: minutesToTimeStr(sunsetMin + 90),
    dawn: minutesToTimeStr(sunriseMin - 90),
  }
}

// --- Bortle Class Estimation ---

const BORTLE_SCALE: BortleEstimate[] = [
  { bortle: 1, label: 'Excellent dark-sky site', description: 'Zodiacal light, gegenschein, zodiacal band visible. Milky Way casts shadows.', nakedEyeLimitMag: 7.6 },
  { bortle: 2, label: 'Typical dark site', description: 'Airglow visible. Milky Way highly structured. M33 visible with direct vision.', nakedEyeLimitMag: 7.1 },
  { bortle: 3, label: 'Rural sky', description: 'Some light pollution on horizon. Milky Way still appears complex.', nakedEyeLimitMag: 6.6 },
  { bortle: 4, label: 'Rural/suburban transition', description: 'Light pollution domes visible in several directions. Milky Way visible but lacks detail.', nakedEyeLimitMag: 6.2 },
  { bortle: 5, label: 'Suburban sky', description: 'Milky Way very weak or invisible near horizon. Clouds brighter than sky.', nakedEyeLimitMag: 5.9 },
  { bortle: 6, label: 'Bright suburban sky', description: 'Milky Way only visible near zenith. Sky glows grayish-white.', nakedEyeLimitMag: 5.5 },
  { bortle: 7, label: 'Suburban/urban transition', description: 'Entire sky has grayish-white hue. Milky Way invisible.', nakedEyeLimitMag: 5.0 },
  { bortle: 8, label: 'City sky', description: 'Sky glows white or orange. Only bright constellations recognizable.', nakedEyeLimitMag: 4.5 },
  { bortle: 9, label: 'Inner-city sky', description: 'Only Moon, planets, and a few bright stars visible.', nakedEyeLimitMag: 4.0 },
]

/**
 * Estimate Bortle class from location metadata.
 * Uses location type, notes, and other contextual clues.
 * This is a rough estimate — real Bortle requires a light meter or SQM reading.
 */
export function estimateBortleClass(
  locationType?: string | null,
  notes?: string | null,
  description?: string | null,
  cellSignal?: string | null
): BortleEstimate {
  const text = `${notes ?? ''} ${description ?? ''}`.toLowerCase()
  let bortle = 5 // default: suburban assumption

  // Location type signals
  if (locationType === 'dispersed') bortle = 3
  else if (locationType === 'campground') bortle = 4
  else if (locationType === 'overlook') bortle = 3
  else if (locationType === 'water_access') bortle = 4

  // Text clues that improve the estimate
  if (text.includes('dark sky') || text.includes('dark-sky') || text.includes('bortle')) bortle = Math.min(bortle, 2)
  if (text.includes('remote') || text.includes('wilderness') || text.includes('backcountry')) bortle = Math.min(bortle, 2)
  if (text.includes('no lights') || text.includes('no light pollution')) bortle = Math.min(bortle, 2)
  if (text.includes('national forest') || text.includes('blm land') || text.includes('pisgah') || text.includes('nantahala')) bortle = Math.min(bortle, 3)
  if (text.includes('state park') || text.includes('national park')) bortle = Math.min(bortle, 3)
  if (text.includes('near town') || text.includes('near city') || text.includes('highway')) bortle = Math.max(bortle, 5)
  if (text.includes('urban') || text.includes('downtown')) bortle = Math.max(bortle, 7)

  // Cell signal as a proxy: no signal = likely remote = darker sky
  if (cellSignal === 'none') bortle = Math.min(bortle, 3)
  else if (cellSignal === 'weak') bortle = Math.min(bortle, 4)
  else if (cellSignal === 'strong') bortle = Math.max(bortle, 5)

  return BORTLE_SCALE[bortle - 1]
}

// --- Night Sky Summary ---

/**
 * Build a complete night sky summary for a trip night.
 */
export function getNightSkyInfo(
  date: Date,
  sunrise: string,
  sunset: string
): NightSkyInfo {
  const moonPhase = getMoonPhase(date)
  const goldenHour = getGoldenHour(sunrise, sunset)
  const twilight = getAstronomicalTwilight(sunrise, sunset)

  // Estimate dark hours: time between astronomical dusk and dawn
  const duskMin = parseTimeToMinutes(twilight.dusk)
  const dawnMin = parseTimeToMinutes(twilight.dawn)
  // Dawn is next morning, so dark hours = (midnight - dusk) + dawn
  const darkHours = Math.round(((24 * 60 - duskMin) + dawnMin) / 60 * 10) / 10

  // Stargazing quality based on moon illumination + dark hours
  let quality: NightSkyInfo['stargazingQuality']
  let label: string

  if (moonPhase.illumination <= 10) {
    quality = 'excellent'
    label = `${moonPhase.emoji} ${moonPhase.name} — perfect for stargazing`
  } else if (moonPhase.illumination <= 25) {
    quality = 'good'
    label = `${moonPhase.emoji} ${moonPhase.name} (${moonPhase.illumination}%) — good dark sky window`
  } else if (moonPhase.illumination <= 60) {
    quality = 'fair'
    label = `${moonPhase.emoji} ${moonPhase.name} (${moonPhase.illumination}%) — some moonlight interference`
  } else {
    quality = 'poor'
    label = `${moonPhase.emoji} ${moonPhase.name} (${moonPhase.illumination}%) — bright moonlight, limited stargazing`
  }

  return {
    moonPhase,
    goldenHour,
    astronomicalTwilight: twilight,
    darkHours,
    stargazingQuality: quality,
    stargazingLabel: label,
  }
}

// --- Helpers ---

function parseTimeToMinutes(time: string): number {
  // Parse "6:42 AM" or "7:58 PM" format
  const match = time.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return 0

  let hours = parseInt(match[1], 10)
  const minutes = parseInt(match[2], 10)
  const period = match[3].toUpperCase()

  if (period === 'PM' && hours !== 12) hours += 12
  if (period === 'AM' && hours === 12) hours = 0

  return hours * 60 + minutes
}

function minutesToTimeStr(totalMinutes: number): string {
  // Normalize to 0-1440
  const normalized = ((totalMinutes % 1440) + 1440) % 1440
  const hours24 = Math.floor(normalized / 60)
  const minutes = Math.round(normalized % 60)

  const period = hours24 >= 12 ? 'PM' : 'AM'
  const hours12 = hours24 === 0 ? 12 : hours24 > 12 ? hours24 - 12 : hours24

  return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`
}
