---
phase: 04-chat-agent
plan: "01"
subsystem: chat-agent
tags: [chat, agent, foundation, bug-fix, schema, tools, navigation]
dependency_graph:
  requires: [03-04]
  provides: [conversation-schema, agent-tools, system-prompt, chat-nav]
  affects: [app/api/packing-list, app/api/trips, components/BottomNav, prisma/schema]
tech_stack:
  added: []
  patterns: [modular-tool-registry, upsert-over-update, cascade-delete-conversations]
key_files:
  created:
    - app/api/trips/[id]/route.ts
    - lib/agent/system-prompt.ts
    - lib/agent/tools/index.ts
    - lib/agent/tools/gear.ts
    - lib/agent/tools/trips.ts
    - lib/agent/tools/locations.ts
    - lib/agent/tools/knowledge.ts
    - lib/agent/tools/weather.ts
    - prisma/migrations/20260331220000_add_chat_models/migration.sql
  modified:
    - app/api/packing-list/items/route.ts
    - prisma/schema.prisma
    - components/BottomNav.tsx
decisions:
  - "Trips tab replaced by Chat tab in BottomNav — Trips accessible from Dashboard"
  - "Migration applied via sqlite3 CLI (not prisma migrate dev) — worktree is non-interactive"
  - "AgentMemory uses unique key constraint — upsert pattern for preference updates"
metrics:
  duration: "8 minutes"
  completed: "2026-03-31"
  tasks_completed: 6
  files_modified: 12
---

# Phase 4 Plan 1: Chat Agent Foundation Summary

**One-liner:** Foundation laid for chat agent — pre-req bugs fixed, Conversation/Message/AgentMemory schema added, 5-tool modular registry built, Chat tab in nav.

## What Was Built

### Bug Fixes (D-10, D-11)
- **Packing item upsert**: `app/api/packing-list/items/route.ts` now uses `prisma.packingItem.upsert` instead of `update`. First-time checkbox toggle creates the row; subsequent toggles update it. P2025 catch removed.
- **Trip CRUD route**: `app/api/trips/[id]/route.ts` created with GET (full relations), PUT (with validation), DELETE (204 response). All handlers have P2025→404 mapping and try-catch error logging.

### Database Schema (D-12, D-13)
Three new models added to `prisma/schema.prisma` and migrated:
- **Conversation**: title (auto-set), context (page JSON), timestamps. Has `messages` relation.
- **Message**: role (user/assistant/tool_result), content, toolCallId, toolName. Indexed by conversationId and createdAt. Cascade deletes on Conversation delete.
- **AgentMemory**: unique key/value store for persistent user preferences across conversations.

### Agent System Prompt (D-08)
`lib/agent/system-prompt.ts` exports `buildSystemPrompt(ctx)` which injects:
- Today's date
- Gear count, location count, upcoming trips
- Agent memory (stored preferences)
- Optional page context (e.g. "User is viewing Trip: Pisgah Weekend")

Persona: "Outland" — knowledgeable camping friend, casual/direct. Confirms before deletes, acts freely for creates/updates.

### Modular Tool Registry (D-07)
`lib/agent/tools/` contains 5 tool files + index:

| Tool | Name | Filters |
|------|------|---------|
| gear.ts | query_gear | category, condition, isWishlist |
| trips.ts | query_trips | upcoming/past/all, limit |
| locations.ts | query_locations | type, minRating, waterAccess, cellSignal |
| knowledge.ts | search_knowledge | query (required), topK |
| weather.ts | get_weather | latitude, longitude (required), days |

`index.ts` exports `ALL_TOOLS: Tool[]` and `executeTool(name, input)` dispatcher.

### Navigation Update
`components/BottomNav.tsx` updated: Trips tab replaced with Chat tab (`/chat`, `MessageCircle` icon). 5 tabs: Home, Gear, Vehicle, Spots, Chat.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Migration applied via sqlite3 CLI instead of prisma migrate dev**
- **Found during:** Task 3
- **Issue:** Worktree environment is non-interactive — `prisma migrate dev` fails with "environment is non-interactive" error
- **Fix:** Created migration SQL file manually, applied via `sqlite3` CLI, registered in `_prisma_migrations` table manually
- **Files modified:** `prisma/migrations/20260331220000_add_chat_models/migration.sql`
- **Commit:** 977d371

## Known Stubs

None — this plan is foundation/infrastructure only. No UI stubs.

## Self-Check: PASSED

Files verified:
- `app/api/packing-list/items/route.ts` — upsert confirmed, P2025 removed
- `app/api/trips/[id]/route.ts` — GET, PUT, DELETE all present
- `prisma/schema.prisma` — Conversation, Message, AgentMemory models present, `prisma validate` passes
- `lib/agent/system-prompt.ts` — buildSystemPrompt exported
- `lib/agent/tools/index.ts` — ALL_TOOLS and executeTool exported
- `components/BottomNav.tsx` — Chat tab with MessageCircle icon at /chat
- SQLite tables: Conversation, Message, AgentMemory confirmed in dev.db

Commits verified:
- 3904201 — fix(04-01): packing item upsert
- 5dea56f — feat(04-01): trip [id] route
- 977d371 — feat(04-01): chat models schema
- 89e3d5e — feat(04-01): agent system prompt
- fdb6e1e — feat(04-01): tool registry
- 478aff6 — feat(04-01): chat nav tab
