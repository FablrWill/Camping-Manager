import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateMealPlan, anthropic } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'
import { safeJsonParse } from '@/lib/safe-json'
import { parseClaudeJSON, MealPlanMealSchema } from '@/lib/parse-claude'
import type { MealPlanResult } from '@/lib/parse-claude'

export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
    })
    if (!mealPlan) {
      return NextResponse.json({ result: null, generatedAt: null })
    }
    const parsed = safeJsonParse(mealPlan.result)
    if (!parsed) {
      return NextResponse.json({ error: 'Meal plan data corrupted' }, { status: 500 })
    }
    return NextResponse.json({
      result: parsed,
      generatedAt: mealPlan.generatedAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to fetch meal plan:', error)
    return NextResponse.json({ error: 'Failed to fetch meal plan' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    // Fetch trip with relations
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true, vehicle: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Fetch ONLY cooking gear (category === 'cook', not wishlist)
    const cookingGear = await prisma.gearItem.findMany({
      where: { isWishlist: false, category: 'cook' },
      select: {
        id: true,
        name: true,
        brand: true,
        category: true,
        weight: true,
        condition: true,
      },
      orderBy: { name: 'asc' },
    })

    const startDate = trip.startDate.toISOString().split('T')[0]
    const endDate = trip.endDate.toISOString().split('T')[0]
    const nights = Math.ceil(
      (trip.endDate.getTime() - trip.startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // Fetch weather (same logic as packing-list route)
    let weather = undefined
    if (trip.location?.latitude && trip.location?.longitude) {
      const daysOut = Math.ceil(
        (trip.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysOut <= 16) {
        try {
          const forecast = await fetchWeather(
            trip.location.latitude,
            trip.location.longitude,
            startDate,
            endDate
          )
          weather = { days: forecast.days, alerts: forecast.alerts }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    // Generate meal plan via Claude (throws on Zod validation failure)
    let mealPlan
    try {
      mealPlan = await generateMealPlan({
        tripName: trip.name,
        startDate,
        endDate,
        nights,
        people: 1,
        locationName: trip.location?.name,
        vehicleName: trip.vehicle?.name,
        tripNotes: trip.notes ?? undefined,
        cookingGear,
        weather,
        bringingDog: trip.bringingDog,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate meal plan'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('Meal plan Zod validation failed:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    // D-03: Regeneration replaces — upsert persists to MealPlan model
    await prisma.mealPlan.upsert({
      where: { tripId },
      create: { tripId, result: JSON.stringify(mealPlan) },
      update: { result: JSON.stringify(mealPlan), generatedAt: new Date() },
    })

    return NextResponse.json(mealPlan)
  } catch (error) {
    console.error('Meal plan generation failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate meal plan'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripId, day, mealType } = body

    if (!tripId || typeof tripId !== 'string') {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    if (!day || typeof day !== 'number') {
      return NextResponse.json({ error: 'day is required and must be a number' }, { status: 400 })
    }
    const validMealTypes = ['breakfast', 'lunch', 'dinner'] as const
    if (!mealType || !validMealTypes.includes(mealType)) {
      return NextResponse.json({ error: 'mealType must be one of: breakfast, lunch, dinner' }, { status: 400 })
    }

    const existing = await prisma.mealPlan.findUnique({ where: { tripId } })
    if (!existing) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const plan = safeJsonParse(existing.result) as MealPlanResult | null
    if (!plan) {
      return NextResponse.json({ error: 'Meal plan data corrupted' }, { status: 500 })
    }

    const targetDay = plan.days.find((d) => d.dayNumber === day)
    if (!targetDay) {
      return NextResponse.json({ error: 'Day not found in meal plan' }, { status: 404 })
    }

    const currentMeal = targetDay.meals[mealType as typeof validMealTypes[number]]
    if (!currentMeal) {
      return NextResponse.json({ error: 'Meal slot is empty' }, { status: 404 })
    }

    const currentMealName = currentMeal.name

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })

    const prompt = `You are a car camping meal planner. Generate a SINGLE replacement meal.

CONTEXT:
- Trip: ${trip?.name || 'Camping trip'}
- Day ${day} (${targetDay.dayLabel}, ${targetDay.date})
- Meal: ${mealType}
- Currently planned: "${currentMealName}" — the user wants something different.
${trip?.location?.name ? `- Location: ${trip.location.name}` : ''}

INSTRUCTIONS:
- Generate ONE meal to replace the ${mealType} slot
- Keep it practical for car camping
- Make it different from "${currentMealName}"
- Use "home" or "camp" for prepType

Respond ONLY with valid JSON matching this exact structure:
{
  "name": "Meal Name",
  "prepType": "camp",
  "prepNotes": "Brief prep instructions",
  "ingredients": ["ingredient 1", "ingredient 2"],
  "cookwareNeeded": ["pan", "etc"]
}

Do NOT wrap JSON in markdown code blocks.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const text = message.content[0].type === 'text' ? message.content[0].text : ''
    const parseResult = parseClaudeJSON(text, MealPlanMealSchema)
    if (!parseResult.success) {
      return NextResponse.json({ error: parseResult.error }, { status: 422 })
    }
    const newMeal = parseResult.data

    const updatedPlan: MealPlanResult = {
      ...plan,
      days: plan.days.map((d) =>
        d.dayNumber === day
          ? { ...d, meals: { ...d.meals, [mealType]: newMeal } }
          : d
      ),
    }

    await prisma.mealPlan.update({
      where: { tripId },
      data: { result: JSON.stringify(updatedPlan), generatedAt: new Date() },
    })

    return NextResponse.json(newMeal)
  } catch (error) {
    console.error('Per-meal regeneration failed:', error)
    return NextResponse.json({ error: 'Failed to regenerate meal' }, { status: 500 })
  }
}
