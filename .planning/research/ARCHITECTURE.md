# Architecture Patterns

**Domain:** Personal camping assistant / second brain (Next.js 16 App Router)
**Researched:** 2026-03-30
**Confidence:** HIGH for PWA/HA patterns; MEDIUM for RAG/agent layer

---

## Current Architecture (Baseline)

The app already has a clean, working layered pattern:

```
Browser
  └── Server Components (data fetch, ISR)
        └── Client Components (state, interactions)
              └── API Routes (REST, try/catch, JSON)
                    └── Prisma ORM
                          └── SQLite file
                    └── External Services (Claude API, Open-Meteo)
```

All new features extend this baseline without disrupting it. New layers sit alongside or wrap existing layers — not inside them.

---

## New Component Map

### 1. PWA / Offline Layer

```
public/sw.js (Service Worker)
  ├── Cache Strategy: app shell (stale-while-revalidate)
  ├── Cache Strategy: API responses (network-first, cache-fallback)
  ├── Cache Strategy: map tiles (cache-first, 50MB quota)
  └── Background Sync: deferred writes queue

app/manifest.ts (Web App Manifest)
  └── Next.js built-in, no library needed

lib/offline/
  ├── useOnlineStatus.ts   — network detection hook
  ├── syncQueue.ts         — IndexedDB queue for offline mutations
  └── tileCache.ts         — Leaflet tile layer with CacheStorage backend
```

**How it integrates:** The service worker intercepts fetch requests. App shell routes (HTML, JS, CSS) use stale-while-revalidate. REST API calls use network-first with a fallback to the last cached response. Map tiles use cache-first with a bounded 50MB quota. Offline mutations (new gear, packing check-offs) go into an IndexedDB sync queue and replay via Background Sync when connectivity returns.

**Key constraint:** Serwist (the recommended offline library) requires Webpack, not Turbopack. The `next.config.js` `dev` script must use `next dev --no-turbo` when Serwist is active. Alternatively, write a minimal manual service worker in `public/sw.js` — this avoids the build tool dependency entirely and is simpler for a single-user app.

**Recommendation:** Manual service worker in `public/sw.js`. About 80 lines. Skip Serwist/next-pwa. Register it with `navigator.serviceWorker.register('/sw.js')` in a client component that loads on every page.

---

### 2. RAG Knowledge Base

```
lib/rag/
  ├── ingest.ts           — chunk + embed documents, write to knowledge_chunks table
  ├── search.ts           — hybrid search: FTS5 + vector similarity, RRF merge
  └── context.ts          — assemble retrieved chunks into Claude prompt context

prisma/schema.prisma additions:
  KnowledgeChunk
    id, source, title, content (text), embedding (blob), metadata (json)
    FTS5 virtual table: knowledge_chunks_fts (managed outside Prisma)

tools/ingest/
  └── nc-camping-corpus.ts — Node script to ingest markdown files, URLs, PDFs
```

**How it integrates:** The RAG layer is a pure server-side concern. Client components call `/api/agent` (the chat endpoint) which calls `lib/rag/search.ts` to retrieve relevant chunks, then passes them as context to the Claude API call.

**Vector search approach:** Use `sqlite-vec` (Node.js loadable extension, maintained by Alex Garcia). Embedding model: `text-embedding-3-small` via OpenAI API, or `voyage-3-lite` via Anthropic's recommended provider. Store embeddings as BLOB in SQLite, query with `vec_distance_cosine()`.

**FTS5 note:** Prisma does not manage FTS5 virtual tables. Create them in a raw SQL migration file (`prisma/migrations/xxx_fts5/migration.sql`) using `CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts USING fts5(...)` with a trigger to keep it in sync. This is a one-time setup.

**Hybrid search pattern (Reciprocal Rank Fusion):**
```
results = merge(fts5_results, vector_results, k=60)
score = Σ 1/(k + rank_i) for each result list
```
This outperforms either search type alone for camping knowledge queries (location names, gear names, technique descriptions).

