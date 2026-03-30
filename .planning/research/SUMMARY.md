# Project Research Summary

**Project:** Outland OS — personal camping second brain / AI-powered trip assistant
**Domain:** Personal productivity tool (camping vertical) — offline-capable PWA with AI agent layer
**Researched:** 2026-03-30
**Confidence:** HIGH

## Executive Summary

Outland OS is a personal camping second brain built on an already-solid Next.js 16 / Prisma / SQLite / Leaflet stack. The research confirms the existing stack is correct and extends naturally into 4 new capability layers: PWA/offline, a RAG knowledge base, an AI agent with tool use, and a Home Assistant bridge for smart campsite monitoring. The core product loop — gear inventory, trip planning, interactive spot map, weather, AI packing lists — is partially complete. The next highest-value work is finishing the meal planning and power budget features, then unifying them into a single executive trip prep view. No new libraries are needed for Phase 2; the stack additions are minimal and scoped to Phase 3 and Phase 4.

The recommended build sequence is strict: complete the Phase 2 core loop before layering any intelligence features. The AI chat agent is only as good as the knowledge base backing it, so the RAG corpus must be built and retrieval quality tested before the chat interface is written. PWA/offline is best added last — service workers make local development significantly more painful and are easiest to retrofit on a stable codebase. The deploy-to-Vercel milestone requires a one-time SQLite→Postgres migration and a photo storage abstraction, both well-understood but requiring dedicated attention.

The main risks are: (1) premature PWA work that complicates development before features are stable, (2) AI agent cost runaway without hard iteration limits, (3) SQLite data loss on Vercel if the migration is skipped, and (4) RAG retrieval quality failures if the corpus is chunked naively. All four are avoidable with the patterns documented in research — none require exotic solutions, but all require intentional design decisions baked in from day one of each phase.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16, Prisma, SQLite, Leaflet, Claude API, Tailwind) needs no changes for Phase 2. Phase 3 adds three libraries and one direct API integration. Phase 4 (PWA) adds a service worker and a tile-caching Leaflet plugin. The deploy phase adds Neon Postgres and Vercel Blob — both are install-at-deploy-time, not install-now.

**Core new technologies:**
- `@serwist/next` (9.5.7): PWA / service worker — the only actively maintained Next.js offline library; `next-pwa` was abandoned 2+ years ago. Requires Webpack; architecture research recommends a manual 80-line `public/sw.js` as a simpler alternative that avoids the Webpack/Turbopack conflict entirely.
- `sqlite-vec` (0.1.8): vector similarity search inside existing SQLite — avoids external vector DB process; alpha-versioned but functional; pin the version and plan a migration to stable if 1.0 ships during development.
- `leaflet.offline`: IndexedDB tile caching — used to build the explicit "Download for offline" pre-trip tile fetch flow; OSM tiles are NOT cached by generic service worker strategies.
- `ai` + `@ai-sdk/anthropic` (Vercel AI SDK v6): streaming chat UI — `useChat` hook eliminates ~60% of streaming boilerplate; coexists cleanly with existing `@anthropic-ai/sdk` (keep both; use AI SDK for streaming chat, keep existing SDK for one-shot generation routes).
- `react-speech-recognition` (4.0.1): voice debrief — browser-native Web Speech API; treat as progressive enhancement on iOS (Safari PWA mode is unreliable; Chrome on iOS uses WebKit and does not support the API at all).
- Home Assistant REST API: thin `fetch` wrapper only, no npm library — all HA npm packages are unmaintained; the REST API is simple enough to wrap in ~50 lines.
- Neon + `@prisma/adapter-neon`: serverless Postgres for Vercel — install at deploy time only; keeps SQLite for all local dev.

**Rejected alternatives:**
- LangChain JS: heavy abstraction, frequent breaking changes, unnecessary for one knowledge base
- Vectra: low npm activity, parallel JSON file storage clashes with SQLite-first architecture
- `node-home-assistant`: last updated 2017; raw fetch is more reliable
- `next-pwa`: abandoned; Serwist is the maintained successor

