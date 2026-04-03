---
phase: 33-conversational-trip-planner
plan: 01
subsystem: api
tags: [claude-api, sse, anthropic-sdk, prisma, streaming, trip-planner]

requires:
  - phase: 33-00
    provides: "failing test stubs for TRIP_PLANNER_TOOLS and executeTripPlannerTool"

provides:
  - "POST /api/trip-planner SSE streaming endpoint with focused system prompt"
  - "TRIP_PLANNER_SYSTEM_PROMPT — trip planner persona, never creates trips directly"
  - "webSearchCampsites tool — web search with 10s AbortController timeout"
  - "TRIP_PLANNER_TOOLS registry — exactly 4 tools (list_gear, get_weather, list_locations, web_search_campsites)"
  - "executeTripPlannerTool dispatcher — routes tool calls to executors"
  - "Conversation + Message persistence for trip planner conversations"

affects: [33-02, 33-03, trip-planner-ui]

tech-stack:
  added: []
  patterns:
    - "BetaToolRunner pattern reused from /api/chat with restricted tool set"
    - "Separate system prompt file per agent persona (trip-planner vs camping-expert)"
    - "AbortController timeout pattern for external API calls"
    - "Web search via Anthropic API with beta header + haiku fallback"

key-files:
  created:
    - lib/agent/trip-planner-system-prompt.ts
    - lib/agent/tools/webSearchCampsites.ts
    - lib/agent/tools/trip-planner-tools.ts
    - app/api/trip-planner/route.ts
  modified:
    - lib/__tests__/trip-planner-tools.test.ts

key-decisions:
  - "trip-planner route is separate from /api/chat to keep tool set and prompt focused (D-07, D-08)"
  - "Agent presents trip_summary JSON card but never calls createTrip — client handles creation after confirm (D-09 anti-pattern avoided)"
  - "No memory extraction in trip planner route — conversations are short and focused, don't need camping knowledge persistence"
  - "webSearchCampsites uses haiku model (cost-efficient) with web-search beta; falls back to plain text prompt if beta unavailable"
  - "Test stubs converted from require() pattern to direct imports — require() doesn't resolve TS modules in vitest ESM context"

patterns-established:
  - "Per-agent system prompts: each agent persona gets its own file (lib/agent/*-system-prompt.ts)"
  - "Per-agent tool registries: restricted tool sets defined in lib/agent/tools/*-tools.ts"

requirements-completed: [TRIP-CHAT-04, TRIP-CHAT-05, TRIP-CHAT-09]

duration: 4min
completed: 2026-04-03
---

# Phase 33 Plan 01: Backend API + Trip Planner System Prompt Summary

**Dedicated `/api/trip-planner` SSE route with focused 4-tool set, campsite web search, and conversation persistence via Anthropic BetaToolRunner**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-03T18:31:09Z
- **Completed:** 2026-04-03T18:34:36Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created focused trip planner system prompt that collects trip details conversationally and presents a `trip_summary` JSON card (never creates trips directly)
- Implemented `webSearchCampsites` tool with `AbortController` 10s timeout and graceful fallback
- Built 4-tool registry (`list_gear`, `get_weather`, `list_locations`, `web_search_campsites`) with dispatcher
- Created `/api/trip-planner` SSE route mirroring `/api/chat` pattern, using focused prompt + restricted tools + full conversation persistence

## Task Commits

Each task was committed atomically:

1. **Task 1: System prompt, web search tool, tool registry** - `68e35d7` (feat)
2. **Task 2: /api/trip-planner SSE route** - `f271d12` (feat)

## Files Created/Modified
- `lib/agent/trip-planner-system-prompt.ts` — focused trip planner persona; instructs agent to present summary card, never create trips
- `lib/agent/tools/webSearchCampsites.ts` — campsite web search via Anthropic API + beta web search header; AbortController timeout; haiku fallback
- `lib/agent/tools/trip-planner-tools.ts` — exactly 4-tool registry + dispatcher
- `app/api/trip-planner/route.ts` — SSE endpoint; BetaToolRunner; conversation + message persistence; no memory extraction
- `lib/__tests__/trip-planner-tools.test.ts` — converted from require() stubs to direct imports; all 3 tests GREEN

## Decisions Made
- Trip planner gets its own route (not a mode switch on `/api/chat`) for clean separation of tool sets and prompts
- Agent presents `trip_summary` JSON card and waits for confirm — client creates the trip (avoids Pitfall 3 from RESEARCH.md)
- No memory extraction in trip planner — these conversations are short-lived and don't contain camping knowledge worth persisting
- Web search uses the Anthropic `web-search-2025-03-05` beta header; falls back to plain claude-haiku-4-5 completion if unavailable

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Converted require() test stubs to direct imports**
- **Found during:** Task 1 verification (running Wave 0 tests)
- **Issue:** Tests used `require()` inside it() blocks to lazily resolve the module (RED-phase strategy from Plan 33-00). After the source files were created, `require()` still failed with MODULE_NOT_FOUND because vitest runs in ESM mode and `require()` cannot resolve TypeScript modules at runtime
- **Fix:** Rewrote test to use top-level `import` statements with `vi.mock('@/lib/db')` for prisma isolation
- **Files modified:** `lib/__tests__/trip-planner-tools.test.ts`
- **Verification:** All 3 tests pass — `TRIP_PLANNER_TOOLS.length === 4`, all 4 tool names present, unknown tool returns error string
- **Committed in:** `68e35d7` (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (Rule 1 - bug in test module resolution)
**Impact on plan:** Necessary to make RED→GREEN TDD cycle work. No scope creep.

## Issues Encountered
- Pre-existing TypeScript errors (`gearDocument` Prisma model missing, `bulk-import.test.ts` Buffer type) caused `npm run build` to fail, but these are unrelated to this plan. New files compile cleanly (confirmed via `npx tsc --noEmit 2>&1 | grep trip-planner` returns no errors).

## Next Phase Readiness
- `/api/trip-planner` is ready to receive POST requests from the UI
- Plan 33-02 can build the `TripPlannerChat` component and wire it to this endpoint
- `extractTripSummary` utility needed in Plan 33-02 for parsing `trip_summary` JSON cards from assistant messages

---
*Phase: 33-conversational-trip-planner*
*Completed: 2026-04-03*
