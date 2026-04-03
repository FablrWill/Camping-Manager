---
phase: 13-address-review-findings
plan: 02
subsystem: error-handling
tags: [json-safety, zod, error-handling, api-hardening]
dependency_graph:
  requires: []
  provides: [safeJsonParse-utility, hardened-json-parsing]
  affects: [departure-checklist, meal-plan, packing-list, timeline, float-plan, post-trip-review, voice-extract, agent-memory]
tech_stack:
  added: [lib/safe-json.ts]
  patterns: [safeJsonParse-null-return, Zod-safeParse-for-LLM-output]
key_files:
  created:
    - lib/safe-json.ts
  modified:
    - lib/voice/extract.ts
    - lib/agent/memory.ts
    - app/api/departure-checklist/[id]/check/route.ts
    - app/api/departure-checklist/route.ts
    - app/api/float-plan/route.ts
    - app/api/meal-plan/route.ts
    - app/api/packing-list/route.ts
    - app/api/timeline/route.ts
    - components/PostTripReview.tsx
decisions:
  - "safeJsonParse returns null on failure — callers decide whether to 500 or use fallback"
  - "LLM output uses Zod InsightPayloadSchema safeParse — throws typed error for route to catch"
  - "timeline waypoints fall back to [] on corrupt data — partial data better than 500"
  - "float-plan checklist parse failure silently skips status — email still sends"
metrics:
  duration: 8
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 10
---

# Phase 13 Plan 02: JSON Safety Hardening Summary

**One-liner:** Zod-validated LLM JSON parsing and safeJsonParse utility replacing ~10 bare JSON.parse calls that could crash routes or components on malformed DB/LLM data.

## What Was Built

Created `lib/safe-json.ts` with `safeJsonParse<T>` — a null-on-failure wrapper for DB-stored JSON. Applied it across 6 API routes and 1 component. Fixed HIGH-priority LLM JSON.parse calls in `lib/voice/extract.ts` (Zod schema validation) and `lib/agent/memory.ts` (Zod MemoryArraySchema safeParse).

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create safe-json utility + fix HIGH LLM JSON.parse issues | c466cbb | lib/safe-json.ts, lib/voice/extract.ts, lib/agent/memory.ts |
| 2 | Harden MEDIUM DB-stored JSON.parse across API routes and components | ec58a4b | 7 files |

## Deviations from Plan

### Scope Reduction (Expected)

**Files with no JSON.parse to fix (plan expected 13 but 7 had actual issues):**
- `components/DepartureChecklistClient.tsx` — no bare JSON.parse; receives pre-parsed JSON from API
- `components/MealPlan.tsx` — same as above
- `components/PackingList.tsx` — same as above
- `components/InsightsReviewSheet.tsx` — no bare JSON.parse on DB content
- `components/TripPrepClient.tsx` — no bare JSON.parse on DB content
- `app/api/trips/[id]/feedback/route.ts` — no bare JSON.parse; summary returned as-is to client

These components display data fetched from APIs that now return pre-parsed JSON. The components were correctly written — the fix was at the API layer.

**Rule 1 observation:** `lib/agent/tools/recommend.ts` already had `JSON.parse(raw)` inside a try-catch (line 122). No fix needed.

**Rule 1 observation:** `app/api/chat/route.ts` uses BetaToolRunner (not manual SSE parsing), so no `JSON.parse(eventData)` pattern exists. The inline `parse` function already had try-catch.

## Decisions Made

- `safeJsonParse` returns `null` on failure; callers choose whether to 500 (routes) or skip rendering (components). This is more composable than throwing.
- `lib/voice/extract.ts` Zod schema uses `.default([])` for arrays so partial LLM responses still produce valid typed output instead of validation failures.
- `float-plan/route.ts` checklist parse failure falls back to the default "not yet generated" string rather than returning 500 — the email still sends successfully.
- `timeline/route.ts` waypoints fallback is `[]` (empty array) — consistent with what the client expects and better than 500 for a visualization feature.

## Known Stubs

None — all changes wire real error handling.

## Self-Check: PASSED

- lib/safe-json.ts: FOUND
- lib/voice/extract.ts contains safeParse: FOUND
- lib/agent/memory.ts contains safeParse: FOUND
- 7 files import safeJsonParse: VERIFIED
- No bare JSON.parse on DB content in target files: VERIFIED
- TypeScript compiled successfully: VERIFIED (build fails only on missing DATABASE_URL env var, pre-existing worktree limitation)
