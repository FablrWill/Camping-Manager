---
phase: 04-chat-agent
plan: "04"
subsystem: chat-agent
tags: [chat, streaming, BetaToolRunner, navigation, FAB, context-aware]
dependency_graph:
  requires: [04-02, 04-03]
  provides: [streaming-chat-api, nav-chat-tab, context-aware-fab]
  affects: [BottomNav, TripsClient, GearClient, SpotsClient]
tech_stack:
  added: [BetaRunnableTool wrapper pattern]
  patterns: [SSE streaming, BetaToolRunner with max_iterations, ReadableStream response]
key_files:
  created:
    - app/api/chat/route.ts
    - components/ChatContextButton.tsx
  modified:
    - components/BottomNav.tsx
    - components/TopHeader.tsx
    - components/TripsClient.tsx
    - components/GearClient.tsx
    - app/spots/spots-client.tsx
decisions:
  - "Wrapped plain Tool schemas as BetaRunnableTool with run()+parse() in route — tools in registry are Tool[], not BetaRunnableTool[]"
  - "BottomNav final config: Home/Gear/Spots/Trips/Chat — Vehicle removed, Trips restored"
  - "TripsClient FAB uses click-to-select pattern (selectedTripId state) since no modal exists"
metrics:
  duration_minutes: 12
  completed_date: "2026-03-31"
  tasks_completed: 2
  tasks_total: 3
  files_created: 2
  files_modified: 5
---

# Phase 04 Plan 04: Chat Integration (Wire-Up) Summary

**One-liner:** Streaming chat API with BetaToolRunner+max_iterations=8, SSE protocol, conversation persistence, Chat tab in bottom nav replacing Vehicle, and context-aware FAB on trips/gear/spots pages.

## Status: PAUSED AT CHECKPOINT (Task 3)

Tasks 1 and 2 are committed. Task 3 is a `checkpoint:human-verify` — awaiting end-to-end verification by the user before marking complete.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create streaming chat API route with BetaToolRunner | da21218 | Done |
| 2 | Add Chat tab to BottomNav, update TopHeader, create FAB | 97b0757 | Done |
| 3 | Verify end-to-end chat functionality | — | Awaiting human verify |

## What Was Built

### Task 1 — `app/api/chat/route.ts`

- POST handler with SSE streaming response (`text/event-stream`)
- BetaToolRunner with `max_iterations: 8` — SDK-native iteration cap (CHAT-04)
- Creates conversation on first message; resumes existing conversation by ID
- Builds context window (memories + conversation history) before saving new message to avoid duplication
- Persists both user and assistant messages to DB
- Fire-and-forget memory extraction via `extractAndSaveMemory`
- SSE event protocol: `text_delta`, `tool_activity`, `message_complete`, `stream_error`

### Task 2 — Navigation + FAB

- **BottomNav**: final 5-tab config: Home / Gear / Spots / Trips / Chat (Vehicle removed)
- **TopHeader**: added `/chat: 'Chat'` title entry, kept `/vehicle: 'Vehicle'`
- **ChatContextButton**: floating amber button, `fixed bottom-24 right-4 z-40`, links to `/chat?context=type:id`
- **TripsClient**: click-to-select pattern (`selectedTripId` state), FAB shown when trip selected
- **GearClient**: FAB shown when `editingItem` is non-null (gear edit modal open)
- **SpotsClient**: FAB shown when `editingLocation.id` is set (editing existing spot)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] AGENT_TOOLS are plain Tool[], not BetaRunnableTool[]**
- **Found during:** Task 1
- **Issue:** The plan assumes `AGENT_TOOLS` can be passed directly to `BetaToolRunner`, but the SDK requires `BetaRunnableTool[]` (with `run()` and `parse()` methods). Plain `Tool[]` lacks these methods.
- **Fix:** Added `makeRunnableTools()` function that wraps each Tool schema with `run()` (dispatching to `executeAgentTool`) and `parse()` (JSON decode). This is the correct pattern for tools that have separate execute functions.
- **Files modified:** `app/api/chat/route.ts`
- **Commit:** da21218

**2. [Rule 1 - Bug] BottomNav already had Chat tab (from Plan 01); Vehicle needed removal + Trips needed restoration**
- **Found during:** Task 2
- **Issue:** The plan says "Chat replaces Vehicle" but the existing BottomNav (from Plan 01) had already replaced Trips with Chat. Current nav was: Home/Gear/Vehicle/Spots/Chat. The target nav should be: Home/Gear/Spots/Trips/Chat.
- **Fix:** Removed Car/Vehicle, added Tent/Trips to restore the Trips tab. Final nav matches plan's 5-tab intent.
- **Files modified:** `components/BottomNav.tsx`
- **Commit:** 97b0757

## Known Stubs

None — all data flows are wired to real sources.

## Self-Check: PASSED

- app/api/chat/route.ts: FOUND
- components/ChatContextButton.tsx: FOUND
- commit da21218: FOUND
- commit 97b0757: FOUND
