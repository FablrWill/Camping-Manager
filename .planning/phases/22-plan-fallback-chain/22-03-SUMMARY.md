---
phase: 22-plan-fallback-chain
plan: "03"
subsystem: trip-prep-ui
tags: [fallback-chain, trip-prep, weather, ui]
dependency_graph:
  requires: [22-01]
  provides: [fallback-plans-card]
  affects: [components/TripPrepClient.tsx, app/trips/[id]/prep/page.tsx]
tech_stack:
  added: []
  patterns: [useEffect-fetch, immutable-state-update]
key_files:
  created: []
  modified:
    - components/TripPrepClient.tsx
    - app/trips/[id]/prep/page.tsx
    - components/__tests__/offline-trip-render.test.tsx
decisions:
  - "Use correct DayForecast field names: highF/lowF/precipProbability — not the plan's tempHigh/tempLow/precipChance aliases"
metrics:
  duration: "~17 min"
  completed: "2026-04-03"
  tasks_completed: 1
  files_modified: 3
requirements: [FALLBACK-02]
---

# Phase 22 Plan 03: Fallback Plans Card Summary

**One-liner:** Fallback Plans card in TripPrepClient fetches Plan B/C alternatives with per-alternative 3-day weather comparison using highF/lowF/precipProbability from DayForecast.

## What Was Built

Added the "Fallback Plans" card to the trip prep page. The card renders after the Permits & Reservations card and:

- Fetches alternative trips (Plan B/C) via `/api/trips/[id]/alternatives` on mount
- Shows loading skeleton (pulse animation) while fetching
- Shows "No fallback plans yet. Add a Plan B" empty state with link to `/trips`
- For each alternative: displays Plan B/C label, trip name, location name (or "No location set" if no location)
- Fetches weather for each alternative that has coordinates via `/api/weather?lat=&lon=`
- Shows 3-day mini weather forecast (day label, high/low temps, precip probability)
- Links to each alternative's prep page via `/trips/[alt.id]/prep`

The server component (`page.tsx`) now passes `fallbackFor` and `fallbackOrder` to `TripPrepClient`.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] DayForecast field name mismatch**
- **Found during:** Task 1 — TypeScript type check
- **Issue:** Plan specified `day.tempHigh`, `day.tempLow`, `day.precipChance` but actual `DayForecast` interface in `lib/weather.ts` uses `highF`, `lowF`, `precipProbability`
- **Fix:** Used correct field names in the weather mini-forecast JSX
- **Files modified:** `components/TripPrepClient.tsx`
- **Commit:** 09f8cf1

**2. [Rule 1 - Bug] Test fixture missing required props**
- **Found during:** Task 1 — TypeScript type check
- **Issue:** `components/__tests__/offline-trip-render.test.tsx` `mockTrip` object was missing `permitUrl`, `permitNotes`, `fallbackFor`, `fallbackOrder` after the interface was expanded
- **Fix:** Added all four fields (all `null`) to `mockTrip`
- **Files modified:** `components/__tests__/offline-trip-render.test.tsx`
- **Commit:** 09f8cf1

## Known Stubs

None — all data is live-fetched from existing API endpoints.

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| Task 1 | 09f8cf1 | feat(22-03): add Fallback Plans card to trip prep page |

## Self-Check: PASSED
