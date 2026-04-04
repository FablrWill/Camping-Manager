import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateDepartureChecklist } from '@/lib/claude'
import { fetchLastStops } from '@/lib/overpass'
import { safeJsonParse } from '@/lib/safe-json'

export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    const checklist = await prisma.departureChecklist.findUnique({
      where: { tripId },
    })

    if (!checklist) {
      return NextResponse.json({ result: null })
    }

    const parsed = safeJsonParse(checklist.result)
    if (!parsed) {
      return NextResponse.json({ error: 'Checklist data corrupted' }, { status: 500 })
    }
    return NextResponse.json({
      result: parsed,
      id: checklist.id,
      generatedAt: checklist.generatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch departure checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch departure checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        packingItems: { include: { gear: true } },
        mealPlan: true,
        vehicle: { include: { mods: true } },
        location: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const packingItems = trip.packingItems.map((item) => ({
      name: item.gear.name,
      category: item.gear.category,
      packed: item.packed,
    }))

    const vehicleMods = trip.vehicle?.mods.map((mod) => ({
      name: mod.name,
      description: mod.description,
    })) ?? []

    // Build a brief power budget summary if trip has battery data
    const powerBudget =
      trip.currentBatteryPct !== null
        ? `Current battery: ${trip.currentBatteryPct}%`
        : null

    // Fetch last-stop names for Claude prompt (non-blocking — silent catch)
    let lastStopNames: string[] = []
    if (trip.location?.latitude != null && trip.location?.longitude != null) {
      try {
        const stops = await fetchLastStops(trip.location.latitude, trip.location.longitude)
        const allStops = [...stops.fuel, ...stops.grocery, ...stops.outdoor]
        lastStopNames = allStops.slice(0, 3).map((s) => s.name)
      } catch {
        // Non-blocking — checklist generates without fuel stops if Overpass fails
      }
    }

    // Format departureTime as human-readable string for Claude prompt
    const departureTimeFormatted = trip.departureTime
      ? trip.departureTime.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        })
      : null

    let result
    try {
      result = await generateDepartureChecklist({
        tripName: trip.name,
        startDate: trip.startDate.toISOString().split('T')[0],
        endDate: trip.endDate.toISOString().split('T')[0],
        packingItems,
        mealPlan: trip.mealPlan ? { result: '' } : null,
        powerBudget,
        vehicleName: trip.vehicle?.name ?? null,
        vehicleMods,
        weatherNotes: trip.weatherNotes ?? null,
        tripNotes: trip.notes ?? null,
        departureTime: departureTimeFormatted,
        lastStopNames,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate checklist'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('Departure checklist Zod validation failed:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    const checklist = await prisma.departureChecklist.upsert({
      where: { tripId },
      create: { tripId, result: JSON.stringify(result) },
      update: { result: JSON.stringify(result), generatedAt: new Date() },
    })

    return NextResponse.json({
      result,
      id: checklist.id,
      generatedAt: checklist.generatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Departure checklist generation failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate departure checklist'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