### Expected Features

**Must have (table stakes — most already built):**
- Gear inventory with categories — already built
- Trip creation with dates + destination — already built
- Interactive map of saved spots — already built
- Weather at destination — already built
- AI packing list — already built
- Meal plan per trip with shopping list — in progress (Phase 2)
- Power budget / runtime estimate — in progress (Phase 2)
- Photo log attached to trips/spots — in progress
- Offline access to trip data — Phase 4

**Should have (differentiators that define the "second brain"):**
- Executive trip prep flow — single unified pre-trip screen; no existing camping app has this; highest near-term value per effort
- Home prep vs. camp cooking distinction — vacuum sealer + sous vide workflow is primary, not an edge case; must be explicit in meal plan UX
- AI chat agent with full trip context — "am I ready for Saturday?" answered using real cross-referenced gear, weather, power, and meal data
- NC camping knowledge base (RAG) — local expert knowledge (dispersed spots, permit rules, seasonal access) not available in any single app; most unique long-term differentiator
- Voice trip debrief — speak 2 minutes after a trip, get a structured log; zero-friction memory capture
- Dog-aware trip planning — personal context feature; add when dog arrives (weeks away)
- Power budget with weather-adjusted solar — Open-Meteo cloud cover forecast for trip dates; no existing calculator offers this

**Defer (explicitly not building):**
- Social feeds, multi-user auth, booking integration, calorie/macro tracking, full recipe database, turn-by-turn navigation, native iOS/Android app

### Architecture Approach

The existing layered architecture (Server Components → Client Components → API Routes → Prisma → SQLite → External Services) is clean and should not be disrupted. All new capability layers are additive — they sit alongside existing code, not inside it. The critical architectural principle is that all HA calls, all RAG queries, and all embedding operations remain server-side; client components call Next.js API routes only, never external services directly.

**Major components (new):**
1. `lib/rag/` (ingest, search, context) — hybrid FTS5 + vector similarity using Reciprocal Rank Fusion; semantic chunking 256–512 tokens; metadata pre-filter for location names reduces retrieval noise
2. `lib/agent/` (tools, orchestrator, prompts) — server-side tool-use loop; hard cap 5–10 tool calls per message; Haiku for tool calls, Sonnet for final synthesis; `ChatClient.tsx` as SSE streaming UI
3. `lib/ha/` (client, types) — REST-only proxy via Next.js API routes; server-to-server fetch avoids CORS entirely; token stays server-side; add WebSocket only if live sensor updates become a real need
4. `lib/voice/` (`useSpeechInput.ts`) — Web Speech API hook with graceful fallback; text input always present; server-side Whisper as escalation path if iOS Safari proves unreliable
5. `lib/offline/` (useOnlineStatus, syncQueue, tileCache) — service worker + IndexedDB mutation queue; all mutation routes must be idempotent; explicit "Download for Offline" UI, not automatic tile caching
6. `lib/storage.ts` — environment-aware storage abstraction: local filesystem in dev, Vercel Blob in production; must be built before adding more photo features

### Critical Pitfalls

1. **SQLite silently fails on Vercel** — writes are lost between function invocations; data disappears on every cold start. Hard blocker. Migrate Prisma datasource to Postgres (Neon) before any Vercel deployment. Keep SQLite for all local dev via `.env.local` override.

2. **AI agent cost runaway** — unconstrained tool-use loops can generate $50–200 in API charges from a single broken session. Set max 5–10 iterations per user message, expose token counts in the dev UI, set Anthropic workspace spend limits before the agent goes live, and use prompt caching (`cache_control: ephemeral`) on system prompts and large RAG injections.

3. **Service worker serves stale app on mobile** — deployed updates don't appear on the mobile PWA because the old worker stays alive until all tabs are closed. Configure `skipWaiting: true` + `clientsClaim: true` from day one. Register the service worker only in `NODE_ENV === 'production'` — never in dev.

