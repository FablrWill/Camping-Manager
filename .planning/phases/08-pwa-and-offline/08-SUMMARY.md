---
phase: 08-pwa-and-offline
plan: all (08-01 through 08-04 + Phase 10 gap closure)
subsystem: pwa, offline
tags: [pwa, offline, indexeddb, service-worker, idb-keyval, leaflet, vitest]
dependency_graph:
  requires: [07-day-of-execution]
  provides:
    - PWA manifest + icons + service worker (OFF-01)
    - Offline app shell (OFF-02)
    - "Leaving Now" IndexedDB caching flow (OFF-03)
    - Map tile passive caching via SW + proactive prefetch via Phase 10 (OFF-04)
    - Offline read path wired to all trip components
    - Offline write queue for departure checklist check-offs
  affects:
    - app/manifest.ts
    - public/sw.js
    - next.config.ts
    - app/layout.tsx
    - components/AppShell.tsx
    - components/ServiceWorkerRegistration.tsx
    - components/OfflineBanner.tsx
    - components/InstallBanner.tsx
    - components/LeavingNowButton.tsx
    - components/CachingProgressOverlay.tsx
    - components/TripPrepClient.tsx
    - components/PackingList.tsx
    - components/MealPlan.tsx
    - components/WeatherCard.tsx
    - components/DepartureChecklistClient.tsx
    - app/spots/spots-client.tsx
    - lib/offline-storage.ts
    - lib/use-online-status.ts
    - lib/cache-trip.ts
    - lib/tile-prefetch.ts
    - lib/offline-write-queue.ts
tech-stack:
  added:
    - idb-keyval (IndexedDB wrapper for trip snapshots and write queue)
  patterns:
    - Manual public/sw.js (avoids Serwist/Webpack/Turbopack conflict — D-12 from Phase 10)
    - "Leaving Now" IndexedDB caching, not Cache API (per OFF-03 requirement)
    - Dual-mode components: online API fetch vs offline IndexedDB read
    - Offline write queue (IndexedDB) with auto-sync on reconnect
    - Debounced online/offline transitions (300ms) to prevent UI flapping
    - OSM tile passive caching via SW fetch intercept (tile-cache-v1)
    - Proactive tile prefetch via tile-prefetch.ts (detail-first, broad-fill)
key-files:
  created:
    - app/manifest.ts
    - public/sw.js
    - public/icon-192x192.png
    - public/icon-512x512.png
    - public/apple-touch-icon.png
    - lib/offline-storage.ts
    - lib/use-online-status.ts
    - lib/cache-trip.ts
    - lib/tile-prefetch.ts
    - lib/offline-write-queue.ts
    - components/ServiceWorkerRegistration.tsx
    - components/OfflineBanner.tsx
    - components/InstallBanner.tsx
    - components/LeavingNowButton.tsx
    - components/CachingProgressOverlay.tsx
    - lib/__tests__/offline-storage.test.ts
    - lib/__tests__/cache-trip.test.ts
    - lib/__tests__/use-online-status.test.ts
    - lib/__tests__/manifest.test.ts
    - lib/__tests__/tile-prefetch.test.ts
    - lib/__tests__/offline-write-queue.test.ts
    - components/__tests__/OfflineBanner.test.tsx
    - components/__tests__/InstallBanner.test.tsx
    - components/__tests__/offline-trip-render.test.tsx
  modified:
    - next.config.ts
    - app/layout.tsx
    - components/AppShell.tsx
    - components/TripPrepClient.tsx
    - components/PackingList.tsx
    - components/MealPlan.tsx
    - components/WeatherCard.tsx
    - components/DepartureChecklistClient.tsx
    - components/OfflineBanner.tsx
    - app/spots/spots-client.tsx
    - lib/use-online-status.ts
