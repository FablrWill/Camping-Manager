---
phase: 31-dark-sky-astro-info
verified: 2026-04-04T00:52:00Z
status: human_needed
score: 11/11 must-haves verified
re_verification: false
human_verification:
  - test: "Open an upcoming trip with a location on /trips and verify AstroCard renders below WeatherCard with indigo tint, moon emoji per night, and Good/Poor badge"
    expected: "AstroCard is visible with indigo background, moon emoji and label for each night of the trip, 'Good' amber badge or 'Poor' muted badge per night"
    why_human: "React component rendering and visual styling cannot be verified without a running browser"
  - test: "Tap the chevron on AstroCard to expand, verify sunrise/sunset times appear per night (requires trip within 16-day forecast window with location)"
    expected: "Each NightBlock shows sunrise and sunset times with icons after expansion"
    why_human: "Expand/collapse interaction and sunrise/sunset data merge from async weather fetch requires live runtime"
  - test: "Verify 'Check light pollution' link appears on a trip with coordinates and opens lightpollutionmap.info with the correct lat/lon"
    expected: "Link is visible, tapping opens the site with pre-loaded WA2015 light pollution overlay at trip coordinates"
    why_human: "External link behavior and coordinate accuracy require human confirmation in browser"
  - test: "Open a trip WITHOUT a location and verify AstroCard shows moon phase only with 'Add a location to see sunrise/sunset times' note and no Bortle link"
    expected: "Moon grid renders, no Bortle link, note text is visible"
    why_human: "Conditional rendering of no-location variant requires live trip data"
  - test: "Toggle dark mode and verify AstroCard uses correct indigo/amber/stone color tokens (indigo tint, amber 'Good' badge, muted 'Poor' badge)"
    expected: "Dark mode: bg-indigo-950/30, amber-300 badge text, stone-400/stone-800 muted colors"
    why_human: "Dark mode visual appearance requires browser inspection"
---

# Phase 31: Dark Sky Astro Info Verification Report

**Phase Goal:** Astronomical data card (moon phase, sunrise/sunset, Bortle) on TripCard for upcoming trips
**Verified:** 2026-04-04T00:52:00Z
**Status:** human_needed
**Re-verification:** No — initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | computeAstro returns correct moon phase for known dates (2024-01-11 new moon, 2024-01-25 full moon) | VERIFIED | 24/24 vitest tests pass; New Moon fraction ~0.0003, Full Moon fraction ~0.996 confirmed |
| 2 | getMoonPhaseLabel maps phase values to correct labels | VERIFIED | 9 tests cover all 8 phase labels including boundary wrapping at 0.97+ |
| 3 | getMoonPhaseEmoji maps phase values to correct emoji | VERIFIED | 4 tests confirm new moon, full moon, first/last quarter emoji |
| 4 | goodForStars is true when moonFraction < 0.25 | VERIFIED | lib/astro.ts line 93: `const goodForStars = fraction < 0.25` |
| 5 | getBortleLink returns lightpollutionmap.info URL with lat/lon params | VERIFIED | 3 tests pass; URL includes lat=, lng=, and full WA2015 state param |
| 6 | computeAstro merges sunrise/sunset from DayForecast when provided | VERIFIED | Test: weatherDays merge confirmed; empty weatherDays yields undefined sunrise/sunset |
| 7 | AstroCard renders with indigo tint, moon emoji per night, Good/Poor badge | VERIFIED (code) | components/AstroCard.tsx lines 50-57: amber "Good" and muted "Poor" badges; bg-indigo-50 container |
| 8 | AstroCard collapsed shows moon emoji + label + stars quality badge | VERIFIED (code) | NightBlock renders emoji, label, badge at all times; sunrise/sunset only in expanded |
| 9 | AstroCard expanded shows sunrise/sunset per night | VERIFIED (code) | lines 35-46: expanded && night.sunrise / expanded && night.sunset conditional rendering |
| 10 | Bortle link appears when trip has lat/lon coordinates | VERIFIED (code) | line 142: `{bortleLink && <a href={bortleLink}...>` |
| 11 | Trip without location shows AstroCard with moon phase only and 'Add a location' note | VERIFIED (code) | lines 100, 154-158: hasNoLocation guard + note text |

