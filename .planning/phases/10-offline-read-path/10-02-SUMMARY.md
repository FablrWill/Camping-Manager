---
phase: 10-offline-read-path
plan: "02"
subsystem: offline
tags: [tile-prefetch, offline-write-queue, cache-trip, pwa, osm]
dependency_graph:
  requires: [10-01]
  provides: [lib/tile-prefetch.ts, lib/offline-write-queue.ts]
  affects: [lib/cache-trip.ts, components/CachingProgressOverlay.tsx, components/LeavingNowButton.tsx]
tech_stack:
  added: []
  patterns: [Promise.allSettled batch fetching, IndexedDB write queue, OSM Slippy Map tile math]
key_files:
  created:
    - lib/tile-prefetch.ts
    - lib/offline-write-queue.ts
    - lib/__tests__/tile-prefetch.test.ts
    - lib/__tests__/offline-write-queue.test.ts
  modified:
    - lib/cache-trip.ts
    - lib/__tests__/cache-trip.test.ts
    - components/LeavingNowButton.tsx
decisions:
  - "Detail tiles (zoom 15-16) generated first, broad tiles (zoom 10-14) fill remaining 1000-tile cap — ensures campsite-level tiles are never truncated"
  - "getTileUrlsWithDestinationDetail is the public API for cacheTripData — lower-level getTileUrlsForBoundingBox kept internal to tests/configurability"
  - "Tile snapshot stored as { count, failed } not URLs — keeps IndexedDB snapshot compact"
  - "LeavingNowButton accepts optional tripCoords — tiles step skips gracefully when no coordinates available"
metrics:
  duration: "~15 minutes"
  completed: "2026-04-02T04:56:18Z"
  tasks: 2
  files: 7
---

# Phase 10 Plan 02: Tile Prefetch + Offline Write Queue Summary

OSM tile prefetch module with concurrent batch fetching (6 at a time) and IndexedDB offline write queue for checklist check-offs, wired into the "Leaving Now" caching flow as an 8th step labeled "Map tiles".

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create tile-prefetch and offline-write-queue modules with tests | c7ed1f8 | lib/tile-prefetch.ts, lib/offline-write-queue.ts, 2 test files |
| 2 | Wire tile prefetch into cacheTripData, update cache-trip tests | 17f8d01 | lib/cache-trip.ts, lib/__tests__/cache-trip.test.ts, components/LeavingNowButton.tsx |

## What Was Built

### lib/tile-prefetch.ts
OSM Slippy Map tile URL generation using the standard lat/lon-to-tile formula (1/69 degrees per mile approximation, negligible error at 35°N). Key behaviors:
- `getTileUrlsForBoundingBox`: generates tile URLs for a bounding box at configurable zoom levels
- `getTileUrlsWithDestinationDetail`: combines broad area (zoom 10-14, 20mi) and destination detail (zoom 15-16, 1mi) — detail tiles always included first, broad tiles fill remaining 1000-tile cap
- `prefetchTiles`: fetches tiles via `Promise.allSettled` in batches of 6 (not sequential), SW intercepts and caches each response in `tile-cache-v1`
- Exported constants: `TILE_PREFETCH_ZOOM_LEVELS`, `TILE_DESTINATION_ZOOM_LEVELS`, `TILE_PREFETCH_RADIUS_MILES`, `TILE_DESTINATION_RADIUS_MILES`, `TILE_PREFETCH_CONCURRENCY`

### lib/offline-write-queue.ts
IndexedDB queue for offline checklist check-offs using `idb-keyval` with a dedicated store (`outland-queue/writes`). Keys formatted as `check:${checklistId}:${itemId}` for deterministic lookup. Exports `queueCheckOff`, `getPendingWrites`, `removeWrite`, `clearQueue`.

### lib/cache-trip.ts (updated)
Added `'tiles'` as the 8th `CacheStep` with label `'Map tiles'`. `cacheTripData` accepts optional `tripCoords?: { lat: number; lon: number }` — when provided, calls `getTileUrlsWithDestinationDetail` and `prefetchTiles`; when undefined, returns `null` gracefully (step shows "done" not "error").

### components/LeavingNowButton.tsx (updated)
Added optional `tripCoords` prop and passes it through to `cacheTripData`. `DepartureChecklistClient` currently doesn't have location coordinates in props — the prop defaults to `undefined`, so the tiles step is skipped gracefully until coordinates are piped in.

### components/CachingProgressOverlay.tsx (no changes needed)
Already iterates over `CACHE_STEPS` and displays `CACHE_STEP_LABELS[step]` dynamically — adding 'tiles' to those constants was sufficient. "Map tiles" now appears as the 8th step in the overlay automatically.

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| lib/__tests__/tile-prefetch.test.ts | 19 | All passing |
| lib/__tests__/offline-write-queue.test.ts | 6 | All passing |
| lib/__tests__/cache-trip.test.ts | 13 | All passing |

Total: 58 tests passing across full suite.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed getTileUrlsWithDestinationDetail truncating zoom 15-16 tiles**
- **Found during:** Task 1 — test revealed that zoom 10-14 at 20mi radius generates ~1526 tiles, hitting the 1000-tile cap before zoom 15-16 tiles were added
- **Issue:** Original implementation did `[...broadUrls, ...detailUrls].slice(0, 1000)` — broad tiles always consumed the entire cap
- **Fix:** Generate destination detail tiles first, then fill remaining capacity with broad tiles. Detail tiles (small count, high value for campsite scouting) are always preserved
- **Files modified:** lib/tile-prefetch.ts, lib/__tests__/tile-prefetch.test.ts
- **Commit:** c7ed1f8

**2. [Rule 3 - Blocking] Fixed vi.mock hoisting error in offline-write-queue tests**
- **Found during:** Task 1 — vitest hoists `vi.mock` calls to the top of the file, making top-level `const` mock variables unavailable
- **Fix:** Used `vi.hoisted()` to create mock store and functions before the mock factory runs
- **Files modified:** lib/__tests__/offline-write-queue.test.ts
- **Commit:** c7ed1f8

## Known Stubs

- `LeavingNowButton.tripCoords` defaults to `undefined` in `DepartureChecklistClient` — the tiles step will be skipped until coordinates are passed in from the trip's location data. This is intentional and safe (step shows "done" with null data). A future plan should pipe location coordinates through the API and component props to enable proactive tile caching.

## Self-Check: PASSED

All created files exist. Both task commits verified in git log. All 58 tests passing.
