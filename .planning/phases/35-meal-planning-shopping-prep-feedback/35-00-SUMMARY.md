---
phase: 35-meal-planning-shopping-prep-feedback
plan: "00"
subsystem: meal-planning
tags: [prisma, schema, zod, testing, phase-35]
dependency_graph:
  requires: [34-meal-planning-core]
  provides: [ShoppingListItem-model, MealFeedback-model, prepGuide-field, Phase35-Zod-schemas, Phase35-test-stubs]
  affects: [prisma/schema.prisma, lib/parse-claude.ts]
tech_stack:
  added: []
  patterns: [prisma-model-addition, zod-schema-definition, vitest-todo-stubs]
key_files:
  created:
    - prisma/migrations/20260404000000_add_meal_feedback/migration.sql
    - tests/meal-plan/shopping-list.test.ts
    - tests/meal-plan/meal-feedback.test.ts
    - tests/meal-plan/prep-guide.test.ts
    - tests/meal-plan/meal-history-injection.test.ts
  modified:
    - prisma/schema.prisma
    - lib/parse-claude.ts
decisions:
  - "Tests placed in tests/meal-plan/ (not __tests__/meal-plan/) to match vitest.config.ts include patterns"
  - "Migration SQL updated to match comprehensive Phase 35 MealFeedback design (replaces earlier minimal one-to-one version)"
  - "MealFeedback mealId nullable with SetNull cascade — feedback survives meal regeneration"
  - "mealName denormalized on MealFeedback — feedback history prompt builder needs no JOIN after meal regeneration"
metrics:
  duration: 15
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_modified: 7
---

# Phase 35 Plan 00: Schema, Zod Schemas, and Test Stubs Summary

**One-liner:** Prisma schema extended with ShoppingListItem + comprehensive MealFeedback models, Phase 35 Zod response schemas added, and 25 it.todo test stubs scaffolded across 4 test files.

## What Was Built

Schema migration and test harness for Phase 35 meal planning extensions.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Prisma schema — ShoppingListItem, MealFeedback, MealPlan.prepGuide | a75136a | prisma/schema.prisma, migration.sql |
| 2 | Zod schemas + test stubs for all Phase 35 APIs | 3bbe7a9 | lib/parse-claude.ts, 4 test files |

## Schema Changes

**MealPlan model** gained:
- `prepGuide String?` — stores generated prep guide JSON
- `shoppingItems ShoppingListItem[]` — relation to shopping list items
- `feedbacks MealFeedback[]` — relation to meal feedback records

**Meal model** changed:
- `feedback MealFeedback?` (one-to-one) replaced by `feedbacks MealFeedback[]` (one-to-many)

**New: ShoppingListItem** — per meal plan, per ingredient row with `item`, `quantity`, `unit`, `category`, `checked` fields. Cascade delete from MealPlan.

**New: MealFeedback** (replaced simple version):
- `mealId String?` — nullable, `onDelete: SetNull` — feedback survives meal regeneration
- `mealPlanId String` — required, `onDelete: Cascade`
- `mealName String` — denormalized for history prompt building without JOIN
- `rating String` — `liked` or `disliked`
- `notes String?` — optional feedback text
- Indexes on `mealPlanId`, `mealId`, `createdAt`

## Zod Schemas Added

`lib/parse-claude.ts` exports:
- `ShoppingListResultSchema` — validates Claude shopping list response (`items[]` with item, quantity, unit, category)
- `ShoppingListResult` — TypeScript type
- `PrepGuideResultSchema` — validates Claude prep guide response (`beforeLeave[]`, `atCamp[]` with day/mealSlot/steps)
- `PrepGuideResult` — TypeScript type

## Test Stubs Created

4 files in `tests/meal-plan/` with 25 `it.todo()` stubs — all run skipped (not failing):
- `shopping-list.test.ts` — 8 stubs covering POST generate, GET list, PATCH toggle, DELETE item
- `meal-feedback.test.ts` — 7 stubs covering POST create feedback, GET list
- `prep-guide.test.ts` — 3 stubs covering POST generate prep guide
- `meal-history-injection.test.ts` — 5 stubs covering `buildMealHistorySection()` pure function

## Deviations from Plan

**[Rule 2 - Convention Fix] Used tests/meal-plan/ instead of __tests__/meal-plan/**
- **Found during:** Task 2 setup
- **Issue:** Plan specified `__tests__/meal-plan/` but vitest.config.ts only includes `tests/**/*.test.{ts,tsx}`. Tests in `__tests__/` would not be discovered.
- **Fix:** Created test stubs in `tests/meal-plan/` to match existing project convention and vitest config.
- **Files modified:** All 4 test stub files placed at correct path.

**[Context Fix] Replaced existing minimal MealFeedback with comprehensive Phase 35 design**
- **Found during:** Task 1 schema inspection
- **Issue:** Existing schema had minimal `MealFeedback` (one-to-one, no mealPlanId, no mealName) from an earlier partial implementation. The migration file also reflected this old design.
- **Fix:** Updated both schema.prisma and migration.sql to implement the full Phase 35 design as specified in CONTEXT.md and RESEARCH.md.
- **Files modified:** prisma/schema.prisma, prisma/migrations/20260404000000_add_meal_feedback/migration.sql

## Self-Check: PASSED

All files created and commits verified:
- FOUND: prisma/schema.prisma (contains ShoppingListItem and MealFeedback models)
- FOUND: lib/parse-claude.ts (contains ShoppingListResultSchema and PrepGuideResultSchema)
- FOUND: tests/meal-plan/shopping-list.test.ts
- FOUND: tests/meal-plan/meal-feedback.test.ts
- FOUND: tests/meal-plan/prep-guide.test.ts
- FOUND: tests/meal-plan/meal-history-injection.test.ts
- FOUND: commit a75136a (schema migration)
- FOUND: commit 3bbe7a9 (Zod schemas + test stubs)