**Data flow:**
```
User query
  → /api/agent POST
    → lib/rag/search.ts (FTS5 + vec_distance_cosine)
      → top-k chunks retrieved
    → lib/claude.ts (system prompt + chunks + query)
      → Claude API streaming response
    → SSE stream → client ChatClient component
```

---

### 3. AI Agent Layer

```
lib/agent/
  ├── tools.ts            — Claude tool definitions (search_spots, get_gear, get_weather)
  ├── orchestrator.ts     — multi-turn conversation with tool use loop
  └── prompts.ts          — system prompts per agent persona

app/api/agent/route.ts    — streaming SSE endpoint
  └── POST: { message, conversationId, context }

components/ChatClient.tsx — messenger-style UI, SSE reader, tool call visibility
app/chat/page.tsx         — chat page entry point
```

**How it integrates:** The agent layer wraps the existing Claude integration in `lib/claude.ts`. The orchestrator runs the tool-use loop server-side: Claude calls a tool → server executes it against Prisma/RAG → result fed back to Claude → repeat until final text response. Streaming uses Server-Sent Events via `ReadableStream` in the Next.js API route.

**Tool definitions (Phase 3 scope):**
- `search_knowledge_base` — queries RAG system
- `get_weather` — calls existing `lib/weather.ts`
- `find_nearby_spots` — queries Location table by radius
- `get_gear_inventory` — queries GearItem table
- `get_trip_context` — returns active trip data

**Cost control:** Use `claude-haiku-3-5` for tool calls and context retrieval; escalate to `claude-sonnet-4-5` only for final answer synthesis. Cache conversation context in session (or a `Conversation` DB model) to avoid resending full history each turn.

**Streaming pattern:**
```typescript
// app/api/agent/route.ts
export async function POST(req: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      for await (const chunk of claudeStream) {
        controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(chunk)}\n\n`))
      }
      controller.close()
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/event-stream' } })
}
```

---

### 4. Home Assistant Bridge

```
lib/ha/
  ├── client.ts           — REST client (fetch wrapper with Bearer token)
  ├── ws.ts               — WebSocket client (home-assistant-js-websocket)
  └── types.ts            — HA entity state types

app/api/ha/
  ├── state/[entityId]/route.ts  — GET: fetch entity state, POST: call service
  └── devices/route.ts           — GET: list all HA entities

components/SmartCampClient.tsx   — device status dashboard
app/camp/page.tsx                — "smart campsite" page
```

**How it integrates:** The HA connection lives entirely on the server side. `lib/ha/client.ts` stores `HA_URL` and `HA_TOKEN` in environment variables. Client components call the Next.js proxy routes (`/api/ha/...`) — the browser never touches the HA instance directly. This is the correct pattern for a local-network HA instance: the Next.js server acts as the bridge.

**REST vs WebSocket decision:**
- REST (`/api/ha/state/...`): Use for on-demand state reads (dashboard load, manual refresh). Simple, stateless, easy to cache.
- WebSocket (`home-assistant-js-websocket`): Use only if real-time state streaming is needed (live sensor updates). For a camping dashboard that refreshes on tap, REST is sufficient and simpler.

**Recommendation:** Start with REST only. Add WebSocket later if live updates become a real need.

**Auth pattern:**
```typescript
// lib/ha/client.ts
const HA_HEADERS = {
  Authorization: `Bearer ${process.env.HA_TOKEN}`,
  'Content-Type': 'application/json',
}

export async function getEntityState(entityId: string) {
  const res = await fetch(`${process.env.HA_URL}/api/states/${entityId}`, {
    headers: HA_HEADERS,
    next: { revalidate: 30 }, // ISR cache for 30s
  })
  return res.json()
}
```

**HA hardware constraint:** HA instance not available until mid-April 2026. Build the schema (SmartDevice fields on GearItem) and proxy routes now. Wire up real HA calls when the hardware arrives.

---

### 5. Voice Input

```
lib/voice/
  └── useSpeechInput.ts   — Web Speech API hook with fallback state

