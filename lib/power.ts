/**
 * Power budget calculation logic for Outland OS.
 * Pure math — no Claude API. Called from app/api/power-budget/route.ts.
 *
 * Two modes:
 *  planning — pre-trip forecast, starts battery at 100%
 *  live     — in-trip, starts from Will's entered battery %
 */

import { CATEGORIES } from '@/lib/gear-categories'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PowerDevice {
  id: string
  name: string
  role: 'battery' | 'solar' | 'consumer'
  wattage: number       // W draw (consumers) or peak output (solar) or 0 (battery)
  capacityWh: number    // only meaningful for battery role
  hoursPerDay: number   // daily usage hours (0 for battery/solar)
  whPerDay: number      // derived: wattage × hoursPerDay
  sourceType: 'explicit' | 'parsed' | 'estimated'
  hasBattery: boolean
}

export interface DayPowerBudget {
  date: string
  dayLabel: string
  weatherLabel: string
  weatherEmoji: string
  weatherCode: number
  cloudFactor: number
  peakSunHoursEffective: number
  solarHarvestWh: number
  consumptionWh: number
  netWh: number
  batteryStartWh: number
  batteryEndWh: number
  batteryPercent: number
  status: 'surplus' | 'balanced' | 'deficit' | 'critical'
}

export interface ChargeReminder {
  id: string
  name: string
  category: string
}

export interface LiveAlert {
  level: 'warning' | 'info'
  message: string
}

export interface LiveStatus {
  currentBatteryPct: number
  currentBatteryWh: number
  updatedAt: string           // ISO timestamp
  currentSolarWph: number     // instantaneous solar output estimate in W
  hoursToEmpty: number | null // null = solar exceeding consumption (net positive)
  hoursOfSolarLeft: number
  priorityChargeNow: string[]
  priorityChargeSoon: string[]
  alerts: LiveAlert[]
}

export interface PowerBudgetResult {
  mode: 'planning' | 'live'
  devices: PowerDevice[]
  batteryCapacityWh: number
  solarPanelWatts: number
  days: DayPowerBudget[]
  todayIndex: number | null
  totalSolarWh: number
  totalConsumptionWh: number
  avgDailyConsumptionWh: number
  verdict: 'good' | 'tight' | 'insufficient'
  verdictMessage: string
  tips: string[]
  chargeReminders: ChargeReminder[]
  liveStatus: LiveStatus | null
}

// ─── Gear item shape (subset fetched from DB) ─────────────────────────────────

interface GearItem {
  id: string
  name: string
  brand: string | null
  category: string
  description: string | null
  condition: string | null
  wattage: number | null
  hoursPerDay: number | null
  hasBattery: boolean
}

interface WeatherDay {
  date: string
  dayLabel: string
  highF: number
  lowF: number
  weatherCode: number
  weatherLabel: string
  weatherEmoji: string
  sunrise: string   // "6:42 AM"
  sunset: string    // "7:58 PM"
  precipProbability: number
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE_PEAK_SUN_HOURS = 5.0  // NC/SE US average; good baseline for spring/summer

// First match wins
const CONSUMER_WATTAGE_TABLE: Array<{
  pattern: RegExp
  watts: number
  hoursPerDay: number
}> = [
  { pattern: /starlink/i,                        watts: 30,  hoursPerDay: 12 },
  { pattern: /macbook|laptop|notebook/i,          watts: 65,  hoursPerDay: 10 },
  { pattern: /monitor|display|screen/i,           watts: 40,  hoursPerDay: 10 },
  { pattern: /ipad|tablet/i,                      watts: 20,  hoursPerDay: 4  },
  { pattern: /iphone|android|phone/i,             watts: 15,  hoursPerDay: 2  },
  { pattern: /camera|mirrorless|dslr/i,           watts: 10,  hoursPerDay: 2  },
  { pattern: /gopro|action cam/i,                 watts: 5,   hoursPerDay: 3  },
  { pattern: /light|lamp|lantern/i,               watts: 10,  hoursPerDay: 4  },
  { pattern: /fan/i,                              watts: 25,  hoursPerDay: 6  },
  { pattern: /heater/i,                           watts: 150, hoursPerDay: 4  },
  { pattern: /cpap|bipap/i,                       watts: 30,  hoursPerDay: 8  },
  { pattern: /inreach|communicat|satellite/i,     watts: 1,   hoursPerDay: 24 },
  { pattern: /speaker|audio/i,                    watts: 10,  hoursPerDay: 4  },
  { pattern: /fridge|electric.*cooler/i,          watts: 45,  hoursPerDay: 24 },
  { pattern: /home assistant|ha server|server/i,  watts: 10,  hoursPerDay: 24 },
  { pattern: /hub|smart plug|smart switch/i,      watts: 3,   hoursPerDay: 24 },
  { pattern: /battery bank|power bank/i,          watts: 15,  hoursPerDay: 3  },
]

const CATEGORY_FALLBACK: Record<string, { watts: number; hoursPerDay: number }> = {
  tools: { watts: 15, hoursPerDay: 2 },
  power: { watts: 20, hoursPerDay: 3 },
  electronics: { watts: 5, hoursPerDay: 4 },
  lighting: { watts: 10, hoursPerDay: 6 },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val))
}

