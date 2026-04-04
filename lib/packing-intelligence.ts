/**
 * Packing Intelligence — S35 Smart Packing v2
 *
 * Builds rich historical context for packing list generation:
 * - Location history from past visits
 * - Seasonal context based on trip month + elevation
 * - Gear skip suggestions from aggregated usage data
 * - Weight note from gear inventory totals
 */

import { prisma } from '@/lib/db'

export interface PackingContext {
  locationHistory?: string   // formatted text block about past trips to this/nearby locations
  seasonalContext?: string   // formatted text block about seasonal patterns at this elevation
  gearSkipSuggestions?: string // formatted text block about gear to deprioritize
  weightNote?: string        // formatted text block about total pack weight
}

const METERS_TO_FEET = 3.28084
const NEARBY_DEGREES = 0.5  // roughly 30 miles
const MAX_SKIP_TRIPS = 10
const DIDNT_NEED_THRESHOLD = 2
const WEIGHT_COMFORT_THRESHOLD_LBS = 35

/**
 * Build a rich PackingContext for a given tripId.
 * All sections are optional — returns {} if no relevant data exists.
 * Never throws — logs errors and returns partial results.
 */
export async function buildPackingContext(tripId: string): Promise<PackingContext> {
  try {
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        startDate: true,
        locationId: true,
        location: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            altitude: true,
            seasonalRatings: {
              select: { season: true, rating: true, notes: true },
            },
          },
        },
      },
    })

    if (!trip) {
      return {}
    }

    const context: PackingContext = {}

    // --- Location history block ---
    if (trip.location) {
      try {
        context.locationHistory = await buildLocationHistory(trip.locationId!, trip.location, tripId)
      } catch (err) {
        console.error('Packing intelligence: location history failed:', err)
      }
    }

    // --- Seasonal context block ---
    if (trip.startDate) {
      try {
        context.seasonalContext = await buildSeasonalContext(trip.startDate, trip.location, tripId)
      } catch (err) {
        console.error('Packing intelligence: seasonal context failed:', err)
      }
    }

    // --- Gear skip suggestions ---
    try {
      context.gearSkipSuggestions = await buildGearSkipSuggestions(tripId)
    } catch (err) {
      console.error('Packing intelligence: gear skip suggestions failed:', err)
    }

    // --- Weight note ---
    try {
      context.weightNote = await buildWeightNote()
    } catch (err) {
      console.error('Packing intelligence: weight note failed:', err)
    }

    // Strip undefined keys to keep the object clean
    return Object.fromEntries(
      Object.entries(context).filter(([, v]) => v !== undefined)
    ) as PackingContext
  } catch (err) {
    console.error('Packing intelligence: buildPackingContext failed:', err)
    return {}
  }
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

interface LocationInfo {
  id: string
  name: string
  latitude: number | null
  longitude: number | null
  altitude: number | null
  seasonalRatings: { season: string; rating: number; notes: string | null }[]
}

async function buildLocationHistory(
  locationId: string,
  location: LocationInfo,
  currentTripId: string
): Promise<string | undefined> {
  // Find all trips at this exact location, or nearby locations
  const nearbyWhere = location.latitude && location.longitude
    ? {
        OR: [
          { locationId },
          {
            location: {
              latitude: {
                gte: location.latitude - NEARBY_DEGREES,
                lte: location.latitude + NEARBY_DEGREES,
              },
              longitude: {
                gte: location.longitude - NEARBY_DEGREES,
                lte: location.longitude + NEARBY_DEGREES,
              },
            },
          },
        ],
      }
    : { locationId }

  const pastTrips = await prisma.trip.findMany({
    where: {
      AND: [
        nearbyWhere,
        { id: { not: currentTripId } },
        { endDate: { not: undefined } },
      ],
    },
    orderBy: { startDate: 'desc' },
    take: 5,
    select: {
      name: true,
      startDate: true,
      endDate: true,
      notes: true,
      location: { select: { name: true } },
    },
  })

  if (pastTrips.length === 0) return undefined

  const visitLines = pastTrips.map((t) => {
    const start = t.startDate.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
    const locLabel = t.location?.name !== location.name ? ` at ${t.location?.name}` : ''
    const notePart = t.notes ? ` — "${t.notes.slice(0, 80)}${t.notes.length > 80 ? '...' : ''}"` : ''
    return `  - ${t.name}${locLabel} (${start})${notePart}`
  })

  const seasonalLines = location.seasonalRatings.length > 0
    ? `\n  Seasonal ratings: ${location.seasonalRatings.map((r) => `${r.season} ${r.rating}/5${r.notes ? ` (${r.notes})` : ''}`).join(', ')}.`
    : ''

  return `Will has camped at or near ${location.name} ${pastTrips.length} time${pastTrips.length !== 1 ? 's' : ''}. Past visits:\n${visitLines.join('\n')}${seasonalLines}`
}

