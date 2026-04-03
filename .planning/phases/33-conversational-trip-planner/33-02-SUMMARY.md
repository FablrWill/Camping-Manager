---
phase: 33-conversational-trip-planner
plan: "02"
subsystem: chat-ui
tags: [chat, trip-planner, components, extraction]
dependency_graph:
  requires: ["33-00"]
  provides: ["33-03"]
  affects: [components/ChatClient.tsx, components/ChatBubble.tsx, lib/chat-extract.ts]
tech_stack:
  added: [lib/chat-extract.ts]
  patterns: [prop-extension, re-export, pure-utility-extraction]
key_files:
  created:
    - lib/chat-extract.ts
    - lib/__tests__/chat-bubble-extraction.test.ts
  modified:
    - components/ChatClient.tsx
    - components/ChatBubble.tsx
decisions:
  - "extractTripSummary extracted to lib/chat-extract.ts (pure TS, no JSX) so Vitest can import without JSX transformation issues; ChatBubble re-exports for backward compatibility"
  - "handleCreateTrip in ChatClient POSTs to /api/trips client-side — trip creation is NOT driven by SSE message_complete event"
  - "TripSummaryPayload imported via type-only import in ChatClient to avoid circular module concerns"
metrics:
  duration_seconds: 313
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_modified: 4
requirements: [TRIP-CHAT-06, TRIP-CHAT-07, TRIP-CHAT-08]
---

# Phase 33 Plan 02: Chat Component Extensions Summary

**One-liner:** ChatClient and ChatBubble extended with configurable API endpoint, fullHeight mode, trip_summary card extraction/rendering, and client-side trip creation via POST /api/trips.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Extend ChatClient with apiEndpoint, fullHeight, onTripCreated | 917c650 | components/ChatClient.tsx |
| 2 | Add trip_summary card extraction and rendering to ChatBubble | ac046df | components/ChatBubble.tsx, lib/chat-extract.ts, lib/__tests__/chat-bubble-extraction.test.ts |

## What Was Built

### Task 1: ChatClient Props Extension

`components/ChatClient.tsx` now accepts three new optional props:

- `apiEndpoint?: string` (default `'/api/chat'`) — controls which SSE endpoint the chat uses. The trip-planner sheet will pass `'/api/trip-planner'` here.
- `fullHeight?: boolean` (default `false`) — when true, the container fills its parent (`100%`) instead of using the fixed viewport calculation. The sticky input bar also moves to `bottom-0` instead of `bottom-20`.
- `onTripCreated?: (tripId: string) => void` — callback fired after the client successfully creates a trip via POST `/api/trips`.

The `handleCreateTrip` function handles client-side trip creation: it POSTs the trip payload from the summary card to `/api/trips`, then calls `onTripCreated(trip.id)`. Trip creation is entirely client-side — NOT triggered by a `message_complete` SSE event.

All existing behavior on `/chat` is unchanged (all new props have defaults).

### Task 2: ChatBubble trip_summary Card

`lib/chat-extract.ts` (new pure utility file):
- `TripSummaryPayload` interface
- `extractTripSummary(content: string): TripSummaryPayload | null` — extracts `action: 'trip_summary'` JSON blocks from assistant messages, both fenced code blocks and inline JSON

`components/ChatBubble.tsx`:
- Imports `extractTripSummary` and `TripSummaryPayload` from `lib/chat-extract.ts`
- Re-exports both so callers importing from `ChatBubble` continue to work
- Adds `onCreateTrip?: (payload: TripSummaryPayload) => void` prop
- Extracts `tripSummary` from assistant messages in component body
- Strips the JSON block from `displayContent` when a card is shown
- Renders a confirm card with trip name, date range, optional "Bringing the dog" tag, optional notes, and an amber "Create Trip" button

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Extracted extractTripSummary to lib/chat-extract.ts**
- **Found during:** Task 2 verification — Wave 0 tests failing with "Cannot find module"
- **Issue:** The Wave 0 test used `require('../../components/ChatBubble')` to lazily load the component. This approach fails in the Vitest ESM environment: TSX files with `'use client'` + JSX + React hooks cannot be `require()`'d without a CJS build transform that isn't configured.
- **Fix:** Extracted `TripSummaryPayload` and `extractTripSummary` to `lib/chat-extract.ts` (pure TypeScript, no JSX). Updated test to use a regular ESM `import` from `lib/chat-extract`. Updated `ChatBubble.tsx` to import from `lib/chat-extract` and re-export both symbols. Updated `ChatClient.tsx` to import `TripSummaryPayload` from `lib/chat-extract`.
- **Files modified:** lib/chat-extract.ts (new), components/ChatBubble.tsx, components/ChatClient.tsx, lib/__tests__/chat-bubble-extraction.test.ts
- **Commit:** ac046df

## Verification

- TypeScript: no errors in ChatClient.tsx, ChatBubble.tsx, or lib/chat-extract.ts
- Wave 0 tests: 5/5 passing (`lib/__tests__/chat-bubble-extraction.test.ts`)
- All new props have defaults — existing `/chat` page usage unaffected
- Acceptance criteria fully met for both tasks

## Self-Check: PASSED

Files exist:
- components/ChatClient.tsx — FOUND
- components/ChatBubble.tsx — FOUND
- lib/chat-extract.ts — FOUND
- lib/__tests__/chat-bubble-extraction.test.ts — FOUND

Commits exist:
- 917c650 — FOUND
- ac046df — FOUND
