import { describe, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealFeedback: { create: vi.fn(), findMany: vi.fn(), upsert: vi.fn() },
    meal: { findUnique: vi.fn() },
    mealPlan: { findUnique: vi.fn() },
  },
}))

// Route imports — add after Plan 02 creates the files:
// import { GET, POST } from '@/app/api/trips/[id]/meal-plan/feedback/route'

describe('POST /api/trips/:id/meal-plan/feedback', () => {
  it.todo('creates MealFeedback with mealId always set (D-03)')
  it.todo('stores denormalized mealName on feedback row')
  it.todo('accepts rating values: liked, disliked')
  it.todo('saves optional notes text')
  it.todo('returns 400 when mealId missing')
})

describe('GET /api/trips/:id/meal-plan/feedback', () => {
  it.todo('returns all feedback for a meal plan')
  it.todo('returns empty array when no feedback exists')
})
