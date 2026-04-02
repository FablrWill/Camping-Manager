# Roadmap: Outland OS — Milestone v1.1 Close the Loop

## Milestones

- ✅ **v1.0 Foundation** - Phases 1-5 (shipped 2026-04-01)
- ✅ **v1.1 Close the Loop** - Phases 6-11 (complete)

## Phases

<details>
<summary>✅ v1.0 Foundation (Phases 1-5) - SHIPPED 2026-04-01</summary>

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
**Plans**: 4 plans
Plans:
- [x] 03-01-PLAN.md — Database foundation: KnowledgeChunk Prisma model, FTS5 virtual table with triggers, vec0 table, better-sqlite3 connection module
- [x] 03-02-PLAN.md — Ingest pipeline: markdown chunking, Voyage-3-lite embeddings, ingest CLI script, corpus manifest
- [x] 03-03-PLAN.md — Hybrid search (FTS5 + vec0 via RRF), search API route, validation script, retrieval quality review
- [x] 03-04-PLAN.md — PDF parsing + web scraping: extend ingest pipeline for external sources (USFS, recreation.gov) per D-02/D-03

### Phase 4: Chat Agent
**Goal**: Users can have a messenger-style conversation with an AI assistant that has real access to their gear, trips, locations, weather, and camping knowledge
**Depends on**: Phase 3
**Requirements**: CHAT-01, CHAT-02, CHAT-03, CHAT-04
**Success Criteria** (what must be TRUE):
  1. User can open a chat screen, type a question, and receive a streamed response that feels responsive on mobile
  2. Agent can answer "what do I need for a cold-weather trip?" by referencing the user's actual gear inventory and RAG knowledge base
  3. Agent can query gear, trips, saved locations, weather, and the knowledge base as distinct tools within a single response
  4. Agent has a hard cap on tool call iterations (5-10 per message) that prevents runaway API cost
**Plans**: 4 plans
Plans:
- [x] 04-01-PLAN.md — Foundation: bug fixes (packing upsert, trip CRUD), Conversation/Message/AgentMemory schema, agent tool registry, system prompt, Chat nav tab
- [x] 04-02-PLAN.md — Chat API: streaming SSE endpoint, tool-calling loop, conversation persistence, context windowing
- [x] 04-03-PLAN.md — Chat UI: messenger-style page, streaming bubbles, empty state, context-aware shortcut button
- [x] 04-04-PLAN.md — Agent memory: preference extraction, memory upsert tool, memory injection into context
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
**Plans**: 4 plans
Plans:
- [x] 05-01-PLAN.md — Recommendation tool: chat-native agent tool, dual-source ranking (saved + KB), rich card rendering in chat, save-to-locations flow
- [x] 05-02-PLAN.md — Voice backend: OpenAI SDK install, Whisper transcription, Claude insight extraction, apply API routes
- [x] 05-03-PLAN.md — Voice UI: VoiceRecordModal with MediaRecorder, InsightsReviewSheet, mic button on trip cards
- [x] 05-04-PLAN.md — Gap closure: wire weather forecasts into recommend_spots (REC-02)
**UI hint**: yes

</details>

### v1.1 Close the Loop (In Progress)

**Milestone Goal:** Stabilize the foundation, add offline capability, and build the learning loop — so the app survives a real camping trip and gets smarter from it.

## Phase Details

### Phase 6: Stabilization
**Goal**: Every existing feature works reliably and the data persists — bugs are fixed, AI outputs survive navigation, CRUD is complete, and all forms use the design system
**Depends on**: Phase 5
**Requirements**: STAB-01, STAB-02, STAB-03, STAB-04, STAB-05, STAB-06
**Success Criteria** (what must be TRUE):
  1. User can generate a packing list or meal plan and return to it after navigating away — the results are still there
  2. User can edit or delete any trip, vehicle profile, vehicle mod, or photo without hitting a missing UI or broken action
  3. A malformed Claude response never crashes the app — it shows an error message and lets the user retry
  4. Every form in the app (gear, trips, vehicle, mods, locations) uses Button, Input, Card, and Modal from the design system — visual consistency across all pages
  5. The schema includes PackingItem usage fields and an append-only TripFeedback model — ready for the learning loop
