---
phase: 04-chat-agent
plan: "02"
subsystem: chat-agent
tags: [chat, agent, tools, system-prompt, memory, context-window]
dependency_graph:
  requires: [04-01]
  provides: [agent-tool-registry, system-prompt-constant, memory-module]
  affects: [lib/agent/tools, lib/agent/system-prompt, lib/agent/memory]
tech_stack:
  added: []
  patterns: [modular-tool-registry, sliding-window-context, llm-memory-extraction, delete-confirmation-protocol]
key_files:
  created:
    - lib/agent/tools/searchKnowledge.ts
    - lib/agent/tools/listGear.ts
    - lib/agent/tools/updateGear.ts
    - lib/agent/tools/listTrips.ts
    - lib/agent/tools/getTrip.ts
    - lib/agent/tools/createTrip.ts
    - lib/agent/tools/updateTrip.ts
    - lib/agent/tools/listLocations.ts
    - lib/agent/tools/getWeather.ts
    - lib/agent/tools/togglePackingItem.ts
    - lib/agent/tools/deleteConfirm.ts
    - lib/agent/memory.ts
  modified:
    - lib/agent/tools/index.ts
    - lib/agent/system-prompt.ts
decisions:
  - "Keep Plan 01 ALL_TOOLS/executeTool exports for backward compat — add AGENT_TOOLS/executeAgentTool alongside"
  - "Use claude-3-5-haiku-20241022 for memory extraction (known good model ID, vs unreleased haiku-4-5-20250901)"
  - "deleteConfirm returns JSON signal only — actual deletion requires user confirmation in next conversation turn"
  - "Memory injection uses synthetic user/assistant pair ('Got it.') to maintain valid alternating role structure"
metrics:
  duration: "12 minutes"
  completed: "2026-03-31"
  tasks_completed: 2
  files_modified: 14
---

# Phase 4 Plan 2: Agent Backend Summary

**One-liner:** 11-tool agent registry with read/write access to all data domains, camping expert system prompt constant, and LLM-based memory extraction with sliding window context.

## What Was Built

### Tool Registry Expansion (Task 1)

Expanded `lib/agent/tools/` from 5 Plan-01 query tools to 11 tools covering full CRUD + delete confirmation protocol:

| Tool | Name | Type | Description |
|------|------|------|-------------|
| searchKnowledge.ts | search_knowledge_base | read | Hybrid RAG search via hybridSearch + buildRagContext |
| listGear.ts | list_gear | read | Gear inventory with category/wishlist filters |
| updateGear.ts | update_gear | write | Update notes, condition, storage location |
| listTrips.ts | list_trips | read | List trips with upcoming filter |
| getTrip.ts | get_trip | read | Full trip details with packing list |
| createTrip.ts | create_trip | write | Create new trip |
| updateTrip.ts | update_trip | write | Update trip fields |
| listLocations.ts | list_locations | read | Camping spots with type/rating filters |
| getWeather.ts | get_weather | read | Open-Meteo forecast by coordinates |
| togglePackingItem.ts | toggle_packing_item | write | Upsert packing item packed status |
| deleteConfirm.ts | request_delete_confirmation | protocol | Returns JSON signal — never deletes |

`lib/agent/tools/index.ts` updated to export both `AGENT_TOOLS` (11 tools) and `executeAgentTool()` dispatcher alongside the Plan 01 `ALL_TOOLS`/`executeTool()` for backward compatibility.

**Design decisions:**
- Tools call Prisma directly, never HTTP routes (anti-pattern from RESEARCH.md)
- Tool descriptions kept to 1-2 sentences to minimize per-request token overhead
- Every tool's execute function wrapped in try-catch — failures return error strings so agent can apologize and continue
- deleteConfirm implements 2-message round-trip: tool returns `{ action: "confirm_delete", ... }` JSON, ChatClient renders confirmation card, user reply triggers actual delete in next turn

### System Prompt Constant (Task 2)

`lib/agent/system-prompt.ts` now exports two things:
- `CAMPING_EXPERT_SYSTEM_PROMPT` — static constant for use by the streaming API route (D-08 persona)
- `buildSystemPrompt(ctx)` — dynamic version that injects live stats (kept from Plan 01)

