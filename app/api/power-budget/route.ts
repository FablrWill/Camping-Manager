import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { calculatePowerBudget } from '@/lib/power'
import { fetchWeather } from '@/lib/weather'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripId, currentBatteryPct } = body as {
      tripId: string
      currentBatteryPct?: number
    }

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    // Persist battery level if provided
    if (currentBatteryPct !== undefined && currentBatteryPct !== null) {
      await prisma.trip.update({
        where: { id: tripId },
        data: {
          currentBatteryPct,
          batteryUpdatedAt: new Date(),
        },
      })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Determine effective battery %:
    // freshly-submitted → persisted → undefined (planning mode)
    const effectiveBatteryPct =
      currentBatteryPct !== undefined
        ? currentBatteryPct
        : trip.currentBatteryPct !== null
        ? trip.currentBatteryPct
        : undefined

    // Fetch gear: power/tools category + anything with explicit wattage or hasBattery
    const gearItems = await prisma.gearItem.findMany({
      where: {
        isWishlist: false,
        NOT: { condition: 'broken' },
        OR: [
          { category: { in: ['power', 'tools'] } },
          { wattage: { not: null } },
          { hasBattery: true },
        ],
      },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        description: true,
        condition: true,
        wattage: true,
        hoursPerDay: true,
        hasBattery: true,
      },
      orderBy: { name: 'asc' },
    })

    const startDate = trip.startDate.toISOString().split('T')[0]
    const endDate = trip.endDate.toISOString().split('T')[0]
    const nights = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fetch weather (same pattern as packing-list and meal-plan routes)
    let weather = undefined
    if (trip.location?.latitude && trip.location?.longitude) {
      const daysOut = Math.ceil(
        (trip.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysOut <= 16) {
        try {
          const forecast = await fetchWeather(
            trip.location.latitude,
            trip.location.longitude,
            startDate,
            endDate
          )
          weather = { days: forecast.days }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    const result = calculatePowerBudget({
      gearItems,
      weather,
      nights,
      startDate,
      currentBatteryPct: effectiveBatteryPct,
      currentTimeISO: new Date().toISOString(),
      batteryUpdatedAt: trip.batteryUpdatedAt?.toISOString(),
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Power budget calculation failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to calculate power budget'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
