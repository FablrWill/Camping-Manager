---
phase: 18-fuel-last-stop-planner
plan: "01"
subsystem: backend
tags: [overpass, api, utility, haversine, testing]
dependency_graph:
  requires: []
  provides: [lib/overpass.ts, app/api/trips/[id]/last-stops/route.ts]
  affects: [trip prep UI, last-stop card]
tech_stack:
  added: []
  patterns: [native fetch POST with form-encoded body, Haversine formula, Overpass QL]
key_files:
  created:
    - lib/overpass.ts
    - app/api/trips/[id]/last-stops/route.ts
    - tests/overpass.test.ts
    - tests/last-stops-route.test.ts
  modified: []
decisions:
  - "Exported haversineDistanceMiles (not private) so tests can verify the formula directly against known coordinate pairs"
  - "fetchLastStops deduplicates via Map<id> before filtering — ensures same OSM node matching multiple tag queries appears once"
  - "Max 2 results per category (D-04) implemented via .slice(0, 2) after sort"
metrics:
  duration_seconds: 144
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 4
---

# Phase 18 Plan 01: Overpass API Utility + Last-Stops Route Summary

**One-liner:** Overpass API client with Haversine distance, category assignment, and a trip-scoped GET endpoint that returns the 2 nearest fuel/grocery/outdoor stops.

## What Was Built

### lib/overpass.ts

Exported interfaces `LastStop` and `LastStopsResult`. Exported `haversineDistanceMiles` using Earth radius 3958.8 miles. Private `buildOverpassQuery` builds OverpassQL for 5 node types within 50km. Private `assignCategory` maps OSM tags to fuel/grocery/outdoor. Exported `fetchLastStops` POSTs form-encoded data to `overpass-api.de/api/interpreter`, deduplicates by OSM id, filters unnamed nodes, groups into categories, sorts by distance, and slices to max 2 per category.

### app/api/trips/[id]/last-stops/route.ts

GET handler following the existing async-params pattern. Looks up trip with location coordinates via Prisma. Returns 404 for missing trip, empty arrays for trips without coordinates, fetched results otherwise. Console.error + 500 on Overpass failure.

### Tests

- `tests/overpass.test.ts`: 9 tests — haversine accuracy (Asheville-Charlotte), identical coords returns 0, empty Overpass response, unnamed node filtering, id deduplication, distance sorting, max-2 slice, category assignment, hardware-to-outdoor fallback
- `tests/last-stops-route.test.ts`: 4 tests — 200 with coords, 200 empty without coords, 404 trip not found, 500 on Overpass throw

## Commits

| Task | Commit | Files |
|------|--------|-------|
| Task 1: Overpass utility | 2273ac6 | lib/overpass.ts, tests/overpass.test.ts |
| Task 2: Last-stops route | a22a1ed | app/api/trips/[id]/last-stops/route.ts, tests/last-stops-route.test.ts |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Both files are fully implemented with no placeholder data.

## Self-Check: PASSED

- lib/overpass.ts exists and exports required symbols
- app/api/trips/[id]/last-stops/route.ts exists with GET handler
- tests/overpass.test.ts: 9 tests all pass
- tests/last-stops-route.test.ts: 4 tests all pass
- Combined run: 13/13 tests pass
- No new npm dependencies added