function getCloudFactor(weatherCode: number): number {
  if (weatherCode === 0)                        return 0.95
  if (weatherCode === 1)                        return 0.85
  if (weatherCode === 2)                        return 0.65
  if (weatherCode === 3)                        return 0.25
  if (weatherCode >= 45 && weatherCode <= 57)   return 0.15
  if (weatherCode >= 61 && weatherCode <= 67)   return 0.12
  if (weatherCode >= 71 && weatherCode <= 77)   return 0.10
  if (weatherCode >= 80 && weatherCode <= 82)   return 0.15
  if (weatherCode >= 95)                        return 0.10
  return 0.60  // unknown — assume partly cloudy
}

function parseBatteryCapacity(item: GearItem): number {
  const text = `${item.name} ${item.description ?? ''}`
  const match = text.match(/(\d+)\s*Wh/i)
  return match ? parseInt(match[1]) : 500
}

function parseSolarWatts(item: GearItem): number {
  if (item.wattage !== null) return item.wattage
  const match = item.name.match(/(\d+)\s*W\b/i)
  return match ? parseInt(match[1]) : 100
}

function resolveConsumerWattage(item: GearItem): {
  watts: number
  hoursPerDay: number
  sourceType: 'explicit' | 'parsed' | 'estimated'
} {
  // 1. Explicit DB value
  if (item.wattage !== null) {
    return {
      watts: item.wattage,
      hoursPerDay: item.hoursPerDay ?? 4,
      sourceType: 'explicit',
    }
  }

  const text = `${item.name} ${item.description ?? ''}`

  // 2. Parse watt range from description (e.g., "20–40W")
  const rangeMatch = text.match(/(\d+)\s*[–\-]\s*(\d+)\s*W/i)
  if (rangeMatch) {
    const avg = Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2)
    return { watts: avg, hoursPerDay: item.hoursPerDay ?? 4, sourceType: 'parsed' }
  }

  // 3. Parse single watt value from description
  const singleMatch = text.match(/\b(\d+)\s*W\b(?!\s*h)/i)
  if (singleMatch) {
    return { watts: parseInt(singleMatch[1]), hoursPerDay: item.hoursPerDay ?? 4, sourceType: 'parsed' }
  }

  // 4. Pattern lookup table
  for (const entry of CONSUMER_WATTAGE_TABLE) {
    if (entry.pattern.test(text)) {
      return {
        watts: entry.watts,
        hoursPerDay: item.hoursPerDay ?? entry.hoursPerDay,
        sourceType: 'estimated',
      }
    }
  }

  // 5. Category fallback
  const fallback = CATEGORY_FALLBACK[item.category]
  if (fallback) {
    return {
      watts: fallback.watts,
      hoursPerDay: item.hoursPerDay ?? fallback.hoursPerDay,
      sourceType: 'estimated',
    }
  }

  return { watts: 0, hoursPerDay: 0, sourceType: 'estimated' }
}

function getDayStatus(pct: number): DayPowerBudget['status'] {
  if (pct >= 80) return 'surplus'
  if (pct >= 40) return 'balanced'
  if (pct >= 15) return 'deficit'
  return 'critical'
}

/**
 * Parse a formatted time string like "6:42 AM" or "7:58 PM" on a given date
 * and return a Date object. Used for remaining solar window calculation.
 */
function parseTimeOnDate(timeStr: string, dateStr: string): Date {
  // dateStr: "YYYY-MM-DD", timeStr: "7:58 PM"
  const [datePart] = [dateStr]
  const d = new Date(`${datePart}T12:00:00`)
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i)
  if (!match) return d
  let hours = parseInt(match[1])
  const minutes = parseInt(match[2])
  const ampm = match[3].toUpperCase()
  if (ampm === 'PM' && hours !== 12) hours += 12
  if (ampm === 'AM' && hours === 12) hours = 0
  d.setHours(hours, minutes, 0, 0)
  return d
}

// ─── Device classification ────────────────────────────────────────────────────