**Plans**: 5 plans
Plans:
- [x] 06-01-PLAN.md — Schema migration (MealPlan, TripFeedback, PackingItem usage, cachedAt) + Zod install + parseClaudeJSON utility
- [x] 06-02-PLAN.md — Missing CRUD APIs (photo delete, mod delete) + trip/vehicle CRUD UI + design system migration
- [x] 06-03-PLAN.md — AI output persistence (packing list + meal plan) with load-on-mount, regenerate, error/retry UI
- [x] 06-04-PLAN.md — Gap closure: packing list persistence fixes ($transaction, packed state in GET, custom item persistence via PUT)
- [x] 06-05-PLAN.md — Gap closure: TripCard extraction, SpotMap photo delete without reload, ConfirmDialog on regenerate
**UI hint**: yes

### Phase 7: Day-Of Execution
**Goal**: Users have the tools to safely depart for a trip — a time-ordered departure checklist and a safety float plan email to an emergency contact
**Depends on**: Phase 6
**Requirements**: EXEC-01, EXEC-02
**Success Criteria** (what must be TRUE):
  1. User can open an active trip and see a time-ordered departure checklist derived from their actual packing list, meal plan, and power data — not a static template
  2. User can tap "Send Float Plan" and have a trip summary email delivered to their emergency contact before leaving
  3. The safety email includes trip name, destination, dates, packed gear summary, and emergency contact info — enough for someone to act on it
**Plans**: 3 plans
Plans:
- [x] 07-01-PLAN.md — Foundation: schema migration (DepartureChecklist, FloatPlanLog, Settings), Zod schemas, nodemailer install, email utility, settings page, TopHeader gear icon
- [x] 07-02-PLAN.md — Departure checklist: Claude generation API, check-off persistence, departure page UI, prep page integration
- [x] 07-03-PLAN.md — Float plan: Claude email composition, Nodemailer send, FloatPlanLog, send flow in departure page
**UI hint**: yes

### Phase 8: PWA and Offline
**Goal**: Users can install the app on their phone's home screen and access all trip data without a cell signal — using a single "Leaving Now" tap to cache everything before departure
**Depends on**: Phase 6
**Requirements**: OFF-01, OFF-02, OFF-03, OFF-04
**Success Criteria** (what must be TRUE):
  1. User can install the app to their phone home screen from Safari or Chrome and launch it as a standalone PWA
  2. User can open the app with no cell signal and see the app shell, navigation, and previously cached pages
  3. User can tap "Leaving Now" on a trip and have weather snapshot, packing list, meal plan, saved spots, and emergency info all available offline — written to IndexedDB, not service worker cache
  4. User can see cached map tiles for the trip area while offline (tiles visible at the time of "Leaving Now")
  5. User sees a clear indicator when the app is offline and knows how old the cached snapshot is
**Plans**: 5 plans
Plans:
- [x] 08-00-PLAN.md — Wave 0: Vitest install, test stub files for all Phase 8 modules
- [x] 08-01-PLAN.md — PWA foundation: manifest, icons, service worker with app shell caching, SW registration
- [x] 08-02-PLAN.md — Offline infrastructure: idb-keyval, offline storage, online status hook, offline banner, install banner
- [x] 08-03-PLAN.md — "Leaving Now" caching flow: sequential data fetcher, progress overlay, button, departure page integration
- [x] 08-04-PLAN.md — Map tile caching + offline UI polish: SpotMap crossOrigin, tile error placeholders, offline checklist states, staleness warning
**UI hint**: yes

### Phase 9: Learning Loop
**Goal**: Every trip makes the app smarter — gear usage is tracked post-trip, Claude generates a debrief summary, and voice notes write back to gear and location records
**Depends on**: Phase 6
**Requirements**: LEARN-01, LEARN-02, LEARN-03
**Success Criteria** (what must be TRUE):
  1. User can open a completed trip and mark each packed item as "used," "didn't need," or "forgot but needed"
  2. User can request a post-trip summary and receive a Claude-generated 3-bullet debrief: what to drop, what was missing, and an updated location rating — generated from their actual usage data
  3. User can record a voice debrief and have it automatically update gear notes and location ratings — with a review screen to confirm before applying changes