4. **Map tiles are not cached automatically** — a standard PWA service worker does NOT cache OSM tiles; the map shows a blank grid offline. This is explicit feature work: build a "Download for Offline" button that pre-fetches a bounding box at zoom levels 10–15 via `leaflet.offline`.

5. **RAG quality degrades with naive chunking** — fixed-size character chunking destroys camping knowledge facts ("dogs allowed, site 14" loses meaning if split). Use semantic/heading-based chunking, 256–512 token target, 20–30% overlap. Test retrieval quality on 10 representative queries before building the chat interface on top.

6. **Home Assistant CORS in production** — direct browser→HA fetch is blocked by Chrome's Private Network Access spec. Always proxy through Next.js API routes. Document Tailscale or a reverse proxy as a setup prerequisite for production remote access.

7. **Prisma migration history incompatible between providers** — SQLite migration SQL is not valid Postgres SQL. At deploy time, regenerate migration history against a Postgres instance from scratch; do not run existing SQLite migrations against Postgres. Plan a full day for this migration.

---

## Implications for Roadmap

### Phase 2: Complete the Core Planning Loop (current)

**Rationale:** The fundamental pre-trip planning primitives are nearly done. Finishing them has zero new architectural dependencies — no new libraries, no new patterns, just existing Claude API + Prisma. A complete planning loop is more valuable than a partially complete loop plus an AI agent. Also, meal plan and power budget data feed the agent's trip context in Phase 3 — the data model must exist first.

**Delivers:** A complete, trustworthy pre-trip planning workflow: meals planned with shopping list, power budget checked with weather-adjusted solar, and a single executive prep view that unifies weather, packing, meals, and power status.

**Addresses:** Meal plan + shopping list, power budget / runtime estimate, executive trip prep flow, home prep vs. camp cooking distinction

**Avoids:** Fix the existing `lib/claude.ts` JSON parsing fragility (known issue, flagged in CONCERNS.md) at the start of Phase 2 — build a shared `parseClaudeJSON<T>` utility with Zod validation before adding more AI features. Every new AI route inherits this fragility if it isn't fixed first.

**Research flag:** No deeper research needed. Meal planning and power calculator UX patterns are well-documented in FEATURES.md. Stack unchanged.

---

### Phase 3: Intelligence Layer

**Rationale:** Intelligence features depend on each other in strict order: RAG corpus must exist before the agent is worth building; agent route must exist before the chat UI; HA schema additions belong now so the smart campsite UI isn't blocked when hardware arrives in mid-April. Voice is independent and can ship at any point within Phase 3.

**Delivers:** An AI assistant that actually knows this specific app's data and NC camping context — transforms the app from a tracker into an advisor.

**Addresses:** AI chat agent with full trip context, NC camping knowledge base, voice trip debrief, gear identification from photo, safety float plan, Home Assistant smart campsite dashboard

**Implements:** `lib/rag/`, `lib/agent/`, `lib/ha/`, `lib/voice/`, `ChatClient.tsx`

**Uses:** `sqlite-vec`, Vercel AI SDK (`ai` + `@ai-sdk/anthropic`), `react-speech-recognition`, raw HA fetch wrapper

**Sub-order within Phase 3:**
1. Shared `parseClaudeJSON<T>` + Zod validation utility (prerequisite for all AI features — do this at start of Phase 2 or Phase 3)
2. `SmartDevice` fields on `GearItem` schema — enables HA bridge now, wires to hardware when it arrives
3. RAG ingest pipeline (`lib/rag/`) — gather 20–30 real NC camping documents first; test retrieval quality on representative queries before touching the agent
4. AI agent orchestrator + `/api/agent` SSE route — server-side only; hard cap iterations; token cost visible in dev
5. `ChatClient.tsx` + `/app/chat/` — streaming UI built on top of a working, tested agent
6. HA proxy routes (`lib/ha/`) — shell built now; real calls wired when hardware arrives mid-April
7. Voice debrief (`lib/voice/`) — parallel track, no dependencies on items 2–6

