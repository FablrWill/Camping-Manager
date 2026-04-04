---
phase: 11-v1.1-polish
plan: "01"
subsystem: trips-ui, usage-tracking-tests
tags: [tech-debt, audit, guard, test-quality]
dependency_graph:
  requires: []
  provides: [AUDIT-VoiceDebriefGuard, AUDIT-CircularTest]
  affects: [components/TripCard.tsx, tests/usage-tracking.test.ts]
tech_stack:
  added: []
  patterns: [isPast conditional guard, API integration test with vi.mock]
key_files:
  created: []
  modified:
    - components/TripCard.tsx
    - tests/usage-tracking.test.ts
decisions:
  - "VoiceDebriefButton wrapped in isPast guard — entire div block conditional, not just inner component"
  - "gearId test calls real PATCH handler via NextRequest — vi.mock('@/lib/db') avoids DB dependency"
metrics:
  duration_seconds: 68
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_modified: 2
requirements:
  - AUDIT-VoiceDebriefGuard
  - AUDIT-CircularTest
---

# Phase 11 Plan 01: v1.1 Polish — VoiceDebrief Guard + Test Rewrite Summary

**One-liner:** Added isPast guard to VoiceDebriefButton in TripCard and replaced circular gearId test with a real PATCH route integration test using vi.mock.

## What Was Built

Two audit-flagged code quality fixes from the v1.1 milestone review:

1. **VoiceDebriefButton guard** — The button and its wrapper div now only render when `isPast` is true. Previously the button appeared on future and active trips, and the wrapper div with `mt-2` margin rendered unconditionally even when the button was empty.

2. **Real gearId validation test** — The previous test only asserted `'gearId' in body === false` on a local object — a circular test that proved nothing about the API. Replaced with a test that imports and calls the actual `PATCH` handler, passes a `NextRequest` without `gearId`, and asserts `res.status === 400` with `json.error === 'gearId is required'`.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Add isPast guard to VoiceDebriefButton | 6915be3 | components/TripCard.tsx |
| 2 | Rewrite circular gearId test as API integration test | 2e86ee0 | tests/usage-tracking.test.ts |

## Verification

- `grep -n 'isPast && (' components/TripCard.tsx` shows guard at line 174 wrapping VoiceDebriefButton block
- `npx vitest run tests/usage-tracking.test.ts` — 3 passed, 5 todo (8 total)
- `npx vitest run` full suite — 90 passed across 12 test files, 0 failures

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — no stub patterns introduced in this plan.

## Self-Check: PASSED

- components/TripCard.tsx: FOUND (contains `{isPast && (` at line 174 wrapping VoiceDebriefButton)
- tests/usage-tracking.test.ts: FOUND (contains PATCH import, vi.mock, await PATCH(req, ...), expect 400)
- Commit 6915be3: FOUND
- Commit 2e86ee0: FOUND
