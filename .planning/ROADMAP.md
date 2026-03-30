# Roadmap: Outland OS — Milestone 1

## Overview

Outland OS has 14 sessions of working features behind it. This milestone transforms that foundation into a trustworthy, intelligent camping second brain: first validating what exists, then completing the core trip prep loop, then layering in the knowledge base, chat agent, and voice features that make it actually useful in the field. Every phase delivers something verifiable before the next phase begins.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Validation** - Test and harden all existing AI features before building new ones
- [x] **Phase 2: Executive Trip Prep** - Unify weather, packing, meals, and power into a single "am I ready?" view (completed 2026-03-30)
- [ ] **Phase 3: Knowledge Base** - Build and validate NC camping RAG corpus with hybrid retrieval
- [ ] **Phase 4: Chat Agent** - Messenger-style AI assistant with full trip context and tool use
- [ ] **Phase 5: Intelligence Features** - AI trip recommendations and voice trip debrief

## Phase Details

### Phase 1: Validation
**Goal**: All existing AI features work correctly and handle edge cases — nothing embarrassing breaks before new features are built on top
**Depends on**: Nothing (first phase)
**Requirements**: VAL-01, VAL-02, VAL-03, VAL-04, VAL-05
**Success Criteria** (what must be TRUE):
  1. User can generate a packing list for a trip and confirm it includes weather-appropriate items from their gear inventory
  2. User can generate a meal plan and confirm it correctly separates home prep vs camp cooking with a shopping list organized by store section
  3. User can calculate a power budget and confirm solar estimates adjust when a trip has cloudy weather forecasted
  4. All three AI features handle edge cases without crashing: empty gear, no weather data, single-day trip, 7-day trip
  5. A shared `parseClaudeJSON<T>` utility with Zod validation exists and is used by all AI routes
**Plans**: TBD

### Phase 2: Executive Trip Prep
**Goal**: Users can see a single "am I ready?" screen that surfaces all trip prep status at a glance and navigates to each sub-feature
**Depends on**: Phase 1
**Requirements**: PREP-01, PREP-02, PREP-03, PREP-04
**Success Criteria** (what must be TRUE):
  1. User can open an upcoming trip and immediately see ready/not-ready status for weather, packing, meals, and power — no navigation required
  2. User can tap any status indicator and navigate directly to that sub-feature (weather, packing list, meal plan, power budget)
  3. User can return from any sub-feature to the executive prep view without losing their place
  4. User can access the executive prep view from the trip card on the home dashboard
**Plans**: 2 plans
Plans:
- [x] 02-01-PLAN.md — Backend foundation: schema migration, prep types/registry, prep API, packing persistence, meal plan tracking
- [x] 02-02-PLAN.md — Frontend: prep page UI with collapsible sections, traffic light badges, entry point links from dashboard and trips page
**UI hint**: yes

### Phase 3: Knowledge Base
**Goal**: A curated NC camping knowledge corpus is ingested, searchable, and retrieving high-quality relevant results — ready to back the chat agent
**Depends on**: Phase 2
**Requirements**: RAG-01, RAG-02, RAG-03, RAG-04
**Success Criteria** (what must be TRUE):
  1. Corpus sources are defined, documented, and at least 20 real NC camping documents are ingested with vector embeddings and full-text search indexes
  2. User can search the knowledge base and get relevant results about NC spots, regulations, seasonal info, and local knowledge
  3. Hybrid retrieval (vector similarity + keyword matching via Reciprocal Rank Fusion) returns noticeably better results than either method alone on 10 representative test queries
  4. Retrieval quality is validated and passing before the chat agent is wired up
**Plans**: 3 plans
Plans:
- [ ] 03-01-PLAN.md — Database foundation: KnowledgeChunk Prisma model, FTS5 virtual table with triggers, vec0 table, better-sqlite3 connection module
- [ ] 03-02-PLAN.md — Ingest pipeline: markdown chunking, Voyage-3-lite embeddings, ingest CLI script, corpus manifest
- [ ] 03-03-PLAN.md — Hybrid search (FTS5 + vec0 via RRF), search API route, validation script, retrieval quality review

### Phase 4: Chat Agent
**Goal**: Users can have a messenger-style conversation with an AI assistant that has real access to their gear, trips, locations, weather, and camping knowledge
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. User can open a chat screen, type a question, and receive a streamed response that feels responsive on mobile
  2. Agent can answer "what do I need for a cold-weather trip?" by referencing the user's actual gear inventory and RAG knowledge base
  3. Agent can query gear, trips, saved locations, weather, and the knowledge base as distinct tools within a single response
  4. Agent has a hard cap on tool call iterations (5-10 per message) that prevents runaway API cost
**Plans**: TBD
**UI hint**: yes

### Phase 5: Intelligence Features
**Goal**: Users can get AI-driven camping spot recommendations and capture trip debriefs by voice with automatic structured extraction
**Depends on**: Phase 4
**Requirements**: REC-01, REC-02, REC-03, VOICE-01, VOICE-02, VOICE-03, VOICE-04, VOICE-05
**Success Criteria** (what must be TRUE):
  1. User can ask "find me a camping spot" with distance, date, and preference constraints and receive recommendations drawn from saved locations and the knowledge base
  2. User can save a recommended spot directly from the recommendation result to their locations
  3. User can record a voice memo from the app and have it automatically transcribed
  4. Transcription is processed by Claude to extract structured insights (what worked, what didn't, gear feedback, spot ratings)
  5. Extracted insights can update gear notes, location ratings, or trip notes from a review screen
**Plans**: TBD
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Validation | 0/TBD | Not started | - |
| 2. Executive Trip Prep | 2/2 | Complete   | 2026-03-30 |
| 3. Knowledge Base | 0/3 | Not started | - |
| 4. Chat Agent | 0/TBD | Not started | - |
| 5. Intelligence Features | 0/TBD | Not started | - |
