---
plan: 34-02
phase: 34-meal-planning-core
status: complete
completed: 2026-04-04
self_check: PASSED
---

# Plan 34-02: Per-meal regeneration

## What Was Built

- **`lib/parse-claude.ts`**: Exported `MealPlanMealSchema` (was `const`, now `export const`) so the PATCH route can use it for Claude response parsing.
- **`lib/claude.ts`**: Changed `anthropic` client to `export const` so the PATCH route can import it directly.
- **`app/api/meal-plan/route.ts`**: Added `PATCH` handler for single-meal regeneration. Accepts `{ tripId, day, mealType }`. Validates inputs, fetches existing plan, calls Claude with a focused single-meal prompt, parses response with `MealPlanMealSchema`, and updates only the target meal slot in the stored JSON (shopping list and prep timeline untouched).
- **`components/MealPlan.tsx`**: Added `regeneratingMeal` and `mealUpdated` state. Added `handleRegenMeal` callback that calls `PATCH /api/meal-plan` and updates local state immutably. In the collapsed meal row: shows an `animate-pulse` skeleton while regenerating. In the expanded detail: shows a "Regenerate this meal" button (with RotateCcw icon), spinner + "Regenerating..." text during the call, and "Meal updated" inline feedback for 2s after success. Hidden in offline mode.

## Commits

- `10787f2` feat(34-02): add PATCH endpoint for per-meal regeneration and export MealPlanMealSchema
- `d3cdab3` feat(34-02): add per-meal regenerate button, skeleton, and inline feedback to MealPlan

## Key Files

key-files.created: []
key-files.modified:
  - lib/parse-claude.ts
  - lib/claude.ts
  - app/api/meal-plan/route.ts
  - components/MealPlan.tsx

## Deviations

None. Implemented exactly per plan spec.

## Self-Check

- [x] `lib/parse-claude.ts` exports `MealPlanMealSchema`
- [x] `app/api/meal-plan/route.ts` has `export async function PATCH`
- [x] PATCH validates `tripId`, `day`, `mealType` with descriptive 400 errors
- [x] PATCH calls `anthropic.messages.create` with single-meal prompt
- [x] PATCH uses `parseClaudeJSON` with `MealPlanMealSchema`
- [x] PATCH updates only target meal slot (shopping list + prep timeline unchanged)
- [x] `components/MealPlan.tsx` has `regeneratingMeal` and `mealUpdated` state
- [x] `handleRegenMeal` calls `PATCH /api/meal-plan` and updates local state immutably
- [x] Collapsed meal row shows `animate-pulse` skeleton during regeneration
- [x] Expanded detail shows "Regenerate this meal" button (not shown in offline mode)
- [x] "Regenerating..." spinner shown during active regen
- [x] "Meal updated" feedback shown for 2s after success
- [x] No ConfirmDialog for per-meal regen (only whole-plan regen uses it)
- [x] No type errors introduced
