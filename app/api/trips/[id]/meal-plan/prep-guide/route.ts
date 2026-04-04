import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePrepGuide } from '@/lib/claude'

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

// POST /api/trips/:id/meal-plan/prep-guide — generate prep guide via Claude
// Splits meal prep into home (beforeLeave) and camp (atCamp) steps
export async function POST(
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

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: { name: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Parse ingredients from each meal
    const meals = mealPlan.meals.map((meal) => {
      let ingredients: Array<{ item: string; quantity: string; unit: string }> = []
      try {
        ingredients = JSON.parse(meal.ingredients) as typeof ingredients
      } catch {
        ingredients = []
      }
      return {
        day: meal.day,
        slot: meal.slot,
        name: meal.name,
        ingredients,
        cookInstructions: meal.cookInstructions ?? null,
        prepNotes: meal.prepNotes ?? null,
      }
    })

    const result = await generatePrepGuide({ tripName: trip.name, meals })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to generate prep guide:', error)
    return NextResponse.json({ error: 'Failed to generate prep guide' }, { status: 500 })
  }
}
