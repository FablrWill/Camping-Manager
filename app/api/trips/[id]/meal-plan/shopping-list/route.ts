import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateShoppingList } from '@/lib/claude'

interface MealIngredient {
  item: string
  quantity: string
  unit: string
}

// GET /api/trips/:id/meal-plan/shopping-list — fetch persisted shopping list items
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
      return NextResponse.json({ items: [] })
    }

    const items = await prisma.shoppingListItem.findMany({
      where: { mealPlanId: mealPlan.id },
      orderBy: [{ category: 'asc' }, { item: 'asc' }],
    })

    return NextResponse.json({ items })
  } catch (error) {
    console.error('Failed to fetch shopping list:', error)
    return NextResponse.json({ error: 'Failed to fetch shopping list' }, { status: 500 })
  }
}

// POST /api/trips/:id/meal-plan/shopping-list — generate via Claude, persist, return items
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
      let ingredients: MealIngredient[] = []
      try {
        ingredients = JSON.parse(meal.ingredients) as MealIngredient[]
      } catch {
        ingredients = []
      }
      return { name: meal.name, ingredients }
    })

    const result = await generateShoppingList({ tripName: trip.name, meals })

    // Persist: delete old items, create new ones
    await prisma.$transaction([
      prisma.shoppingListItem.deleteMany({ where: { mealPlanId: mealPlan.id } }),
      prisma.shoppingListItem.createMany({
        data: result.items.map((item) => ({
          mealPlanId: mealPlan.id,
          item: item.item,
          quantity: item.quantity,
          unit: item.unit,
          category: item.category,
          checked: false,
        })),
      }),
    ])

    const savedItems = await prisma.shoppingListItem.findMany({
      where: { mealPlanId: mealPlan.id },
      orderBy: [{ category: 'asc' }, { item: 'asc' }],
    })

    return NextResponse.json({ items: savedItems })
  } catch (error) {
    console.error('Failed to generate shopping list:', error)
    return NextResponse.json({ error: 'Failed to generate shopping list' }, { status: 500 })
  }
}

// POST /api/trips/:id/meal-plan/shopping-list — generate shopping list via Claude
// Consolidates and categorizes ingredients using AI, returns structured list
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
      return { name: meal.name, ingredients }
    })

    const result = await generateShoppingList({ tripName: trip.name, meals })

    return NextResponse.json({ items: result.items })
  } catch (error) {
    console.error('Failed to generate shopping list:', error)
    return NextResponse.json({ error: 'Failed to generate shopping list' }, { status: 500 })
  }
}