**Plans**: 4 plans
Plans:
- [x] 09-00-PLAN.md — Wave 0: Vitest test stubs for all Phase 9 modules (usage tracking, trip summary, voice debrief)
- [x] 09-01-PLAN.md — Usage tracking: PATCH /api/trips/[id]/usage, post-trip review section UI, usageState in packing list GET
- [x] 09-02-PLAN.md — Trip summary: POST /api/trips/[id]/feedback, TripSummaryResultSchema, auto-generate trigger, summary display UI
- [x] 09-03-PLAN.md — Voice debrief: wire VoiceRecordModal to TripFeedback persistence, InsightsReviewSheet integration, apply route TripFeedback write-back
**UI hint**: yes

### Phase 10: Offline Read Path & PWA Completion
**Goal**: Cached trip data is actually accessible offline — components read IndexedDB snapshots via client-side detection, map tiles are proactively prefetched before departure, and offline check-offs queue for sync
**Depends on**: Phase 8
**Requirements**: OFF-01, OFF-02, OFF-03, OFF-04
**Gap Closure:** Closes all 4 unsatisfied requirements, 2 integration gaps, and 1 broken E2E flow from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. User can tap "Leaving Now," go offline, and see their trip data rendered from IndexedDB (packing list, meal plan, weather, spots)
  2. Components use useOnlineStatus hook to detect offline state and read IndexedDB directly — client-side detection, not SW interception
  3. Map tiles for the trip bounding box are proactively fetched and cached on "Leaving Now" — not just passively cached from prior views
  4. Phase 8 has passing tests (not todo stubs), SUMMARY.md, and VERIFICATION.md
**Plans**: 4 plans
Plans:
- [x] 10-01-PLAN.md — Test implementations: all 32 existing test stubs replaced with real assertions
- [x] 10-02-PLAN.md — New modules: tile-prefetch, offline-write-queue, cache-trip tiles wiring
- [x] 10-03-PLAN.md — Dual-mode components: offline read path for PackingList, MealPlan, DepartureChecklistClient + write queue
- [x] 10-04-PLAN.md — Phase 8 documentation: SUMMARY.md and VERIFICATION.md

### Phase 11: v1.1 Polish
**Goal**: Fix tech debt and stale documentation identified by the milestone audit — VoiceDebriefButton guard, circular test, and doc consistency
**Depends on**: Phase 9
**Requirements**: (none — tech debt and documentation)
**Gap Closure:** Closes tech debt items from v1.1 audit
**Success Criteria** (what must be TRUE):
  1. VoiceDebriefButton only renders for past trips (isPast guard)
  2. usage-tracking.test.ts gearId validation test is logically sound (not circular)
  3. REQUIREMENTS.md, ROADMAP.md, and STATE.md are consistent with actual implementation state
**Plans**: 2 plans
Plans:
- [ ] 11-01-PLAN.md — Code fixes: VoiceDebriefButton isPast guard + circular test rewrite
- [ ] 11-02-PLAN.md — Documentation consistency pass across REQUIREMENTS, ROADMAP, STATE, PROJECT

## Progress

**Execution Order:**
Phases execute in numeric order: 6 → 7 → 8 → 9 → 10 → 11

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Validation | v1.0 | 0/TBD | Not started | - |
| 2. Executive Trip Prep | v1.0 | 2/2 | Complete | 2026-03-30 |
| 3. Knowledge Base | v1.0 | 4/4 | Complete | 2026-03-31 |
| 4. Chat Agent | v1.0 | 4/4 | Complete | 2026-03-31 |
| 5. Intelligence Features | v1.0 | 4/4 | Complete | 2026-04-01 |
| 6. Stabilization | v1.1 | 5/5 | Complete | 2026-04-01 |
| 7. Day-Of Execution | v1.1 | 3/3 | Complete | 2026-04-01 |
| 8. PWA and Offline | v1.1 | 5/5 | Complete | 2026-04-02 |
| 9. Learning Loop | v1.1 | 4/4 | Complete | 2026-04-02 |
| 10. Offline Read Path & PWA Completion | v1.1 | 4/4 | Complete | 2026-04-02 |
| 11. v1.1 Polish | v1.1 | 0/2 | Executing | - |
