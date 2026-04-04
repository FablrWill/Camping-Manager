---
phase: 41-camp-kit-presets
plan: 01
subsystem: ui
tags: [packing-list, kit-presets, react, vitest, pure-functions]

# Dependency graph
requires:
  - phase: existing
    provides: PackingListResult interface in lib/claude.ts
  - phase: existing
    provides: /api/kits POST endpoint for creating kit presets
provides:
  - lib/kit-utils.ts with tested pure logic (extractGearIdsFromPackingList, computeGearIdsToRemove, buildReviewPrompt)
  - Save as Kit inline form in PackingList.tsx for creating presets from Claude-generated lists
  - Improved kit picker discoverability via "Use Kit Presets" button in empty and generated list states
affects: [41-02, 41-03, components/PackingList.tsx, lib/kit-utils.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Pure logic extracted to lib/kit-utils.ts — tested in isolation before UI integration"
    - "TDD: tests written against non-existent module, module created to pass"

key-files:
  created:
    - lib/kit-utils.ts
    - lib/__tests__/kit-presets.test.ts
  modified:
    - components/PackingList.tsx

key-decisions:
  - "extractGearIdsFromPackingList uses type predicate filter to narrow items with defined gearId"
  - "computeGearIdsToRemove uses Set for O(n) protection lookup across remaining kits"
  - "buildReviewPrompt outputs kit names and gear names only — never raw IDs"
  - "Save as Kit UI: collapsed link → expanded inline form pattern (low visual weight until needed)"
  - "Use Kit Presets button added in both empty AND generated list states for consistent discoverability"

patterns-established:
  - "Kit logic pattern: pure functions in lib/kit-utils.ts tested independently before wiring to UI"
  - "Save-as-kit pattern: extract inventory gearIds from PackingListResult, POST { name, gearIds } to /api/kits"

requirements-completed: [D-01, D-02]

# Metrics
duration: 3min
completed: 2026-04-04
---

# Phase 41 Plan 01: Camp Kit Presets — Pure Logic + Save as Kit Summary

**Pure kit-utils module with 9 passing TDD tests, plus Save as Kit inline form and "Use Kit Presets" button replacing the buried "Apply Kit" toggle in PackingList**

## Performance

- **Duration:** ~3 min
- **Started:** 2026-04-04T19:38:21Z
- **Completed:** 2026-04-04T19:41:22Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `lib/kit-utils.ts` with 3 pure exported functions: `extractGearIdsFromPackingList`, `computeGearIdsToRemove`, `buildReviewPrompt`
- Created `lib/__tests__/kit-presets.test.ts` with 9 unit tests (3 per function), all passing
- Added "Save as kit preset" collapsed link + inline name form to generated packing list view
- Replaced "Apply Kit" with "Use Kit Presets" in empty state and added the button to generated list header

## Task Commits

1. **Task 1: Create kit-utils module with tests (Wave 0)** - `f3d5ad8` (feat + test — TDD)
2. **Task 2: Add Save as Kit flow + improve kit picker discoverability** - `9e0d328` (feat)

## Files Created/Modified
- `lib/kit-utils.ts` — Pure logic: extract gearIds from packing list, compute IDs safe to remove, build Claude review prompt
- `lib/__tests__/kit-presets.test.ts` — 9 unit tests covering all behaviors specified in plan
- `components/PackingList.tsx` — Import kit-utils, add save state, handleSaveAsKit, Save as Kit UI, Use Kit Presets buttons

## Decisions Made
- Save as Kit UI uses a collapsed link pattern (underlined amber text) that expands inline — minimal visual footprint, discoverable without cluttering the packing list
- `extractGearIdsFromPackingList` uses a TypeScript type predicate filter `(item): item is ... & { gearId: string }` to safely narrow the type while filtering
- `buildReviewPrompt` regex test in tests uses `/cl[a-z0-9]{20,}/` to catch cuid-style IDs — prompt must contain only human-readable names

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- `lib/kit-utils.ts` is fully tested and ready for consumption by Plans 02 and 03
- `extractGearIdsFromPackingList` and `computeGearIdsToRemove` are the foundation for the multi-kit stacking unapply route (Plan 02)
- `buildReviewPrompt` is ready for the Claude review endpoint (Plan 03)
- No blockers for Plans 02 or 03

---
*Phase: 41-camp-kit-presets*
*Completed: 2026-04-04*
