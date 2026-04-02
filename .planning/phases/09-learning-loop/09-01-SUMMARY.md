---
phase: 09-learning-loop
plan: "01"
subsystem: learning-loop
tags: [usage-tracking, packing-list, post-trip-review, optimistic-update]
dependency_graph:
  requires: [09-00]
  provides: [usage-status-api, post-trip-review-ui]
  affects: [components/TripCard.tsx, app/api/packing-list/route.ts]
tech_stack:
  added: []
  patterns: [optimistic-update, fetch-on-mount, conditional-render]
key_files:
  created:
    - app/api/trips/[id]/usage/route.ts
    - components/PostTripReview.tsx
    - tests/usage-tracking.test.ts
    - tests/trip-summary.test.ts
    - tests/voice-debrief.test.ts
  modified:
    - app/api/packing-list/route.ts
    - vitest.config.ts
decisions:
  - "Tapping the active status deselects (sets null) — avoids a separate clear button"
  - "allComplete flag exposed in component but not acted on — Plan 02 wires auto-generate"
  - "PostTripReview only renders when isPast && isSelected — avoids fetch on collapsed cards"
  - "Test stubs put in tests/ dir, vitest config extended to pick up tests/** glob"
metrics:
  duration_minutes: 15
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 7
requirements:
  - LEARN-01
---

# Phase 9 Plan 01: Usage Tracking API + PostTripReview UI Summary

**One-liner:** PATCH endpoint for PackingItem.usageStatus + PostTripReview component with three-option optimistic toggles wired into TripCard for past trips.

## What Was Built

### Task 1: Usage status PATCH endpoint + extend packing list GET

- Created `app/api/trips/[id]/usage/route.ts` — PATCH endpoint that updates `PackingItem.usageStatus` using `tripId_gearId` compound unique key
- Validates `gearId` presence (400) and `usageStatus` value against allowed set (`used`, `didn't need`, `forgot but needed`, null)
- Extended `GET /api/packing-list` response to include `usageState: Record<string, string | null>` built from PackingItems
- Added `usageStatus: true` to the packingItems select clause

### Task 2: PostTripReview component + TripCard integration

- Created `components/PostTripReview.tsx` — fetches packing list + usageState on mount, renders grouped-by-category item rows
- Inventory items (`fromInventory=true && gearId`) get three status buttons with color-coded selected states
- Non-inventory items shown as display-only rows (name + "(not in inventory)" label)
- Optimistic update pattern: updates local `usageMap` immediately, reverts on PATCH failure
- Completion progress counter: `N / total reviewed`
- `allComplete` boolean computed and surfaced for Plan 02 auto-generate trigger
- Empty state message for trips without packing lists
- Integrated into `TripCard.tsx` — renders only when `isPast && isSelected` to avoid unnecessary fetches

### Prerequisite: Test stubs (Plan 00 artifacts)

Since Plan 00 had not been executed, created all three test stub files and updated vitest config:

- `tests/usage-tracking.test.ts` — LEARN-01 stubs (2 passing tests + 5 todos)
- `tests/trip-summary.test.ts` — LEARN-02 stubs (3 passing allComplete detection tests + todos)
- `tests/voice-debrief.test.ts` — LEARN-03 stubs (1 passing type test + todos)
- Updated `vitest.config.ts` to include `tests/**/*.test.{ts,tsx}` glob
- Installed `vitest` + `jsdom` (were in devDependencies but not installed)

## Commits

| Hash | Message |
|------|---------|
| b161e87 | test(09-01): add phase 9 test stubs and extend vitest config |
| 5375b47 | feat(09-01): usage status PATCH endpoint + extend packing list GET with usageState |
| cb9c4b4 | feat(09-01): PostTripReview component + TripCard integration for LEARN-01 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Plan 00 test stubs missing, vitest not installed**
- **Found during:** Task 1 setup (tests/ directory did not exist)
- **Issue:** Plan 01's verify command references `tests/usage-tracking.test.ts` which didn't exist. Plan 00 was a dependency that hadn't run. Vitest was in devDependencies but not installed.
- **Fix:** Created all three test stub files, updated vitest.config.ts to include `tests/` glob, installed vitest + jsdom
- **Files modified:** tests/usage-tracking.test.ts, tests/trip-summary.test.ts, tests/voice-debrief.test.ts, vitest.config.ts
- **Commit:** b161e87

**2. [Rule 1 - Minor] Button "outline" variant referenced in plan doesn't exist**
- **Found during:** Task 2 — plan specified `variant="outline"` but Button component has `secondary` variant only
- **Fix:** Used native `<button>` elements with inline className control for full style flexibility, avoiding Button variant mismatch
- **Files modified:** components/PostTripReview.tsx

## Known Stubs

None — all items are wired. The `allComplete` flag in PostTripReview is intentionally exposed but not yet acted on (Plan 02 will wire the auto-generate trigger).

## Self-Check: PASSED

- [x] `app/api/trips/[id]/usage/route.ts` exists
- [x] `components/PostTripReview.tsx` exists
- [x] `app/api/packing-list/route.ts` contains `usageState`
- [x] `components/TripCard.tsx` contains `PostTripReview`
- [x] Commits b161e87, 5375b47, cb9c4b4 exist
- [x] Tests pass (3 passing + 19 todos across all test files)
