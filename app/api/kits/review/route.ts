import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { anthropic } from '@/lib/claude'
import { buildReviewPrompt } from '@/lib/kit-utils'

// POST /api/kits/review — Claude gap analysis for applied kit presets
// Body: { tripId: string, appliedKits: Array<{ name: string, gearIds: string[] }> }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json() as {
      tripId?: unknown
      appliedKits?: unknown
    }

    if (
      typeof body.tripId !== 'string' ||
      !body.tripId ||
      !Array.isArray(body.appliedKits) ||
      body.appliedKits.length === 0
    ) {
      return NextResponse.json(
        { error: 'tripId and appliedKits are required' },
        { status: 400 }
      )
    }

    const tripId = body.tripId
    const rawKits = body.appliedKits as Array<{ name: unknown; gearIds: unknown }>

    // Validate each kit shape
    for (const kit of rawKits) {
      if (typeof kit.name !== 'string' || !Array.isArray(kit.gearIds)) {
        return NextResponse.json(
          { error: 'Each kit must have a name (string) and gearIds (array)' },
          { status: 400 }
        )
      }
    }

    const appliedKits = rawKits as Array<{ name: string; gearIds: string[] }>

    // Load trip context
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Resolve gear names for each kit (send names to Claude, not IDs — keeps prompt human-readable)
    const allGearIds = appliedKits.flatMap(k => k.gearIds)
    const gearItems = await prisma.gearItem.findMany({
      where: { id: { in: allGearIds } },
      select: { id: true, name: true },
    })
    const gearNameMap = new Map(gearItems.map(g => [g.id, g.name]))

    const appliedKitsWithNames = appliedKits.map(k => ({
      name: k.name,
      gearNames: k.gearIds
        .map(id => gearNameMap.get(id))
        .filter((n): n is string => Boolean(n)),
    }))

    // Compute nights
    const nights =
      trip.startDate && trip.endDate
        ? Math.max(
            1,
            Math.ceil(
              (new Date(trip.endDate).getTime() - new Date(trip.startDate).getTime()) /
                86400000
            )
          )
        : 1

    // Use minimal weather summary — full forecast not needed for gap analysis
    const weatherSummary = 'Check weather conditions for trip dates'

    const prompt = buildReviewPrompt({
      appliedKits: appliedKitsWithNames,
      tripName: trip.name,
      nights,
      locationName: trip.location?.name ?? 'Unknown location',
      locationType: trip.location?.type ?? 'campsite',
      weatherSummary,
      bringingDog: trip.bringingDog ?? false,
    })

    const message = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 500,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content
      .filter(block => block.type === 'text')
      .map(block => (block.type === 'text' ? block.text : ''))
      .join('')

    return NextResponse.json({ review: text })
  } catch (error) {
    console.error('Failed to review kits:', error)
    return NextResponse.json(
      { error: 'Review unavailable. Check your connection or try again.' },
      { status: 500 }
    )
  }
}