components/VoiceDebrief.tsx — voice recording UI, transcript display
app/api/debrief/route.ts   — POST transcript → Claude → structured debrief
```

**Browser support reality:** Web Speech API works on Chrome/Chromium and iOS Safari 14.5+. Firefox: no. Android Chrome: yes. Given this is a personal tool Will uses on his phone (presumably iOS Safari), Web Speech API is viable but needs a graceful text fallback for the few cases it fails.

**Alternative:** If Web Speech API proves too unreliable on iOS, use `MediaRecorder` to capture audio and POST the blob to `app/api/transcribe/route.ts` which calls Whisper via OpenAI API (not Claude). Whisper is more reliable but adds API cost and latency. Start with Web Speech API; add Whisper fallback if needed.

**Data flow:**
```
User taps "Start Debrief"
  → useSpeechInput hook activates SpeechRecognition
  → Interim transcript shown live in VoiceDebrief component
  → User taps "Done"
  → Full transcript POST → /api/debrief
    → Claude: extract trip highlights, gear notes, rating, location notes
    → Structured JSON response
  → UI offers: "Save to Trip", "Add to Gear Notes"
```

---

### 6. Database Migration Path (SQLite → Postgres)

This is a deploy-time concern, not a feature. The existing Prisma schema is fully portable.

**Migration steps:**
1. Change `datasource db { provider = "sqlite" }` → `provider = "postgresql"`
2. Add `DATABASE_URL` to Vercel env vars (Vercel Postgres or Neon)
3. Run `npx prisma migrate deploy` in Vercel build command
4. For SQLite-specific things (FTS5 virtual tables, sqlite-vec extension): these do NOT migrate. The RAG system needs a Postgres alternative at deploy time — `pgvector` for vectors, native Postgres FTS for text.

**Recommendation:** Keep SQLite locally (it works great). At Vercel deploy time, swap to Postgres + pgvector. This is a one-time migration effort, not something to solve now.

---

## Complete Component Boundary Map

```
Browser (Client)
├── App Shell (cached by SW)
│   ├── ChatClient           → /api/agent (SSE stream)
│   ├── SmartCampClient      → /api/ha/state
│   ├── VoiceDebrief         → Web Speech API → /api/debrief
│   ├── SpotMap (Leaflet)    → tile cache (SW CacheStorage)
│   └── Offline indicator    → useOnlineStatus hook
│
Service Worker (public/sw.js)
├── App shell: stale-while-revalidate
├── API responses: network-first, cache-fallback
├── Tiles: cache-first, 50MB bounded
└── Background Sync: mutation replay queue
│
Next.js Server
├── /api/agent              → lib/agent/orchestrator.ts → Claude API
├── /api/ha/state           → lib/ha/client.ts → HA REST API
├── /api/debrief            → lib/claude.ts → Claude API
├── /api/knowledge/search   → lib/rag/search.ts → SQLite (FTS5 + vec)
└── All existing routes     → Prisma → SQLite
│
External Services
├── Claude API (Anthropic)   — agent, RAG synthesis, debrief
├── Home Assistant REST      — device states, service calls
├── Open-Meteo               — weather (existing)
└── Embedding API            — text-embedding-3-small for RAG ingest
```

---

## Data Flow: Offline Write Cycle

The most important new flow — getting data into the DB when offline:

```
User action (e.g., check packing item while camping, no signal)
  → Optimistic UI update (local state)
  → syncQueue.ts: write to IndexedDB queue (mutation type + payload)
  → If online: immediate flush → /api/[route] → Prisma → SQLite
  → If offline: queue persists
  → On reconnect: Background Sync fires → service worker flushes queue
  → API routes process queued mutations in order
  → UI reconciles (no duplicate writes — idempotent mutation design)
```

**Key requirement:** All mutation API routes must be idempotent (safe to call twice). Use `upsert` over `create` where possible, or include a client-generated `idempotencyKey` field on mutable models.

---

## Build Order (Dependency Graph)

Features must be built in this order to avoid rework:

```
Phase 2 (current):
  1. Meal planning + power budget (Claude API — no new arch needed)
  2. Trip prep executive view (UI composition — no new arch needed)

