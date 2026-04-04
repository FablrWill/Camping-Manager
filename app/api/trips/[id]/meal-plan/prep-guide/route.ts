import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

interface PrepEntry {
  mealId: string
  day: number
  slot: string
  mealName: string
  prepNotes: string
}

// GET /api/trips/:id/meal-plan/prep-guide — collect all prepNotes ordered by day/slot
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      include: {
        meals: { orderBy: [{ day: 'asc' }, { slot: 'asc' }] },
      },
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'No meal plan found for this trip' }, { status: 404 })
    }

    const entries: PrepEntry[] = mealPlan.meals
      .filter((meal) => meal.prepNotes && meal.prepNotes.trim().length > 0)
      .map((meal) => ({
        mealId: meal.id,
        day: meal.day,
        slot: meal.slot,
        mealName: meal.name,
        prepNotes: meal.prepNotes as string,
      }))

    return NextResponse.json({ prepGuide: entries })
  } catch (error) {
    console.error('Failed to build prep guide:', error)
    return NextResponse.json({ error: 'Failed to build prep guide' }, { status: 500 })
  }
}
