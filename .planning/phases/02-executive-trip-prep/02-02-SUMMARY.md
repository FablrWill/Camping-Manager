---
phase: 02-executive-trip-prep
plan: 02
subsystem: ui
tags: [react, next.js, trip-prep, collapsible, tailwind, dashboard, mobile-first]

requires:
  - 02-01 (PrepState type, PREP_SECTIONS registry, /api/trips/[id]/prep endpoint)

provides:
  - /trips/[id]/prep page with four collapsible sections and traffic light badges
  - TripPrepSection component (reusable collapsible wrapper with status badge)
  - TripPrepClient component (full prep page with sections, ready checklist, sticky CTA)
  - Prepare entry points on dashboard and trips page

affects:
  - components/DashboardClient.tsx (now renders upcoming trip card with prep link)
  - components/TripsClient.tsx (now has Prepare link on upcoming/active trip cards)

tech-stack:
  added: []
  patterns:
    - "CSS max-h collapse: max-h-0 → max-h-[9999px] keeps children mounted (avoids re-fetch)"
    - "STATUS_BADGE record: maps PrepStatus → {label, className} — keeps badge rendering declarative"
    - "Section registry loop: PREP_SECTIONS drives section order/render — no JSX change for new sections"
    - "Auto-expand heuristic: first section with status !== 'ready' expands by default"

key-files:
  created:
    - components/TripPrepSection.tsx
    - components/TripPrepClient.tsx
    - app/trips/[id]/prep/page.tsx
  modified:
    - app/page.tsx
    - components/DashboardClient.tsx
    - components/TripsClient.tsx

key-decisions:
  - "CSS collapse (not conditional render) keeps WeatherCard/PackingList/MealPlan/PowerBudget mounted — avoids re-fetching when user re-expands"
  - "Ready Checklist is derived from prepState.sections (not PREP_SECTIONS registry) — shows actual computed status, not config labels"
  - "daysUntil used directly in dashboard card header ('3 days away') — no separate countdown component needed"

metrics:
  duration: ~3 min
  completed: 2026-03-30
  tasks_completed: 2
  files_modified: 6
---

# Phase 02 Plan 02: Executive Trip Prep UI Summary

**Prep page at /trips/[id]/prep with collapsible sections, traffic light badges, ready checklist, sticky CTA, and entry point links from dashboard and trips page**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-03-30T23:12:51Z
- **Completed:** 2026-03-30T23:15:26Z
- **Tasks:** 2 of 3 (Task 3 is human-verify checkpoint)
- **Files modified:** 6

## Accomplishments

- `TripPrepSection`: reusable collapsible wrapper with CSS max-h animation — children stay mounted so sub-components (WeatherCard, PackingList, etc.) don't re-fetch on collapse/expand
- `TripPrepClient`: fetches PrepState from `/api/trips/[id]/prep`, renders sections from PREP_SECTIONS registry, auto-expands first non-ready section, shows ready checklist + sticky CTA
- `app/trips/[id]/prep/page.tsx`: server component with `notFound()`, awaits `params` (Next.js 16 pattern)
- Dashboard: upcoming trip query added to Promise.all, amber card with prep link shown above stats grid
- Trips page: Prepare link with ChevronRight added to upcoming/active trip cards (stopPropagation prevents modal trigger)
- Build passes clean — `/trips/[id]/prep` registered as dynamic route

## Task Commits

1. **Task 1: TripPrepSection, TripPrepClient, and prep server page** - `faf3436` (feat)
2. **Task 2: Prepare links on dashboard and trips page** - `6690ac4` (feat)

## Files Created/Modified

- `components/TripPrepSection.tsx` — Collapsible section wrapper with STATUS_BADGE traffic light map
- `components/TripPrepClient.tsx` — Full prep page: header card, section registry loop, ready checklist, sticky CTA
- `app/trips/[id]/prep/page.tsx` — Server component fetching trip + location + vehicle, `notFound()` guard
- `app/page.tsx` — Added upcomingTrip query to Promise.all, passes to DashboardClient
- `components/DashboardClient.tsx` — New UpcomingTrip interface, amber card with prep link before stats grid
- `components/TripsClient.tsx` — Import Link, Prepare link on upcoming/active TripCards

## Decisions Made

- CSS collapse (not conditional render) keeps sub-components mounted — avoids re-fetching when user re-expands sections
- Ready Checklist derives from `prepState.sections` computed status, not the registry config
- `daysUntil()` used inline in dashboard card label — no extra abstraction needed

## Deviations from Plan

None — plan executed exactly as written.

## Checkpoint: Task 3 (human-verify)

Task 3 is a blocking human-verify checkpoint. The build passes. The dev server can be started with `npm run dev` in the worktree directory for verification.

## Known Stubs

None — all four section components (WeatherCard, PackingList, MealPlan, PowerBudget) are fully wired. The TripPrepClient fetches live data from `/api/trips/[id]/prep`.

## Self-Check: PASSED

- `components/TripPrepSection.tsx` — FOUND
- `components/TripPrepClient.tsx` — FOUND
- `app/trips/[id]/prep/page.tsx` — FOUND
- Task 1 commit `faf3436` — verified in git log
- Task 2 commit `6690ac4` — verified in git log
- `npm run build` exits 0, `/trips/[id]/prep` registered as dynamic route

---
*Phase: 02-executive-trip-prep*
*Completed (tasks 1-2): 2026-03-30*