Phase 3a — Foundation for intelligence:
  3. SmartDevice fields on GearItem (schema) → enables HA bridge UI later
  4. RAG ingest pipeline (lib/rag/) → knowledge base populated before agent needs it
  5. Agent chat interface + /api/agent route (lib/agent/) → depends on RAG
  6. HA proxy routes (lib/ha/) → schema exists from step 3; wire up when HW arrives

Phase 3b — Voice (parallel, no deps on 3a):
  7. Voice debrief (lib/voice/) → independent, can be built any time

Phase 4 — PWA + Deploy:
  8. Service worker + manifest → add after core features stable (SW adds complexity)
  9. Offline sync queue → depends on SW; add alongside or after SW
 10. Offline map tile caching → depends on SW
 11. SQLite → Postgres migration → only at Vercel deployment time
```

**Do not build the service worker early.** SW caching makes local dev confusing (stale responses, need to manually clear cache). Build it last, after all features work online.

---

## Anti-Patterns to Avoid

### Putting HA credentials in client-side code
**What goes wrong:** `HA_TOKEN` leaks to the browser via env vars prefixed `NEXT_PUBLIC_`.
**Instead:** All HA calls go through Next.js API routes. Token stays server-side only.

### Service worker in development
**What goes wrong:** SW caches responses, dev changes don't appear, hours of debugging.
**Instead:** Register SW only when `process.env.NODE_ENV === 'production'` or use a dev-bypass flag.

### Running FTS5 and vector search on every keystroke
**What goes wrong:** SQLite under load with a 50k-chunk knowledge base is slow in the hot path.
**Instead:** Debounce search input (300ms). For the chat agent, search happens once per user message, not incrementally.

### Building RAG before having corpus
**What goes wrong:** RAG system built, tested with placeholder data, then real corpus reveals chunking strategy is wrong.
**Instead:** Gather 20-30 real NC camping documents first. Test chunking and search quality before wiring to Claude.

### Migrating to Postgres prematurely
**What goes wrong:** Postgres requires a running server (even locally via Docker), adding friction to daily dev.
**Instead:** SQLite locally through all development. Migrate only when deploying to Vercel.

---

## Scalability Notes

This is a single-user app. Scalability here means "works well for one user with years of data."

| Concern | Current approach | At scale (5+ years of data) |
|---------|-----------------|------------------------------|
| SQLite query speed | Fine for hundreds of records | Add indexes on timestamp, coordinates, tripId |
| Knowledge base size | N/A yet | 10k-50k chunks is comfortable for sqlite-vec |
| Claude API cost | Per-request, no concern | Add caching for identical prompts; Haiku for tool calls |
| Tile cache size | N/A yet | Cap at 50MB; prune LRU tiles |
| IndexedDB offline queue | N/A yet | Never grows large (flushes on reconnect) |

---

## Sources

- [Next.js PWA Official Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — HIGH confidence, official docs, updated 2026-03-25
- [Serwist + Next.js offline](https://github.com/serwist/serwist) — MEDIUM confidence (requires webpack, adds build complexity)
- [sqlite-vec hybrid search](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) — HIGH confidence, authored by sqlite-vec maintainer
- [home-assistant-js-websocket](https://github.com/home-assistant/home-assistant-js-websocket) — HIGH confidence, official HA library
- [HA REST API docs](https://developers.home-assistant.io/docs/api/rest) — HIGH confidence, official HA developer docs
- [Prisma + Vercel Postgres](https://vercel.com/kb/guide/nextjs-prisma-postgres) — HIGH confidence, official Vercel guide
- [Web Speech API browser support](https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API) — HIGH confidence, MDN
- [Dexie.js for IndexedDB](https://dexie.org/) — MEDIUM confidence (widely used, good for offline queues)
- [LogRocket offline-first 2025](https://blog.logrocket.com/offline-first-frontend-apps-2025-indexeddb-sqlite/) — MEDIUM confidence (editorial, well-sourced)
