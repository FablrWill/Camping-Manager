import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateTripSummary } from '@/lib/claude'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const feedback = await prisma.tripFeedback.findFirst({
      where: { tripId, summary: { not: null } },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ feedback: feedback ?? null })
  } catch (error) {
    console.error('Failed to fetch trip feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch trip feedback' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    // Check for existing summary — prevent duplicate generation (D-03)
    const existing = await prisma.tripFeedback.findFirst({
      where: { tripId, summary: { not: null } },
      orderBy: { createdAt: 'desc' },
    })
    if (existing) {
      return NextResponse.json({ feedback: existing, cached: true })
    }

    // Fetch trip with location + packing items with gear details
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        location: { select: { name: true, rating: true } },
        packingItems: {
          include: { gear: { select: { name: true, category: true } } },
        },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Validate all items have usageStatus (per D-03)
    const itemsWithStatus = trip.packingItems.filter((i) => i.usageStatus !== null)
    if (itemsWithStatus.length < trip.packingItems.length) {
      return NextResponse.json(
        { error: 'Not all packing items have been reviewed' },
        { status: 400 }
      )
    }

    // Generate summary via Claude Haiku
    const result = await generateTripSummary({
      tripName: trip.name,
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      locationName: trip.location?.name,
      currentLocationRating: trip.location?.rating ?? null,
      usageItems: trip.packingItems.map((i) => ({
        name: i.gear.name,
        category: i.gear.category,
        usageStatus: i.usageStatus!,
      })),
    })

    // Store in TripFeedback (append-only per D-06)
    const feedback = await prisma.tripFeedback.create({
      data: {
        tripId,
        summary: JSON.stringify(result),
        status: 'generated',
      },
    })

    return NextResponse.json({ feedback, cached: false })
  } catch (error) {
    console.error('Failed to generate trip summary:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate trip summary'
    if (message.includes('schema mismatch') || message.includes('non-JSON')) {
      return NextResponse.json({ error: message }, { status: 422 })
    }
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
