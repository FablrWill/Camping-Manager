import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePackingList } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'

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

    // Generate packing list via Claude
    const packingList = await generatePackingList({
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

    return NextResponse.json(packingList)
  } catch (error) {
    console.error('Packing list generation failed:', error)
    const message =
      error instanceof Error ? error.message : 'Failed to generate packing list'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
