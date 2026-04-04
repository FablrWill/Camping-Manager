import { describe, it, expect } from 'vitest'
// Schema imports — add after Plan 01 creates them:
// import { NormalizedIngredientSchema, SingleMealSchema, NormalizedMealPlanResultSchema } from '@/lib/parse-claude'

describe('NormalizedIngredientSchema', () => {
  // MEAL-07: validates ingredient shape
  it.todo('accepts valid ingredient with item, quantity, and unit')
  it.todo('defaults unit to empty string when omitted')
  it.todo('rejects ingredient missing item field')
  it.todo('rejects ingredient missing quantity field')
})

describe('SingleMealSchema', () => {
  // MEAL-07: validates single meal shape for regenerateMeal output
  it.todo('accepts valid meal with all fields')
  it.todo('accepts meal with only required fields (name + ingredients)')
  it.todo('rejects meal without name')
  it.todo('rejects meal with string[] ingredients instead of object[]')
})

describe('NormalizedMealPlanResultSchema', () => {
  // MEAL-07: validates full meal plan response shape
  it.todo('accepts valid meal plan with days array')
  it.todo('rejects empty object')
})
