import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/trips/:id/meal-plan — fetch plan with all meals
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      include: {
        meals: {
          orderBy: [{ day: 'asc' }, { slot: 'asc' }],
          include: { feedback: true },
        },
      },
    })

    if (!mealPlan) {
      return NextResponse.json({ mealPlan: null })
    }

    // Parse ingredients JSON for each meal
    const mealsWithParsedIngredients = mealPlan.meals.map((meal) => ({
      ...meal,
      ingredients: JSON.parse(meal.ingredients),
    }))

    return NextResponse.json({
      mealPlan: {
        ...mealPlan,
        meals: mealsWithParsedIngredients,
      },
    })
  } catch (error) {
    console.error('Failed to fetch meal plan:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 })
  }
}

// DELETE /api/trips/:id/meal-plan — clear plan (cascade deletes meals)
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    await prisma.mealPlan.delete({
      where: { tripId },
    }).catch(() => {
      // No meal plan exists — that's fine
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal plan:', error)
    return NextResponse.json({ error: 'Failed to delete meal plan' }, { status: 500 })
  }
}
