---
phase: 10-offline-read-path
plan: "03"
subsystem: offline
tags: [offline, pwa, indexeddb, write-queue, react, tripprep, spotsmap]
dependency_graph:
  requires: [10-01, 10-02]
  provides: [offline-read-path-wired, offline-write-queue-wired, appshell-sync]
  affects:
    - components/TripPrepClient.tsx
    - components/PackingList.tsx
    - components/MealPlan.tsx
    - components/WeatherCard.tsx
    - components/DepartureChecklistClient.tsx
    - components/AppShell.tsx
    - components/OfflineBanner.tsx
    - app/spots/spots-client.tsx
    - lib/use-online-status.ts
tech-stack:
  added: []
  patterns:
    - "offlineData prop pattern for dual-mode online/offline rendering"
    - "useEffect cancelled=true pattern for async cleanup in offline loaders"
    - "WriteQueueSync compound component pattern — sync logic extracted to child of AppShell"
    - "Debounced event listener pattern in custom hook (300ms setTimeout + clearTimeout)"
key-files:
  created: []
  modified:
    - lib/use-online-status.ts
    - components/TripPrepClient.tsx
    - components/PackingList.tsx
    - components/MealPlan.tsx
    - components/WeatherCard.tsx
    - components/DepartureChecklistClient.tsx
    - components/AppShell.tsx
    - components/OfflineBanner.tsx
    - app/spots/spots-client.tsx
    - lib/__tests__/use-online-status.test.ts
    - components/__tests__/OfflineBanner.test.tsx
key-decisions:
  - "WriteQueueSync extracted as child component inside AppShell to allow hooks at component level without making AppShell itself a client component"
  - "TripPrepClient passes typed snapshot fields (not raw unknown) — uses `as import()` inline cast to avoid re-importing types at module level"
  - "DepartureChecklistClient load-on-mount useEffect depends on [tripId, offlineChecklist] — triggers setChecklist from snapshot state when offline"
  - "SpotsClient merges spots from ALL cached trips (not just first) — deduplicates by location.id before passing to SpotMap"
  - "OfflineBanner re-checks write queue every 5s while offline — cheap IndexedDB read, acceptable polling interval"

metrics:
  duration: "~3 min"
  completed: "2026-04-02T05:08:00Z"
  tasks: 2
  files: 11
---

# Phase 10 Plan 03: Offline Read Path Wiring Summary

**Offline data path fully wired — getTripSnapshot is now called by TripPrepClient, DepartureChecklistClient, and SpotsClient; write queue hooked into handleCheck; AppShell syncs on reconnect; OfflineBanner shows pending count**

## Performance

- **Duration:** ~3 min
- **Completed:** 2026-04-02T05:08:00Z
- **Tasks:** 2
- **Files modified:** 11 (9 components/lib, 2 test files)

## Accomplishments

### Task 1: useOnlineStatus debounce + TripPrepClient snapshot + PackingList/MealPlan/WeatherCard dual-mode
- `useOnlineStatus` now debounces online/offline transitions by 300ms — cancels pending transition if opposite event fires, preventing UI flapping
- `TripPrepClient` calls `getTripSnapshot(trip.id)` when offline, nulls it out on reconnect, passes typed offlineData to PackingList, MealPlan, and WeatherCard
- `PackingList` accepts `offlineData?: PackingListResult` — skips API fetch and initializes from snapshot, hides Regenerate button, shows "(Offline — read only)"
- `MealPlan` accepts `offlineData?: MealPlanResult` — same pattern as PackingList
- `WeatherCard` accepts typed `offlineData?:` — uses effectiveDays/effectiveAlerts/effectiveLocationName/effectiveElevation from snapshot, shows "(Offline snapshot)" indicator
- All 6 planned tests in `offline-trip-render.test.tsx` now pass (previously tests 3-6 were RED)

### Task 2: DepartureChecklistClient write queue + AppShell sync + OfflineBanner pending count + SpotsClient cached spots
- `DepartureChecklistClient` loads from IndexedDB snapshot when offline (falls back to `getTripSnapshot` if no offlineData prop), queues check-offs via `queueCheckOff` instead of firing PATCH
- `AppShell` contains `WriteQueueSync` component that replays queued writes on reconnect — runs app-wide regardless of which page is mounted
- `OfflineBanner` reads `getPendingWrites()` and shows "{N} check-offs pending sync" — polls every 5s while offline
- `SpotsClient` merges spots from ALL cached trip snapshots using `getCachedTripIds()` + `getTripSnapshot()` loop, deduplicates by location id, shows "(Showing cached spots)" overlay when offline

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Debounce useOnlineStatus + TripPrepClient snapshot + PackingList/MealPlan/WeatherCard offlineData | 8a2abe1 | 6 files |
| 2 | DepartureChecklistClient write queue + AppShell sync + OfflineBanner pending count + SpotsClient cached spots | 5ca5725 | 5 files |

## Files Modified

- `lib/use-online-status.ts` — 300ms debounce on online/offline events, clearTimeout in both handlers and cleanup
- `components/TripPrepClient.tsx` — useOnlineStatus + getTripSnapshot + offlineSnapshot state, passes offlineData to 3 children
- `components/PackingList.tsx` — offlineData?: PackingListResult prop, early return in useEffect, hide Regenerate button
- `components/MealPlan.tsx` — offlineData?: MealPlanResult prop, early return in useEffect, hide Regenerate button
- `components/WeatherCard.tsx` — offlineData?: typed shape prop, effectiveDays/effectiveAlerts/effectiveLocationName/effectiveElevation
- `components/DepartureChecklistClient.tsx` — offline snapshot loading, queueCheckOff in handleCheck when offline
- `components/AppShell.tsx` — WriteQueueSync child component with useOnlineStatus + getPendingWrites + removeWrite
- `components/OfflineBanner.tsx` — pendingCount state, getPendingWrites polling every 5s
- `app/spots/spots-client.tsx` — useOnlineStatus + getCachedTripIds + getTripSnapshot loop, effectiveLocations merge
- `lib/__tests__/use-online-status.test.ts` — updated for debounce with vi.useFakeTimers() + vi.advanceTimersByTime(300)
- `components/__tests__/OfflineBanner.test.tsx` — added vi.mock for offline-write-queue (Rule 1 fix)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Missing offline-write-queue mock in OfflineBanner tests**
- **Found during:** Task 2 — full test suite run revealed OfflineBanner tests failing with idb-keyval errors
- **Issue:** OfflineBanner now imports from `@/lib/offline-write-queue` which uses `idb-keyval`. Existing tests didn't mock the new import.
- **Fix:** Added `vi.mock('@/lib/offline-write-queue', () => ({ getPendingWrites: vi.fn(() => Promise.resolve([])) }))` to the test file
- **Files modified:** components/__tests__/OfflineBanner.test.tsx
- **Verification:** All 12 test files pass, 90 tests green
- **Committed in:** 5ca5725

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Trivial. Test-only fix, zero impact on implementation.

## Known Stubs

None — all offline data paths are wired. The DepartureChecklistClient `offlineData` prop is optional and currently not passed from any parent (the component self-loads from IndexedDB when offline), which is intentional and documented in the plan spec.

## Self-Check: PASSED
