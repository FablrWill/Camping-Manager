---
phase: 35-meal-planning-shopping-prep-feedback
plan: "02"
subsystem: meal-planning
tags: [meal-planning, feedback, ai-prompts, api]
dependency_graph:
  requires: [35-00, 35-01]
  provides: [meal-feedback-api, meal-history-injection]
  affects: [lib/claude.ts, app/api/trips/[id]/meal-plan/generate/route.ts]
tech_stack:
  added: []
  patterns: [feedback-injection, non-blocking-try-catch, findFirst-create-update]
key_files:
  created:
    - app/api/trips/[id]/meal-plan/feedback/route.ts
  modified:
    - lib/claude.ts
    - app/api/trips/[id]/meal-plan/generate/route.ts
decisions:
  - buildMealHistorySection is a pure function in lib/claude.ts — testable without DB
  - Feedback query crosses all trips (not just current) — meal preferences carry forward session to session
  - Non-blocking try-catch around feedback fetch — generation always succeeds even if feedback DB fails
  - findFirst + create/update pattern used since MealFeedback has no @@unique constraint
  - Both feedbackHistory and mealHistory params coexist in generateMealPlan() — mealHistory is the new structured path
metrics:
  duration: 125s
  completed: "2026-04-04T04:46:25Z"
  tasks: 2
  files: 3
---

# Phase 35 Plan 02: Meal Feedback API and History Injection Summary

**One-liner:** GET/POST feedback API with findFirst+upsert pattern, plus buildMealHistorySection() injected into meal plan generation prompt for cross-trip learning.

## What Was Built

### Task 1: buildMealHistorySection() + mealHistory param

Added `export function buildMealHistorySection()` to `lib/claude.ts`:
- Accepts `Array<{ mealName, rating, notes }>` — matches MealFeedback Prisma model fields
- Returns empty string when feedback array is empty (backward compatible)
- Separates liked vs disliked meals into a `WILL'S MEAL HISTORY:` block
- Disliked meals with notes generate an `Avoid:` line to prevent pattern repetition

Added `mealHistory?: string` param to `generateMealPlan()`:
- Injected into the prompt when truthy, after `feedbackSection` and before cooking equipment
- Backward compatible — generation works without it

### Task 2: Feedback API route + updated generate route

Created `app/api/trips/[id]/meal-plan/feedback/route.ts`:
- `GET` returns all feedback for the trip's meal plan (or empty array if no plan exists)
- `POST` validates `mealId` (required, 400 if missing), `mealName` (required), `rating` ('liked'/'disliked' only)
- Uses `findFirst` + `create/update` pattern to handle the case where feedback already exists for a meal
- Stores denormalized `mealName` on each row for prompt building without joins

Updated `app/api/trips/[id]/meal-plan/generate/route.ts`:
- Replaced inline feedback formatting with `buildMealHistorySection` call
- Switched from trip-scoped query to global `findMany({ take: 10 })` — all trips contribute to preferences
- Wrapped feedback query in try-catch — generation never fails due to feedback issues
- Passes `mealHistory` (not `feedbackHistory`) to `generateMealPlan()`

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed fb.note → fb.notes field reference**
- **Found during:** Task 2 review of existing generate/route.ts
- **Issue:** The prior feedback code referenced `fb.note` but the MealFeedback model field is `notes`
- **Fix:** Replaced entire inline feedback logic with `buildMealHistorySection` which uses the correct `notes` field
- **Files modified:** app/api/trips/[id]/meal-plan/generate/route.ts
- **Commit:** 93aac25

## Known Stubs

None — all feedback paths are wired to actual DB operations.

## Self-Check: PASSED
