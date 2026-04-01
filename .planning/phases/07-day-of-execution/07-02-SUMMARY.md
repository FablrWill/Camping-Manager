---
phase: 07-day-of-execution
plan: 02
subsystem: api, ui, components
tags: [claude-ai, departure-checklist, prisma-transaction, check-off, prep-page]

# Dependency graph
requires:
  - phase: 07-day-of-execution
    plan: 01
    provides: DepartureChecklist Prisma model, DepartureChecklistResultSchema, lib/parse-claude.ts exports
provides:
  - generateDepartureChecklist in lib/claude.ts (vehicle mods, unpacked warnings, weather-aware tips)
  - GET/POST /api/departure-checklist (load and Claude generation with upsert)
  - PATCH /api/departure-checklist/[id]/check (race-safe check-off via prisma.$transaction)
  - /trips/[id]/depart departure page with full checklist UI
  - DepartureChecklistClient component (load, generate, check-off, progress, regenerate)
  - DepartureChecklistItem component (amber warnings, line-through, touch target)
  - departure section in PREP_SECTIONS and TripPrepClient with status logic and link
affects: [07-03-float-plan]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Departure checklist check-off uses prisma.$transaction for race-safe JSON blob read-modify-write
    - Optimistic update + fire-and-forget PATCH pattern (same as PackingList)
    - Departure section in TripPrepClient fetches its own data independently (not via /api/trips/[id]/prep)

key-files:
  created:
    - app/api/departure-checklist/route.ts
    - app/api/departure-checklist/[id]/check/route.ts
    - app/trips/[id]/depart/page.tsx
    - components/DepartureChecklistClient.tsx
    - components/DepartureChecklistItem.tsx
  modified:
    - lib/claude.ts
    - lib/prep-sections.ts
    - components/TripPrepClient.tsx

key-decisions:
  - "PATCH check-off wrapped in prisma.$transaction — prevents race conditions on rapid sequential taps (per review HIGH concern)"
  - "Departure section in TripPrepClient fetches /api/departure-checklist independently in useEffect — not routed through /api/trips/[id]/prep to keep prep API changes minimal"
  - "DepartureChecklistItem entire row is clickable (not just checkbox) — 44px min-height for reliable touch target on mobile"

# Metrics
duration: 5min
completed: 2026-04-01
---

# Phase 07 Plan 02: Departure Checklist Summary

**Claude-generated time-ordered departure checklist at /trips/[id]/depart with interactive check-off persisted via prisma.$transaction, unpacked item warnings, regenerate with confirm, and prep page departure section with status and link**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-01T22:32:25Z
- **Completed:** 2026-04-01T22:37:11Z
- **Tasks:** 2
- **Files modified:** 8 (3 created API/page, 5 created/modified components)

## Accomplishments

- Added `generateDepartureChecklist` to `lib/claude.ts` — builds time-ordered slots from packing list (with unpacked warnings), vehicle mods (generates specific check items per mod), meal plan, power budget, and weather notes
- Created GET/POST `/api/departure-checklist` for loading saved checklist and Claude generation with upsert
- Created PATCH `/api/departure-checklist/[id]/check` with `prisma.$transaction` for race-safe JSON blob read-modify-write on rapid check-off taps
- Built `/trips/[id]/depart` page: Claude-generated time slots, progress bar, check-off with optimistic updates, empty/loading/error states, regenerate with ConfirmDialog
- Built `DepartureChecklistItem` with amber `isUnpackedWarning` styling, `line-through` for checked, `min-h-[44px]` touch target
- Added `departure` section to `PREP_SECTIONS` and `TripPrepClient` — fetches independently, derives status (not_started/in_progress/ready), shows first-slot preview and "Open full checklist" link

## Task Commits

1. **Task 1: Departure checklist API + Claude generation function** — `47f6320` (feat)
2. **Task 2: Departure page UI + prep page integration** — `efe2838` (feat)

## Files Created/Modified

- `lib/claude.ts` — Added `generateDepartureChecklist` with vehicle mods, unpacked warnings, weather tips; imports `DepartureChecklistResultSchema`
- `app/api/departure-checklist/route.ts` — GET loads by tripId, POST generates via Claude and upserts
- `app/api/departure-checklist/[id]/check/route.ts` — PATCH with `prisma.$transaction` for race-safe check-off
- `app/trips/[id]/depart/page.tsx` — Server component fetching trip and rendering `DepartureChecklistClient`
- `components/DepartureChecklistClient.tsx` — Full departure page: load-on-mount, generate, optimistic check-off, progress bar, regenerate confirm, float plan placeholder
- `components/DepartureChecklistItem.tsx` — Row with amber unpacked warning, checked line-through, 44px touch target
- `lib/prep-sections.ts` — Added `departure` as last entry in PREP_SECTIONS
- `components/TripPrepClient.tsx` — Added departure section with independent fetch, status logic, preview, link to /depart

## Decisions Made

- `prisma.$transaction` wraps the check-off read-modify-write — prevents race conditions when user taps quickly through items
- Departure section fetches its own data independently in `TripPrepClient` useEffect (not through `/api/trips/[id]/prep`) — keeps prep API minimal and lets the departure section stay current without refetching all prep data
- Entire `DepartureChecklistItem` row is clickable (not just the checkbox visual) — `min-h-[44px]` meets mobile touch target guidelines

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — departure checklist generates from real trip data; float plan area placeholder (`<div id="float-plan-area" />`) is intentional per Plan 03 spec.

## Self-Check: PASSED

All files exist. Both commits verified (47f6320, efe2838).

---

*Phase: 07-day-of-execution*
*Completed: 2026-04-01*