The constant encodes:
- Camping buddy persona: "knowledgeable camping buddy — casual, direct, helpful"
- Explicit deleteConfirm protocol in behavior rules
- User context: Will, Asheville NC, Santa Fe Hybrid, ADHD-friendly output rules

### Memory + Context Windowing (Task 2)

`lib/agent/memory.ts` implements D-13 (memory extraction) and D-14 (sliding window):

**buildContextWindow(conversationId, pageContext)**
- Loads all AgentMemory rows
- Injects memories + page context as synthetic user/assistant exchange ("Got it.") to maintain valid alternating role structure
- Loads last 20 messages (SLIDING_WINDOW_SIZE) from conversation history
- Returns ready-to-use messages array for Anthropic API calls

**extractAndSaveMemory(assistantMessage, userMessage)**
- Fires after each assistant response (fire-and-forget)
- Skips messages < 20 chars
- Calls claude-3-5-haiku-20241022 to extract `{key, value}` preference pairs
- Upserts each key into AgentMemory table
- Full try-catch: failures logged, never throw — chat is never blocked

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Merged Plan 01 branch before starting**
- **Found during:** Task 1 setup
- **Issue:** agent-a41d70fb worktree was behind worktree-agent-a8463676 (plan 01) — lib/agent/ didn't exist
- **Fix:** `git merge worktree-agent-a8463676` (fast-forward, no conflicts)
- **Files modified:** None (merge only)

**2. [Rule 2 - Missing] Added try-catch to deleteConfirm**
- **Found during:** Acceptance criteria verification
- **Issue:** deleteConfirm.ts had no try-catch despite plan requiring all tools to have one
- **Fix:** Wrapped JSON.stringify return in try-catch
- **Files modified:** lib/agent/tools/deleteConfirm.ts
- **Commit:** 2fb5187

### Model ID Selection
- **Plan specified:** `claude-haiku-4-5-20250901` (preferred), `claude-3-5-haiku-20241022` (fallback)
- **Decision:** Used `claude-3-5-haiku-20241022` — the newer model ID may not be released yet
- **Impact:** None on functionality — haiku tier cost efficiency maintained

## Known Stubs

None — this plan is agent infrastructure only. No UI rendering, no stubs.

## Self-Check: PASSED

Files verified:
- `lib/agent/tools/index.ts` — AGENT_TOOLS array with 11 tools, executeAgentTool dispatcher
- `lib/agent/tools/searchKnowledge.ts` — imports hybridSearch from @/lib/rag/search
- `lib/agent/tools/searchKnowledge.ts` — imports buildRagContext from @/lib/rag/context
- `lib/agent/tools/listGear.ts` — contains prisma.gearItem.findMany
- `lib/agent/tools/listTrips.ts` — contains prisma.trip.findMany
- `lib/agent/tools/getWeather.ts` — latitude and longitude in input_schema required
- `lib/agent/tools/deleteConfirm.ts` — contains confirm_delete, no prisma.*.delete
- `lib/agent/tools/togglePackingItem.ts` — contains prisma.packingItem.upsert
- All 11 plan-02 tool files exist in lib/agent/tools/
- All 11 tool execute functions contain try and catch
- `lib/agent/system-prompt.ts` — exports CAMPING_EXPERT_SYSTEM_PROMPT constant
- `lib/agent/system-prompt.ts` — contains "knowledgeable camping buddy", "request_delete_confirmation", "Asheville NC", "ADHD"
- `lib/agent/memory.ts` — exports buildContextWindow, extractAndSaveMemory, SLIDING_WINDOW_SIZE
- `lib/agent/memory.ts` — contains prisma.message.findMany, prisma.agentMemory.findMany, prisma.agentMemory.upsert
- `lib/agent/memory.ts` — contains "Got it." synthetic message
- `lib/agent/memory.ts` — contains claude-haiku model, messages.create, no RegExp
- npx tsc --noEmit: 0 errors in lib/agent/ (pre-existing RAG errors unrelated to this plan)

Commits verified:
- b88d5be — feat(04-02): expand agent tool registry to 11 tools with write operations
- 5145de9 — feat(04-02): add system prompt constant and memory/context windowing module
- 2fb5187 — fix(04-02): add try-catch to deleteConfirm run function for consistency
