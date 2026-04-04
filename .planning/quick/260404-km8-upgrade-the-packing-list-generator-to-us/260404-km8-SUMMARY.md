---
phase: quick-260404-km8
plan: 01
subsystem: packing-list
tags: [packing, ai, prompt-engineering, context-fetching, s35]
dependency_graph:
  requires: []
  provides: [packing-intelligence-context]
  affects: [app/api/packing-list/route.ts, lib/claude.ts]
tech_stack:
  added: []
  patterns: [non-blocking-try-catch, optional-context-enrichment]
key_files:
  created:
    - lib/packing-intelligence.ts
  modified:
    - lib/claude.ts
    - app/api/packing-list/route.ts
decisions:
  - buildPackingContext wraps all DB queries in nested try-catch — any section failure returns undefined rather than breaking packing list generation
  - PackingContext imported as type-only in claude.ts to avoid circular dependency risk
  - intelligenceSection injected between feedbackSection and INSTRUCTIONS to group historical context together
  - Nearby location query uses 0.5-degree bounding box (~30 miles) matching plan spec
  - Monthly season matching done client-side (post-query filter) because SQLite lacks a native month() function in Prisma raw queries
metrics:
  duration_seconds: 344
  tasks_completed: 2
  files_changed: 3
  completed_date: "2026-04-04"
---

# Quick Task 260404-km8: Upgrade Packing List Generator to Use Rich Historical Context (S35 Smart Packing v2)

**One-liner:** New `lib/packing-intelligence.ts` module builds 4 optional context blocks (location history, seasonal context, gear skip suggestions, weight note) from DB history and injects them into the Claude packing list prompt.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create lib/packing-intelligence.ts with buildPackingContext | e0566c3 | lib/packing-intelligence.ts |
| 2 | Update generatePackingList to accept PackingContext and wire in route | 55fccba | lib/claude.ts, app/api/packing-list/route.ts |

## What Was Built

### lib/packing-intelligence.ts (new)

Exports `PackingContext` interface and `buildPackingContext(tripId: string): Promise<PackingContext>`.

Four optional context blocks:

1. **locationHistory** — Queries past trips to the same `locationId` or within 0.5 degrees lat/lon (~30 miles). Includes trip names, dates, notes, and location seasonal ratings. Formatted as a readable narrative.

2. **seasonalContext** — Identifies the trip month and finds past trips within ±1 month. Adds elevation context (meters → feet) if the location has altitude data. Post-query month filtering used since SQLite has no native month() function in Prisma.

3. **gearSkipSuggestions** — Aggregates PackingItem `usageStatus` across the last 10 trips (expanded from the existing 5-trip limit in the route). Items with `didntNeedCount >= 2 AND usedCount == 0` are listed as "consider skipping"; items with `didntNeedCount >= 2 AND usedCount > 0` are listed as "low priority".

4. **weightNote** — Sums all non-wishlist gear weights. If total > 35 lbs, adds a comfort threshold warning.

All sections wrapped in individual try-catch; the outer function also wrapped in try-catch. Returns `{}` on total failure so generation never breaks.

### lib/claude.ts (updated)

- Added `import type { PackingContext } from '@/lib/packing-intelligence'`
- Added optional `packingContext?: PackingContext` to `generatePackingList` params
- Builds `intelligenceSection` string from PackingContext blocks with labeled headers (`LOCATION HISTORY:`, `SEASONAL CONTEXT:`, `GEAR SKIP SUGGESTIONS:`, `WEIGHT NOTE:`)
- Injects `intelligenceSection` into prompt between `feedbackSection` and `INSTRUCTIONS:`
- Updated instruction #8 to reference the new context blocks

### app/api/packing-list/route.ts (updated)

- Added `import { buildPackingContext } from '@/lib/packing-intelligence'`
- Calls `buildPackingContext(tripId)` before `generatePackingList()` in a non-blocking try-catch
- Passes `packingContext` to `generatePackingList()`

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npx tsc --noEmit` — no errors in modified files (pre-existing errors in `lib/agent/memory.ts` and `lib/__tests__/bulk-import.test.ts` are unrelated and pre-dated this work)
- `npm run build` — passes successfully
- Graceful degradation confirmed: when `buildPackingContext` returns `{}`, `intelligenceSection` is empty string and prompt is identical to previous behavior

## Self-Check: PASSED

- [x] `lib/packing-intelligence.ts` exists
- [x] `lib/claude.ts` modified with PackingContext import and optional param
- [x] `app/api/packing-list/route.ts` calls buildPackingContext and passes result
- [x] Commit e0566c3 exists (Task 1)
- [x] Commit 55fccba exists (Task 2)
- [x] Build passes
