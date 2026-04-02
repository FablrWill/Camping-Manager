---
phase: 10-offline-read-path
plan: 01
subsystem: testing
tags: [vitest, idb-keyval, react-testing-library, pwa, offline, service-worker]

requires:
  - phase: 08-pwa-and-offline
    provides: offline-storage.ts, cache-trip.ts, use-online-status.ts, OfflineBanner, InstallBanner implementations

provides:
  - 22 passing lib tests (offline-storage, cache-trip, useOnlineStatus, manifest)
  - 10 passing component tests (OfflineBanner, InstallBanner)
  - offline-trip-render.test.tsx scaffold for Plan 10-03 verification (6 tests, 1 passing pre-10-03)

affects: [10-offline-read-path]

tech-stack:
  added: []
  patterns:
    - vi.mock('idb-keyval') pattern for offline-storage tests
    - renderHook + act() pattern for custom hook testing
    - Component test mock pattern with vi.mock for useOnlineStatus + offline-storage

key-files:
  created:
    - components/__tests__/offline-trip-render.test.tsx
  modified:
    - lib/__tests__/offline-storage.test.ts
    - lib/__tests__/cache-trip.test.ts
    - lib/__tests__/use-online-status.test.ts
    - lib/__tests__/manifest.test.ts
    - components/__tests__/OfflineBanner.test.tsx
    - components/__tests__/InstallBanner.test.tsx

key-decisions:
  - "offline-trip-render.test.tsx tests 3-6 intentionally RED — they validate Plan 10-03 offlineData prop wiring, not current behavior"
  - "cache-trip tests do NOT test 'tiles' step — Plan 10-02 adds that step and updates tests"
  - "iOS InstallBanner test uses getAllByText (multiple matching elements) instead of getByText"

patterns-established:
  - "vi.mock('idb-keyval') at file top, import mocked fns after mock declaration"
  - "beforeEach(() => vi.clearAllMocks()) in every test file"
  - "getTripSnapshot mock returns full TripSnapshot shape to satisfy TypeScript"

requirements-completed: [OFF-01, OFF-02, OFF-03]

duration: 12min
completed: 2026-04-02
---

# Phase 10 Plan 01: Test Stub Implementation Summary

**32 offline/PWA test stubs implemented across 6 files using vi.mock(idb-keyval) + renderHook patterns, plus offline-trip-render.test.tsx scaffold for Plan 10-03 verification**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-02T00:54:03Z
- **Completed:** 2026-04-02T01:02:00Z
- **Tasks:** 2
- **Files modified:** 7 (6 modified, 1 created)

## Accomplishments

- Replaced all 32 `it.todo()` stubs with real assertions — zero stubs remain in any test file
- 22 lib tests pass: offline-storage CRUD, cache-trip step orchestration, useOnlineStatus hook events, PWA manifest fields
- 10 component tests pass: OfflineBanner renders nothing online / shows snapshot age offline, InstallBanner standalone/iOS/Android/dismiss behavior
- Created `offline-trip-render.test.tsx` scaffold with 6 tests for Plan 10-03 TripPrepClient offline data wiring

## Task Commits

1. **Task 1: Implement lib test stubs** - `f1849cf` (test)
2. **Task 2: Implement component test stubs + offline-trip-render scaffold** - `d966d05` (test)

## Files Created/Modified

- `lib/__tests__/offline-storage.test.ts` — 7 tests: saveTripSnapshot, getTripSnapshot, deleteTripSnapshot, getCachedTripIds, getSnapshotAge
- `lib/__tests__/cache-trip.test.ts` — 6 tests: step updates, 7-step coverage, error handling, snapshot save, CACHE_STEPS/LABELS constants
- `lib/__tests__/use-online-status.test.ts` — 5 tests: online/offline state, event listeners, cleanup on unmount
- `lib/__tests__/manifest.test.ts` — 4 tests: name, icons (192+512), standalone display, theme/bg colors
- `components/__tests__/OfflineBanner.test.tsx` — 5 tests: hidden online, shows offline text, WifiOff icon, snapshot age, staleness warning
- `components/__tests__/InstallBanner.test.tsx` — 5 tests: standalone hidden, localStorage dismiss, iOS instructions, Android install button, dismiss handler
- `components/__tests__/offline-trip-render.test.tsx` — 6-test scaffold: getTripSnapshot call patterns + offlineData prop assertions (tests 3-6 RED until Plan 10-03)

## Decisions Made

- Tests 3-6 in offline-trip-render.test.tsx are intentionally RED — they are pre-written for Plan 10-03's offlineData prop implementation
- cache-trip tests only cover 7 current CacheStep values; Plan 10-02 adds 'tiles' step and is responsible for adding that test
- iOS test uses `getAllByText` (not `getByText`) because the component renders "Add to Home Screen" in two places

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed iOS InstallBanner test to use getAllByText**
- **Found during:** Task 2 (InstallBanner component tests)
- **Issue:** Component renders "Add to Home Screen" text in both the heading and the instructions paragraph — `getByText(/Add to Home Screen/i)` throws "multiple elements found"
- **Fix:** Changed to `getAllByText(...).length > 0` and switched to `getByText(/Tap the Share button/i)` for the secondary assertion
- **Files modified:** components/__tests__/InstallBanner.test.tsx
- **Verification:** `npx vitest run components/__tests__/InstallBanner.test.tsx` exits 0
- **Committed in:** d966d05

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug)
**Impact on plan:** Trivial fix. No scope creep.

## Issues Encountered

- `npx` not on `PATH` in bash context — resolved by using `export PATH="/opt/homebrew/bin:$PATH"` prefix
- offline-trip-render scaffold tests 2-6 fail as expected (TripPrepClient doesn't yet have offline logic) — this is by design per the plan spec

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All 32 D-11 stubs implemented — Plan 10-02 can proceed to add 'tiles' step
- offline-trip-render.test.tsx scaffold ready for Plan 10-03 to make green
- No blockers for Plans 10-02 or 10-03

## Self-Check: PASSED

Files created:
- FOUND: components/__tests__/offline-trip-render.test.tsx

Files modified (all exist):
- FOUND: lib/__tests__/offline-storage.test.ts
- FOUND: lib/__tests__/cache-trip.test.ts
- FOUND: lib/__tests__/use-online-status.test.ts
- FOUND: lib/__tests__/manifest.test.ts
- FOUND: components/__tests__/OfflineBanner.test.tsx
- FOUND: components/__tests__/InstallBanner.test.tsx

Commits:
- FOUND: f1849cf
- FOUND: d966d05

---
*Phase: 10-offline-read-path*
*Completed: 2026-04-02*
