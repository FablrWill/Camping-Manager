import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_GEAR_STATUSES = ['used', "didn't need", 'forgot but needed'] as const
type GearUsageStatus = typeof VALID_GEAR_STATUSES[number]

function isValidGearUsageStatus(value: unknown): value is GearUsageStatus {
  return (VALID_GEAR_STATUSES as readonly string[]).includes(value as string)
}

interface GearUsageEntry {
  gearId: string
  usageStatus: GearUsageStatus
}

interface MealFeedbackEntry {
  mealId: string
  mealPlanId: string
  mealName: string
  rating: 'liked' | 'disliked'
  notes?: string
}

interface ReviewBody {
  gearUsage: GearUsageEntry[]
  mealFeedbacks: MealFeedbackEntry[]
  spotRating: number | null
  spotNote: string | null
  tripNotes: string | null
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const body: ReviewBody = await request.json()

    // Validate gearUsage is an array
    if (!Array.isArray(body.gearUsage)) {
      return NextResponse.json({ error: 'gearUsage must be an array' }, { status: 400 })
    }

    // Validate each gearUsage entry
    for (const entry of body.gearUsage) {
      if (!isValidGearUsageStatus(entry.usageStatus)) {
        return NextResponse.json(
          { error: `Invalid usageStatus "${entry.usageStatus}". Must be "used", "didn't need", or "forgot but needed"` },
          { status: 400 }
        )
      }
    }

    // Fetch trip
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { id: true, locationId: true, reviewedAt: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Idempotency guard
    if (trip.reviewedAt) {
      return NextResponse.json({ error: 'Trip already reviewed' }, { status: 409 })
    }

    const mealFeedbacks: MealFeedbackEntry[] = Array.isArray(body.mealFeedbacks) ? body.mealFeedbacks : []
    const spotRating: number | null = body.spotRating ?? null
    const spotNote: string | null = body.spotNote ?? null
    const tripNotes: string | null = body.tripNotes ?? null

    // Atomic transaction: gear usage + meal feedbacks + location + trip
    const updatedTrip = await prisma.$transaction(async (tx) => {
      // REV-03: Update PackingItem.usageStatus for each gear entry
      for (const { gearId, usageStatus } of body.gearUsage) {
        await tx.packingItem.update({
          where: { tripId_gearId: { tripId, gearId } },
          data: { usageStatus },
        })
      }

      // REV-04: Upsert MealFeedback records
      for (const fb of mealFeedbacks) {
        const existing = await tx.mealFeedback.findFirst({
          where: { mealId: fb.mealId, mealPlanId: fb.mealPlanId },
        })
        if (existing) {
          await tx.mealFeedback.update({
            where: { id: existing.id },
            data: { rating: fb.rating, mealName: fb.mealName, notes: fb.notes ?? null },
          })
        } else {
          await tx.mealFeedback.create({
            data: {
              mealId: fb.mealId,
              mealPlanId: fb.mealPlanId,
              mealName: fb.mealName,
              rating: fb.rating,
              notes: fb.notes ?? null,
            },
          })
        }
      }

      // REV-05: Update location rating (only if both locationId and spotRating are present)
      if (spotRating !== null && trip.locationId !== null) {
        await tx.location.update({
          where: { id: trip.locationId },
          data: { rating: spotRating, notes: spotNote ?? undefined },
        })
      }

      // REV-06: Set reviewedAt and replace trip notes
      return tx.trip.update({
        where: { id: tripId },
        data: {
          notes: tripNotes ?? undefined,
          reviewedAt: new Date(),
        },
      })
    })

    return NextResponse.json({ success: true, reviewedAt: updatedTrip.reviewedAt })
  } catch (error) {
    console.error('Failed to submit trip review:', error)
    return NextResponse.json({ error: 'Failed to submit trip review' }, { status: 500 })
  }
}
