import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { regenerateMeal, type GearItem } from '@/lib/claude'
import { fetchWeather } from '@/lib/weather'

// PATCH /api/trips/:id/meal-plan/meals/:mealId — regenerate single meal
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const { id: tripId, mealId } = await params

    // 1. Find the meal and verify it belongs to this trip
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { mealPlan: true },
    })

    if (!meal || meal.mealPlan.tripId !== tripId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    // 2. Fetch trip context
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true, vehicle: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // 3. Fetch cooking gear
    const cookingGear = await prisma.gearItem.findMany({
      where: { isWishlist: false, category: 'cook' },
      select: { id: true, name: true, brand: true, category: true, weight: true, condition: true },
      orderBy: { name: 'asc' },
    })

    // 4. Fetch weather (if available)
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

    // 5. Call regenerateMeal
    const newMeal = await regenerateMeal({
      day: meal.day,
      slot: meal.slot,
      tripName: trip.name,
      startDate: startDate.toISOString().split('T')[0],
      endDate: endDate.toISOString().split('T')[0],
      locationName: trip.location?.name,
      currentMealName: meal.name,
      cookingGear: cookingGear as GearItem[],
      bringingDog: trip.bringingDog,
      weather,
    })

    // 6. Update the meal row
    const updated = await prisma.meal.update({
      where: { id: mealId },
      data: {
        name: newMeal.name,
        description: newMeal.description ?? null,
        ingredients: JSON.stringify(newMeal.ingredients),
        cookInstructions: newMeal.cookInstructions ?? null,
        prepNotes: newMeal.prepNotes ?? null,
        estimatedMinutes: newMeal.estimatedMinutes ?? null,
      },
    })

    return NextResponse.json({
      meal: { ...updated, ingredients: JSON.parse(updated.ingredients) },
    })
  } catch (error) {
    console.error('Failed to regenerate meal:', error)
    const message = error instanceof Error ? error.message : 'Failed to regenerate meal'
    const status = message.includes('schema mismatch') ? 422 : 500
    return NextResponse.json({ error: message }, { status })
  }
}

// DELETE /api/trips/:id/meal-plan/meals/:mealId — delete single meal
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  try {
    const { id: tripId, mealId } = await params

    // Verify meal belongs to this trip's plan
    const meal = await prisma.meal.findUnique({
      where: { id: mealId },
      include: { mealPlan: true },
    })

    if (!meal || meal.mealPlan.tripId !== tripId) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 })
    }

    await prisma.meal.delete({ where: { id: mealId } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete meal:', error)
    return NextResponse.json({ error: 'Failed to delete meal' }, { status: 500 })
  }
}
