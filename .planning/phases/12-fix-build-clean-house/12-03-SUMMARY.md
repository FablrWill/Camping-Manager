# Plan 12-03 Summary: Implement Test Stubs

## What Was Done

Replaced all 7 `it.todo` stubs across two test files with real route-level test implementations. Removed 2 low-value array-only tests per BUILD-09/D-06.

## Files Modified

- `tests/usage-tracking.test.ts` — 5 stubs implemented + 2 low-value tests removed
- `tests/trip-summary.test.ts` — 2 stubs implemented

## Tests Implemented

### usage-tracking.test.ts
- PATCH updates `usageStatus` to `"used"` → calls prisma with correct where/data, returns 200
- PATCH updates `usageStatus` to `"didn't need"` → same pattern
- PATCH updates `usageStatus` to `"forgot but needed"` → same pattern
- PATCH with non-existent tripId_gearId → P2025 error caught as 500 (matches actual route behavior)
- GET /api/packing-list → response includes `usageState` map alongside `packedState`

### trip-summary.test.ts
- POST /api/trips/[id]/feedback → returns cached existing summary with `{ cached: true }`
- POST /api/trips/[id]/feedback → returns 400 when packing items have null `usageStatus`

## Tests Removed (Low-Value)
- `validates usageStatus must be one of the allowed values` — tested a hardcoded array literal, not the route
- `usageState type is Record<string, string | null>` — tested a locally-constructed object, not the API

## Verification

- `grep -rc "it.todo" tests/` → 0 across all files
- `npx vitest run tests/usage-tracking.test.ts tests/trip-summary.test.ts` → 15 passed
- `npm test` → 95 tests passed, 0 failures
