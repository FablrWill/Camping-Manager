---
phase: 27-safety-float-plan
plan: 01
subsystem: float-plan-email
tags: [refactor, dead-code, email, template]
depends_on: []
provides: [plain-text-float-plan-route]
affects: [app/api/float-plan/route.ts, lib/claude.ts, lib/parse-claude.ts]
tech_stack:
  added: []
  patterns: [deterministic-template, fire-and-forget-log]
key_files:
  modified:
    - app/api/float-plan/route.ts
    - lib/claude.ts
    - lib/parse-claude.ts
decisions:
  - Float plan email uses deterministic template — no AI token cost, no schema mismatch risk
  - Template includes: destination, dates, vehicle, expected return, notes, Google Maps link
  - Missing optional fields (vehicle, notes, coords) are gracefully omitted (line not included)
  - Subject format locked to "Float Plan: [trip name] ([start date])"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_modified: 3
requirements_satisfied:
  - FLOAT-TEMPLATE-01
  - FLOAT-TEMPLATE-02
  - FLOAT-TEMPLATE-03
---

# Phase 27 Plan 01: Plain-Text Float Plan Template Summary

**One-liner:** Replaced Claude-composed float plan email with a deterministic plain-text template, removing AI token cost, schema mismatch risk, and gear/checklist noise from the safety email.

## What Was Built

The float plan email route now generates a simple, human-readable check-in message using a local template function instead of calling the Claude API. The email contains exactly what an emergency contact needs: who, where, when, vehicle, and notes.

**Before:** 168-line route calling `composeFloatPlanEmail` via Claude (AI token cost, async, schema parse risk, gear list + checklist status in email).

**After:** 121-line route with a local `composeFloatPlanTemplate` function (zero AI cost, synchronous, deterministic output, clean readable email).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace Claude call with plain-text template in float-plan route | 92a116c | app/api/float-plan/route.ts |
| 2 | Remove dead composeFloatPlanEmail code from claude.ts and parse-claude.ts | 4c0e814 | lib/claude.ts, lib/parse-claude.ts |

## What the Template Produces

**Subject:** `Float Plan: [trip name] ([start date])`

**Body lines (optional lines omitted when data absent):**
1. `Will is camping at [destination] from [start] to [end].`
2. `Vehicle: [vehicle name].` (only if vehicle assigned)
3. `Expected return: [end date].`
4. `Notes: [trip notes]` (only if notes exist)
5. `Map: https://www.google.com/maps?q=[lat],[lon]` (only if location has coordinates)

## Dead Code Removed

- `composeFloatPlanEmail` function removed from `lib/claude.ts` (88 lines)
- `FloatPlanEmailSchema` and `FloatPlanEmail` type removed from `lib/parse-claude.ts` (8 lines)
- Import of `FloatPlanEmailSchema`, `FloatPlanEmail` removed from `lib/claude.ts` import line
- `composeFloatPlanEmail`, `DepartureChecklistResult`, `safeJsonParse` imports removed from route
- Prisma include simplified: removed `packingItems`, `mealPlan`, `departureChecklist`
- ANTHROPIC_API_KEY check removed from route (no longer needed)
- Packed gear summary builder removed (~12 lines)
- Checklist status builder removed (~16 lines)
- Claude call + error handling removed (~25 lines)
- Google Maps append block removed (template handles directly)

## API Response Shape (Unchanged)

```json
{ "success": true, "sentTo": "...", "sentToName": "...", "sentAt": "..." }
```

## Deviations from Plan

None — plan executed exactly as written.

## Build Verification

TypeScript compilation: PASS (no errors in modified files)

Full `npm run build` fails in this worktree due to pre-existing issues (stale database file, schema migration drift between worktree and `dev.db`) — these failures exist on the branch prior to this plan and are unrelated to the float plan refactor. The specific errors are `GearItem.modelNumber` column not found and `/inbox` page prerender failures.

## Known Stubs

None. The template is fully wired — all fields read from live Prisma data.

## Self-Check: PASSED

- app/api/float-plan/route.ts exists and contains "is camping at"
- lib/claude.ts exists and does NOT contain "composeFloatPlanEmail"
- lib/parse-claude.ts exists and does NOT contain "FloatPlanEmailSchema"
- Commits 92a116c and 4c0e814 present in git log