function classifyDevices(items: GearItem[]): {
  battery: GearItem | null
  solar: GearItem | null
  consumers: GearItem[]
} {
  const battery = items.find(
    (i) =>
      i.category === 'power' &&
      /\d+\s*Wh/i.test(`${i.name} ${i.description ?? ''}`)
  ) ?? null

  const solar = items.find((i) => /solar/i.test(i.name)) ?? null

  const consumers = items.filter(
    (i) =>
      i.id !== battery?.id &&
      i.id !== solar?.id &&
      i.condition !== 'broken' &&
      // Exclude non-electrical categories; electrical categories that can draw power: tools, power, electronics, vehicle, lighting
      !CATEGORIES.filter((c) => !['tools', 'power', 'electronics', 'vehicle', 'lighting'].includes(c.value)).map((c) => c.value as string).includes(i.category)
  )

  return { battery, solar, consumers }
}

// ─── Live status builder ──────────────────────────────────────────────────────

type TripDay = {
  date: string
  dayLabel: string
  weatherCode: number
  weatherLabel: string
  weatherEmoji: string
  sunrise: string
  sunset: string
}

function buildLiveStatus(params: {
  currentBatteryPct: number
  batteryCapacityWh: number
  currentTimeISO: string
  todayForecast: TripDay
  totalConsumptionWhPerDay: number
  solarPanelWatts: number
  chargeReminders: ChargeReminder[]
  batteryUpdatedAt?: string
}): LiveStatus {
  const {
    currentBatteryPct,
    batteryCapacityWh,
    currentTimeISO,
    todayForecast,
    totalConsumptionWhPerDay,
    solarPanelWatts,
    chargeReminders,
    batteryUpdatedAt,
  } = params

  const currentBatteryWh = (currentBatteryPct / 100) * batteryCapacityWh
  const cloudFactor = getCloudFactor(todayForecast.weatherCode)
  const currentSolarWph = solarPanelWatts * cloudFactor

  const now = new Date(currentTimeISO)
  const sunsetDate = parseTimeOnDate(todayForecast.sunset, todayForecast.date)
  const hoursOfSolarLeft = Math.max(0, (sunsetDate.getTime() - now.getTime()) / 3_600_000)

  // Net Wh per hour: positive = charging, negative = draining
  const consumptionWph = totalConsumptionWhPerDay / 24
  const netWph = currentSolarWph - consumptionWph
  const hoursToEmpty = netWph >= 0 ? null : currentBatteryWh / Math.abs(netWph)

  // Priority charge lists
  const priorityChargeNow: string[] = []
  const priorityChargeSoon: string[] = []

  if (currentBatteryPct < 30) {
    chargeReminders.forEach((r) => priorityChargeNow.push(r.name))
  } else if (currentBatteryPct < 60) {
    chargeReminders.forEach((r) => priorityChargeSoon.push(r.name))
  }

  // Alerts
  const alerts: LiveAlert[] = []

  if (currentBatteryPct < 15) {
    alerts.push({ level: 'warning', message: 'Battery critical — start the car or cut Starlink now' })
  } else if (currentBatteryPct < 30) {
    alerts.push({ level: 'warning', message: `Battery at ${Math.round(currentBatteryPct)}% — consider charging from the car` })
  }

  if (hoursToEmpty !== null && hoursToEmpty < 4) {
    alerts.push({ level: 'warning', message: `At current draw, battery runs out in ~${Math.round(hoursToEmpty)}h` })
  }

  if (hoursOfSolarLeft < 1 && currentBatteryPct < 50) {
    alerts.push({ level: 'info', message: 'Solar window closing soon — harvest what you can before sunset' })
  }

  if (cloudFactor < 0.3) {
    alerts.push({ level: 'info', message: 'Heavy cloud cover — solar output is minimal right now' })
  }

  return {
    currentBatteryPct,
    currentBatteryWh,
    updatedAt: batteryUpdatedAt ?? currentTimeISO,
    currentSolarWph,
    hoursToEmpty,
    hoursOfSolarLeft,
    priorityChargeNow,
    priorityChargeSoon,
    alerts,
  }
}

// ─── Verdict + tips ───────────────────────────────────────────────────────────