**Avoids:**
- Build HA integration as Next.js proxy routes only — direct browser→HA fetch fails in production due to CORS + Private Network Access
- Gather real NC camping documents before writing the ingest script — chunking strategy decisions depend on actual document structure
- Voice input is text-first; voice as progressive enhancement — iOS Chrome does not support the Web Speech API

**Research flags:**
- RAG ingest: needs a phase-level research pass on NC camping corpus sources and document formats before implementation begins
- Agent tool definitions: the exact tool input/output schemas should be designed against the actual Prisma schema before coding — easy to get wrong
- HA integration: standard REST proxy pattern once the architecture decision is made; no further research needed

---

### Phase 4: PWA + Production Deploy

**Rationale:** Offline and deployment are both last-phase work for the same reason: they add complexity to every subsequent change. Service worker cache invalidation is an extra debugging dimension on every feature iteration. The Postgres migration is a one-time, careful operation that has no benefit until actual deployment. Both are well-understood; the sequencing is the discipline.

**Delivers:** A fieldworthy app — works without cell signal, installable on home screen as a PWA, photo uploads persistent in production, data surviving Vercel redeployments.

**Addresses:** Offline access to trip data, offline map tiles (explicit download flow), installable PWA, production hosting

**Implements:** `lib/offline/` (service worker, sync queue, tile cache), `lib/storage.ts` (photo storage abstraction), Postgres migration, Vercel Blob setup

**Uses:** `@serwist/next` or manual `public/sw.js`, `leaflet.offline`, `@neondatabase/serverless`, `@prisma/adapter-neon`, `@vercel/blob`

**Pre-work note:** Build `lib/storage.ts` (environment-aware photo storage abstraction) before Phase 4 begins — ideally as the last task of Phase 3. Every photo feature added after this point benefits from the abstraction and avoids rework at deployment.

**Avoids:**
- SQLite on Vercel is a hard blocker: migrate Prisma datasource to Postgres and regenerate migration history from scratch (do not run SQLite migration files against Postgres)
- Photo storage abstraction must exist before deployment; store blob URLs in DB, never local paths
- `skipWaiting: true` + `clientsClaim: true` from day one to prevent stale cache on mobile
- Map tile caching is explicit feature work, not automatic

**Research flags:**
- pgvector + Neon setup: FTS5 virtual tables and `sqlite-vec` do NOT migrate to Postgres. Equivalent at deploy time is `pgvector` + Postgres native FTS. A validation pass on the Prisma + Neon + pgvector setup before implementation is warranted.
- Service worker Webpack constraint: verify the Webpack/Turbopack situation in the actual `next.config.ts` at the time of implementation; the manual `public/sw.js` approach may be simpler.

---

### Phase Ordering Rationale

- **Phase 2 before Phase 3:** Intelligence features are shallow without a complete data model. Power budget and meal plan outputs feed into agent trip context. Build the data first, then the intelligence layer on top of it.
- **RAG before agent within Phase 3:** The agent without a knowledge base is a general-purpose Claude wrapper — not the "local NC camping expert" that makes this app worth building. 20–30 real documents must be ingested and retrieval validated before the chat UI is written.
- **HA schema before HA hardware:** Hardware arrives mid-April. Schema and proxy routes can be built now. Avoid blocking Phase 3 critical path on hardware availability.
- **Voice after text-first:** iOS Web Speech API unreliability in PWA mode means building voice-primary risks breaking the primary mobile use case. Text input must always work; voice enhances it.
- **PWA after features stable:** Service workers add a cache invalidation dimension to every debugging session. Adding offline to a stable app is straightforward; adding new features to an app with an active service worker is painful.
- **Postgres migration at deploy time only:** SQLite works perfectly for local development. Running Postgres locally (Docker) just for dev adds operational friction. Switch provider only when deploying to Vercel.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official docs and recent npm activity. Serwist, Vercel AI SDK v6, sqlite-vec, Neon confirmed current as of 2026-03-30. |
| Features | MEDIUM-HIGH | Camping app feature patterns verified against real apps. Power budget and meal plan UX patterns well-documented. NC knowledge base corpus definition speculative until real documents are gathered. |
| Architecture | HIGH (PWA/HA), MEDIUM (RAG/agent) | PWA and HA proxy patterns from official sources. RAG hybrid search documented by sqlite-vec maintainer. Agent tool design is project-specific and inherently uncertain. |
| Pitfalls | HIGH | SQLite/Vercel, photo storage, CORS, and service worker stale cache all verified with multiple official sources. iOS Web Speech API issues confirmed via Apple Developer Forums + Can I Use data. |