async function buildSeasonalContext(
  startDate: Date,
  location: LocationInfo | null,
  currentTripId: string
): Promise<string | undefined> {
  const month = startDate.getMonth() // 0-indexed
  const monthName = startDate.toLocaleString('en-US', { month: 'long' })

  // Find trips within +/- 1 month (wrapping around year boundaries)
  const prevMonth = (month - 1 + 12) % 12
  const nextMonth = (month + 1) % 12
  const matchMonths = [prevMonth, month, nextMonth]

  // Pull last 20 trips and filter by month client-side (SQLite has no month() function in Prisma)
  const recentTrips = await prisma.trip.findMany({
    where: {
      id: { not: currentTripId },
      endDate: { not: undefined },
    },
    orderBy: { startDate: 'desc' },
    take: 20,
    select: {
      name: true,
      startDate: true,
      notes: true,
      location: { select: { name: true, altitude: true } },
    },
  })

  const seasonalTrips = recentTrips.filter((t) =>
    matchMonths.includes(t.startDate.getMonth())
  )

  const elevationFt = location?.altitude
    ? Math.round(location.altitude * METERS_TO_FEET)
    : null

  const elevationNote = elevationFt ? ` at ${elevationFt.toLocaleString()} ft elevation` : ''

  if (seasonalTrips.length === 0 && !elevationFt) return undefined

  const lines: string[] = []

  if (elevationFt) {
    lines.push(`  - Elevation: ${elevationFt.toLocaleString()} ft. Temperatures can be 15-20°F cooler than valley floor. Pack extra warm layers.`)
  }

  if (seasonalTrips.length > 0) {
    const tripSummaries = seasonalTrips.slice(0, 3).map((t) => {
      const mo = t.startDate.toLocaleString('en-US', { month: 'short' })
      const notePart = t.notes ? `: "${t.notes.slice(0, 60)}${t.notes.length > 60 ? '...' : ''}"` : ''
      return `  - ${t.name} (${mo})${notePart}`
    })
    lines.push(`  Past ${monthName}-season trips:\n${tripSummaries.join('\n')}`)
  }

  return `This trip is in ${monthName}${elevationNote}.\n${lines.join('\n')}`
}

interface GearUsage {
  gearId: string
  gearName: string
  usedCount: number
  didntNeedCount: number
  totalTrips: number
}

async function buildGearSkipSuggestions(currentTripId: string): Promise<string | undefined> {
  const recentTrips = await prisma.trip.findMany({
    where: {
      packingItems: { some: { usageStatus: { not: null } } },
      id: { not: currentTripId },
    },
    orderBy: { endDate: 'desc' },
    take: MAX_SKIP_TRIPS,
    select: {
      id: true,
      packingItems: {
        where: { usageStatus: { not: null } },
        select: {
          gearId: true,
          usageStatus: true,
          gear: { select: { name: true } },
        },
      },
    },
  })

  if (recentTrips.length === 0) return undefined

  const totals: Record<string, GearUsage> = {}
  for (const trip of recentTrips) {
    for (const item of trip.packingItems) {
      if (!item.usageStatus) continue
      if (!totals[item.gearId]) {
        totals[item.gearId] = {
          gearId: item.gearId,
          gearName: item.gear.name,
          usedCount: 0,
          didntNeedCount: 0,
          totalTrips: 0,
        }
      }
      const g = totals[item.gearId]
      const updated: GearUsage = { ...g, totalTrips: g.totalTrips + 1 }
      if (item.usageStatus === 'used') updated.usedCount = g.usedCount + 1
      else if (item.usageStatus === "didn't need") updated.didntNeedCount = g.didntNeedCount + 1
      totals[item.gearId] = updated
    }
  }

  const all = Object.values(totals)
  const neverUsed = all.filter(
    (g) => g.didntNeedCount >= DIDNT_NEED_THRESHOLD && g.usedCount === 0
  )
  const lowPriority = all.filter(
    (g) => g.didntNeedCount >= DIDNT_NEED_THRESHOLD && g.usedCount > 0
  )

  if (neverUsed.length === 0 && lowPriority.length === 0) return undefined

  const lines: string[] = []

  if (neverUsed.length > 0) {
    const skipLines = neverUsed
      .map((g) => `  - ${g.gearName} (brought ${g.didntNeedCount} times, never used)`)
      .join('\n')
    lines.push(`Items to consider skipping:\n${skipLines}`)
  }

  if (lowPriority.length > 0) {
    const lowLines = lowPriority
      .map((g) => `  - ${g.gearName} (used ${g.usedCount} of ${g.totalTrips} times)`)
      .join('\n')
    lines.push(`Low-priority items (used occasionally):\n${lowLines}`)
  }

  return lines.join('\n\n')
}

async function buildWeightNote(): Promise<string | undefined> {
  const gear = await prisma.gearItem.findMany({
    where: { isWishlist: false },
    select: { weight: true },
  })

  const totalLbs = gear.reduce((sum, g) => sum + (g.weight ?? 0), 0)
  if (totalLbs <= 0) return undefined

  const rounded = Math.round(totalLbs * 10) / 10
  const overNote =
    totalLbs > WEIGHT_COMFORT_THRESHOLD_LBS
      ? ` This exceeds the ${WEIGHT_COMFORT_THRESHOLD_LBS} lb comfort threshold — consider leaving heavy non-essentials.`
      : ''

  return `Total gear inventory weight: ${rounded} lbs.${overNote}`
}
