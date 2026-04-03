---
phase: 18-fuel-last-stop-planner
plan: "02"
subsystem: ui
tags: [react, overpass, leaflet, trip-prep, last-stops, fuel]

# Dependency graph
requires:
  - phase: 18-01
    provides: lib/overpass.ts (LastStopsResult interface) and GET /api/trips/[id]/last-stops route
provides:
  - Fuel & Last Stops card rendered in TripPrepClient for trips with coordinates
  - Silent omit when trip has no location (no card shown)
  - Loading skeleton, error state, and per-category "None found nearby" fallback
affects: [trip-prep, TripPrepClient]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Independent useEffect fetch pattern — card fetches its own data source, not piped through /api/trips/[id]/prep (D-10)"
    - "Silent omit pattern — conditional render on trip.location coords, no empty card shown (D-01)"
    - "Tailwind animate-pulse skeleton with role=status for accessible loading state"

key-files:
  created: []
  modified:
    - components/TripPrepClient.tsx

key-decisions:
  - "Card fetches independently via useEffect, not through /api/trips/[id]/prep — avoids coupling Overpass latency to prep load (D-10)"
  - "Card is conditionally rendered only when trip.location.latitude + longitude exist — silent omit per D-01"
  - "Dependency array: [trip.id, trip.location?.latitude, trip.location?.longitude] — minimal per CLAUDE.md hook rules"
  - "NOT added to PREP_SECTIONS — renders outside the sections map to avoid injecting external API calls into the static prep loop"

patterns-established:
  - "Silent omit: informational cards that require external data conditionally render on coord presence — no empty placeholder"
  - "Independent card fetch: each enrichment card owns its own useEffect + state trio (loading/error/data)"

requirements-completed: [FUEL-03]

# Metrics
duration: ~10min
completed: 2026-04-03
---

# Phase 18 Plan 02: Fuel & Last Stop Planner — Card Injection Summary

**Fuel & Last Stops card injected into TripPrepClient using an independent useEffect fetch, showing up to 2 results each for Fuel, Grocery, and Outdoor/Gear categories with distance in miles, silently omitted when trip has no location**

## Performance

- **Duration:** ~10 min
- **Started:** 2026-04-03T05:30:00Z
- **Completed:** 2026-04-03T05:40:00Z
- **Tasks:** 1 (+ 1 human-verify checkpoint)
- **Files modified:** 1

## Accomplishments

- Added `LastStopsResult` type import from `lib/overpass`
- Wired up independent `useEffect` fetching `/api/trips/${trip.id}/last-stops` — no coupling to the prep endpoint
- Card renders only when `trip.location?.latitude && trip.location?.longitude` (D-01 silent omit)
- Loading skeleton uses `animate-pulse` with `role="status"` and `aria-label="Loading nearby stops"`
- Error state uses `role="alert"` with red surface styling matching UI-SPEC
- Three category sections rendered via array map: Fuel (⛽), Grocery (🛒), Outdoor / Gear (🏕️)
- Each result: `{name} — {distanceMiles.toFixed(1)} mi`
- Empty categories: `"None found nearby — plan ahead"` italic fallback
- Card positioned after WeatherCard, before PREP_SECTIONS.map() block (D-09)
- `lib/prep-sections.ts` left unmodified — fuel card is not a prep section

## Task Commits

1. **Task 1: Add Fuel & Last Stops card to TripPrepClient** - `2b6c21b` (feat)

## Files Created/Modified

- `components/TripPrepClient.tsx` - Added LastStopsResult import, 3 state vars, 1 useEffect, and the full card JSX block (73 lines added)

## Decisions Made

- Card fetches its own data independently via `useEffect` — not piped through `/api/trips/[id]/prep`. This keeps Overpass API latency isolated and avoids slowing the prep endpoint for trips with no location.
- Dependency array `[trip.id, trip.location?.latitude, trip.location?.longitude]` is minimal per CLAUDE.md hook rules — only values the effect actually uses.
- Card is not added to `PREP_SECTIONS` — the sections map is for static/local content; external API enrichment cards render outside it.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Phase 18 complete: Overpass utility, API route, and UI card all shipped
- Phase 19 (Dog-Aware Trip Planning) can proceed independently
- The independent useEffect fetch pattern is now established for future enrichment cards

---
*Phase: 18-fuel-last-stop-planner*
*Completed: 2026-04-03*
