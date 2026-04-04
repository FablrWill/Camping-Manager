import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateMealPlan, type GearItem } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'

// POST /api/trips/:id/meal-plan/generate — generate full meal plan via Claude
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    // 1. Fetch trip with location and vehicle
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true, vehicle: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (!trip.startDate || !trip.endDate) {
      return NextResponse.json({ error: 'Trip must have start and end dates' }, { status: 400 })
    }

    // 2. Fetch cooking gear
    const cookingGear = await prisma.gearItem.findMany({
      where: { isWishlist: false, category: 'cook' },
      select: { id: true, name: true, brand: true, category: true, weight: true, condition: true },
      orderBy: { name: 'asc' },
    })

    // 3. Fetch weather if within 16 days and coordinates exist
    const startDate = trip.startDate instanceof Date ? trip.startDate : new Date(trip.startDate)
    const endDate = trip.endDate instanceof Date ? trip.endDate : new Date(trip.endDate)
    let weather = undefined
    if (trip.location?.latitude && trip.location?.longitude) {
      const daysOut = Math.ceil(
        (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      )
      if (daysOut <= 16) {
        try {
          const forecast = await fetchWeather(
            trip.location.latitude,
            trip.location.longitude,
            startDate.toISOString().split('T')[0],
            endDate.toISOString().split('T')[0]
          )
          weather = { days: forecast.days, alerts: forecast.alerts }
        } catch (err) {
          console.error('Weather fetch failed (non-blocking):', err)
        }
      }
    }

    // 4. Calculate nights
    const nights = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
    )

    // 5. Fetch prior meal feedback from previous plans for this trip (non-blocking)
    let feedbackHistory: string | undefined
    try {
      const mealPlanRecord = await prisma.mealPlan.findUnique({
        where: { tripId },
        select: { id: true },
      })
      if (mealPlanRecord) {
        const priorFeedback = await prisma.mealFeedback.findMany({
          where: { mealPlanId: mealPlanRecord.id },
          orderBy: { createdAt: 'desc' },
          take: 10,
        })
        if (priorFeedback.length > 0) {
          const liked = priorFeedback.filter((f) => f.rating === 'liked' || f.rating === 'loved').map((f) => f.mealName)
          const disliked = priorFeedback.filter((f) => f.rating === 'disliked' || f.rating === 'skip')
          const lines: string[] = []
          if (liked.length > 0) lines.push(`Previously liked: ${liked.join(', ')}.`)
          if (disliked.length > 0) {
            const parts = disliked.map((f) => f.notes ? `${f.mealName} (${f.notes})` : f.mealName)
            lines.push(`Previously disliked: ${parts.join(', ')}.`)
          }
          if (lines.length > 0) feedbackHistory = `Will's meal history:\n${lines.join('\n')}`
        }
      }
    } catch (err) {
      console.error('Feedback fetch failed (non-blocking):', err)
    }

    // 6. Call Claude generateMealPlan with bringingDog and feedback history
    const result = await generateMealPlan({
      tripName: trip.name,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      nights,
      people: 1,
      locationName: trip.location?.name,
      vehicleName: trip.vehicle?.name,
      tripNotes: trip.notes ?? undefined,
      cookingGear: cookingGear as GearItem[],
      weather,
      bringingDog: trip.bringingDog,
      feedbackHistory,
    })

    // 7. Map Claude result to Meal rows
    const mealRows: {
      day: number
      slot: string
      name: string
      description: string | null
      ingredients: string
      cookInstructions: string | null
      prepNotes: string | null
      estimatedMinutes: number | null
    }[] = []

    for (const dayData of result.days) {
      const { dayNumber, meals } = dayData
      if (meals.breakfast) {
        mealRows.push({
          day: dayNumber,
          slot: 'breakfast',
          name: meals.breakfast.name,
          description: meals.breakfast.description ?? null,
          ingredients: JSON.stringify(meals.breakfast.ingredients),
          cookInstructions: meals.breakfast.cookInstructions ?? null,
          prepNotes: meals.breakfast.prepNotes ?? null,
          estimatedMinutes: meals.breakfast.estimatedMinutes ?? null,
        })
      }
      if (meals.lunch) {
        mealRows.push({
          day: dayNumber,
          slot: 'lunch',
          name: meals.lunch.name,
          description: meals.lunch.description ?? null,
          ingredients: JSON.stringify(meals.lunch.ingredients),
          cookInstructions: meals.lunch.cookInstructions ?? null,
          prepNotes: meals.lunch.prepNotes ?? null,
          estimatedMinutes: meals.lunch.estimatedMinutes ?? null,
        })
      }
      if (meals.dinner) {
        mealRows.push({
          day: dayNumber,
          slot: 'dinner',
          name: meals.dinner.name,
          description: meals.dinner.description ?? null,
          ingredients: JSON.stringify(meals.dinner.ingredients),
          cookInstructions: meals.dinner.cookInstructions ?? null,
          prepNotes: meals.dinner.prepNotes ?? null,
          estimatedMinutes: meals.dinner.estimatedMinutes ?? null,
        })
      }
      // Snacks as a single meal row per day
      if (meals.snacks && meals.snacks.length > 0) {
        mealRows.push({
          day: dayNumber,
          slot: 'snack',
          name: meals.snacks.join(', '),
          description: null,
          ingredients: JSON.stringify([]),
          cookInstructions: null,
          prepNotes: null,
          estimatedMinutes: null,
        })
      }
    }

    // 8. Persist: upsert MealPlan header, delete old meals, create new meals, update Trip
    const now = new Date()
    await prisma.$transaction(async (tx) => {
      // Upsert MealPlan header
      const mealPlan = await tx.mealPlan.upsert({
        where: { tripId },
        create: { tripId, generatedAt: now },
        update: { generatedAt: now },
      })

      // Delete existing meals for this plan
      await tx.meal.deleteMany({ where: { mealPlanId: mealPlan.id } })

      // Create new meal rows
      if (mealRows.length > 0) {
        await tx.meal.createMany({
          data: mealRows.map((row) => ({
            ...row,
            mealPlanId: mealPlan.id,
          })),
        })
      }

      // Update Trip.mealPlanGeneratedAt
      await tx.trip.update({
        where: { id: tripId },
        data: { mealPlanGeneratedAt: now },
      })
    })

    // 9. Fetch and return the complete plan
    const savedPlan = await prisma.mealPlan.findUnique({
      where: { tripId },
      include: {
        meals: {
          orderBy: [{ day: 'asc' }, { slot: 'asc' }],
          include: { feedbacks: { orderBy: { createdAt: 'desc' }, take: 1 } },
        },
      },
    })

    return NextResponse.json(
      {
        mealPlan: savedPlan
          ? {
              ...savedPlan,
              meals: savedPlan.meals.map((m) => ({
                ...m,
                ingredients: JSON.parse(m.ingredients) as unknown,
                feedback: m.feedbacks[0] ?? null,
              })),
            }
          : null,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to generate meal plan:', error)
    const message = error instanceof Error ? error.message : 'Failed to generate meal plan'
    const status = message.includes('schema mismatch') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}
