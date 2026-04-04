import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateMealPlan, anthropic } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'
import { parseClaudeJSON, SingleMealSchema } from '@/lib/parse-claude'

export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }
    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      include: { meals: { orderBy: [{ day: 'asc' }, { slot: 'asc' }] } },
    })
    if (!mealPlan) {
      return NextResponse.json({ result: null, generatedAt: null })
    }
    return NextResponse.json({
      result: mealPlan,
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

    // D-03: Regeneration replaces — upsert persists MealPlan header only
    // Note: Phase 34 Plan 02 will add normalized Meal row persistence
    await prisma.mealPlan.upsert({
      where: { tripId },
      create: { tripId, generatedAt: new Date() },
      update: { generatedAt: new Date() },
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
    const { tripId, day, mealType } = await request.json()

    if (!tripId) return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    if (day === undefined || day === null) return NextResponse.json({ error: 'day is required' }, { status: 400 })
    if (!mealType) return NextResponse.json({ error: 'mealType is required' }, { status: 400 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const mealPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      include: { meals: true },
    })
    if (!mealPlan) {
      return NextResponse.json({ error: 'Meal plan not found' }, { status: 404 })
    }

    const meal = mealPlan.meals.find((m) => m.day === day && m.slot === mealType)
    if (!meal) {
      return NextResponse.json({ error: `No ${mealType} found for day ${day}` }, { status: 404 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `You are a camping meal planner. Generate a single replacement ${mealType} meal for a camping trip.
Trip: ${trip?.name ?? 'camping trip'}
Location: ${trip?.location?.name ?? 'unknown'}
Meal slot: day ${day}, ${mealType}
Current meal being replaced: ${meal.name}

Return a JSON object with this exact shape:
{
  "name": "Meal name",
  "description": "Brief description",
  "ingredients": [{"item": "ingredient", "amount": "quantity"}],
  "cookInstructions": "How to cook at camp",
  "prepNotes": "Any at-home prep notes",
  "estimatedMinutes": 20
}`,
        },
      ],
    })

    const content = response.content[0]
    if (content.type !== 'text') {
      return NextResponse.json({ error: 'Unexpected Claude response type' }, { status: 500 })
    }

    const parsed = parseClaudeJSON(content.text, SingleMealSchema)
    if (!parsed.success) {
      return NextResponse.json({ error: 'Claude returned an invalid meal schema' }, { status: 422 })
    }

    const updated = await prisma.meal.update({
      where: { id: meal.id },
      data: {
        name: parsed.data.name,
        description: parsed.data.description ?? null,
        ingredients: JSON.stringify(parsed.data.ingredients),
        cookInstructions: parsed.data.cookInstructions ?? null,
        prepNotes: parsed.data.prepNotes ?? null,
        estimatedMinutes: parsed.data.estimatedMinutes ?? null,
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Per-meal regeneration failed:', error)
    const message = error instanceof Error ? error.message : 'Failed to regenerate meal'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
