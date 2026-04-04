---
quick_task: 260404-k4h
title: Add Persistent Chat Agent Memory (S33)
date: 2026-04-04
duration_minutes: 11
tasks_completed: 7
files_created: 4
files_modified: 5
commits:
  - b82a3fd
  - 2721f4b
  - 366fdeb
  - 7321a6d
  - c0b9640
  - cfb3e5b
  - 12ac767
---

# Quick Task 260404-k4h: Add Persistent Chat Agent Memory (S33) Summary

**One-liner:** Persistent agent memory with AI-condensed summary injection, explicit remember tool, memory management API, and Settings UI for reviewing/deleting remembered preferences.

## What Was Built

### Schema Migration
Added `summary` and `createdAt` fields to `AgentMemory` model via manual SQL migration `20260404250000_s33_agent_memory_summary`. The `summary` field stores an AI-condensed digest (<500 tokens) on the `__summary__` sentinel row. Applied via `prisma migrate deploy`.

### `lib/agent/tools/remember.ts` (new)
Explicit remember tool that the agent can call when users state clear preferences. Key is always `explicit_preferences`. New values are **appended** (not replaced) to existing value using semicolon-separated format. Returns a confirmation string the agent relays to the user.

### `lib/agent/memory.ts` (modified)
Added two new exports:
- `buildMemorySummary()` — returns compact context string using stored AI summary if available, falls back to raw key-value pairs. Replaces inline memory block logic in `buildContextWindow()`.
- `refreshMemorySummary()` — calls Haiku to condense all memory entries into a single <400 token paragraph, stores it in `AgentMemory` with key `__summary__`. Fire-and-forget safe.

Updated `buildContextWindow()` to call `buildMemorySummary()` for consistent context injection.

### `app/api/agent/memory/route.ts` (new)
REST API for memory management:
- `GET /api/agent/memory` — lists all entries (excluding `__summary__` row)
- `DELETE /api/agent/memory` with `{ id }` — deletes one entry, triggers summary refresh
- `DELETE /api/agent/memory` with empty body — clears all memories

### `lib/agent/tools/index.ts` (modified)
Registered `rememberTool` in `AGENT_TOOLS` array and added `'remember'` case to `executeAgentTool` dispatcher.

### `components/SettingsClient.tsx` (modified)
Added "Agent Memory" card to the Settings page:
- Lists all memory entries with key label + value text
- Per-row delete button (✕)
- "Clear All" button when entries exist
- Empty state: "No memories yet. Chat with the assistant to build up your profile."
- Loading/error states managed with React state

### `lib/agent/jobs/refresh-memory.ts` (new)
Background job handler `processRefreshMemory()` that calls `refreshMemorySummary()` and returns a timestamped result. Registered as `memory_refresh` type in `scripts/agent-runner.ts`.

## Commits

| Commit | Description |
|--------|-------------|
| b82a3fd | feat(s33): add summary and createdAt fields to AgentMemory schema |
| 2721f4b | feat(s33): add remember tool for explicit user preference storage |
| 366fdeb | feat(s33): add buildMemorySummary and refreshMemorySummary to memory module |
| 7321a6d | feat(s33): register remember tool in AGENT_TOOLS and executeAgentTool dispatcher |
| c0b9640 | feat(s33): add GET/DELETE endpoints for agent memory management |
| cfb3e5b | feat(s33): add agent memory management UI to Settings page |
| 12ac767 | feat(s33): add refresh-memory job handler and register in agent-runner |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Pre-existing schema drift in fresh worktree dev.db**
- **Found during:** Build verification
- **Issue:** Several columns existed in schema.prisma but were missing from the fresh dev.db created during `prisma migrate deploy`. Affected: `GearItem.researchResult`, `GearItem.researchedAt`, `Trip.emergencyContactName`, `Trip.emergencyContactEmail`, and tables `AgentJob`, `KitPreset`.
- **Root cause:** These fields/tables were added via `prisma db push` or direct SQL in previous sessions and never captured in a migration file.
- **Fix:** Added missing columns directly via `sqlite3` CLI on the worktree dev.db. Also created `.env` with absolute path to worktree db (gitignored). Not committed since this is dev-only worktree setup.
- **Production impact:** None — production Mac mini db has all columns already.

**2. [Rule 3 - Blocking] Multiple pre-existing migration conflicts in worktree dev.db**
- **Found during:** First `prisma migrate deploy` attempt
- **Issue:** Two migrations had been applied in prior sessions but failed on fresh db: `20260404100000_phase35_shopping_prep_feedback` (duplicate column) and `20260404240000_add_scheduled_recurring_to_agent_job` (missing table).
- **Fix:** Used `prisma migrate resolve --applied` to mark them as applied, then re-ran `migrate deploy`.

## Known Stubs

None — all functionality is wired to real DB operations.

## Self-Check: PASSED

Files exist:
- FOUND: lib/agent/tools/remember.ts
- FOUND: app/api/agent/memory/route.ts
- FOUND: lib/agent/jobs/refresh-memory.ts
- FOUND: prisma/migrations/20260404250000_s33_agent_memory_summary/migration.sql

Commits exist: b82a3fd, 2721f4b, 366fdeb, 7321a6d, c0b9640, cfb3e5b, 12ac767

Build: PASSED (npm run build succeeded after dev.db schema drift fix)
