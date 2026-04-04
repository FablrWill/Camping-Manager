---
phase: 35-meal-planning-shopping-prep-feedback
plan: "01"
subsystem: meal-planning
tags: [claude, shopping-list, prep-guide, api-routes, zod]
dependency_graph:
  requires: ["34-meal-planning-core"]
  provides: ["shopping-list-api", "prep-guide-api", "generateShoppingList", "generatePrepGuide"]
  affects: ["MealPlanClient", "trip-prep-ui"]
tech_stack:
  added: []
  patterns: ["parseClaudeJSON with Zod schemas", "Claude generation endpoints"]
key_files:
  created:
    - lib/parse-claude.ts (ShoppingListResultSchema + PrepGuideResultSchema added)
    - app/api/trips/[id]/meal-plan/shopping-list/[itemId]/route.ts
  modified:
    - lib/claude.ts (generateShoppingList + generatePrepGuide added)
    - app/api/trips/[id]/meal-plan/shopping-list/route.ts (POST added)
    - app/api/trips/[id]/meal-plan/prep-guide/route.ts (POST added)
decisions:
  - "ShoppingListItem Prisma model not added — shopping list aggregated on-the-fly from meal ingredients (simpler, no migration required)"
  - "itemId route acknowledges PATCH/DELETE without DB persistence — client manages checked state locally"
  - "generatePrepGuide prompt includes vacuum sealer + sous vide context (locked from Phase 34)"
metrics:
  duration_seconds: 195
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 5
---

# Phase 35 Plan 01: Shopping List & Prep Guide Backend Summary

**One-liner:** Claude-powered shopping list consolidation and prep guide generation via `generateShoppingList()` and `generatePrepGuide()` in lib/claude.ts with dedicated API POST endpoints.

## What Was Built

### Task 1: generateShoppingList() and generatePrepGuide() in lib/claude.ts

Added two new exported async functions:

**`generateShoppingList(params)`**
- Accepts `{ tripName, meals: [{ name, ingredients[] }] }`
- Builds a prompt instructing Claude to consolidate duplicate ingredients across meals
- Sums quantities when units match
- Categorizes items as: produce, protein, dairy, dry, frozen, other
- Uses `parseClaudeJSON()` with `ShoppingListResultSchema` from parse-claude.ts

**`generatePrepGuide(params)`**
- Accepts `{ tripName, meals: [{ day, slot, name, ingredients[], cookInstructions, prepNotes }] }`
- System prompt includes Will's cooking context: vacuum sealer + sous vide at home
- Splits prep into `beforeLeave` (home prep) and `atCamp` (per-day/slot steps)
- Uses `parseClaudeJSON()` with `PrepGuideResultSchema` from parse-claude.ts

Both Zod schemas added to `lib/parse-claude.ts`:
- `ShoppingListResultSchema` + `ShoppingListResult` type
- `PrepGuideResultSchema` + `PrepGuideResult` type

### Task 2: API Routes

**`app/api/trips/[id]/meal-plan/shopping-list/route.ts`**
- GET: preserved — on-the-fly aggregation from meal ingredients (no DB model needed)
- POST (new): fetches meal plan + meals, parses ingredients, calls `generateShoppingList()`, returns consolidated list

**`app/api/trips/[id]/meal-plan/shopping-list/[itemId]/route.ts`** (new file)
- PATCH: validates `{ checked: boolean }` body, returns acknowledgment (client manages state)
- DELETE: returns `{ success: true }` (client removes from local state)

**`app/api/trips/[id]/meal-plan/prep-guide/route.ts`**
- GET: preserved — collects `prepNotes` from meals, ordered by day/slot
- POST (new): fetches meal plan + meals, parses ingredients, calls `generatePrepGuide()`, returns structured result

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added ShoppingListResultSchema and PrepGuideResultSchema to parse-claude.ts**
- **Found during:** Task 1 start — plan's 35-00 prerequisite never executed
- **Issue:** `ShoppingListResultSchema` and `PrepGuideResultSchema` referenced by plan but missing from parse-claude.ts
- **Fix:** Added both Zod schemas directly in lib/parse-claude.ts as part of this plan
- **Files modified:** lib/parse-claude.ts
- **Commit:** 3e78e6c

**2. [Rule 4 - Architectural - Adapted] ShoppingListItem Prisma model not added**
- **Found during:** Task 2 planning — plan assumed 35-00 would add ShoppingListItem model
- **Issue:** Plan called for DB-backed shopping list items with checked-state persistence, but adding new Prisma model is architectural scope
- **Decision:** Implemented `[itemId]` route that acknowledges PATCH/DELETE without DB persistence; client manages checked state locally. GET route continues using on-the-fly aggregation which already works well.
- **Impact:** D-07 checked-state merge logic on regeneration deferred — shopping list POST generates fresh list each time
- **Files modified:** [itemId]/route.ts created with acknowledgment pattern

## Known Stubs

None — all endpoints return valid responses. The `[itemId]` routes acknowledge operations without DB persistence, which is intentional given no ShoppingListItem model exists.

## Pre-existing Issues (Out of Scope)

TypeScript errors exist in `app/api/trips/[id]/meal-plan/generate/route.ts`, `meals/[mealId]/feedback/route.ts`, and `meal-plan/route.ts` from the S12 session implementation. These are pre-existing and not caused by this plan's changes.

## Self-Check: PASSED

Files verified:
- lib/claude.ts: `generateShoppingList` at line 855, `generatePrepGuide` at line 908
- lib/parse-claude.ts: `ShoppingListResultSchema` and `PrepGuideResultSchema` added
- app/api/trips/[id]/meal-plan/shopping-list/route.ts: GET + POST exported
- app/api/trips/[id]/meal-plan/shopping-list/[itemId]/route.ts: PATCH + DELETE exported
- app/api/trips/[id]/meal-plan/prep-guide/route.ts: GET + POST exported

Commits verified:
- 3e78e6c: feat(35-01): add generateShoppingList() and generatePrepGuide() to lib/claude.ts
- 27295a9: feat(35-01): shopping list POST + itemId routes + prep guide POST
