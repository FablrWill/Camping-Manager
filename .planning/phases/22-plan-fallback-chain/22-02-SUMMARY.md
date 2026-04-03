---
phase: 22-plan-fallback-chain
plan: 02
subsystem: trips-ui
tags: [fallback-chain, trip-card, trips-client, ui-badges]
dependency_graph:
  requires: [22-01]
  provides: [fallback-chain-ui]
  affects: [components/TripCard.tsx, components/TripsClient.tsx, app/trips/page.tsx]
tech_stack:
  added: []
  patterns: [optimistic-update, badge-ui, fallback-form-state]
key_files:
  created: []
  modified:
    - components/TripCard.tsx
    - components/TripsClient.tsx
    - app/trips/page.tsx
decisions:
  - "Add Plan B/C button placed in TripsClient (not TripCard) to keep TripCard interface minimal"
  - "Fallback state cleared on both form success and cancel to prevent stale context"
  - "Optimistic _count.alternatives increment uses immutable spread pattern"
  - "app/trips/page.tsx updated to include alternatives in _count query to avoid TS mismatch"
metrics:
  duration: "~15 min"
  completed: "2026-04-03T16:13:00Z"
  tasks_completed: 2
  files_changed: 3
---

# Phase 22 Plan 02: Fallback Chain UI (TripCard + TripsClient) Summary

**One-liner:** Trip card badge system showing +NB alternatives count and Plan B/C labels, with "Add Plan B/C" button that pre-fills fallback form context.

## What Was Built

Added fallback chain UI to the trips page:

1. **TripCard badges** - Two new visual indicators:
   - Plan B/C amber pill label (shown when `trip.fallbackFor` is set)
   - +NB alternatives count badge (shown when primary trip has alternatives)

2. **TripsClient Add Plan B/C flow**:
   - `openAddFallback()` handler computes next `fallbackOrder` (2=B, 3=C) and sets form state
   - Context banner in create form showing "Creating as Plan B for [trip name]"
   - `fallbackFor` + `fallbackOrder` included in POST body
   - Optimistic `_count.alternatives + 1` update after successful create
   - Fallback state cleared on success and cancel

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] app/trips/page.tsx missing `alternatives` in _count query**
- **Found during:** Task 2 TypeScript verification
- **Issue:** After updating `TripsClient.TripData._count` to require `alternatives: number`, the server-side page query `_count: { select: { packingItems, photos } }` caused TS2322 mismatch
- **Fix:** Added `alternatives: true` to the `_count` select in `app/trips/page.tsx`
- **Files modified:** app/trips/page.tsx
- **Commit:** 3c20189

### Additional Work: Plan 22-01 Executed as Prerequisite

Plan 22-02 depends on 22-01 (DB schema + API), but 22-01 had not been executed. The schema fields (`fallbackFor`, `fallbackOrder`) and API route changes were required for 22-02's UI to compile and function.

**Executed as part of this session:**
- Added `fallbackFor`/`fallbackOrder` fields + `FallbackChain` self-relation to `prisma/schema.prisma`
- Created migration `20260403110000_add_fallback_chain` with `ALTER TABLE` statements + index
- Updated `GET /api/trips` to include `_count.alternatives`
- Updated `POST /api/trips` to accept `fallbackFor`/`fallbackOrder`
- Updated `GET/PUT/DELETE /api/trips/[id]` with fallback fields + pre-delete SetNull
- Created `GET /api/trips/[id]/alternatives` endpoint
- Commit: e22d3f0

## Verification

- `npx tsc --noEmit` exits 0 (excluding pre-existing test file errors)
- All acceptance criteria met (verified via grep)
- TripCard: `_count.alternatives`, `fallbackFor`, `fallbackOrder` in TripData
- TripCard: `trip._count.alternatives > 0` badge, `trip.fallbackFor &&` label
- TripsClient: `fallbackForTripId`, `fallbackForTripName`, `fallbackOrder` state
- TripsClient: `openAddFallback`, `Add Plan` button, `fallbackFor: fallbackForTripId` in POST
- TripsClient: `_count.alternatives + 1` optimistic update

## Commits

| Hash | Description |
|------|-------------|
| e22d3f0 | feat(22-01): add fallback chain schema, migration, and trip API routes |
| 1e1ccf8 | feat(22-02): TripCard — alternatives count badge + Plan B/C fallback label |
| 3c20189 | feat(22-02): TripsClient — Add Plan B/C button, fallback form state, and optimistic update |

## Self-Check: PASSED
