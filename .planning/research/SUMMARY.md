# Project Research Summary

**Project:** Outland OS — Camping Second Brain
**Domain:** Personal AI-powered trip assistant / offline-capable PWA
**Researched:** 2026-03-30
**Confidence:** HIGH (stack + pitfalls); MEDIUM (RAG/agent architecture)

## Executive Summary

Outland OS is a personal camping second brain built on a solid existing foundation: Next.js 16 App Router, Prisma/SQLite, Leaflet maps, Tailwind, and the Claude API. The next milestone delivers the complete pre-trip planning loop — meal planning, power budgeting, and an executive prep view that unifies them. After that, Phase 3 adds intelligence: a RAG knowledge base for NC-specific camping info, an AI chat agent with tool use, and voice trip debrief. Phase 4 makes the app fieldworthy with offline PWA support and production deployment. Each phase builds on the previous one — the agent layer needs the RAG corpus before it's useful, and offline support is easiest to retrofit after features stabilize.

The recommended technical approach is to stay firmly in the existing stack for as long as possible. No new libraries are needed for Phase 2 (meal + power + executive view). Phase 3 adds `sqlite-vec` for vector search (stays inside the existing SQLite file), the Vercel AI SDK for streaming chat UI, and a raw `fetch` wrapper for Home Assistant (no HA library — they're all unmaintained). Phase 4 adds `@serwist/next` for the service worker, `leaflet.offline` for tile caching, and a Postgres migration (Neon + Prisma) only at Vercel deployment time. The key discipline is sequencing: build the corpus before the agent, build the service worker last, and migrate the database only when deploying.

The two hardest risks are the SQLite-on-Vercel hard blocker (writes silently fail in production — must migrate to Postgres before deploy) and AI agent cost runaway (unconstrained tool-use loops can generate surprising bills). Both are well-understood and preventable with specific architectural decisions baked in from the start: a storage abstraction layer for photos, hard iteration caps on agent loops, Haiku for tool calls and Sonnet only for final synthesis, and Anthropic-level spend limits set before the agent goes live.

---

## Key Findings

### Recommended Stack

The existing stack needs minimal additions. The only new libraries needed before Phase 4 are `sqlite-vec` (vector search in SQLite), the Vercel AI SDK (`ai` + `@ai-sdk/anthropic`) for the streaming chat interface, and `react-speech-recognition` for voice input. The `@anthropic-ai/sdk` package already in the project continues to handle packing list, meal plan, and other one-shot generation routes — these two packages coexist cleanly.

**Core technologies (existing, validated):**
- Next.js 16 App Router + Tailwind + Prisma/SQLite — foundation; no changes needed through Phase 3
- Claude API (`@anthropic-ai/sdk`) — packing list, meal plan, one-shot generation; keep using directly

**New additions by phase:**

Phase 3:
- `sqlite-vec` 0.1.8 — vector similarity search inside existing SQLite; avoids external vector DB
- `ai` + `@ai-sdk/anthropic` (Vercel AI SDK v6) — streaming chat UI; `useChat` hook handles history + streaming
- `react-speech-recognition` 4.0.1 — Web Speech API wrapper; browser-native, no cost, Chrome/iOS Safari only

Phase 4 (deploy-time only):
- `@serwist/next` 9.5.7 — service worker (requires Webpack, not Turbopack in dev)
- `leaflet.offline` — IndexedDB tile caching for the spots map
- `@neondatabase/serverless` + `@prisma/adapter-neon` — Postgres migration path for Vercel deployment
- `@vercel/blob` — persistent photo storage in production

**Rejected and why:**
- LangChain JS: heavy abstraction, frequent breaking changes, unnecessary for one knowledge base
- Vectra: low npm activity, parallel JSON file storage vs. SQLite-first architecture
- `node-home-assistant`: last updated 2017; raw fetch wrapper is 50 lines and more reliable
- `next-pwa`: abandoned 2+ years ago; Serwist is the maintained successor

### Expected Features

The feature landscape is clear. Everything through Phase 2 is table stakes for a camping assistant. Phase 3 differentiators are what make this genuinely different from any existing app.

**Must have (table stakes — most already built):**
- Gear inventory with categories — already built
- Trip creation with dates/destination — already built
- Interactive map of saved spots — already built
- Weather at destination — already built
- AI packing list — already built
- Meal plan per trip with shopping list — in progress (Phase 2)
- Power budget / runtime estimate — in progress (Phase 2)
- Photo log attached to trips/spots — in progress

**Should have (differentiators):**
- Executive trip prep flow — single unified pre-trip screen; no other camping app has this
- Home prep vs. camp cooking distinction — vacuum sealer + sous vide workflow is primary, not edge case
- AI chat agent with full trip context — "am I ready for Saturday?" answered with real cross-referenced data
- NC camping knowledge base (RAG) — local expert knowledge not available in any single app
- Voice trip debrief — speak for 2 minutes, get a structured log; zero-friction capture
- Dog-aware planning — incoming; filter by pet rules, generate dog packing list

**Defer (anti-features to explicitly avoid):**
- Social feeds, multi-user auth, turn-by-turn navigation, booking integration, native iOS app, calorie tracking, recipe database

### Architecture Approach

The existing layered architecture (Server Components → API Routes → Prisma → SQLite → External Services) is clean and should not be disrupted. All new features extend it by adding new modules alongside existing ones. The build order matters: RAG pipeline before agent chat, schema additions for Home Assistant before hardware arrives, and the service worker last (it makes local dev confusing and is easiest to add after features stabilize).

**Major components (new):**

1. `lib/rag/` (ingest, search, context) — hybrid FTS5 + vector similarity search using Reciprocal Rank Fusion; semantic chunking 256–512 tokens; metadata pre-filter for location names
2. `lib/agent/` (tools, orchestrator, prompts) — server-side tool-use loop; max 5–10 iterations per message; Haiku for tool calls, Sonnet for synthesis; `ChatClient.tsx` as streaming SSE UI
3. `lib/ha/` (client, types) — REST-only proxy; server-to-server fetch avoids CORS entirely; WebSocket only if live sensor updates become a real need
4. `lib/voice/` (`useSpeechInput.ts`) — Web Speech API hook; text fallback always present; server-side Whisper as fallback if iOS Safari proves unreliable
5. `lib/offline/` (useOnlineStatus, syncQueue, tileCache) — service worker + IndexedDB mutation queue; idempotent API routes required; explicit "Download for Offline" UI, not automatic tile caching
6. `lib/storage.ts` — environment-aware storage abstraction: local filesystem in dev, Vercel Blob in production (must build before adding more photo features)

### Critical Pitfalls

1. **SQLite silently fails on Vercel** — all writes are lost between function invocations. Hard blocker for deployment. Migrate Prisma datasource to Postgres (Neon) before ever deploying. Keep SQLite for all local dev.

2. **AI agent cost runaway** — unconstrained tool-use loops can generate $50–200 in API charges from a single broken session. Set max 5–10 iterations per user message, expose token counts in dev UI, set Anthropic spend limits before the agent goes live, and use prompt caching on system prompts.

3. **Service worker stale cache** — deployed updates don't appear on mobile because the old worker stays alive. Configure `skipWaiting: true` + `clientsClaim: true` from day one. Register the service worker only in production (`NODE_ENV === 'production'`).

4. **Map tiles are not cached by default** — a standard PWA service worker does NOT cache OSM tiles. The map shows a blank grid offline. This is feature work: build an explicit "Download for Offline" button that pre-fetches a bounding box at zoom levels 10–15.

5. **RAG quality depends on chunking** — fixed-size character chunking destroys camping knowledge ("dogs allowed, site 14" loses meaning if split). Use semantic/heading-based chunking, 256–512 token target, 20–30% overlap. Test retrieval on 10 real queries before building the chat interface on top.

---

## Implications for Roadmap

### Phase 2: Complete the Core Planning Loop (current)

**Rationale:** The fundamental pre-trip planning primitives are almost done. Finish them before building anything more complex. Meal plan, power budget, and executive view all depend only on existing architecture — no new libraries, no new patterns.

**Delivers:** A complete, usable pre-trip planning workflow. Meals planned, power checked, gear packed, all on one screen.

**Addresses (from FEATURES.md):** Meal plan + shopping list, power budget with weather adjustment, executive trip prep flow, home-prep vs. camp-cooking distinction

**Avoids (from PITFALLS.md):** Claude JSON fragility — fix `lib/claude.ts` JSON parsing + build shared `parseClaudeJSON<T>` utility before adding more AI features. This is pre-work for Phase 3.

**Research flag:** Standard patterns — no additional research needed. Meal planning and power calculator UX patterns are well-documented.

---

### Phase 3: Intelligence Layer

**Rationale:** Intelligence features depend on each other in strict order: build RAG corpus before agent (agent is shallow without knowledge base), build agent route before chat UI, build HA schema before HA hardware arrives. Voice is independent — can ship in any order within Phase 3.

**Delivers:** An AI assistant that actually knows this specific app's data and NC camping context. Transforms the app from a tracker into an advisor.

**Addresses (from FEATURES.md):** AI chat agent with full trip context, NC camping knowledge base, voice trip debrief, gear identification from photo, safety float plan, Home Assistant smart campsite dashboard

**Implements (from ARCHITECTURE.md):** `lib/rag/`, `lib/agent/`, `lib/ha/`, `lib/voice/`, `ChatClient.tsx`

**Uses (from STACK.md):** `sqlite-vec`, Vercel AI SDK, `react-speech-recognition`, raw HA fetch wrapper

**Avoids (from PITFALLS.md):**
- Build HA bridge as Next.js API route proxy (never direct browser→HA fetch — CORS hard failure in production)
- Voice input is text-first, voice as progressive enhancement (iOS Chrome does not support Web Speech API)
- Gather 20–30 real NC camping documents and test retrieval before wiring to Claude

**Sub-order within Phase 3:**
1. `lib/rag/` ingest + search pipeline — corpus must exist before agent
2. `lib/agent/` orchestrator + `/api/agent` route — server-side only, no UI yet
3. `ChatClient.tsx` + `/app/chat/` — streaming UI on top of working agent
4. `lib/ha/` schema + proxy routes — wire real HA calls when hardware arrives (mid-April)
5. `lib/voice/` — parallel track, no dependencies on 3a items

**Research flags:**
- RAG ingest pipeline: needs phase research. Corpus definition (what documents, what chunking strategy) is project-specific and requires deliberate planning.
- Agent tool design: needs phase research. Tool definitions must match actual Prisma schema; easy to get wrong without reviewing schema first.
- Home Assistant: standard REST pattern once the proxy approach is chosen — no deep research needed.

---

### Phase 4: PWA + Production Deploy

**Rationale:** Offline and deployment are last because: (a) the service worker makes local dev confusing — add it after features stabilize; (b) the Postgres migration is a one-time, careful operation that has no benefit until actual deployment; (c) photo storage abstraction can be built alongside other Phase 4 work.

**Delivers:** A fieldworthy app — works without cell signal, installable on home screen, photo uploads persistent in production.

**Addresses (from FEATURES.md):** Offline access to trip data, map tile caching, "Download for Offline" UX, dog-aware planning (straightforward once the dog arrives)

**Implements (from ARCHITECTURE.md):** `lib/offline/` (service worker, sync queue, tile cache), storage abstraction, Postgres migration

**Uses (from STACK.md):** `@serwist/next`, `leaflet.offline`, `@neondatabase/serverless`, `@prisma/adapter-neon`, `@vercel/blob`

**Avoids (from PITFALLS.md):**
- SQLite on Vercel is a hard blocker — migrate Prisma provider to Postgres before deploying. Regenerate migration history from scratch; do not run SQLite migration files against Postgres.
- Photo storage abstraction (`lib/storage.ts`) must be built before deployment. Store URLs in DB, never local paths.
- Set `skipWaiting: true` + `clientsClaim: true` in service worker config from day one.
- Map tile caching is feature work — explicit "Download for Offline" button, not automatic.

**Research flags:**
- Postgres migration: needs phase research. FTS5 virtual tables and `sqlite-vec` do NOT migrate to Postgres — need `pgvector` and native Postgres FTS at deploy time. This is a non-trivial substitution.
- Service worker with App Router: standard pattern with Serwist, but Webpack vs. Turbopack constraint needs verification against actual `next.config.ts` at the time.

---

### Phase Ordering Rationale

- **Phase 2 before 3:** Intelligence features are shallow without a complete data model. Power budget and meal plan data feed into the agent's trip context. Build the data first.
- **RAG before agent:** The agent chat experience without a knowledge base is a generic Claude wrapper — not worth building. 20-30 real NC documents must be ingested and retrieval tested before the chat UI exists.
- **HA schema before HA hardware:** Hardware arrives mid-April. Build the schema and proxy routes now so Phase 3 isn't blocked on arrival. Wire real calls when hardware lands.
- **Service worker last:** PWA service worker adds complexity to every debugging session. Every change must consider cache invalidation. Defer until all features work online.
- **Postgres migration at deploy time only:** SQLite works flawlessly for local development. Running Postgres locally (Docker) just for dev adds friction. Switch provider only when deploying to Vercel.

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against official docs and recent npm activity. Serwist, Vercel AI SDK, sqlite-vec, Neon all confirmed current as of 2026-03-30. |
| Features | MEDIUM-HIGH | Camping app feature patterns verified against real apps (EcoFlow, REI, trail planners). Power budget and meal plan UX patterns well-documented. NC knowledge base corpus definition is speculative until real documents gathered. |
| Architecture | HIGH (PWA/HA), MEDIUM (RAG/agent) | PWA and HA bridge patterns verified against official sources. RAG hybrid search (RRF) documented by sqlite-vec maintainer. Agent orchestration patterns are well-established but tool definitions are project-specific. |
| Pitfalls | HIGH | SQLite/Vercel, photo storage, CORS, and service worker stale cache pitfalls all verified with multiple sources including official docs. iOS Web Speech API issues confirmed via Apple Developer Forums + Can I Use. |

**Overall confidence:** HIGH for Phases 2 and 4. MEDIUM for Phase 3 (RAG corpus quality and agent tool design are inherently project-specific).

### Gaps to Address

- **NC camping knowledge base corpus:** What documents to include (trail guides, permit PDFs, personal notes, gear manuals) and how to source them is undefined. Needs explicit planning before RAG ingest work begins. Recommend: define corpus document list as first task in Phase 3.

- **sqlite-vec at alpha (v0.1.8):** Version is pre-1.0. Pin the version. If breaking changes appear before Phase 3 work is complete, `pgvector` in a local Postgres instance is the fallback — the architecture is identical, just different underlying engine.

- **Voice on iOS:** Web Speech API behavior in Safari PWA (home screen) mode is documented as buggy. This needs hands-on testing with actual iPhone before the voice debrief feature is designed. Do not build the voice UI until tested on device.

- **HA hardware (mid-April):** HA proxy routes and schema can be built now, but end-to-end testing of the smart campsite dashboard is blocked until the hardware arrives. Plan Phase 3 to not gate on HA for critical path.

---

## Sources

### Primary (HIGH confidence)
- [Next.js PWA Official Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — service worker, manifest, Serwist requirement (updated 2026-03-25)
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) — v6.0.141, streaming chat, Anthropic provider
- [HA REST API docs](https://developers.home-assistant.io/docs/api/rest) — entity states, service calls (v2026.3.4)
- [Prisma + Neon + Vercel guide](https://www.prisma.io/docs/guides/frameworks/nextjs) — official Prisma deployment guide
- [sqlite-vec hybrid search](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) — authored by sqlite-vec maintainer
- [Web Speech API browser support — MDN](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API)
- [Is SQLite Supported in Vercel?](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel) — hard blocker confirmed
- [Prisma Migrate Limitations](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues) — SQLite/Postgres incompatibility confirmed

### Secondary (MEDIUM confidence)
- [@serwist/next npm](https://www.npmjs.com/package/@serwist/next) — v9.5.7, published 15 days ago
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec) — active maintenance confirmed
- [react-speech-recognition npm](https://www.npmjs.com/package/react-speech-recognition) — v4.0.1, published 6 months ago
- [leaflet.offline GitHub](https://github.com/allartk/leaflet.offline) — IndexedDB tile caching; last major activity 2023
- [Best Chunking Strategies for RAG 2025 — Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [Preventing AI Agent Runaway Costs — Cloudatler](https://cloudatler.com/blog/the-50-000-loop-how-to-stop-runaway-ai-agent-costs)
- [CORS Issue with Home Assistant — Community Forum](https://community.home-assistant.io/t/solved-cross-origin-request-blocked-http-configuration/179510)

### Tertiary (LOW confidence)
- [AI camping apps overview — Rebecca Campbell](https://rebeccascampbell.com/ai-camping-apps) — feature landscape context
- [Voice journaling AI — Deepgram](https://deepgram.com/ai-apps/audio-diary) — voice debrief UX patterns
- [Web Speech API Issues on Safari — Apple Developer Forums](https://developer.apple.com/forums/thread/694847) — iOS PWA issues (user reports, not official docs)

---
*Research completed: 2026-03-30*
*Ready for roadmap: yes*
