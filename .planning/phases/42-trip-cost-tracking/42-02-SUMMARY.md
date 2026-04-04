---
phase: 42
plan: 02
subsystem: trips
tags: [expense-tracking, trip-cards, ui-badge]
dependency_graph:
  requires: [expense-api-aggregate]
  provides: [trip-card-cost-badge]
  affects: [components/TripCard.tsx, components/TripsClient.tsx, app/trips/page.tsx]
tech_stack:
  added: []
  patterns: [client-side-aggregate, conditional-badge-render]
key_files:
  modified:
    - components/TripCard.tsx
    - components/TripsClient.tsx
    - app/trips/page.tsx
decisions:
  - "Badge uses stone/muted colors (bg-stone-100/dark:bg-stone-800) — amber is reserved for CTA-level elements"
  - "Cost badge hidden when total is 0 — no empty-state badge clutters the card"
  - "IIFE pattern ((() => {})()) used for inline reduce + conditional render inside JSX"
metrics:
  duration: 2min
  completed_date: "2026-04-04"
  tasks_completed: 1
  files_modified: 3
requirements:
  - EXP-05
---

# Phase 42 Plan 02: Trip Cost Tracking — Cost Badge on Trip Cards Summary

Stone-colored cost badge showing total trip spend rendered inline with trip name badges; hidden when no expenses exist.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T1 | Add expenses to TripData interfaces and render cost badge | a40cb18 | components/TripCard.tsx, components/TripsClient.tsx, app/trips/page.tsx |

## Changes Made

### Task 1: Cost Badge in TripCard Header

**`components/TripCard.tsx`**
- Added `DollarSign` to lucide-react import
- Added `expenses: Array<{ amount: number }>` to `TripData` interface with Phase 42 comment
- Added cost badge IIFE after `+{trip._count.alternatives}B` badge and before edit/delete buttons
- Badge: `bg-stone-100 dark:bg-stone-800`, `text-stone-500 dark:text-stone-400`, rounded-full, `DollarSign size={10}` icon, `$X.XX` format via `toFixed(2)`
- Badge only renders when `expenseTotal > 0`

**`components/TripsClient.tsx`**
- Added `expenses: Array<{ amount: number }>` to `TripData` interface with Phase 42 comment
- Added `expenses: saved.expenses ?? []` in `handleCreate` state spread so newly created trips initialize with an empty expenses array

**`app/trips/page.tsx`** (auto-fix: Rule 3)
- Added `expenses: { select: { amount: true } }` to `prisma.trip.findMany` include block
- Added `expenses: t.expenses` to the `.map()` spread — required for TypeScript to satisfy the updated `TripData` interface

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Missing expenses include in trips page server query**
- **Found during:** Task 1, build verification
- **Issue:** `app/trips/page.tsx` uses its own Prisma `findMany` query that did not include `expenses`. After updating the `TripData` interface, TypeScript reported a type error: `Property 'expenses' is missing in type '...'`.
- **Fix:** Added `expenses: { select: { amount: true } }` to the `findMany` include block and `expenses: t.expenses` to the `trips.map()` spread in `page.tsx`.
- **Files modified:** `app/trips/page.tsx`
- **Commit:** a40cb18

## Verification

- `grep -n "expenseTotal" components/TripCard.tsx` — returns 4 lines confirming badge logic present
- `npm run build` — passes cleanly with TypeScript type check

## Known Stubs

None — cost badge reads from real `trip.expenses` data included in the Prisma query.

## Self-Check: PASSED
