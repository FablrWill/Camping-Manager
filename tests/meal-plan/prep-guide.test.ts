import { describe, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealPlan: { findUnique: vi.fn(), update: vi.fn() },
  },
}))
vi.mock('@/lib/claude', () => ({
  generatePrepGuide: vi.fn(),
}))

// Route imports — add after Plan 02 creates the files:
// import { POST } from '@/app/api/trips/[id]/meal-plan/prep-guide/route'

describe('POST /api/trips/:id/meal-plan/prep-guide', () => {
  it.todo('generates prep guide and stores as JSON on MealPlan.prepGuide')
  it.todo('returns 404 when meal plan not found')
  it.todo('includes Will cooking context in Claude prompt')
})
