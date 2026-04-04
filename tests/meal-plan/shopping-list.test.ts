import { describe, it, vi } from 'vitest'

vi.mock('@/lib/db', () => ({
  prisma: {
    mealPlan: { findUnique: vi.fn() },
    shoppingListItem: {
      findMany: vi.fn(),
      createMany: vi.fn(),
      deleteMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}))
vi.mock('@/lib/claude', () => ({
  generateShoppingList: vi.fn(),
}))

// Route imports — add after Plan 01 creates the files:
// import { GET, POST } from '@/app/api/trips/[id]/meal-plan/shopping-list/route'
// import { PATCH, DELETE } from '@/app/api/trips/[id]/meal-plan/shopping-list/[itemId]/route'

describe('POST /api/trips/:id/meal-plan/shopping-list', () => {
  it.todo('generates shopping list items from meal plan ingredients via Claude')
  it.todo('returns 404 when meal plan not found')
  it.todo('preserves checked=true items on regeneration by case-insensitive name match (D-07)')
  it.todo('new items start unchecked (D-05)')
})

describe('GET /api/trips/:id/meal-plan/shopping-list', () => {
  it.todo('returns shopping list items grouped by mealPlanId')
  it.todo('returns empty array when no shopping list exists')
})

describe('PATCH /api/trips/:id/meal-plan/shopping-list/:itemId', () => {
  it.todo('toggles checked state for a single item')
  it.todo('returns 404 when item not found')
})

describe('DELETE /api/trips/:id/meal-plan/shopping-list/:itemId', () => {
  it.todo('deletes a single shopping list item')
  it.todo('returns 404 when item not found')
})