function deriveVerdict(
  days: DayPowerBudget[],
  batteryCapacityWh: number,
  solarPanelWatts: number,
  mode: 'planning' | 'live'
): { verdict: PowerBudgetResult['verdict']; verdictMessage: string; tips: string[] } {
  const hasCritical = days.some((d) => d.status === 'critical')
  const hasDeficit = days.some((d) => d.status === 'deficit')
  const lastDay = days[days.length - 1]
  const endPct = lastDay ? Math.round(lastDay.batteryPercent) : 100

  const verdict: PowerBudgetResult['verdict'] = hasCritical
    ? 'insufficient'
    : hasDeficit
    ? 'tight'
    : 'good'

  let verdictMessage = ''
  if (verdict === 'good') {
    verdictMessage = `Battery ends the trip at ${endPct}% — you're well covered.`
  } else if (verdict === 'tight') {
    const worstDay = days.reduce((a, b) => a.batteryPercent < b.batteryPercent ? a : b)
    verdictMessage = `Battery dips to ${Math.round(worstDay.batteryPercent)}% on ${worstDay.dayLabel}. Charge from the car if needed.`
  } else {
    const criticalDay = days.find((d) => d.status === 'critical')
    verdictMessage = `Battery runs critically low on ${criticalDay?.dayLabel ?? 'a trip day'}. Reduce Starlink hours or charge from the car.`
  }

  const tips: string[] = []

  if (mode === 'planning') {
    tips.push('Charge the EcoFlow to 100% before you leave — it\'s in your prep checklist below')
    tips.push('The Santa Fe\'s 12V outlet (via BESTEK inverter) can add ~300Wh on the drive up')
  }

  const cloudyDays = days.filter((d) => d.cloudFactor < 0.3)
  if (cloudyDays.length > 0) {
    const worst = cloudyDays.reduce((a, b) => a.cloudFactor < b.cloudFactor ? a : b)
    tips.push(`Heavy clouds forecast ${worst.dayLabel} — solar harvest will be minimal. Lean on the car charger or reduce device hours.`)
  }

  if (verdict === 'good' && endPct > 50) {
    tips.push('You\'ll have extra power — top off your phone, camera, and portable banks each morning')
  }

  if (verdict !== 'good') {
    tips.push('Limit Starlink to active use periods to reclaim ~30Wh per hour saved')
  }

  return { verdict, verdictMessage, tips }
}

// ─── Main entry point ─────────────────────────────────────────────────────────

