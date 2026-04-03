---
phase: 20-live-location-sharing
plan: "01"
subsystem: backend
tags: [location-sharing, prisma, api-routes, tdd]
dependency_graph:
  requires: []
  provides:
    - SharedLocation Prisma model + migration
    - lib/share-location.ts (generateSlug, timeAgo, upsertSharedLocation, deleteSharedLocation)
    - POST /api/share/location (upsert, returns slug + url)
    - GET /api/share/location (own record fetch)
    - DELETE /api/share/location (idempotent removal)
    - GET /api/share/location/[slug] (public read-only, 404 on miss)
  affects: []
tech_stack:
  added: []
  patterns:
    - Singleton upsert pattern (findFirst + create/update) for SharedLocation
    - force-dynamic on public slug route to prevent stale caching
    - Pure helper functions accepting prismaClient argument for testability
key_files:
  created:
    - prisma/migrations/20260403010541_add_shared_location/migration.sql
    - lib/share-location.ts
    - tests/share-location.test.ts
    - app/api/share/location/route.ts
    - app/api/share/location/[slug]/route.ts
  modified:
    - prisma/schema.prisma
decisions:
  - SharedLocation uses singleton pattern (findFirst not findUnique by id) — same approach as Settings model; one row max
  - upsertSharedLocation/deleteSharedLocation accept prismaClient argument — pure helpers are testable without real DB
  - force-dynamic on public slug route — family/friends must see fresh data, not a stale pre-rendered page
  - Slug is 11 chars (8 random bytes → base64url) — matches existing upload route pattern, URL-safe, hard to guess
metrics:
  duration: 383s
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 5
  files_modified: 1
---

# Phase 20 Plan 01: SharedLocation Backend — Summary

**One-liner:** SharedLocation Prisma model with singleton upsert API, public slug read endpoint, and 10 passing Vitest unit tests for slug generation, timeAgo, upsert logic, and delete logic using mocked Prisma clients.

## What Was Built

- **SharedLocation model** appended to `prisma/schema.prisma` — id (cuid), slug (unique), lat, lon, label?, updatedAt, createdAt
- **Migration** `20260403010541_add_shared_location` applied successfully via `prisma migrate deploy`
- **`lib/share-location.ts`** — four exported functions:
  - `generateSlug()` — 8 random bytes → 11-char base64url string
  - `timeAgo(date)` — human-readable elapsed time (30s ago / 1m ago / 2h ago / 2d ago)
  - `upsertSharedLocation(prismaClient, data)` — singleton upsert, slug preserved on update
  - `deleteSharedLocation(prismaClient)` — idempotent delete, returns `{ deleted: boolean }`
- **`app/api/share/location/route.ts`** — GET (own record), POST (upsert, validates lat/lon, returns slug + url), DELETE
- **`app/api/share/location/[slug]/route.ts`** — public read-only, `force-dynamic`, 404 on miss

## Tests

All 10 tests pass in `tests/share-location.test.ts`:

- `generateSlug` returns 11-char URL-safe string; two calls return different values
- `timeAgo` returns correct strings for 30s, 1m, 2h, 2d
- 404 branch logic verified
- Upsert with no existing record → calls `create`, slug is non-empty
- Upsert with existing record → calls `update`, slug unchanged
- Delete with existing record → calls `delete`; subsequent GET returns null (404)

## Deviations from Plan

**Auto-fixed Issues**

**1. [Rule 1 - Bug] TypeScript type cast error in test mocks**
- **Found during:** Task 2 type-check verification
- **Issue:** `mockPrisma as Parameters<typeof upsertSharedLocation>[0]` failed TS strict check — mock type doesn't overlap with Prisma client shape
- **Fix:** Changed to `mockPrisma as unknown as Parameters<...>[0]` — standard pattern for mocking complex Prisma types in tests
- **Files modified:** tests/share-location.test.ts
- **Commit:** a64eb33

**2. [Rule 3 - Blocking] Migration needed manual creation + prisma migrate deploy**
- **Found during:** Task 1 migration step
- **Issue:** `prisma migrate dev` requires interactive TTY; non-interactive CI/shell environment rejected it
- **Fix:** Created migration SQL file manually, ran `prisma migrate deploy` (non-interactive equivalent for applying pending migrations)
- **Files modified:** prisma/migrations/20260403010541_add_shared_location/migration.sql (created manually)
- **Commit:** 10b838a

**3. [Rule 3 - Blocking] Missing .env file in worktree**
- **Found during:** Task 1 migration step
- **Issue:** Worktree had no `.env` file; Prisma couldn't find DATABASE_URL
- **Fix:** Created `.env` in worktree with same values as main project root `.env`
- **Files modified:** .env (created, gitignored)
- **Note:** `.env` is gitignored and not committed — expected worktree setup behavior

## Pre-Existing Issues (Out of Scope)

The `/trips` page has a pre-existing Prisma prerender failure in the worktree (`P2022: column main.Trip.emergencyContactName does not exist`). This is because the worktree's fresh `dev.db` only has migrations applied up to this plan — it does not have the full historical seed data from the production database. This error exists independent of our changes and does not affect the TypeScript type-check (which passed clean) or the tests.

## Known Stubs

None — all exported functions are fully implemented.

## Self-Check: PASSED

All created files exist on disk:
- prisma/schema.prisma contains `model SharedLocation` — FOUND
- prisma/migrations/20260403010541_add_shared_location/migration.sql — FOUND
- lib/share-location.ts — FOUND
- tests/share-location.test.ts — FOUND
- app/api/share/location/route.ts — FOUND
- app/api/share/location/[slug]/route.ts — FOUND

Commits verified:
- 10b838a (Task 1: schema + migration + lib + tests) — FOUND
- a64eb33 (Task 2: API routes + test type fix) — FOUND