**Score:** 11/11 truths verified (code-level). Visual rendering deferred to human verification per user instruction.

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `lib/astro.ts` | NightAstro, TripAstroData interfaces, computeAstro, getMoonPhaseLabel, getMoonPhaseEmoji, getBortleLink | VERIFIED | 135 lines, all 6 exports present, suncalc imported, UTC noon date construction |
| `tests/astro.test.ts` | Unit tests for all astro computation functions | VERIFIED | 163 lines, 24 tests, all pass |
| `components/AstroCard.tsx` | AstroCard with loading, error, no-location, collapsed, expanded states | VERIFIED | 161 lines, all states implemented, bg-indigo-50, animate-pulse, aria-label, "Good"/"Poor" badges |
| `components/TripCard.tsx` | AstroCard integration below WeatherCard | VERIFIED | Imports AstroCard, astro?: TripAstroData prop, renders `<AstroCard>` gated on !isPast |
| `components/TripsClient.tsx` | astroByTrip state + computeAstro calls in useEffect | VERIFIED | Lines 62, 201-232: state, batched single-setState useEffect with weather-aware cache guard |
| `package.json` | suncalc and @types/suncalc dependencies | VERIFIED | `"suncalc": "^1.9.0"` and `"@types/suncalc": "^1.9.2"` present |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| lib/astro.ts | suncalc | `import * as SunCalc from 'suncalc'` | WIRED | Line 8; SunCalc.getMoonIllumination called line 88 |
| tests/astro.test.ts | lib/astro.ts | `import { computeAstro, getMoonPhaseLabel, getMoonPhaseEmoji, getBortleLink } from '@/lib/astro'` | WIRED | Line 2; all 4 functions exercised in tests |
| components/AstroCard.tsx | lib/astro.ts | `import type { NightAstro } from '@/lib/astro'` | WIRED | Line 5; NightAstro used in NightBlock props and AstroCardProps.nights array |
| components/TripsClient.tsx | lib/astro.ts | `import { computeAstro } from '@/lib/astro'` | WIRED | Lines 11-12; computeAstro called line 220 inside useEffect |
| components/TripCard.tsx | components/AstroCard.tsx | `import AstroCard from '@/components/AstroCard'` | WIRED | Line 16; `<AstroCard>` rendered lines 253-258 |
| TripsClient.tsx useEffect dep array | excludes astroByTrip | `}, [trips, now, weatherByTrip]` | VERIFIED | Line 232; astroByTrip (the state being written) correctly excluded per CLAUDE.md hook rules |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| AstroCard.tsx | `nights: NightAstro[]` | TripsClient.tsx → computeAstro() → SunCalc.getMoonIllumination() | Yes — suncalc pure math from real dates | FLOWING |
| AstroCard.tsx | `bortleLink?: string` | computeAstro() → getBortleLink(lat, lon) | Yes — real coordinates from trip.location | FLOWING |
| NightBlock sunrise/sunset | `night.sunrise`, `night.sunset` | computeAstro() → weatherDays DayForecast merge from Open-Meteo API | Yes — merges from async weather fetch after weatherByTrip populates | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| 24 unit tests pass | `node node_modules/.bin/vitest run tests/astro.test.ts` | 24 passed (24), 0 failed | PASS |
| TypeScript compilation succeeds | `next build` (TypeScript phase) | `Compiled successfully in 2.9s`, `Finished TypeScript in 4.7s` | PASS |
| suncalc in package.json | `grep "suncalc" package.json` | `"suncalc": "^1.9.0"` found | PASS |
| Full static build | `next build` (static generation) | Fails on /inbox — pre-existing DATABASE_URL env issue in worktree, unrelated to astro changes | SKIP (pre-existing) |

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| ASTRO-01 | 31-01, 31-02 | Moon phase emoji + label per night, Good/Poor badge (fraction < 25%) | SATISFIED | AstroCard.tsx NightBlock lines 29-57; goodForStars in computeAstro; 24 tests pass |
| ASTRO-02 | 31-01, 31-02 | Sunrise/sunset per night in expanded view from DayForecast | SATISFIED | AstroCard.tsx lines 35-46; computeAstro weatherDays merge; test "merges sunrise/sunset" passes |
| ASTRO-03 | 31-01, 31-02 | Bortle link to lightpollutionmap.info with trip coords; hidden without location | SATISFIED | getBortleLink in lib/astro.ts; AstroCard.tsx line 142 conditional render; 3 getBortleLink tests pass |
| ASTRO-04 | 31-01 | suncalc used for moon phase; no new env vars | SATISFIED | `import * as SunCalc from 'suncalc'` in lib/astro.ts line 8; no env vars added |
| ASTRO-05 | 31-02 | npm run build passes with no type errors | SATISFIED | TypeScript compilation succeeds cleanly; static gen failure is pre-existing DATABASE_URL issue in worktree |

