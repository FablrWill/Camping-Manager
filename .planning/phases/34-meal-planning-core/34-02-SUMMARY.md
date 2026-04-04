---
phase: 34-meal-planning-core
plan: "02"
subsystem: meal-planning
tags: [api-routes, claude-integration, meal-plan, normalized-schema]
dependency_graph:
  requires: [34-01]
  provides: [meal-plan-api-routes, regenerate-meal-api]
  affects: [app/api/trips, lib/claude.ts]
tech_stack:
  added: []
  patterns: [per-trip-route-pattern, prisma-transaction, ownership-check]
key_files:
  created:
    - app/api/trips/[id]/meal-plan/route.ts
    - app/api/trips/[id]/meal-plan/generate/route.ts
    - app/api/trips/[id]/meal-plan/meals/[mealId]/route.ts
  modified:
    - lib/claude.ts
decisions:
  - "GearItem interface exported from lib/claude.ts so API routes can import the type directly"
  - "generateMealPlan() now returns NormalizedMealPlanResult instead of MealPlanResult — legacy interfaces preserved for backward compat"
  - "POST /generate persists Meal rows inside prisma.$transaction — atomic with MealPlan upsert and Trip.mealPlanGeneratedAt update"
  - "Snacks mapped as a single meal row with slot='snack' and name=joined string"
  - "meal ownership verified by checking meal.mealPlan.tripId === tripId before PATCH/DELETE"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 4
---

# Phase 34 Plan 02: Meal Plan API Routes Summary

One-liner: Per-trip meal plan API (5 endpoints) wired to normalized generateMealPlan/regenerateMeal functions with bringingDog context and atomic transaction persistence.

## What Was Built

Added `bringingDog` param and structured ingredient support to `generateMealPlan()`, added new `regenerateMeal()` function, and created all 5 per-trip meal plan endpoints.

### lib/claude.ts changes

- Added `bringingDog?: boolean` param to `generateMealPlan()`
- Added `DOG ON TRIP` section in generateMealPlan prompt when bringingDog is true
- Switched prompt ingredient format from string arrays to `{item, quantity, unit}` objects
- Switched validation from `MealPlanResultSchema` to `NormalizedMealPlanResultSchema`
- Return type changed from `Promise<MealPlanResult>` to `Promise<NormalizedMealPlanResult>`
- Added `export async function regenerateMeal()` — generates a single meal replacement via Claude, validates with `SingleMealSchema`
- Exported `GearItem` interface (was previously private)
- Legacy `MealPlanMeal`, `MealPlanDay`, `MealPlanResult` interfaces preserved

### API Routes Created

**`GET /api/trips/:id/meal-plan`**
- Fetches MealPlan with nested Meal rows ordered by day/slot
- Parses ingredients JSON string back to objects for each meal
- Returns `{ mealPlan: null }` when no plan exists

**`DELETE /api/trips/:id/meal-plan`**
- Deletes MealPlan row (cascades to Meal rows via schema relation)
- Silently succeeds if no plan exists

**`POST /api/trips/:id/meal-plan/generate`**
- Fetches trip with location + vehicle, cooking gear, weather (non-blocking)
- Calls `generateMealPlan({ ..., bringingDog: trip.bringingDog })`
- Maps NormalizedMealPlanResult days → Meal rows (breakfast/lunch/dinner/snack)
- All persistence in `prisma.$transaction`: upsert MealPlan, deleteMany old Meal rows, createMany new rows, update `Trip.mealPlanGeneratedAt`
- Returns 201 with complete mealPlan + meals (ingredients parsed)

**`PATCH /api/trips/:id/meal-plan/meals/:mealId`**
- Verifies meal ownership (`meal.mealPlan.tripId === tripId`)
- Fetches trip context + cooking gear + weather
- Calls `regenerateMeal()` with current meal name (Claude generates something different)
- Updates the Meal row in-place
- Returns updated meal (ingredients parsed)

**`DELETE /api/trips/:id/meal-plan/meals/:mealId`**
- Verifies meal ownership before deletion
- Returns `{ success: true }`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Exported GearItem interface from lib/claude.ts**
- **Found during:** Task 2 — TypeScript error when importing `type GearItem` from `@/lib/claude` in route files
- **Issue:** `GearItem` was declared as a module-private `interface` (no `export` keyword)
- **Fix:** Added `export` to the `GearItem` interface declaration
- **Files modified:** lib/claude.ts
- **Commit:** fe9bd6f (included in Task 2 commit)

## Success Criteria Review

1. generateMealPlan() accepts bringingDog param and injects into Claude prompt — DONE
2. generateMealPlan() requests structured ingredients {item, quantity, unit} from Claude — DONE
3. regenerateMeal() generates a single meal and validates via SingleMealSchema — DONE
4. POST /generate creates MealPlan + Meal rows in a transaction and updates Trip.mealPlanGeneratedAt — DONE
5. POST /generate maps prepNotes directly (no prepType fallback) — DONE
6. GET returns mealPlan with nested meals array (ingredients parsed from JSON) — DONE
7. DELETE clears MealPlan (cascades to Meal rows) — DONE
8. PATCH per-meal regenerates one meal and updates the row — DONE
9. DELETE per-meal removes one meal after ownership verification — DONE

## Self-Check: PASSED

All created files exist on disk. Both task commits (dd0aa1c, fe9bd6f) verified in git log.