export function calculatePowerBudget(params: {
  gearItems: GearItem[]
  weather?: { days: WeatherDay[] }
  nights: number
  startDate: string
  currentBatteryPct?: number
  currentTimeISO?: string
  batteryUpdatedAt?: string
}): PowerBudgetResult {
  const { gearItems, weather, nights, startDate, currentBatteryPct, currentTimeISO, batteryUpdatedAt } = params

  // ── 1. Classify gear ──
  const { battery, solar, consumers } = classifyDevices(gearItems)

  const batteryCapacityWh = battery ? parseBatteryCapacity(battery) : 0
  const solarPanelWatts = solar ? parseSolarWatts(solar) : 0

  // ── 2. Build device list ──
  const devices: PowerDevice[] = []

  if (battery) {
    devices.push({
      id: battery.id,
      name: battery.name,
      role: 'battery',
      wattage: 0,
      capacityWh: batteryCapacityWh,
      hoursPerDay: 0,
      whPerDay: 0,
      sourceType: 'parsed',
      hasBattery: battery.hasBattery,
    })
  }

  if (solar) {
    devices.push({
      id: solar.id,
      name: solar.name,
      role: 'solar',
      wattage: solarPanelWatts,
      capacityWh: 0,
      hoursPerDay: 0,
      whPerDay: 0,
      sourceType: solar.wattage !== null ? 'explicit' : 'parsed',
      hasBattery: false,
    })
  }

  let totalConsumptionWhPerDay = 0
  for (const item of consumers) {
    const { watts, hoursPerDay, sourceType } = resolveConsumerWattage(item)
    if (watts === 0) continue
    const whPerDay = watts * hoursPerDay
    totalConsumptionWhPerDay += whPerDay
    devices.push({
      id: item.id,
      name: item.name,
      role: 'consumer',
      wattage: watts,
      capacityWh: 0,
      hoursPerDay,
      whPerDay,
      sourceType,
      hasBattery: item.hasBattery,
    })
  }

  // ── 3. Charge reminders (hasBattery=true, not the main battery source) ──
  const chargeReminders: ChargeReminder[] = gearItems
    .filter((i) => i.hasBattery && i.id !== battery?.id)
    .map((i) => ({ id: i.id, name: i.name, category: i.category }))

  // ── 4. Determine mode + starting battery ──
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tripStart = new Date(startDate + 'T00:00:00')

  const isLiveMode =
    currentBatteryPct !== undefined &&
    currentBatteryPct !== null &&
    today >= tripStart

  const mode: 'planning' | 'live' = isLiveMode ? 'live' : 'planning'

  const startingBatteryWh = isLiveMode
    ? (currentBatteryPct! / 100) * batteryCapacityWh
    : batteryCapacityWh  // 100% for planning

  // ── 5. Build weather day array (one entry per trip day) ──
  // Create a day entry for each trip day, with or without weather data
  const tripDays: TripDay[] = []

  for (let i = 0; i <= nights; i++) {
    const d = new Date(tripStart)
    d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' })

    const wxDay = weather?.days.find((w) => w.date === dateStr)
    tripDays.push({
      date: dateStr,
      dayLabel,
      weatherCode: wxDay?.weatherCode ?? 2,   // partly cloudy fallback
      weatherLabel: wxDay?.weatherLabel ?? 'Partly cloudy',
      weatherEmoji: wxDay?.weatherEmoji ?? '⛅',
      sunrise: wxDay?.sunrise ?? '6:30 AM',
      sunset: wxDay?.sunset ?? '7:30 PM',
    })
  }

  // ── 6. Find today's index ──
  const todayStr = today.toISOString().split('T')[0]
  const todayIndex = mode === 'live'
    ? (tripDays.findIndex((d) => d.date === todayStr) ?? null)
    : null

  // ── 7. Per-day budget calculation ──
  const days: DayPowerBudget[] = []
  let batteryWh = startingBatteryWh
  let totalSolarWh = 0
  let totalConsumptionWh = 0

  for (let i = 0; i < tripDays.length; i++) {
    const td = tripDays[i]
    const cloudFactor = getCloudFactor(td.weatherCode)

    // In live mode: for today, use remaining sun hours instead of full day
    let effectiveSunHours = BASE_PEAK_SUN_HOURS * cloudFactor

    if (mode === 'live' && i === todayIndex && currentTimeISO) {
      const now = new Date(currentTimeISO)
      const sunset = parseTimeOnDate(td.sunset, td.date)
      const sunriseDate = parseTimeOnDate(td.sunrise, td.date)
      const remainingHours = Math.max(0, (sunset.getTime() - now.getTime()) / 3_600_000)
      const totalDaylightHours = Math.max(1, (sunset.getTime() - sunriseDate.getTime()) / 3_600_000)
      // Scale effective sun hours proportionally to remaining daylight
      effectiveSunHours = BASE_PEAK_SUN_HOURS * cloudFactor * (remainingHours / totalDaylightHours)
    }

    const solarHarvestWh = solarPanelWatts * effectiveSunHours
    const consumptionWh = totalConsumptionWhPerDay

    const netWh = solarHarvestWh - consumptionWh
    const newBatteryWh = clamp(batteryWh + netWh, 0, batteryCapacityWh)
    const batteryPercent = batteryCapacityWh > 0
      ? (newBatteryWh / batteryCapacityWh) * 100
      : 0

    days.push({
      date: td.date,
      dayLabel: td.dayLabel,
      weatherLabel: td.weatherLabel,
      weatherEmoji: td.weatherEmoji,
      weatherCode: td.weatherCode,
      cloudFactor,
      peakSunHoursEffective: effectiveSunHours,
      solarHarvestWh,
      consumptionWh,
      netWh,
      batteryStartWh: batteryWh,
      batteryEndWh: newBatteryWh,
      batteryPercent: clamp(batteryPercent, 0, 100),
      status: getDayStatus(batteryPercent),
    })

    totalSolarWh += solarHarvestWh
    totalConsumptionWh += consumptionWh
    batteryWh = newBatteryWh
  }

  // ── 8. Verdict + tips ──
  const { verdict, verdictMessage, tips } = deriveVerdict(days, batteryCapacityWh, solarPanelWatts, mode)

  // ── 9. Live status (only in live mode) ──
  let liveStatus: LiveStatus | null = null
  if (mode === 'live' && todayIndex !== null && currentBatteryPct !== undefined) {
    const todayForecast = tripDays[todayIndex]
    liveStatus = buildLiveStatus({
      currentBatteryPct: currentBatteryPct!,
      batteryCapacityWh,
      currentTimeISO: currentTimeISO!,
      todayForecast,
      totalConsumptionWhPerDay,
      solarPanelWatts,
      chargeReminders,
      batteryUpdatedAt,
    })
  }

  return {
    mode,
    devices,
    batteryCapacityWh,
    solarPanelWatts,
    days,
    todayIndex,
    totalSolarWh,
    totalConsumptionWh,
    avgDailyConsumptionWh: days.length > 0 ? totalConsumptionWh / days.length : 0,
    verdict,
    verdictMessage,
    tips,
    chargeReminders,
    liveStatus,
  }
}
