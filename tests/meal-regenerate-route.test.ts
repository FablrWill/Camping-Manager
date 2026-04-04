import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    trip: { findUnique: vi.fn() },
    meal: { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() },
    gearItem: { findMany: vi.fn() },
  },
}))

vi.mock('@/lib/claude', () => ({
  regenerateMeal: vi.fn(),
}))

vi.mock('@/lib/weather', () => ({
  fetchWeather: vi.fn(),
}))

// Route import — add after Plan 02 creates the file:
// import { PATCH, DELETE } from '@/app/api/trips/[id]/meal-plan/meals/[mealId]/route'

describe('PATCH /api/trips/:id/meal-plan/meals/:mealId', () => {
  // MEAL-05: PATCH calls regenerateMeal and updates the Meal row
  it.todo('calls regenerateMeal with correct context and updates meal row')
  it.todo('returns updated meal with parsed ingredients')

  // MEAL-06: PATCH returns 404 when mealId does not belong to trip
  it.todo('returns 404 when meal not found')
  it.todo('returns 404 when meal belongs to a different trip')
})

describe('DELETE /api/trips/:id/meal-plan/meals/:mealId', () => {
  it.todo('deletes a single meal and returns { success: true }')
  it.todo('returns 404 when meal does not belong to trip')
})
