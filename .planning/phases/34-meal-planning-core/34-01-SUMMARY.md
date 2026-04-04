---
plan: 34-01
phase: 34-meal-planning-core
status: complete
completed: 2026-04-04
self_check: PASSED
---

# Plan 34-01: Dog-aware meal planning + meal plan status badge

## What Was Built

- **`lib/claude.ts`**: Added `bringingDog?: boolean` to `generateMealPlan` params. When true, injects a `DOG ON TRIP:` section into the Claude prompt advising it to avoid foods toxic to dogs (onions, garlic, grapes, chocolate, xylitol) and suggesting a dog-friendly snack tip.
- **`app/api/meal-plan/route.ts`**: POST handler now passes `bringingDog: trip.bringingDog` to `generateMealPlan`. Added imports for `anthropic`, `parseClaudeJSON`, `MealPlanMealSchema`, and `MealPlanResult` (needed for plan 34-02 PATCH handler in same file).
- **`app/trips/page.tsx`**: Added `mealPlan: { select: { id: true } }` to trip query include. Added `hasMealPlan: !!t.mealPlan` to serialization map.
- **`components/TripCard.tsx`**: Added `hasMealPlan: boolean` to `TripData` interface. Added `🍽️ Meal plan` badge in the collapsed stats row — only visible when a plan exists; silence = no plan.
- **`components/TripsClient.tsx`**: Added `hasMealPlan: boolean` to the local `TripData` interface to keep types in sync.

## Commits

- `d7cebbf` feat(34-01): add bringingDog to generateMealPlan and pass from meal-plan route
- `f78f845` feat(34-01): add hasMealPlan badge to TripCard and mealPlan include to trips query

## Key Files

key-files.created: []
key-files.modified:
  - lib/claude.ts
  - app/api/meal-plan/route.ts
  - app/trips/page.tsx
  - components/TripCard.tsx
  - components/TripsClient.tsx

## Deviations

None. Implemented exactly per plan spec.

## Self-Check

- [x] `generateMealPlan` accepts `bringingDog?: boolean`
- [x] Claude prompt includes `DOG ON TRIP:` conditional section with toxic food list
- [x] Meal plan route passes `bringingDog: trip.bringingDog` to generateMealPlan
- [x] `app/trips/page.tsx` queries `mealPlan: { select: { id: true } }`
- [x] `hasMealPlan: !!t.mealPlan` in serialization map
- [x] `TripData.hasMealPlan: boolean` in TripCard and TripsClient
- [x] Meal plan badge renders in stats row when `trip.hasMealPlan` is true
- [x] No type errors introduced (pre-existing test error unrelated)
