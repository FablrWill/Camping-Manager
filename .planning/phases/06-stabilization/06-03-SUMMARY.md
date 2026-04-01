---
phase: 06-stabilization
plan: 03
subsystem: api
tags: [zod, prisma, claude-api, packing-list, meal-plan, persistence, error-handling]

# Dependency graph
requires:
  - phase: 06-01
    provides: parseClaudeJSON utility, PackingListResultSchema, MealPlanResultSchema, MealPlan model, Trip.packingListResult field

provides:
  - GET /api/packing-list?tripId= — returns saved packing list result from Trip
  - POST /api/packing-list — generates, validates with Zod, persists to Trip, resets packed state (D-04)
  - GET /api/meal-plan?tripId= — returns saved meal plan result from MealPlan model
  - POST /api/meal-plan — generates, validates with Zod, upserts to MealPlan (D-03)
  - PackingList component with load-on-mount, regenerate, inline error/retry
  - MealPlan component with load-on-mount, regenerate, inline error/retry
  - 422 status on Zod schema mismatch, 500 on other errors
  - Packed state reset on packing list regeneration (D-04)

affects: [06-stabilization, trip-planning, components, ai-features]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "parseClaudeJSON wraps all Claude response parsing — 422 for schema mismatch, throw for unknown"
    - "Split try-catch for generate call (returns 422) vs outer try-catch (returns 500)"
    - "Load-on-mount useEffect with silent-fail catch — user can always generate fresh"
    - "generating state separate from loadingMounted — preserves existing result during regenerate"
    - "formatRelativeTime helper for human-readable timestamps in metadata line"

key-files:
  created: []
  modified:
    - lib/claude.ts
    - app/api/packing-list/route.ts
    - app/api/meal-plan/route.ts
    - components/PackingList.tsx
    - components/MealPlan.tsx

key-decisions:
  - "Use inner try-catch around generatePackingList/generateMealPlan call to distinguish 422 (Zod) from 500 (other)"
  - "MealPlanMeal.prepType widened to string (was 'home' | 'camp') to match Zod-inferred type from parse-claude.ts"
  - "PackingListItem.category made optional to align with Zod schema which has it optional"
  - "loadingMounted state separate from generating — shows loading spinner on mount, preserves result during regenerate"
  - "formatRelativeTime implemented inline in each component rather than shared util — avoids over-abstraction for personal tool"

patterns-established:
  - "Persist-on-generate: AI results saved immediately after generation, component loads on mount (STAB-02)"
  - "Split error handling: inner catch returns 422 for Zod failures, outer catch returns 500 for all else"

requirements-completed: [STAB-01, STAB-02]

# Metrics
duration: 7min
completed: 2026-04-01
---

# Phase 6 Plan 03: AI Persistence + Error Resilience Summary

**Packing list and meal plan now persist on generation, load on mount, and show inline error/retry instead of crashing on malformed Claude responses**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-01T19:47:47Z
- **Completed:** 2026-04-01T19:54:58Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Both AI routes now have GET (load saved) and POST (generate + persist with Zod validation)
- Packing list persisted to `Trip.packingListResult`; meal plan upserted to `MealPlan` model (one per trip, D-03)
- Packing list regeneration resets all `PackingItem.packed` to false (D-04 — new list = clean slate)
- Both components load saved result on mount — navigation-safe (STAB-02)
- Malformed Claude response returns 422 with error message; component shows inline error + Retry button (STAB-01, D-12, D-13)
- No `alert()` in components — all errors are state-based inline messages

## Task Commits

1. **Task 1: Update API routes** - `413ed17` (feat)
2. **Task 2: Update PackingList and MealPlan components** - `5321645` (feat)

## Files Created/Modified

- `lib/claude.ts` — replaced bare `JSON.parse(text)` with `parseClaudeJSON` + Zod schemas; fixed interface type compatibility
- `app/api/packing-list/route.ts` — added GET handler, persist on POST, packed state reset, 422 error handling
- `app/api/meal-plan/route.ts` — added GET handler, upsert on POST, 422 error handling
- `components/PackingList.tsx` — load-on-mount useEffect, generating state, error/retry, metadata line, Regenerate button
- `components/MealPlan.tsx` — same pattern as PackingList but hitting /api/meal-plan

## Decisions Made

- `MealPlanMeal.prepType` widened from `'home' | 'camp'` to `string` — Zod schema infers `string` since no `.refine()` added; UI just displays it so no functional impact.
- `PackingListItem.category` made optional — matches Zod schema which has it optional; categories come from the parent category name, not the item.
- Inner try-catch around `generatePackingList`/`generateMealPlan` to check error message for "schema mismatch" or "non-JSON" and return 422, while outer catch handles all other errors with 500.
- `loadingMounted` state separate from `generating` — on first load shows loading spinner; on regenerate shows existing result with Regenerate button in loading state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] TypeScript type errors in lib/claude.ts after adding parseClaudeJSON**
- **Found during:** Task 1 (tsc check)
- **Issue:** `PackingListItem.category` was `string` (required) but Zod schema has it optional; `MealPlanMeal.prepType` was `'home' | 'camp'` but Zod infers `string`
- **Fix:** Made `category` optional in `PackingListItem`; widened `prepType` to `string` in `MealPlanMeal`
- **Files modified:** `lib/claude.ts`
- **Verification:** `npx tsc --noEmit` passes for all changed files
- **Committed in:** `413ed17` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 bug fix — type compatibility)
**Impact on plan:** Minor — type widening matches actual runtime behavior. No functional impact.

## Issues Encountered

- Pre-existing build failure in `lib/rag/db.ts` (missing `better-sqlite3` and `sqlite-vec` modules) — unrelated to this plan, out of scope per deviation rules. Logged to deferred-items.
- Prisma client needed regeneration (`npx prisma generate`) to pick up `packingListResult`, `packingListGeneratedAt` on `Trip` and `MealPlan` model — applied before TypeScript check.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- Plan 03 (this plan) completes Phase 6 Wave 2
- Phase 6 Stabilization is now complete
- AI output persistence is fully wired: generate → validate → persist → load on mount
- Ready for Phase 7+ (Offline Snapshot, Learning Loop, etc.)

---
*Phase: 06-stabilization*
*Completed: 2026-04-01*