**Overall confidence:** HIGH for Phases 2 and 4. MEDIUM for Phase 3 (RAG corpus quality and agent tool design are inherently project-specific decisions).

### Gaps to Address

- **NC camping knowledge base corpus:** What documents to include (trail guides, permit PDFs, personal notes, gear manuals) and how to source them is undefined. This needs explicit planning before RAG ingest work begins. Recommended: define corpus document list as the first task in Phase 3.

- **sqlite-vec alpha version:** v0.1.8 is pre-1.0. Pin the version. If 1.0 ships before Phase 3 work completes, plan a migration sprint. If breaking changes appear before then, the fallback is `pgvector` in a local Postgres container — the architecture is identical, different engine.

- **Voice on iOS:** Web Speech API behavior in Safari PWA (home screen) mode is documented as unreliable. This needs hands-on testing with an actual iPhone before the voice debrief feature UX is designed. Do not build the voice UI around audio input until tested on device.

- **HA hardware:** HA proxy routes and schema can be built now, but end-to-end testing of the smart campsite dashboard is blocked until hardware arrives mid-April. Phase 3 critical path must not gate on HA functionality.

- **EcoFlow API:** The power budget calculator may want to pull live device state. EcoFlow has not published a formal public API. Research this before Phase 2 power budget work to determine whether live device data is feasible or whether manual input is the right model.

---

## Sources

### Primary (HIGH confidence)
- [Next.js Official PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — Serwist recommendation, Webpack requirement (updated 2026-03-25)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) — v6.0.141, streaming chat, Anthropic provider confirmed
- [HA REST API docs](https://developers.home-assistant.io/docs/api/rest) — entity states, service calls (v2026.3.4)
- [Prisma + Neon + Vercel guide](https://www.prisma.io/docs/guides/frameworks/nextjs) — official deployment path
- [Is SQLite Supported in Vercel?](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) — hard blocker confirmed in official KB
- [Prisma Migrate Limitations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues) — SQLite/Postgres incompatibility confirmed
- [sqlite-vec hybrid search](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) — authored by sqlite-vec maintainer, RRF pattern
- [Web Speech API — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — browser support matrix

### Secondary (MEDIUM confidence)
- [@serwist/next npm](https://www.npmjs.com/package/@serwist/next) — v9.5.7, published 15 days before research date
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec) — active maintenance confirmed
- [react-speech-recognition npm](https://www.npmjs.com/package/react-speech-recognition) — v4.0.1, published 6 months ago
- [leaflet.offline GitHub](https://github.com/allartk/leaflet.offline) — IndexedDB tile caching; last major activity 2023
- [Best RAG Chunking Strategies 2025 — Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [Preventing AI Agent Runaway Costs — Cloudatler](https://cloudatler.com/blog/the-50-000-loop-how-to-stop-runaway-ai-agent-costs)
- [HA CORS issue — Community Forum](https://community.home-assistant.io/t/solved-cross-origin-request-blocked-http-configuration/179510)

### Tertiary (informational)
- [AI camping apps overview — Rebecca Campbell](https://rebeccascampbell.com/ai-camping-apps) — competitive feature landscape
- [Voice journaling AI — Deepgram](https://deepgram.com/ai-apps/audio-diary) — voice debrief UX patterns
- [Web Speech API Issues on Safari — Apple Developer Forums](https://developer.apple.com/forums/thread/694847) — iOS PWA issues (user reports, not official docs)
- [EcoFlow App features](https://www.ecoflow.com/us/app) — confirms no trip-planning mode; API availability unconfirmed

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
