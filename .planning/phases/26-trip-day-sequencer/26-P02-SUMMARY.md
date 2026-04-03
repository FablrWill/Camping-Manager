---
phase: 26-trip-day-sequencer
plan: 26-P02
subsystem: api, ai-prompts
tags: [claude-prompt, overpass, tdd, api-routes, departure-checklist]
dependency-graph:
  requires: [26-P01]
  provides: [generateDepartureChecklist with departureTime+lastStopNames, POST /api/departure-checklist fuel-stop integration]
  affects: [lib/claude.ts, app/api/departure-checklist/route.ts]
tech-stack:
  added: []
  patterns: [TDD red-green, non-blocking async fetch, Claude prompt engineering]
key-files:
  created:
    - tests/departure-checklist-route.test.ts
  modified:
    - lib/claude.ts
    - app/api/departure-checklist/route.ts
decisions:
  - "Overpass failure is silent catch — empty lastStopNames array, checklist still generates"
  - "departureTime formatted via toLocaleDateString (en-US, weekday+month+day+time) for human-readable Claude prompt"
  - "lastStopNames capped at 3 entries (fuel+grocery+outdoor combined) to avoid prompt bloat"
  - "suggestedTime required on all items via instruction 9 — backwards compat maintained via Zod optional in P01"
metrics:
  duration: 8
  completed: 2026-04-03
  tasks-completed: 2
  files-created: 1
  files-modified: 2
---

# Phase 26 Plan 02: Trip Day Sequencer — Claude Prompt + API Enrichment Summary

**One-liner:** Claude prompt upgraded with time-anchored suggestedTime output and fuel stop reminders; departure-checklist API route now fetches Overpass stops and passes departureTime to Claude non-blockingly.

## Tasks Completed

| # | Name | Commit | Files |
|---|------|--------|-------|
| 1 | Upgrade generateDepartureChecklist in lib/claude.ts | 8ad14fa | lib/claude.ts |
| 2 | Enhance POST /api/departure-checklist with fuel stops + departureTime | 1a2adb1 | app/api/departure-checklist/route.ts, tests/departure-checklist-route.test.ts |

## Objective Achieved

Brain layer complete: Claude now generates clock-time-anchored tasks when departure time is set, and includes fuel stop reminders from Phase 18 Overpass data.

- `generateDepartureChecklist` accepts `departureTime: string | null` and `lastStopNames: string[]`
- Claude prompt instructs model to produce `suggestedTime` on every checklist item (instruction 9)
- `DEPARTURE TIME:` section gives Claude explicit time-anchoring guidance when set, or instructs null + slot labels when not set
- `LAST STOPS BEFORE DESTINATION` section included when stops are available
- JSON schema example updated to show `suggestedTime` field on items
- POST /api/departure-checklist fetches fuel/grocery/outdoor stops via `fetchLastStops`
- Overpass failure is silently caught — empty array passed, checklist still generates
- `trip.departureTime` formatted as human-readable string (e.g. "Friday, May 1 at 7:00 AM") for Claude context
- 5 new tests pass, full suite 73 tests green

## Decisions Made

1. **Overpass failure is non-blocking** — `try/catch` with empty `lastStopNames` fallback. Fuel stop data enhances quality but is not required for a valid checklist.
2. **Cap at 3 stop names** — `allStops.slice(0, 3)` across fuel+grocery+outdoor combined. Avoids bloating the Claude prompt with many stop names.
3. **`toLocaleDateString` for formatting** — Produces natural language like "Friday, May 1 at 7:00 AM" that reads well in Claude's context window.
4. **Instruction 9 enforces suggestedTime** — Explicit "MUST include" language in INSTRUCTIONS list ensures Claude doesn't omit the field, even for items where null is appropriate.
5. **Meal plan instruction D-07** — Changed from generic "include meal prep items" to specific ONE phase-level reminder pattern, preventing duplicate or excessive meal tasks.
6. **Power instruction D-08** — Changed to explicit "Charge EcoFlow to 100%" with battery percentage context, so Claude produces a concrete actionable task.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Pre-existing Issues (Out of Scope)

**Pre-existing TypeScript error in lib/__tests__/bulk-import.test.ts** — `Buffer<ArrayBufferLike>` incompatible with `BlobPart`. Pre-dates Phase 26, out of scope.

**Pre-existing build failure** — `npm run build` fails during static page generation (P2022 missing column). Same issue documented in 26-P01-SUMMARY.md. Out of scope.

## Known Stubs

None.

## Self-Check: PASSED

Files exist:
- tests/departure-checklist-route.test.ts: FOUND
- lib/claude.ts (contains departureTime param): FOUND
- app/api/departure-checklist/route.ts (contains fetchLastStops): FOUND

Commits exist:
- 8ad14fa: FOUND
- 1a2adb1: FOUND
