import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_RATINGS = ['loved', 'ok', 'skip', 'liked', 'disliked'] as const
type Rating = (typeof VALID_RATINGS)[number]

function isValidRating(value: unknown): value is Rating {
  return typeof value === 'string' && (VALID_RATINGS as readonly string[]).includes(value)
}

// POST /api/trips/:id/meal-plan/meals/:mealId/feedback — upsert meal rating (legacy endpoint)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const { id: tripId, mealId } = await params

    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { mealPlan: true },
    })

    if (!meal || meal.mealPlan.tripId !== tripId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    const body = await request.json() as { rating?: unknown; note?: unknown; notes?: unknown }

    if (!isValidRating(body.rating)) {
      return NextResponse.json(
        { error: 'rating must be one of: loved, ok, skip, liked, disliked' },
        { status: 400 }
      )
    }

    const notes = typeof body.notes === 'string' ? body.notes.trim() || null
      : typeof body.note === 'string' ? body.note.trim() || null
      : null

    // Find existing feedback for this meal in this plan
    const existing = await prisma.mealFeedback.findFirst({
      where: { mealId, mealPlanId: meal.mealPlanId },
    })

    let feedback
    if (existing) {
      feedback = await prisma.mealFeedback.update({
        where: { id: existing.id },
        data: { rating: body.rating, notes },
      })
    } else {
      feedback = await prisma.mealFeedback.create({
        data: {
          mealId,
          mealPlanId: meal.mealPlanId,
          mealName: meal.name,
          rating: body.rating,
          notes,
        },
      })
    }

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('Failed to save meal feedback:', error)
    return NextResponse.json({ error: 'Failed to save meal feedback' }, { status: 500 })
  }
}
