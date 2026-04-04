---
phase: 31-dark-sky-astro-info
plan: 01
subsystem: api
tags: [suncalc, astronomy, moon-phase, typescript, tdd, vitest]

requires: []

provides:
  - lib/astro.ts with NightAstro and TripAstroData interfaces
  - computeAstro function (date range → per-night moon data + sunrise/sunset merge)
  - getMoonPhaseLabel and getMoonPhaseEmoji (phase 0.0-1.0 → label/emoji)
  - getBortleLink (lat/lon → lightpollutionmap.info deep link)
  - 24 passing Vitest unit tests in tests/astro.test.ts
  - suncalc + @types/suncalc installed as dependencies

affects: [31-dark-sky-astro-info]

tech-stack:
  added:
    - suncalc ^1.9.0
    - "@types/suncalc ^1.9.2 (devDep)"
  patterns:
    - TDD RED/GREEN with vitest direct imports (no require() needed since source file created in same plan)
    - UTC noon (T12:00:00Z) for suncalc date construction — timezone-stable across all locales
    - Bortle class as placeholder deep link (no free API) per D-01 decision

key-files:
  created:
    - lib/astro.ts
    - tests/astro.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "UTC noon (T12:00:00Z) used for suncalc Date construction to avoid DST/timezone drift"
  - "Bortle class implemented as lightpollutionmap.info deep link (no free no-key API exists)"
  - "computeAstro accepts optional weatherDays param for sunrise/sunset merge — no new API needed"

patterns-established:
  - "Phase 0.0 and > 0.97 both map to New Moon — handles suncalc phase cycling correctly"
  - "goodForStars = moonFraction < 0.25 — fraction (illuminated %) not phase (cycle position)"

requirements-completed: [ASTRO-01, ASTRO-02, ASTRO-03, ASTRO-04]

duration: 5min
completed: 2026-04-04
---

# Phase 31 Plan 01: Dark Sky Astro Info — lib/astro.ts Summary

**suncalc-based moon phase library with per-night NightAstro computation, UTC noon date construction, and lightpollutionmap.info deep link — 24 tests passing**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-04T04:30:00Z
- **Completed:** 2026-04-04T04:36:57Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Installed suncalc + @types/suncalc into package.json
- Created tests/astro.test.ts with 24 Vitest tests covering all public functions (TDD RED)
- Implemented lib/astro.ts with 6 exports: NightAstro, TripAstroData, computeAstro, getMoonPhaseLabel, getMoonPhaseEmoji, getBortleLink (TDD GREEN)
- Validated known moon dates: 2024-01-11 = New Moon (fraction ~0.0003), 2024-01-25 = Full Moon (fraction ~0.996)
- TypeScript compiled cleanly (build failure is pre-existing DATABASE_URL env issue in worktree, not a regression)

## Task Commits

Each task was committed atomically:

1. **Task 1: Install suncalc and write TDD tests (RED)** — `61117d3` (test)
2. **Task 2: Implement lib/astro.ts (GREEN)** — `d729f59` (feat)

_Note: TDD tasks have two commits — test RED, then feat GREEN._

## Files Created/Modified

- `lib/astro.ts` — NightAstro/TripAstroData interfaces, computeAstro, getMoonPhaseLabel, getMoonPhaseEmoji, getBortleLink
- `tests/astro.test.ts` — 24 unit tests for all astro computation functions
- `package.json` — suncalc + @types/suncalc added
- `package-lock.json` — updated lockfile

## Decisions Made

- **UTC noon construction:** `new Date(\`${date}T12:00:00Z\`)` — avoids DST/timezone drift for moon illumination calls across all system locales
- **Bortle = deep link only:** getBortleLink returns lightpollutionmap.info URL with WA2015 overlay state; no estimation, no bundled dataset — honest and unblocking
- **goodForStars uses fraction not phase:** moonFraction < 0.25 is the correct indicator (illuminated disk %, not cycle position)

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## Known Stubs

None — all exported functions are fully implemented and tested.

## Next Phase Readiness

- lib/astro.ts is complete and tested. Plan 02 (AstroCard component) can import computeAstro, NightAstro, TripAstroData directly from @/lib/astro.
- No blockers.

## Self-Check

- [x] `lib/astro.ts` exists
- [x] `tests/astro.test.ts` exists
- [x] `package.json` contains "suncalc"
- [x] `package.json` contains "@types/suncalc"
- [x] Commits 61117d3 and d729f59 exist

---
*Phase: 31-dark-sky-astro-info*
*Completed: 2026-04-04*
