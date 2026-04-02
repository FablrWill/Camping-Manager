---
phase: 09-learning-loop
plan: "02"
subsystem: learning-loop
tags: [ai, claude, trip-summary, post-trip, feedback, haiku]
dependency_graph:
  requires:
    - 09-01 (PostTripReview component + usage tracking PATCH endpoint)
    - lib/parse-claude.ts (parseClaudeJSON utility, existing schemas)
    - prisma/schema.prisma (TripFeedback model, PackingItem.usageStatus)
  provides:
    - TripSummaryResultSchema (Zod validation for Claude response)
    - generateTripSummary (lib/claude.ts — calls Haiku with usage data)
    - GET/POST /api/trips/[id]/feedback (fetch existing summary, generate + store)
    - PostTripReview summary display (auto-generate trigger + trip debrief card)
  affects:
    - components/PostTripReview.tsx (extended with summary states + display)
    - lib/parse-claude.ts (TripSummaryResultSchema added)
    - lib/claude.ts (generateTripSummary added)
tech_stack:
  added:
    - claude-haiku-4-20250514 model for trip debrief generation
  patterns:
    - append-only TripFeedback creation (never mutate existing records)
    - JSON.stringify for storage, JSON.parse on read (summary field is JSON blob in String column)
    - duplicate prevention via findFirst before Claude call
    - useRef generatingRef to prevent race condition on rapid re-renders
key_files:
  created:
    - app/api/trips/[id]/feedback/route.ts
  modified:
    - lib/parse-claude.ts
    - lib/claude.ts
    - components/PostTripReview.tsx
    - tests/trip-summary.test.ts
decisions:
  - "Summary stored as JSON.stringify(TripSummaryResult) in TripFeedback.summary String field — parsed with JSON.parse on read"
  - "generatingRef prevents double-invocation during React render cycle when allComplete first becomes true"
  - "GET feedback uses findFirst with summary: { not: null } — skips pending/empty records"
  - "POST returns cached:true when existing summary found — no duplicate Claude call"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_modified: 4
  files_created: 1
---

# Phase 9 Plan 02: AI Trip Summary Generation Summary

**One-liner:** Claude Haiku post-trip debrief with Zod-validated TripSummaryResult, auto-generates when all gear items are reviewed, stores append-only in TripFeedback.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | TripSummaryResult schema + generateTripSummary + feedback API | 991db48 | lib/parse-claude.ts, lib/claude.ts, app/api/trips/[id]/feedback/route.ts, tests/trip-summary.test.ts |
| 2 | Auto-generate trigger + summary display in PostTripReview | ea68fd7 | components/PostTripReview.tsx |

## What Was Built

**TripSummaryResultSchema** (`lib/parse-claude.ts`): Zod schema validating `whatToDrop` (string[], defaults []), `whatWasMissing` (string[], defaults []), `locationRating` (number 1-5 or null), and `summary` (string).

**generateTripSummary** (`lib/claude.ts`): Calls `claude-haiku-4-20250514` with trip name, dates, location, and categorized gear usage breakdown. Returns `TripSummaryResult` via `parseClaudeJSON`.

**Feedback API** (`app/api/trips/[id]/feedback/route.ts`):
- `GET`: Returns most recent `TripFeedback` row with non-null summary, or null
- `POST`: Checks for existing summary first (returns cached), validates all packing items have `usageStatus`, calls `generateTripSummary`, stores result as `JSON.stringify` in `TripFeedback.create()` (append-only)

**PostTripReview** (`components/PostTripReview.tsx`):
- Fetches existing summary on mount via `GET /api/trips/[id]/feedback`
- Parses `feedback.summary` via `JSON.parse` before accessing `.whatToDrop` etc.
- Auto-triggers `generateSummary()` when `allComplete && !summaryExists && !summaryLoading`
- Uses `useRef` guard to prevent race condition on rapid re-renders
- Displays "Trip Debrief" amber card with summary prose, whatToDrop chips, whatWasMissing chips, locationRating
- Loading state (animate-pulse), error state with Retry button

## Decisions Made

1. **JSON.stringify for storage**: `TripFeedback.summary` is a `String?` column in Prisma. The full `TripSummaryResult` object is stored as `JSON.stringify(result)` and read back with `JSON.parse(feedback.summary)`. This avoids schema migration for structured data.

2. **generatingRef prevents double-calls**: React's render cycle can re-evaluate `allComplete` multiple times. A `useRef` guard ensures `generateSummary` is only called once even if the component re-renders while the request is in flight.

3. **Duplicate prevention at POST level**: The POST handler calls `findFirst` before hitting Claude. If a summary already exists, it returns `{ cached: true }` immediately — no Claude API cost.

4. **Haiku for debrief**: Trip debrief is low-complexity summarization. `claude-haiku-4-20250514` is sufficient and keeps costs minimal.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all summary fields are wired and rendered from live API data.

## Self-Check: PASSED

Files exist:
- `lib/parse-claude.ts` contains `TripSummaryResultSchema` — FOUND
- `lib/claude.ts` contains `generateTripSummary` — FOUND
- `app/api/trips/[id]/feedback/route.ts` — FOUND
- `components/PostTripReview.tsx` contains `summaryExists`, `JSON.parse`, `Trip Debrief` — FOUND

Commits exist:
- 991db48 (Task 1) — FOUND
- ea68fd7 (Task 2) — FOUND

Tests: 7 passed, 2 todo (API integration tests deferred — require Prisma mock setup)
