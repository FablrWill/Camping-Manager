import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generatePrepGuide } from '@/lib/claude'

interface MealIngredient {
  item: string
  quantity: string
  unit: string
}

// GET /api/trips/:id/meal-plan/prep-guide — return persisted prep guide from MealPlan.prepGuide
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      select: { prepGuide: true },
    })

    if (!mealPlan) {
      return NextResponse.json({ error: 'No meal plan found for this trip' }, { status: 404 })
    }

    if (!mealPlan.prepGuide) {
      return NextResponse.json({ prepGuide: null })
    }

    try {
      const prepGuide = JSON.parse(mealPlan.prepGuide) as unknown
      return NextResponse.json({ prepGuide })
    } catch {
      return NextResponse.json({ prepGuide: null })
    }
  } catch (error) {
    console.error('Failed to fetch prep guide:', error)
    return NextResponse.json({ error: 'Failed to fetch prep guide' }, { status: 500 })
  }
}

// POST /api/trips/:id/meal-plan/prep-guide — generate via Claude, persist, return guide
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

    const meals = mealPlan.meals.map((meal) => {
      let ingredients: MealIngredient[] = []
      try {
        ingredients = JSON.parse(meal.ingredients) as MealIngredient[]
      } catch {
        ingredients = []
      }
      return {
        day: meal.day,
        slot: meal.slot,
        name: meal.name,
        ingredients,
        cookInstructions: meal.cookInstructions,
        prepNotes: meal.prepNotes,
      }
    })

    const result = await generatePrepGuide({ tripName: trip.name, meals })

    // Persist to MealPlan.prepGuide
    await prisma.mealPlan.update({
      where: { tripId },
      data: { prepGuide: JSON.stringify(result) },
    })

    return NextResponse.json({ prepGuide: result })
  } catch (error) {
    console.error('Failed to generate prep guide:', error)
    return NextResponse.json({ error: 'Failed to generate prep guide' }, { status: 500 })
  }
}
