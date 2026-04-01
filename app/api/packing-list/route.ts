import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePackingList } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'

export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        packingListResult: true,
        packingListGeneratedAt: true,
        packingItems: { select: { gearId: true, packed: true } },
      },
    })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    const packedState: Record<string, boolean> = {}
    for (const item of trip.packingItems) {
      packedState[item.gearId] = item.packed
    }
    return NextResponse.json({
      result: trip.packingListResult ? JSON.parse(trip.packingListResult) : null,
      generatedAt: trip.packingListGeneratedAt?.toISOString() ?? null,
      packedState,
    })
  } catch (error) {
    console.error('Failed to fetch packing list:', error)
    return NextResponse.json({ error: 'Failed to fetch packing list' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json(
        { error: 'tripId is required' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Claude API key not configured' },
        { status: 500 }
      )
    }

    // Fetch trip with relations
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        location: true,
        vehicle: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Fetch all owned gear (exclude wishlist and broken)
    const gearInventory = await prisma.gearItem.findMany({
      where: { isWishlist: false },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        weight: true,
        condition: true,
      },
      orderBy: { category: 'asc' },
    })

    // Calculate trip duration
    const startDate = trip.startDate.toISOString().split('T')[0]
    const endDate = trip.endDate.toISOString().split('T')[0]
    const nights = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fetch weather if location has GPS and trip is within forecast range
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
          weather = {
            days: forecast.days,
            alerts: forecast.alerts,
          }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    // Generate packing list via Claude (throws on Zod validation failure)
    let packingList
    try {
      packingList = await generatePackingList({
        tripName: trip.name,
        startDate,
        endDate,
        nights,
        locationName: trip.location?.name,
        locationType: trip.location?.type ?? undefined,
        vehicleName: trip.vehicle?.name,
        tripNotes: trip.notes ?? undefined,
        gearInventory,
        weather,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate packing list'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('Packing list Zod validation failed:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    // Upsert PackingItems for gear-linked items
    const gearItems = packingList.categories
      .flatMap((cat) => cat.items)
      .filter((item) => item.fromInventory && item.gearId)

    await prisma.$transaction(async (tx) => {
      // Upsert PackingItems for gear-linked items
      for (const item of gearItems) {
        await tx.packingItem.upsert({
          where: { tripId_gearId: { tripId, gearId: item.gearId! } },
          create: { tripId, gearId: item.gearId!, packed: false },
          update: {},
        })
      }

      // D-04: Regeneration resets packed state — new list = clean slate
      await tx.packingItem.updateMany({
        where: { tripId },
        data: { packed: false },
      })

      // Persist packing list result to Trip
      await tx.trip.update({
        where: { id: tripId },
        data: {
          packingListResult: JSON.stringify(packingList),
          packingListGeneratedAt: new Date(),
        },
      })
    })

    return NextResponse.json(packingList)
  } catch (error) {
    console.error('Packing list generation failed:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to generate packing list'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { tripId, result } = await request.json()
    if (!tripId || !result) {
      return NextResponse.json({ error: 'tripId and result are required' }, { status: 400 })
    }

    await prisma.trip.update({
      where: { id: tripId },
      data: { packingListResult: JSON.stringify(result) },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to save packing list:', error)
    return NextResponse.json({ error: 'Failed to save packing list' }, { status: 500 })
  }
}
