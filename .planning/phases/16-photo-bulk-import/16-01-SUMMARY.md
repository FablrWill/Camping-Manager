---
phase: 16-photo-bulk-import
plan: 01
subsystem: api, ui
tags: [photos, bulk-import, sharp, exif, prisma, vitest, formdata, nextjs]

# Dependency graph
requires:
  - phase: 13-address-review-findings
    provides: existing photo upload pattern (app/api/photos/upload/route.ts), lib/exif.ts extractGps, lib/paths.ts getPhotosDir

provides:
  - /api/photos/bulk-import POST endpoint: single-file handler with EXIF extraction + sharp compression + DB write
  - PhotoUpload component: sequential per-file loop with progress counter "Importing X of Y..."
  - lib/__tests__/bulk-import.test.ts: 3-test vitest suite covering success, no-GPS skip, and per-file error isolation

affects: [photos, spots-map, photo-pins, gps-import]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Single-file-per-request bulk import pattern: client loop + per-file endpoint (vs multipart batch)
    - "@vitest-environment node annotation for Next.js route handler tests requiring Request.formData()"
    - Per-file error isolation: catch per file in loop, aggregate errors, always return HTTP 200

key-files:
  created:
    - lib/__tests__/bulk-import.test.ts
    - app/api/photos/bulk-import/route.ts
  modified:
    - components/PhotoUpload.tsx

key-decisions:
  - "Single-file-per-request over multipart: client sends files one at a time; server endpoint simpler to test and isolates failures"
  - "HTTP 200 on per-file error: batch must continue; non-2xx causes fetch error in client loop, breaking aggregation"
  - "@vitest-environment node required: jsdom does not implement Request.formData() — hangs indefinitely"
  - "onUploadComplete called once after loop (not per file) to avoid redundant map refreshes"

patterns-established:
  - "Node environment for route handler unit tests: annotate with // @vitest-environment node"
  - "Sequential fetch loop in client for per-file progress: setProgress({ current: i+1, total }) before each fetch"

requirements-completed: [PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04, PHOTO-05]

# Metrics
duration: 7min
completed: 2026-04-03
---

# Phase 16 Plan 01: Photo Bulk Import Summary

**Sequential per-file bulk import to /api/photos/bulk-import with real-time "Importing X of Y..." progress counter, EXIF GPS extraction, sharp compression, and per-file error isolation**

## Performance

- **Duration:** 7 min
- **Started:** 2026-04-03T04:09:57Z
- **Completed:** 2026-04-03T04:17:01Z
- **Tasks:** 3 (Task 0: RED tests, Task 1: endpoint, Task 2: UI)
- **Files modified:** 3

## Accomplishments

- Created `/api/photos/bulk-import` POST endpoint accepting one photo at a time via FormData field `photo`
- Added sequential per-file loop to `PhotoUpload` with "Importing X of Y..." progress counter
- Per-file error isolation: bad files get caught and collected without aborting the remaining batch
- `onUploadComplete()` called exactly once after the loop to refresh Spots map pins
- 3-test vitest suite covering success, no-GPS skip, and sharp failure isolation — all passing

## Task Commits

1. **Task 0: Failing tests (RED)** - `c01db4b` (test) + `8d612ce` (test fix: node environment)
2. **Task 1: Bulk-import endpoint** - `688f4f5` (feat)
3. **Task 2: PhotoUpload progress loop** - `aa9464e` (feat)

## Files Created/Modified

- `lib/__tests__/bulk-import.test.ts` - 3 vitest tests for bulk-import endpoint contract
- `app/api/photos/bulk-import/route.ts` - Single-file POST endpoint with EXIF + sharp + prisma
- `components/PhotoUpload.tsx` - Progress state + per-file sequential fetch loop

## Decisions Made

- **Single-file-per-request pattern:** Client sends each file in a separate POST. Simpler server logic, easier to test, natural per-file error isolation without multipart boundary parsing complexity.
- **HTTP 200 on error:** The catch block returns 200 even when sharp or DB fails. A non-2xx status causes `fetch` to not parse JSON in some patterns, and PHOTO-04 requires batch continuation.
- **`@vitest-environment node` annotation:** jsdom's `Request.formData()` hangs indefinitely. Route handler tests for endpoints that parse FormData must use the node environment.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed jsdom FormData hang causing test timeouts**
- **Found during:** Task 0/1 (test verification)
- **Issue:** jsdom environment does not implement `Request.formData()` — all 3 tests timed out at 5000ms
- **Fix:** Added `// @vitest-environment node` to test file; switched `buildRequest` helper to use `NextRequest` (which works with FormData in Node.js); restored sharp mock in `beforeEach` after `vi.clearAllMocks()`
- **Files modified:** `lib/__tests__/bulk-import.test.ts`
- **Verification:** All 3 tests pass in 15ms with node environment
- **Committed in:** `8d612ce`

---

**Total deviations:** 1 auto-fixed (Rule 1 - Bug: test environment incompatibility)
**Impact on plan:** Required fix for tests to run at all. No scope creep.

## Issues Encountered

- `vi.mock('fs/promises', () => ({ mkdir: vi.fn() }))` broke because vitest requires all exports to be present when fully replacing a module. Fixed by using `importOriginal` helper to spread actual exports and override only `mkdir`.
- `vi.clearAllMocks()` clears mock implementations, not just call counts. The sharp and prisma mocks needed re-initialization in `beforeEach` after clearing.

## Known Stubs

None — all data flows are wired. PhotoUpload calls `/api/photos/bulk-import` which writes real records to the DB.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Bulk photo import is fully functional with progress feedback
- Photos with GPS appear on the Spots map after import (onUploadComplete triggers refreshPhotos)
- The old `/api/photos/upload` endpoint remains intact for any other callers
- Phase 16 plan 01 is the only plan in this phase — phase complete

---
*Phase: 16-photo-bulk-import*
*Completed: 2026-04-03*
