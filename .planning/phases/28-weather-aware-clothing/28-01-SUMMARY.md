---
phase: 28-weather-aware-clothing
plan: 01
subsystem: packing-list-ai
tags: [ai, packing-list, weather, clothing, tdd]
dependency_graph:
  requires: []
  provides: [buildClothingGuidance, weather-aware-clothing-directives]
  affects: [lib/claude.ts, generatePackingList prompt]
tech_stack:
  added: []
  patterns: [pure-function-helper, threshold-constants, gear-cross-reference]
key_files:
  created:
    - tests/clothing-guidance.test.ts
  modified:
    - lib/claude.ts
decisions:
  - "buildClothingGuidance follows buildFeedbackSection pattern — pure exported function, testable in isolation"
  - "Spotlight line includes all owned clothing items for all triggered conditions — subcategory tagging deferred per CONTEXT.md"
  - "buildWeatherSection exported so tests can import directly without mocking the full prompt pipeline"
  - "UV, rain, and cold thresholds stored as named constants (not magic numbers) per CLAUDE.md coding standards"
metrics:
  duration_seconds: 300
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 2
requirements:
  - CLOTH-01
  - CLOTH-02
  - CLOTH-03
  - CLOTH-04
  - CLOTH-05
  - CLOTH-06
---

# Phase 28 Plan 01: Weather-Aware Clothing Guidance Summary

**One-liner:** TDD-built `buildClothingGuidance()` injects rain gear, cold layers, and UV protection directives into packing list prompts with owned clothing item cross-references, triggered by `precipProbability >= 40%`, `lowF <= 50F`, and `uvIndexMax >= 6` thresholds.

## What Was Built

Added weather-aware clothing guidance to `lib/claude.ts` via a new exported `buildClothingGuidance()` helper, covered by 14 unit tests written first in TDD fashion.

### Changes to lib/claude.ts

1. **Named threshold constants** at the top of the file:
   - `RAIN_THRESHOLD_PERCENT = 40`
   - `COLD_THRESHOLD_F = 50`
   - `UV_THRESHOLD_INDEX = 6`

2. **UV in `buildWeatherSection()`** — per-day weather line now includes `, UV ${d.uvIndexMax}` so the forecast Claude reads explicitly mentions UV index.

3. **`buildClothingGuidance()` exported function** — pure function following the `buildFeedbackSection()` pattern:
   - Guards: returns `''` when weather is undefined or days array is empty
   - Checks three independent thresholds with `.some()`
   - Returns `''` when no thresholds triggered
   - Returns `CLOTHING GUIDANCE:\n...` with directives for triggered conditions
   - Each directive spotlights owned clothing items with `[id:xxx]` cross-references when clothingItems array is non-empty

4. **Wired into `generatePackingList()`** — filters `gearInventory` to clothing category, calls `buildClothingGuidance()`, injects result after `weatherSection` in prompt.

5. **Instruction #4 updated** — from generic "Adjust for weather" to "Follow the CLOTHING GUIDANCE block above for specific weather-driven clothing directives."

### New file: tests/clothing-guidance.test.ts

14 unit tests covering:
- Empty/undefined weather guards (2 tests)
- No-threshold-met guard (1 test)
- Header present when any threshold triggered (1 test)
- Rain directive at and above threshold (2 tests)
- Cold layers directive at and above threshold (2 tests)
- UV protection directive at and above threshold (2 tests)
- All three together (1 test)
- Cross-reference with clothing items (1 test)
- Cross-reference omitted when no clothing items (1 test)
- UV in buildWeatherSection output (1 test)

## Verification

```
npm test -- tests/clothing-guidance.test.ts  → 14/14 passed
npm test                                      → 160/160 passed (21 test files)
grep -c buildClothingGuidance lib/claude.ts   → 2 (definition + call)
grep 'UV.*uvIndexMax' lib/claude.ts           → confirmed
grep 'CLOTHING GUIDANCE' lib/claude.ts        → confirmed
grep 'RAIN_THRESHOLD_PERCENT' lib/claude.ts   → confirmed
```

## Deviations from Plan

None — plan executed exactly as written.

The plan mentioned "at least 3 occurrences of buildClothingGuidance" counting definition + call + export separately. In TypeScript `export function buildClothingGuidance` covers definition and export as one line (2 occurrences total: definition/export + call). This is correct behavior, not a deficiency.

## Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 (RED) | Write failing tests | `2fc5492` | `tests/clothing-guidance.test.ts` |
| 2 (GREEN) | Implement buildClothingGuidance + UV + wire | `8e86e60` | `lib/claude.ts` |

## Self-Check: PASSED

- `tests/clothing-guidance.test.ts` — FOUND
- `lib/claude.ts` — FOUND (modified)
- Commit `2fc5492` — FOUND
- Commit `8e86e60` — FOUND
