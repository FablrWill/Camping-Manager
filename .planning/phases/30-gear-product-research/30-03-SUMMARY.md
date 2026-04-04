---
phase: 30-gear-product-research
plan: 03
subsystem: ui
tags: [react, nextjs, prisma, gear, upgrade-opportunities]

# Dependency graph
requires:
  - phase: 30-01
    provides: GearResearch Prisma model with verdict column
  - phase: 30-02
    provides: openResearchForItem callback in GearClient + Research tab
provides:
  - Upgrade Opportunities collapsible section on gear page
  - Server-side GearResearch fetch filtered to "Worth upgrading" verdict
  - Click-through from upgrade entry to gear item Research tab
affects: [gear-page, GearClient]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Promise.all server fetch: gear items and upgrade research fetched in parallel in page.tsx"
    - "Collapsible section pattern: boolean state toggle with rotate-90 chevron indicator"
    - "Safe JSON parse with try/catch in server component for GearResearch result blob"

key-files:
  created: []
  modified:
    - app/gear/page.tsx
    - components/GearClient.tsx

key-decisions:
  - "Upgrade Opportunities section placed above the gear list — surfaces actionable items immediately on page load"
  - "JSON parsing of result blob done in server component (page.tsx) — client receives clean UpgradeOpportunity objects, not raw JSON"
  - "Reason text truncated to first alternative's reason field, with summary as fallback — avoids verbosity in compact list"

patterns-established:
  - "Server page extracts alternative name + reason from JSON blob before passing to client — keeps client component free of JSON parsing logic"
  - "initialUpgrades defaults to [] — GearClient renders normally when no upgrade data exists"

requirements-completed: [SC-4, SC-5]

# Metrics
duration: 4min
completed: 2026-04-03
---

# Phase 30 Plan 03: Gear Product Research — Upgrade Opportunities Summary

**Collapsible "Upgrade Opportunities (N)" section on gear page showing Worth-upgrading items with click-through to Research tab**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T23:55:55Z
- **Completed:** 2026-04-03T23:59:31Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Server-side fetch in `app/gear/page.tsx` uses `Promise.all` to load gear items and all `GearResearch` records with `verdict: 'Worth upgrading'` in parallel
- `app/gear/page.tsx` parses the JSON result blob server-side, extracting top alternative name and reason before passing a clean `UpgradeOpportunity[]` to the client
- `GearClient.tsx` renders a collapsible "Upgrade Opportunities (N)" section above the gear list; each entry shows gear name -> top alternative — Worth upgrading (reason) and opens the Research tab on click

## Task Commits

1. **Task 1: Server fetch + Upgrade Opportunities UI** - `84ef0e5` (feat)
2. **Task 2: Verify complete gear research feature** - Human approved

## Files Created/Modified

- `app/gear/page.tsx` — Added parallel `prisma.gearResearch.findMany` fetch, JSON parsing, and `initialUpgrades` prop passed to GearClient
- `components/GearClient.tsx` — Added `UpgradeOpportunity` interface, `initialUpgrades` prop, `upgradesExpanded` state, and collapsible Upgrade Opportunities section

## Decisions Made

- JSON parsing of the `result` blob is done in the server component so the client receives clean typed objects — avoids spreading JSON logic into the client bundle
- Reason text comes from `alternatives[0].reason` with `summary` as fallback — first alternative is most relevant, summary covers edge cases

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

Phase 30 is complete — all 3 plans delivered:
- Plan 01: GearResearch model, Zod types, API route, Claude research generation
- Plan 02: GearResearchTab component, Documents/Research tab switcher in gear modal
- Plan 03: Upgrade Opportunities surface on main gear page

Phase 31 (Dark Sky, Astro Info) is independent and ready to execute.

---
*Phase: 30-gear-product-research*
*Completed: 2026-04-03*
