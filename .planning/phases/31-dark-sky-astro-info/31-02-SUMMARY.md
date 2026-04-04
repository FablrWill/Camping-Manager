---
phase: 31-dark-sky-astro-info
plan: 02
subsystem: ui
tags: [astro, moon-phase, react, tailwind, trips, dark-mode]

requires:
  - phase: 31-dark-sky-astro-info-plan-01
    provides: lib/astro.ts with computeAstro, NightAstro, TripAstroData interfaces

provides:
  - AstroCard component with loading, error, no-location, collapsed, expanded states
  - Per-night moon emoji + Good/Poor stars badge (amber/muted styling)
  - Trip-level "N of M nights good for stars" summary line
  - Bortle link to lightpollutionmap.info when trip has coordinates
  - AstroCard integrated into TripCard below WeatherCard for upcoming trips
  - TripsClient batched single-setState astroByTrip with weather-aware cache guard

affects: [31-dark-sky-astro-info]

tech-stack:
  added: []
  patterns:
    - AstroCard mirrors WeatherCard structure exactly — indigo tint, same skeleton/error/expand patterns
    - Single batched setAstroByTrip call per effect run (not forEach + multiple setters)
    - Weather-aware cache guard — re-computes when weatherByTrip changes and existing entry lacks sunrise/sunset
    - useEffect dep array [trips, now, weatherByTrip] — never includes astroByTrip (the state it writes)

key-files:
  created:
    - components/AstroCard.tsx
  modified:
    - components/TripCard.tsx
    - components/TripsClient.tsx

key-decisions:
  - "AstroCard renders for all upcoming trips, not just those with location — moon phase works without coords (per D-05)"
  - "Weather-aware cache guard re-computes astro when weatherByTrip changes so sunrise/sunset merges after async weather fetch"
  - "Functional updater returns same prev reference when nothing changed — prevents unnecessary re-renders"

patterns-established:
  - "AstroCard indigo tint (bg-indigo-50/indigo-950/30) distinguishes astro context from weather (sky) and fuel cards"
  - "Per-night badge rendered always (not just expanded) — critical info visible at a glance"

requirements-completed: [ASTRO-01, ASTRO-02, ASTRO-03, ASTRO-05]

duration: 7min
completed: 2026-04-04
---

# Phase 31 Plan 02: Dark Sky Astro Info — AstroCard Integration Summary

**AstroCard component with indigo-tinted card, per-night moon emoji + Good/Poor badges, expand/collapse for sunrise/sunset, and Bortle deep link — integrated into TripCard below WeatherCard via batched weather-aware useEffect**

## Performance

- **Duration:** ~7 min
- **Started:** 2026-04-04T04:39:43Z
- **Completed:** 2026-04-04T04:47:00Z
- **Tasks:** 1 (+ checkpoint)
- **Files modified:** 3

## Accomplishments

- Created `components/AstroCard.tsx` (149 lines) — all states: loading skeleton, error, empty (null return), collapsed, expanded
- Per-night NightBlock with moon emoji, moon label, per-night Good/Poor badge (amber/muted), optional sunrise/sunset when expanded
- Trip-level summary line: "N of M nights good for stars"
- Bortle link to lightpollutionmap.info (rendered only when bortleLink prop provided)
- No-location variant: shows moon phase, hides Bortle link, shows "Add a location to see sunrise/sunset times"
- Modified `components/TripCard.tsx` — added `astro?: TripAstroData` prop, renders `<AstroCard>` below WeatherCard for upcoming trips
- Modified `components/TripsClient.tsx` — added `astroByTrip` state + dedicated useEffect with batched single-setState and weather-aware cache guard
- TypeScript compiles cleanly (pre-existing DATABASE_URL env issue in worktree prevents full static build, same as Plan 01)

## Task Commits

Each task was committed atomically:

1. **Task 1: Create AstroCard component and integrate into TripCard + TripsClient** — `cee7bd0` (feat)

## Files Created/Modified

- `components/AstroCard.tsx` — AstroCard component with all states; NightBlock sub-component
- `components/TripCard.tsx` — Added `astro?: TripAstroData` prop + AstroCard render below WeatherCard
- `components/TripsClient.tsx` — astroByTrip state + weather-aware useEffect with batched setState

## Decisions Made

- AstroCard renders for all upcoming trips (not just trips with location) — moon phase computation is pure math, works without coordinates
- Weather-aware cache guard: re-computes when weatherByTrip changes so that sunrise/sunset data from the async weather fetch properly merges into astro nights
- Functional updater returns same `prev` reference when nothing changed — avoids unnecessary re-renders from the useEffect

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

- Pre-existing TypeScript error in `lib/__tests__/bulk-import.test.ts` (Buffer type incompatibility with Node types) — pre-existing, unrelated to this plan's changes. My changed files (`AstroCard.tsx`, `TripCard.tsx`, `TripsClient.tsx`) compiled with zero errors.
- Pre-existing DATABASE_URL env issue prevents full static build in worktree — same as Plan 01, not a regression.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- AstroCard is complete and integrated. Human verification checkpoint next — user visits /trips and confirms visual output.
- No blockers after approval.

## Known Stubs

None — AstroCard is fully wired with real computeAstro data from lib/astro.ts.

## Self-Check

- [x] `components/AstroCard.tsx` exists
- [x] `components/TripCard.tsx` contains `import AstroCard from '@/components/AstroCard'`
- [x] `components/TripCard.tsx` contains `astro?: TripAstroData`
- [x] `components/TripsClient.tsx` contains `astroByTrip`
- [x] Commit `cee7bd0` exists

## Self-Check: PASSED

---
*Phase: 31-dark-sky-astro-info*
*Completed: 2026-04-04*
