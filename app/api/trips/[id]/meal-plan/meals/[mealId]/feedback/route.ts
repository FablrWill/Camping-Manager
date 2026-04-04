import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_RATINGS = ['loved', 'ok', 'skip'] as const
type Rating = (typeof VALID_RATINGS)[number]

function isValidRating(value: unknown): value is Rating {
  return typeof value === 'string' && (VALID_RATINGS as readonly string[]).includes(value)
}

// POST /api/trips/:id/meal-plan/meals/:mealId/feedback — upsert meal rating
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const { id: tripId, mealId } = await params

    // Validate meal belongs to this trip
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { mealPlan: true },
    })

    if (!meal || meal.mealPlan.tripId !== tripId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    const body = await request.json() as { rating?: unknown; note?: unknown }

    if (!isValidRating(body.rating)) {
      return NextResponse.json(
        { error: 'rating must be one of: loved, ok, skip' },
        { status: 400 }
      )
    }

    const note = typeof body.note === 'string' ? body.note.trim() || null : null

    // Use a raw upsert — Prisma upsert on @unique field
    const feedback = await prisma.mealFeedback.upsert({
      where: { mealId },
      create: { mealId, rating: body.rating, note },
      update: { rating: body.rating, note },
    })

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Failed to save meal feedback:', error)
    return NextResponse.json({ error: 'Failed to save meal feedback' }, { status: 500 })
  }
}
