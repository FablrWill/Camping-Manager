import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db and claude before any imports
vi.mock('@/lib/db', () => ({
  prisma: {
    trip: { findUnique: vi.fn(), update: vi.fn() },
    mealPlan: { findUnique: vi.fn(), upsert: vi.fn(), delete: vi.fn() },
    meal: { findUnique: vi.fn(), createMany: vi.fn(), deleteMany: vi.fn(), update: vi.fn(), delete: vi.fn() },
    gearItem: { findMany: vi.fn() },
    $transaction: vi.fn(),
  },
}))

vi.mock('@/lib/claude', () => ({
  generateMealPlan: vi.fn(),
}))

vi.mock('@/lib/weather', () => ({
  fetchWeather: vi.fn(),
}))

// Route imports — add after Plan 02 creates the files:
// import { POST } from '@/app/api/trips/[id]/meal-plan/generate/route'
// import { GET, DELETE } from '@/app/api/trips/[id]/meal-plan/route'

describe('POST /api/trips/:id/meal-plan/generate', () => {
  // MEAL-01: POST /generate creates MealPlan + Meal rows, updates Trip.mealPlanGeneratedAt
  it.todo('creates MealPlan and Meal rows from Claude response')
  it.todo('updates Trip.mealPlanGeneratedAt after successful generation')
  it.todo('returns 404 when trip not found')
  it.todo('returns 400 when trip has no start or end date')

  // MEAL-02: POST /generate passes bringingDog to generateMealPlan
  it.todo('passes bringingDog=true to generateMealPlan when trip.bringingDog is true')
  it.todo('passes bringingDog=false to generateMealPlan when trip.bringingDog is false')
})

describe('GET /api/trips/:id/meal-plan', () => {
  // MEAL-03: GET /meal-plan returns plan with meals array
  it.todo('returns mealPlan with nested meals array when plan exists')
  it.todo('returns { mealPlan: null } when no plan exists')
  it.todo('parses ingredients JSON string into array of objects')
})

describe('DELETE /api/trips/:id/meal-plan', () => {
  // MEAL-04: DELETE /meal-plan clears MealPlan + cascades Meal rows
  it.todo('deletes MealPlan and returns { success: true }')
  it.todo('returns { success: true } even when no plan exists')
})