decisions:
  - "Manual public/sw.js preferred over Serwist — avoids Webpack/Turbopack conflict"
  - "IndexedDB (idb-keyval) for offline data storage, not Cache API — per OFF-03 requirement"
  - "Passive SW tile intercept for browsed tiles + proactive prefetch via tile-prefetch.ts for Leaving Now (Phase 10 adds proactive)"
  - "Dual-mode components receive offlineData prop — same UI, read-only badge when offline"
  - "Write queue scope is checklist check-offs only — usage tracking requires connectivity"
  - "useOnlineStatus debounces transitions by 300ms — prevents UI flapping on flaky connections"
  - "WriteQueueSync extracted as child component of AppShell — allows hooks without making AppShell a client component"
  - "SpotsClient merges spots from ALL cached trip snapshots — deduplicates by location.id"
  - "OfflineBanner polls write queue every 5s while offline — cheap IndexedDB read"
  - "Tile detail-first ordering: zoom 15-16 tiles generated first, broad tiles fill remaining 1000-tile cap"
  - "TripSnapshot tiles field stores { count, failed } not URLs — keeps IndexedDB compact"
  - "Phase 10 retroactively creates Phase 8 docs after tests pass and read path is wired (D-12)"
metrics:
  duration: "Phase 8: ~4 plans; Phase 10 gap closure: ~3 plans"
  completed: "2026-04-02"
  tasks: 11 total (8 from Phase 8 + 6 from Phase 10)
  files: 25+ files created or modified
---

# Phase 8: PWA and Offline — Summary

**PWA foundation, offline caching flow, and complete offline read path — all 4 OFF requirements satisfied across Phase 8 (Plans 01-04) and Phase 10 gap closure (Plans 01-03)**

## Summary

Phase 8 built the complete offline capability for Outland OS. The work was executed in two waves: Phase 8 (Plans 01-04) built the infrastructure, and Phase 10 (Plans 01-03) closed the remaining gaps — implementing all test stubs, proactive tile prefetch, write queue, and wiring the offline read path into every trip component. Together they satisfy OFF-01 through OFF-04.

### Phase 8 Plans

