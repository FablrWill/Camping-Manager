---
phase: 22-plan-fallback-chain
plan: 01
subsystem: database
tags: [prisma, sqlite, self-relation, api, fallback-chain]

# Dependency graph
requires:
  - phase: 21-permit-reservation
    provides: permitUrl/permitNotes fields on Trip model (migration pattern confirmed)
provides:
  - fallbackFor and fallbackOrder fields on Trip model
  - FallbackChain Prisma self-relation enabling _count.alternatives
  - GET /api/trips/[id]/alternatives endpoint returning ordered fallbacks
  - POST /api/trips accepts fallbackFor + fallbackOrder for creating linked fallback trips
  - DELETE /api/trips/[id] pre-clears fallbackFor on alternatives before deleting primary
affects: [22-02, 22-03, trip-card, trips-client, trip-prep-client]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Manual pre-delete SetNull for SQLite self-relation FK cleanup
    - Bi-directional Prisma self-relation using named @relation("FallbackChain")
    - Manually created migration SQL to bypass Prisma migrate dev FTS warning

key-files:
  created:
    - prisma/migrations/20260403110000_add_fallback_chain/migration.sql
    - app/api/trips/[id]/alternatives/route.ts
  modified:
    - prisma/schema.prisma
    - app/api/trips/route.ts
    - app/api/trips/[id]/route.ts

key-decisions:
  - "Used manually created migration SQL instead of prisma migrate dev because FTS virtual tables triggered a non-interactive warning that blocked automated migration"
  - "onDelete: NoAction on self-relation (not SetNull) — SQLite/Prisma limitation; manual updateMany in DELETE handler handles FK cleanup"
  - "fallbackFor is a plain String? field with a @relation directive for Prisma _count support"

patterns-established:
  - "Pattern: Pre-delete SetNull — use prisma.trip.updateMany({ where: { fallbackFor: id }, data: { fallbackFor: null } }) before prisma.trip.delete() for manual referential integrity"
  - "Pattern: Self-relation _count requires bi-directional @relation directives on both sides"

requirements-completed: [FALLBACK-01, FALLBACK-02, FALLBACK-04, FALLBACK-05]

# Metrics
duration: 3min
completed: 2026-04-03
---

# Phase 22 Plan 01: Fallback Chain Schema + API Routes Summary

**Prisma self-relation FallbackChain with ALTER TABLE migration, enabling Plan B/C trip linking via fallbackFor/fallbackOrder fields and a dedicated alternatives endpoint**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-03T15:57:35Z
- **Completed:** 2026-04-03T16:00:36Z
- **Tasks:** 2
- **Files modified:** 4 (3 modified + 1 created)

## Accomplishments

- Trip model gains `fallbackFor String?` and `fallbackOrder Int?` fields with FallbackChain self-relation
- Migration applied using ALTER TABLE (not table recreation) with a `Trip_fallbackFor_idx` index
- GET /api/trips/[id]/alternatives returns alternatives ordered by fallbackOrder
- All trip CRUD routes updated to include `_count.alternatives` and accept/persist fallback fields
- DELETE pre-clears alternatives' fallbackFor before deleting to maintain referential integrity

## Task Commits

1. **Task 1: Prisma schema migration — add fallback fields + self-relation** - `269ea01` (feat)
2. **Task 2: Update trip CRUD routes + create alternatives endpoint** - `2dfb0df` (feat)

## Files Created/Modified

- `prisma/schema.prisma` - Added fallbackFor, fallbackOrder fields + FallbackChain self-relation to Trip model
- `prisma/migrations/20260403110000_add_fallback_chain/migration.sql` - ALTER TABLE migration + index
- `app/api/trips/route.ts` - GET/POST updated with _count.alternatives and fallback fields
- `app/api/trips/[id]/route.ts` - GET/PUT/DELETE updated with _count.alternatives, fallback fields, pre-delete SetNull
- `app/api/trips/[id]/alternatives/route.ts` - NEW: GET endpoint returning alternatives ordered by fallbackOrder

## Decisions Made

- Used manually created migration SQL (not `prisma migrate dev`) because the FTS virtual tables in the database caused a non-interactive TTY warning that blocked the automated migration. The migration SQL uses `ALTER TABLE ADD COLUMN` per the established project pattern.
- `onDelete: NoAction` on the self-relation — SQLite/Prisma does not support `onDelete: SetNull` for self-relations; manual `updateMany` in DELETE handler provides the same safety.

## Deviations from Plan

None - plan executed exactly as written. The migration creation method (manual SQL vs. `prisma migrate dev`) was anticipated in the plan's CRITICAL note and the research file's Pitfall 1.

## Issues Encountered

- `prisma migrate dev` blocked in non-interactive shell with FTS table drop warning. Resolved by creating migration SQL manually (documented in research as Pitfall 1) and applying via `prisma migrate deploy`.

## Known Stubs

None - all fields are wired to real database columns. The alternatives endpoint returns live data.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Data layer complete for Phase 22 UI plans (22-02, 22-03)
- `_count.alternatives` available in all trip list/detail responses
- `GET /api/trips/[id]/alternatives` endpoint ready for TripPrepClient to consume
- POST /api/trips accepts fallbackFor + fallbackOrder for "Add Plan B" flow

---
*Phase: 22-plan-fallback-chain*
*Completed: 2026-04-03*
