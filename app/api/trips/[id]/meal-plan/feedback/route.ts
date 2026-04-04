import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/trips/:id/meal-plan/feedback — list all feedback for this trip's meal plan
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      select: { id: true },
    })

    if (!mealPlan) {
      return NextResponse.json({ feedbacks: [] })
    }

    const feedbacks = await prisma.mealFeedback.findMany({
      where: { mealPlanId: mealPlan.id },
      orderBy: { createdAt: 'desc' },
    })

    return NextResponse.json({ feedbacks })
  } catch (error) {
    console.error('Failed to fetch meal feedback:', error)
    return NextResponse.json({ error: 'Failed to fetch meal feedback' }, { status: 500 })
  }
}

// POST /api/trips/:id/meal-plan/feedback — save or update feedback for a meal
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const body = await request.json() as {
      mealId?: string
      mealName?: string
      rating?: string
      notes?: string
    }

    const { mealId, mealName, rating, notes } = body

    if (!mealId) {
      return NextResponse.json({ error: 'mealId is required' }, { status: 400 })
    }
    if (!mealName) {
      return NextResponse.json({ error: 'mealName is required' }, { status: 400 })
    }
    if (rating !== 'liked' && rating !== 'disliked') {
      return NextResponse.json(
        { error: 'rating must be "liked" or "disliked"' },
        { status: 400 }
      )
    }

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      select: { id: true },
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'No meal plan found for this trip' }, { status: 404 })
    }

    // Find existing feedback for this meal in this plan
    const existing = await prisma.mealFeedback.findFirst({
      where: { mealId, mealPlanId: mealPlan.id },
    })

    if (existing) {
      const updated = await prisma.mealFeedback.update({
        where: { id: existing.id },
        data: { rating, notes: notes ?? null, mealName },
      })
      return NextResponse.json(updated)
    } else {
      const created = await prisma.mealFeedback.create({
        data: {
          mealId,
          mealPlanId: mealPlan.id,
          mealName,
          rating,
          notes: notes ?? null,
        },
      })
      return NextResponse.json(created, { status: 201 })
    }
  } catch (error) {
    console.error('Failed to save meal feedback:', error)
    return NextResponse.json({ error: 'Failed to save meal feedback' }, { status: 500 })
  }
}