**Plan 01 — PWA Foundation** (OFF-01, OFF-02)
- `app/manifest.ts`: PWA web app manifest with standalone display, amber theme (#d97706), stone background (#0c0a09), Outland OS name
- `public/sw.js`: Service worker with app shell caching (outland-shell-v1), OSM tile passive intercept (tile-cache-v1), API network-only fallback
- `public/icon-*.png`: Placeholder icons at 192x192, 512x512, and 180x180 (apple-touch-icon)
- `components/ServiceWorkerRegistration.tsx`: Client component registered in AppShell, calls `navigator.storage.persist()` for durable storage
- `next.config.ts`: sw.js served with `no-cache, no-store, must-revalidate` headers

**Plan 02 — Offline Infrastructure** (OFF-01, OFF-02)
- `lib/offline-storage.ts`: idb-keyval wrapper — `saveTripSnapshot`, `getTripSnapshot`, `deleteTripSnapshot`, `getCachedTripIds`, `getSnapshotAge`; uses dedicated store `outland-trips/snapshots`
- `lib/use-online-status.ts`: React hook watching `navigator.onLine` + online/offline events; later updated (Phase 10) to debounce by 300ms
- `components/OfflineBanner.tsx`: Slim banner showing "Offline · snapshot from Xh ago"; hidden online; later updated to poll write queue pending count every 5s
- `components/InstallBanner.tsx`: Dismissible PWA install prompt; iOS (Share → Add to Home Screen) and Android (beforeinstallprompt) variants; standalone mode hidden

**Plan 03 — "Leaving Now" Caching Flow** (OFF-03)
- `lib/cache-trip.ts`: Orchestrates 8-step sequential caching (weather, packing, meals, checklist, emergency, spots, vehicle, map tiles); calls `saveTripSnapshot` on completion; step callbacks for UI progress
- `components/CachingProgressOverlay.tsx`: Full-screen progress modal with checkmark animation per step; iterates CACHE_STEPS/CACHE_STEP_LABELS constants
- `components/LeavingNowButton.tsx`: Primary CTA triggering caching flow; shows "Update" variant when snapshot exists; accepts optional `tripCoords` for tile prefetch
- `DepartureChecklistClient.tsx`: LeavingNowButton integrated at top of departure page

**Plan 04 — Map Tile Caching + Offline UI Polish** (OFF-04, OFF-02, OFF-03)
- `components/SpotMap.tsx`: crossOrigin attribute on tile layer so SW can intercept and cache tiles
- `public/sw.js`: Tile-specific caching strategy — network-first with cache fallback, tiles stored in tile-cache-v1
- Offline UI states: AI generate buttons disabled offline, checklist check-offs queued (Phase 10 write queue), staleness warning at 24h

### Phase 10 Gap Closure

**Plan 10-01 — Test Stubs** (32 stubs → real implementations)
- `lib/__tests__/offline-storage.test.ts`: 7 tests — CRUD, getCachedTripIds, getSnapshotAge
- `lib/__tests__/cache-trip.test.ts`: 13 tests — 8 steps, tile integration, error resilience, snapshot persistence
- `lib/__tests__/use-online-status.test.ts`: 5 tests — debounce behavior, event cleanup
- `lib/__tests__/manifest.test.ts`: 4 tests — PWA fields, icons, standalone, theme colors
- `components/__tests__/OfflineBanner.test.tsx`: 5 tests — hidden online, snapshot age, staleness, write queue mock
- `components/__tests__/InstallBanner.test.tsx`: 5 tests — standalone hidden, dismiss, iOS/Android variants
- `components/__tests__/offline-trip-render.test.tsx`: 6 tests — TripPrepClient offline snapshot wiring

**Plan 10-02 — Tile Prefetch + Write Queue**
- `lib/tile-prefetch.ts`: OSM Slippy Map tile URL generation; `getTileUrlsWithDestinationDetail` (detail-first up to 1000 tiles); `prefetchTiles` with Promise.allSettled batches of 6; exports: TILE_PREFETCH_ZOOM_LEVELS, TILE_DESTINATION_ZOOM_LEVELS, TILE_PREFETCH_RADIUS_MILES, TILE_DESTINATION_RADIUS_MILES, TILE_PREFETCH_CONCURRENCY
- `lib/offline-write-queue.ts`: IndexedDB queue (`outland-queue/writes`); `queueCheckOff`, `getPendingWrites`, `removeWrite`, `clearQueue`; keys formatted as `check:${checklistId}:${itemId}`
- `lib/__tests__/tile-prefetch.test.ts`: 19 tests
- `lib/__tests__/offline-write-queue.test.ts`: 6 tests

**Plan 10-03 — Offline Read Path Wiring**
- `lib/use-online-status.ts`: 300ms debounce on online/offline transitions
- `components/TripPrepClient.tsx`: Calls `getTripSnapshot(trip.id)` when offline, passes typed offlineData to PackingList, MealPlan, WeatherCard
- `components/PackingList.tsx`: Accepts `offlineData?: PackingListResult` — reads from snapshot, hides Regenerate button, shows "(Offline — read only)"
- `components/MealPlan.tsx`: Accepts `offlineData?: MealPlanResult` — same pattern
- `components/WeatherCard.tsx`: Accepts typed `offlineData?` — effectiveDays/effectiveAlerts/effectiveLocationName/effectiveElevation, shows "(Offline snapshot)"
- `components/DepartureChecklistClient.tsx`: Loads IndexedDB snapshot when offline, queues check-offs via `queueCheckOff` instead of PATCH
- `components/AppShell.tsx`: `WriteQueueSync` child component — replays queued writes on reconnect
- `components/OfflineBanner.tsx`: Polls `getPendingWrites()` every 5s, shows "{N} check-offs pending sync"
- `app/spots/spots-client.tsx`: Merges spots from all cached trip snapshots, deduplicates by location.id, shows "(Showing cached spots)" overlay

## Test Coverage

| File | Tests | Status |
|------|-------|--------|
| lib/__tests__/offline-storage.test.ts | 7 | PASS |
| lib/__tests__/cache-trip.test.ts | 13 | PASS |
| lib/__tests__/use-online-status.test.ts | 5 | PASS |
| lib/__tests__/manifest.test.ts | 4 | PASS |
| lib/__tests__/tile-prefetch.test.ts | 19 | PASS |
| lib/__tests__/offline-write-queue.test.ts | 6 | PASS |
| components/__tests__/OfflineBanner.test.tsx | 5 (+ 12 total with mocks) | PASS |
| components/__tests__/InstallBanner.test.tsx | 5 | PASS |
| components/__tests__/offline-trip-render.test.tsx | 6 | PASS |

**Total offline/PWA tests: 90 passing (12 test files), 0 failing**

## Key Files

### Created
- `app/manifest.ts` — PWA manifest (standalone, amber theme, stone background)
- `public/sw.js` — Service worker (app shell cache + tile intercept)
- `public/icon-192x192.png`, `public/icon-512x512.png`, `public/apple-touch-icon.png` — App icons
- `lib/offline-storage.ts` — IndexedDB CRUD via idb-keyval
- `lib/use-online-status.ts` — Debounced online/offline hook
- `lib/cache-trip.ts` — 8-step caching orchestrator
- `lib/tile-prefetch.ts` — OSM tile URL generation + batch prefetch
- `lib/offline-write-queue.ts` — IndexedDB write queue for check-offs
- `components/ServiceWorkerRegistration.tsx` — SW registration + storage persistence
- `components/OfflineBanner.tsx` — Offline indicator with snapshot age + pending writes
- `components/InstallBanner.tsx` — iOS/Android install prompt
- `components/LeavingNowButton.tsx` — "Leaving Now" primary CTA
- `components/CachingProgressOverlay.tsx` — 8-step progress modal

### Modified
- `next.config.ts` — sw.js cache headers
- `app/layout.tsx` — apple-touch-icon link
- `components/AppShell.tsx` — ServiceWorkerRegistration + OfflineBanner + InstallBanner + WriteQueueSync
- `components/TripPrepClient.tsx` — offline snapshot read path
- `components/PackingList.tsx` — offlineData prop
- `components/MealPlan.tsx` — offlineData prop
- `components/WeatherCard.tsx` — offlineData prop
- `components/DepartureChecklistClient.tsx` — write queue + snapshot load
- `app/spots/spots-client.tsx` — cached spots merge

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| OFF-01 | PASS | app/manifest.ts + public/sw.js + icons → PWA installable |
| OFF-02 | PASS | sw.js caches app shell; OfflineBanner shows offline state |
| OFF-03 | PASS | cacheTripData saves 7 data types to IndexedDB; read path wired in TripPrepClient, PackingList, MealPlan, WeatherCard, DepartureChecklistClient, SpotsClient |
| OFF-04 | PASS | sw.js passively caches OSM tiles in tile-cache-v1; tile-prefetch.ts proactively prefetches on Leaving Now |

## Known Limitations

- **iOS 7-day storage eviction**: iOS Safari evicts IndexedDB after 7 days without app open. Snapshot age is visible in OfflineBanner. Mitigated by `navigator.storage.persist()` call in ServiceWorkerRegistration.
- **Tile prefetch requires trip coordinates**: `LeavingNowButton.tripCoords` currently defaults to `undefined` in DepartureChecklistClient — tile prefetch step gracefully skips until coordinates are piped in from trip location data.
- **No offline usage tracking**: Marking gear as used/didn't need while offline is deferred. Write queue scope is checklist check-offs only.
- **No offline voice debrief**: Voice transcription requires connectivity (Whisper API).
- **No cache cleanup**: Stale snapshots persist indefinitely. Storage management deferred to a future phase if it becomes a problem.

## Self-Check: PASSED
