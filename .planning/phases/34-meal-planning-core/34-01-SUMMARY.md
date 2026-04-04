---
phase: 34-meal-planning-core
plan: "01"
subsystem: database/validation
tags: [prisma, schema, zod, meal-planning, sqlite]
dependency_graph:
  requires: ["34-00"]
  provides: ["Meal table in SQLite", "normalized MealPlan schema", "NormalizedIngredientSchema", "SingleMealSchema", "NormalizedMealPlanResultSchema"]
  affects: ["app/api/meal-plan/route.ts", "app/api/departure-checklist/route.ts"]
tech_stack:
  added: []
  patterns: ["SQLite table recreation (no DROP COLUMN)", "Prisma migrate resolve --applied for manual migrations"]
key_files:
  created:
    - prisma/migrations/20260403140000_normalize_meal_plan/migration.sql
  modified:
    - prisma/schema.prisma
    - lib/parse-claude.ts
    - app/api/meal-plan/route.ts
    - app/api/departure-checklist/route.ts
decisions:
  - "Applied migration manually via better-sqlite3 (FTS triggers block Prisma migrate deploy on this DB)"
  - "Drop FTS triggers temporarily during DDL, recreate after — triggers reference knowledge_chunks_fts which does not exist yet"
  - "meal-plan route upsert stores only header row (no result blob) — Plan 02 adds normalized Meal row persistence"
  - "departure-checklist passes empty string for mealPlan.result since Meal data is now in separate rows"
metrics:
  duration_minutes: 5
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
requirements_satisfied:
  - MEAL-01
  - MEAL-07
---

# Phase 34 Plan 01: Normalize MealPlan Schema + Zod Schemas Summary

Normalized MealPlan schema from JSON blob to individual Meal rows with structured ingredient support; added Zod validation schemas for the normalized shape.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Schema migration — normalize MealPlan + Meal table | bc70cb1 | prisma/schema.prisma, migration.sql |
| 2 | Add normalized Zod schemas + fix schema-breaking references | b808f9d | lib/parse-claude.ts, route.ts files |

## Decisions Made

1. **Migration applied manually**: `prisma migrate deploy` fails because FTS triggers (`knowledge_chunks_fts_insert`, etc.) reference `knowledge_chunks_fts` table which doesn't exist. Used better-sqlite3 to drop triggers, apply DDL, recreate triggers, then `prisma migrate resolve --applied` to mark migration done.

2. **meal-plan route stores header only**: The existing `app/api/meal-plan/route.ts` used `result` JSON blob on MealPlan. Since that field is removed, the route now upserts only the MealPlan header row. Plan 02 will add the full normalized Meal row persistence.

3. **departure-checklist uses empty string fallback**: The departure-checklist route was passing `trip.mealPlan.result` (a string) to `generateDepartureChecklist`. Now passes empty string since the meal plan content lives in normalized Meal rows that Plan 02 will wire up.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed TypeScript errors from removed MealPlan.result field**
- **Found during:** Task 2 TypeScript check
- **Issue:** `app/api/meal-plan/route.ts` referenced `mealPlan.result` (upsert create/update and GET response) which no longer exists on the MealPlan type after schema normalization.
- **Fix:** Updated GET to include Meal rows in response, updated upsert to store header only (no `result` field), removed unused `safeJsonParse` import.
- **Files modified:** `app/api/meal-plan/route.ts`
- **Commit:** b808f9d

**2. [Rule 1 - Bug] Fixed TypeScript error in departure-checklist route**
- **Found during:** Task 2 TypeScript check
- **Issue:** `app/api/departure-checklist/route.ts` accessed `trip.mealPlan.result` which no longer exists on MealPlan type.
- **Fix:** Changed to pass empty string `{ result: '' }` (satisfies the `{ result: string } | null` parameter type; Plan 02 will update this with real meal summary).
- **Files modified:** `app/api/departure-checklist/route.ts`
- **Commit:** b808f9d

## Known Stubs

- `app/api/meal-plan/route.ts` POST: upserts only MealPlan header, no Meal rows written yet — Plan 02 adds full normalized persistence.
- `app/api/departure-checklist/route.ts`: passes `{ result: '' }` for mealPlan context — Plan 02 will provide meal summary string.

## Self-Check: PASSED

Files exist:
- prisma/migrations/20260403140000_normalize_meal_plan/migration.sql ✓
- prisma/schema.prisma (contains `model Meal`) ✓
- lib/parse-claude.ts (contains NormalizedIngredientSchema, SingleMealSchema) ✓

Commits exist:
- bc70cb1 ✓
- b808f9d ✓
