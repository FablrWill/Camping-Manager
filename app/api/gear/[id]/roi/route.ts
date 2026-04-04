import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface TripSummary {
  id: string
  name: string
  startDate: string | null
}

interface ROIResult {
  price: number | null
  tripCount: number
  costPerTrip: number | null
  trips: TripSummary[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    const gearItem = await prisma.gearItem.findUnique({
      where: { id },
      select: { price: true },
    })

    if (!gearItem) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 })
    }

    // Count distinct trips where this item was actually packed
    const packingItems = await prisma.packingItem.findMany({
      where: { gearId: id, packed: true },
      select: {
        tripId: true,
        trip: {
          select: {
            id: true,
            name: true,
            startDate: true,
          },
        },
      },
    })

    // Deduplicate by tripId (safety — @@unique([tripId, gearId]) should prevent dupes)
    const seenTripIds = new Set<string>()
    const trips: TripSummary[] = []
    for (const item of packingItems) {
      if (!seenTripIds.has(item.tripId)) {
        seenTripIds.add(item.tripId)
        trips.push({
          id: item.trip.id,
          name: item.trip.name,
          startDate: item.trip.startDate?.toISOString() ?? null,
        })
      }
    }

    const tripCount = trips.length
    const price = gearItem.price ?? null
    const costPerTrip =
      price !== null && tripCount > 0
        ? Math.round((price / tripCount) * 100) / 100
        : null

    const result: ROIResult = { price, tripCount, costPerTrip, trips }
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch gear ROI:', error)
    return NextResponse.json({ error: 'Failed to fetch ROI data' }, { status: 500 })
  }
}
