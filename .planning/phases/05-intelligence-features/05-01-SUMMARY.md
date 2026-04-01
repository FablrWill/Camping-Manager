---
phase: 05-intelligence-features
plan: "01"
subsystem: intelligence-features
tags: [recommendations, chat-agent, tool-registry, RAG, location-save]
dependency_graph:
  requires: [04-01, 04-02, 04-03, 03-02]
  provides: [recommend_spots-tool, RecommendationCard, recommendation-save-flow]
  affects: [lib/agent/tools/index.ts, components/ChatBubble.tsx, app/api/locations/route.ts]
tech_stack:
  added: []
  patterns: [dual-source search (saved+RAG), JSON action block parsing in ChatBubble, save-from-chat flow]
key_files:
  created:
    - lib/agent/tools/recommend.ts
    - components/RecommendationCard.tsx
    - .planning/phases/05-intelligence-features/05-01-PLAN.md
  modified:
    - lib/agent/tools/index.ts
    - components/ChatBubble.tsx
    - app/api/locations/route.ts
decisions:
  - "Relax locations POST validation: name required, lat/lon optional — RAG-sourced spots don't have coordinates; user can add GPS pin via edit form later (D-06)"
  - "Recommendation cards follow deleteConfirm pattern in ChatBubble — JSON action block extracted and stripped from display text, then rendered as cards below message"
  - "recommend_spots returns all saved locations ranked by rating, then RAG results — client sees saved spots first"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-01"
  tasks_completed: 5
  tasks_total: 5
  files_created: 3
  files_modified: 3
---

# Phase 05 Plan 01: AI Trip Recommendations Summary

**One-liner:** Dual-source recommend_spots agent tool (saved locations + RAG hybrid search), RecommendationCard chat UI component with save-to-locations flow, ChatBubble updated to render recommendation cards inline.

## Status: COMPLETE

All 5 tasks completed. Zero TypeScript errors in new Phase 5 files.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Create recommend_spots agent tool | 3c76d86 | Done |
| 2 | Register in AGENT_TOOLS and dispatcher | 904dd1e | Done |
| 3 | RecommendationCard component + relax locations API | ccee180 | Done |
| 4 | ChatBubble renders recommendation cards | e822460 | Done |
| 5 | TypeScript verification + plan file commit | 0c43f3b | Done |

## What Was Built

### Task 1 — `lib/agent/tools/recommend.ts`

- `recommendSpotsTool` tool definition: `recommend_spots`, triggers on "find/recommend/suggest camping spots" queries
- `executeRecommendSpots` executor: dual-source search
  - Source 1 (priority): `prisma.location.findMany` ordered by rating desc — Will's saved spots first
  - Source 2: `hybridSearch(query, 10)` — RAG knowledge base fills gaps
  - Returns JSON: `{ action: "recommendations", query, count, recommendations[] }`
  - Each recommendation: id (null for RAG spots), name, description, type, rating, source, distanceNote, coordinates

### Task 2 — `lib/agent/tools/index.ts`

- Import `recommendSpotsTool` and `executeRecommendSpots` from `./recommend`
- Added `recommendSpotsTool` to `AGENT_TOOLS` array (now 12 tools)
- Added `'recommend_spots'` case to `executeAgentTool` dispatcher

### Task 3 — `components/RecommendationCard.tsx` + `app/api/locations/route.ts`

- `Recommendation` interface exported for shared typing with ChatBubble
- Card shows: spot name, source badge (amber "Saved" or stone "Knowledge Base"), type/rating meta row, description (line-clamp-3)
- Save button visible only for `knowledge_base` source spots
- Save POSTs to `/api/locations`: name, description, type, coordinates (null if unknown)
- States: saving (disabled button), saved (check icon + "Saved to your spots"), error (inline red message)
- Locations POST route: relaxed validation to `name` required only (lat/lon now optional) — Rule 2 fix

### Task 4 — `components/ChatBubble.tsx`

- Import `RecommendationCard` and `Recommendation` type
- `extractRecommendations()` function: mirrors `extractDeleteConfirm` pattern, looks for `"action":"recommendations"` JSON
- `displayContent` logic extended: strips recommendation JSON block from display text
- `recommendations.map(rec => <RecommendationCard>)` renders below assistant message text
- Existing `deleteConfirm` behavior unchanged

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Functionality] Locations POST required lat/lon, breaking save for RAG-sourced spots**
- **Found during:** Task 3
- **Issue:** The existing `POST /api/locations` validator required `latitude` and `longitude` to be non-null. RAG-sourced recommendations never have coordinates — the tool returns `coordinates: null` for knowledge base spots. Save would always fail with 400.
- **Fix:** Changed validation from `!body.name || body.latitude == null || body.longitude == null` to just `!body.name`. Per D-06, user adds GPS pin via the location edit form after saving.
- **Files modified:** `app/api/locations/route.ts`
- **Commit:** ccee180

## Known Stubs

None — data flows are wired to real sources (prisma.location, hybridSearch, /api/locations POST).

## Self-Check: PASSED
