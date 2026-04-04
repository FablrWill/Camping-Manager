---
phase: 39-personal-signal-map
plan: 01
subsystem: signal-map
tags: [signal, api, library, tdd]
dependency_graph:
  requires: []
  provides: [signal-summary-lib, signal-summary-api]
  affects: [SpotMap, spots-client]
tech_stack:
  added: []
  patterns: [pure-function-library, prisma-aggregation]
key_files:
  created:
    - lib/signal-summary.ts
    - lib/__tests__/signal-summary.test.ts
    - app/api/locations/signal-summary/route.ts
  modified: []
decisions:
  - "getSignalTier priority order: green > red > yellow > gray — red checked before yellow to prevent cellBars=0 from matching yellow clause"
  - "aggregateSignalSummaries builds immutable result via spread — no mutation of log array"
  - "Promise.all for parallel DB queries in API route — avoids sequential await latency"
metrics:
  duration: 3m
  completed: 2026-04-04T19:28:00Z
  tasks_completed: 2
  files_changed: 3
---

# Phase 39 Plan 01: Signal Summary Data Layer Summary

**One-liner:** Signal tier classification library (green/yellow/red/gray) and GET endpoint returning per-location signal summaries from SignalLog records with Location string fallback.

## What Was Built

### lib/signal-summary.ts
Pure function library with three exports:
- `SignalTier` — `"green" | "yellow" | "red" | "gray"` union type
- `SignalSummary` — interface with `tier`, `bestCellType`, `bestCellBars`, `bestStarlinkQuality`, `readingCount`
- `getSignalTier({ cellBars, cellType, starlinkQuality })` — classifies a single reading per D-04 through D-07
- `aggregateSignalSummaries(logs, cellSignalStr, starlinkSignalStr)` — picks best tier across all logs; falls back to parsing Location string fields when no logs exist

### app/api/locations/signal-summary/route.ts
GET endpoint that:
1. Queries all SignalLog rows + all Location signal fields in parallel (Promise.all)
2. Groups logs by locationId
3. Calls `aggregateSignalSummaries` per location
4. Returns `Record<locationId, SignalSummary>` as JSON

### lib/__tests__/signal-summary.test.ts
15 tests covering all tier combinations, boundary conditions, and fallback paths.

## Tier Logic (D-04 through D-07)

| Tier   | Condition |
|--------|-----------|
| green  | LTE/5G + cellBars ≥ 3, OR starlinkQuality = strong/excellent |
| yellow | cellBars 1–2, OR starlinkQuality = moderate, OR LTE/5G + cellBars < 3 |
| red    | cellType = "none" OR cellBars = 0 |
| gray   | all fields null/undefined (unknown) |

Priority when multiple conditions match: green → red → yellow → gray (red is checked before yellow to prevent cellBars=0 from entering yellow).

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] lib/signal-summary.ts exists and exports SignalTier, SignalSummary, getSignalTier, aggregateSignalSummaries
- [x] lib/__tests__/signal-summary.test.ts has 15 tests, all pass
- [x] app/api/locations/signal-summary/route.ts exists with GET handler
- [x] No TypeScript errors in new files (pre-existing error in bulk-import.test.ts is out of scope)
- [x] Commits: 2b8be6b (Task 1), 1662729 (Task 2)

## Self-Check: PASSED