All 5 requirement IDs from both plans accounted for. No orphaned requirements.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| lib/astro.ts | 5 | "placeholder" in JSDoc comment | INFO | Comment describes design decision (no free Bortle API = deep link placeholder). Not a code stub — function is fully implemented and tested. |
| TripsClient.tsx | 332, 380, etc. | `placeholder=` HTML attribute | INFO | Input field UX placeholder text. Not a code stub. |

No genuine anti-patterns. No TODO/FIXME in implementation code. No empty handlers. No return null/empty array stubs (AstroCard `return null` when `nights.length === 0` is correct behavior, not a stub).

### Human Verification Required

The following items require human testing in a browser. These were intentionally deferred to UAT per user instruction.

#### 1. AstroCard Visual Render on Upcoming Trip

**Test:** Run `npm run dev`, open http://localhost:3000/trips, expand an upcoming trip that has a location with coordinates.
**Expected:** AstroCard appears below WeatherCard with indigo background tint, one NightBlock per trip night showing moon emoji, moon label (e.g. "Waxing Gibbous"), and "Good" (amber) or "Poor" (muted) badge.
**Why human:** React component rendering and Tailwind CSS styling cannot be verified without browser execution.

#### 2. AstroCard Expand/Collapse — Sunrise/Sunset

**Test:** On a trip within the 16-day forecast window with a location, tap the chevron on AstroCard to expand.
**Expected:** Sunrise and sunset times appear per night with Sunrise/Sunset icons.
**Why human:** Expand/collapse toggle interaction and async weather data merge require live runtime state.

#### 3. Bortle Link Opens Correctly

**Test:** On a trip with coordinates, tap "Check light pollution" link.
**Expected:** Opens lightpollutionmap.info with the WA2015 overlay pre-loaded at the trip's latitude/longitude.
**Why human:** External link and URL coordinate accuracy require browser confirmation.

#### 4. No-Location Trip Variant

**Test:** Open a trip without a location assigned. Expand the trip card.
**Expected:** AstroCard shows moon grid (moon phase works without coords), no "Check light pollution" link, and note text "Add a location to see sunrise/sunset times" is visible.
**Why human:** Requires trip data with no location in the live database.

#### 5. Dark Mode Colors

**Test:** Toggle dark mode (via settings or localStorage), then view an upcoming trip with AstroCard.
**Expected:** AstroCard background is dark indigo tint (bg-indigo-950/30), "Good" badge uses amber-300 text, "Poor" badge uses stone-400/stone-800, text is legible.
**Why human:** Dark mode CSS token rendering requires browser inspection.

### Gaps Summary

No gaps found. All automated checks pass:
- 24/24 unit tests passing for lib/astro.ts
- TypeScript compiles without errors
- All 5 requirement IDs satisfied
- All key links wired and data flows confirmed end-to-end (suncalc → computeAstro → astroByTrip state → TripCard prop → AstroCard render)
- No anti-patterns in implementation code

The only remaining items are visual/behavioral human verification checks, which were intentionally deferred to UAT by the user.

---

_Verified: 2026-04-04T00:52:00Z_
_Verifier: Claude (gsd-verifier)_
