import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateShoppingList } from '@/lib/claude'

interface MealIngredient {
  item: string
  quantity: string
  unit: string
}

interface ShoppingItem {
  item: string
  quantity: string
  unit: string
  fromMeals: string[]
}

type ShoppingCategory =
  | 'produce'
  | 'protein'
  | 'dairy'
  | 'grains'
  | 'pantry'
  | 'other'

type MatchableCategory = Exclude<ShoppingCategory, 'other'>

const CATEGORY_KEYWORDS: Record<MatchableCategory, string[]> = {
  produce: [
    'apple', 'avocado', 'banana', 'bell pepper', 'broccoli', 'cabbage',
    'carrot', 'celery', 'cherry tomato', 'cilantro', 'corn', 'cucumber',
    'garlic', 'ginger', 'grape', 'green bean', 'herb', 'jalapeño',
    'kale', 'lemon', 'lettuce', 'lime', 'mango', 'mushroom', 'onion',
    'orange', 'parsley', 'peach', 'pepper', 'potato', 'radish',
    'scallion', 'shallot', 'spinach', 'strawberry', 'sweet potato',
    'tomato', 'vegetable', 'zucchini',
  ],
  protein: [
    'bacon', 'beef', 'brat', 'burger', 'chicken', 'chorizo', 'clam',
    'cod', 'deli', 'egg', 'fish', 'ground beef', 'ham', 'hot dog',
    'lamb', 'pork', 'prosciutto', 'salmon', 'sausage', 'shrimp',
    'steak', 'tofu', 'tuna', 'turkey',
  ],
  dairy: [
    'butter', 'cheese', 'cream', 'cream cheese', 'half and half',
    'milk', 'sour cream', 'whipped cream', 'yogurt',
  ],
  grains: [
    'bagel', 'biscuit', 'bread', 'bun', 'burrito', 'couscous',
    'cracker', 'english muffin', 'flour', 'granola', 'naan',
    'oat', 'oatmeal', 'pasta', 'pita', 'quinoa', 'rice',
    'roll', 'rye', 'tortilla', 'wrap',
  ],
  pantry: [
    'almond', 'bean', 'bouillon', 'broth', 'cashew', 'chips', 'chocolate',
    'coconut', 'coffee', 'condiment', 'cookie', 'dried fruit', 'foil',
    'honey', 'hot sauce', 'jam', 'jerky', 'ketchup', 'lentil',
    'maple syrup', 'mustard', 'nut', 'nutella', 'oil', 'olive oil',
    'peanut butter', 'pepper flake', 'pickle', 'popcorn', 'pretzel',
    'ranch', 'salt', 'salsa', 'sauce', 'seasoning', 'spice', 'sriracha',
    'stock', 'sugar', 'sunflower', 'syrup', 'tea', 'trail mix', 'vinegar',
    'walnut', 'water', 'wrap',
  ],
}

function inferCategory(itemName: string): ShoppingCategory {
  const lower = itemName.toLowerCase()
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS) as [MatchableCategory, string[]][]) {
    if (keywords.some((kw) => lower.includes(kw))) {
      return cat
    }
  }
  return 'other'
}

function normalizeMealLabel(day: number, slot: string): string {
  return `Day ${day} ${slot.charAt(0).toUpperCase()}${slot.slice(1)}`
}

// GET /api/trips/:id/meal-plan/shopping-list — aggregate all ingredients, grouped by category
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

    // Aggregate ingredients across all meals
    // Key: normalized item name (lowercase); value: accumulated quantity info
    const itemMap = new Map<string, ShoppingItem>()

    for (const meal of mealPlan.meals) {
      const mealLabel = normalizeMealLabel(meal.day, meal.slot)
      let ingredients: MealIngredient[] = []
      try {
        ingredients = JSON.parse(meal.ingredients) as MealIngredient[]
      } catch {
        continue
      }

      for (const ing of ingredients) {
        if (!ing.item) continue
        const key = ing.item.toLowerCase().trim()
        const existing = itemMap.get(key)

        if (existing) {
          // Append this meal to the fromMeals list (no duplicate)
          const updatedFromMeals = existing.fromMeals.includes(mealLabel)
            ? existing.fromMeals
            : [...existing.fromMeals, mealLabel]

          // Try to sum quantities if units match and quantities are numeric
          let updatedQuantity = existing.quantity
          if (
            existing.unit === ing.unit &&
            !isNaN(parseFloat(existing.quantity)) &&
            !isNaN(parseFloat(ing.quantity))
          ) {
            const sum = parseFloat(existing.quantity) + parseFloat(ing.quantity)
            updatedQuantity = Number.isInteger(sum) ? String(sum) : sum.toFixed(2).replace(/\.?0+$/, '')
          }

          itemMap.set(key, { ...existing, quantity: updatedQuantity, fromMeals: updatedFromMeals })
        } else {
          itemMap.set(key, {
            item: ing.item,
            quantity: ing.quantity,
            unit: ing.unit,
            fromMeals: [mealLabel],
          })
        }
      }
    }

    // Group by category
    const grouped: Record<ShoppingCategory, ShoppingItem[]> = {
      produce: [],
      protein: [],
      dairy: [],
      grains: [],
      pantry: [],
      other: [],
    }

    for (const item of itemMap.values()) {
      const cat = inferCategory(item.item)
      grouped[cat].push(item)
    }

    // Sort each category alphabetically
    for (const cat of Object.keys(grouped) as ShoppingCategory[]) {
      grouped[cat].sort((a, b) => a.item.localeCompare(b.item))
    }

    return NextResponse.json({ shoppingList: grouped })
  } catch (error) {
    console.error('Failed to build shopping list:', error)
    return NextResponse.json({ error: 'Failed to build shopping list' }, { status: 500 })
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
