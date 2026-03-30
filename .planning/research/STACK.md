# Technology Stack — New Feature Additions

**Project:** Outland OS (camping second brain)
**Researched:** 2026-03-30
**Scope:** Libraries and tools needed for Phase 2–4 features. Does NOT re-document existing stack (Next.js 16, Prisma, Leaflet, Claude API, Tailwind — all validated).

---

## PWA / Offline

### Service Worker

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `@serwist/next` | 9.5.7 | Service worker + offline caching for Next.js | Actively maintained (published 15 days ago). Official Next.js docs name it as the only recommended offline option. Successor to `next-pwa` (abandoned 2 years ago). Wraps Workbox with Next.js-specific config. |

**Install:**
```bash
npm install @serwist/next serwist
```

**Critical caveat:** Serwist currently requires Webpack, not Turbopack. Next.js 16 defaults to Turbopack in dev. Build script must be run with `--no-turbo` (or disable Turbopack in `next.config.ts`). Confirmed by official Next.js docs and Serwist docs.

**What it handles:**
- App shell caching (JS/CSS/HTML → works offline)
- API response caching (configurable per route)
- Background sync for deferred writes
- Web push (optional — low priority for this project)

**What it does NOT handle:** Map tile caching (separate concern — see below).

**Confidence:** HIGH — verified via official Next.js docs + npm publish recency.

---

### Offline Map Tiles

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `leaflet.offline` | latest | Cache OSM tiles to IndexedDB | Most actively maintained Leaflet offline library. Integrates directly with Leaflet's tile layer system. Stores tiles in browser IndexedDB so pre-trip downloads work. |

**Install:**
```bash
npm install leaflet.offline
```

**Alternative considered:** `Leaflet.TileLayer.PouchDBCached` — uses PouchDB as the backend, adds a large dependency. leaflet.offline uses IndexedDB directly; simpler for this use case.

**UX pattern:** Add a "Download area for offline" button on the Spots map page before a trip. Seed the bounding box of the destination area at zoom levels 10–15.

**Confidence:** MEDIUM — library is maintained but last major activity was 2023. IndexedDB tile caching is a solved pattern; the library works even if infrequently updated.

---

### Offline Data Storage (app data, not tiles)

No new library needed. Use the existing Prisma/SQLite database — it runs fully local. API routes already read from it. Serwist can cache API responses. For full offline write support (deferred mutations), use the Browser's built-in IndexedDB via a simple wrapper if needed in a later phase — avoid adding a full offline-first library (TanStack Query, WatermelonDB) until the need is proven.

---

## RAG / Vector Search (NC Camping Knowledge Base)

### Embedding + Vector Storage

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `sqlite-vec` | 0.1.8 | Vector similarity search inside existing SQLite | Keeps the entire stack in one SQLite file. No external service. Node.js bindings work with `better-sqlite3`. Author (Alex Garcia) actively maintains. Avoids adding Chroma, Pinecone, or Qdrant — all require external processes. |
| `@anthropic-ai/sdk` (existing) | 0.80.0 | Generate embeddings via Claude or call text embedding model | Already in the project. Use `claude-3-haiku-20240307` for embedding generation to keep cost low. |

**Install:**
```bash
npm install sqlite-vec better-sqlite3
npm install -D @types/better-sqlite3
```

**Why not Vectra (named in milestone context)?** Vectra is a local file-based vector store for Node.js. sqlite-vec is a stronger choice because it lives inside the existing SQLite DB rather than a parallel folder of JSON files, making backup, migration, and querying unified. Vectra has low npm activity as of 2025.

**Why not LangChain?** LangChain JS is a heavy abstraction with frequent breaking changes. For a single-user personal tool with one knowledge base (NC camping info), a thin direct implementation is simpler and more maintainable.

**Architecture for the knowledge base:**
1. Source documents: markdown files in `/data/knowledge/` (NC camping areas, permit info, trail notes)
2. Ingest script: chunk docs → generate embeddings via Anthropic API → store in `sqlite-vec` table
3. At query time: embed the user question → cosine search in sqlite-vec → inject top-5 chunks into Claude prompt as context

**FTS5 (Full-Text Search):** SQLite already supports FTS5 natively. Use it for keyword fallback when vector search returns low-confidence results. No library needed — raw SQL via Prisma's `$queryRaw`.

**Confidence:** MEDIUM — sqlite-vec v0.1.8 is alpha-versioned but functional. The vector search pattern is well documented. Risk: potential breaking changes before 1.0. Mitigate by pinning the version.

---

## Home Assistant Integration

No npm library needed. Use the HA REST API directly.

**Approach:**

```typescript
// lib/homeAssistant.ts — thin wrapper, no external dep
const HA_URL = process.env.HA_URL      // e.g. http://homeassistant.local:8123
const HA_TOKEN = process.env.HA_TOKEN  // Long-lived access token from HA profile
```

**Why no library:** The `node-home-assistant` npm package (last updated 2017) and similar wrappers are poorly maintained. The HA REST API is simple JSON over HTTP — a `fetch` wrapper in ~50 lines is more reliable than a stale dependency.

**Available HA REST endpoints used in this project:**
- `GET /api/states/<entity_id>` — read device state
- `POST /api/services/<domain>/<service>` — trigger automations
- `GET /api/states` — list all entity states for dashboard

**Required env vars:**
```
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token
```

**Timing:** HA hardware not yet available (mid-April 2026). Build the data model and UI shell now; wire to real HA later. Use mock API responses in dev.

**Confidence:** HIGH — official HA REST API is stable, well-documented, and version 2026.3.4 active.

---

## Voice Input (Journaling / Debrief)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `react-speech-recognition` | 4.0.1 | Browser-native speech-to-text via Web Speech API | Uses the browser's built-in SpeechRecognition — no server costs, no API key for basic transcription. Published 6 months ago, still maintained. Returns transcript as React state. |

**Install:**
```bash
npm install react-speech-recognition
npm install -D @types/react-speech-recognition
```

**Browser support reality:** Chrome/Edge have native Web Speech API — it works well. Safari iOS 14.5+ supports it. Firefox does not support it without a polyfill. Given Will primarily uses Chrome on phone and laptop, this is sufficient.

**Important caveat:** The Web Speech API sends audio to Google's servers for processing (Chrome's implementation). This is fine for casual trip journaling. It does NOT work offline. For offline voice transcription, the alternative is Whisper (OpenAI) via API — but that adds cost and complexity. Defer offline voice to Phase 4 if it becomes a requirement.

**Alternative considered:** Vercel AI SDK's `useAudioRecorder` / Anthropic's audio input. As of early 2026, Claude's API supports audio input in some models. This is higher quality but costs API credits per transcription. The Web Speech API is free and good enough for debrief notes.

**Confidence:** MEDIUM — react-speech-recognition is the standard library; the Web Speech API limitation (Chrome only, online-only) is a known constraint, acceptable for this use case.

---

## AI Chat / Streaming (Agent Interface)

### Switch to Vercel AI SDK for Chat Features

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `ai` (Vercel AI SDK) | 6.0.141 | Streaming chat UI + React hooks | Reduces ~60% of boilerplate for streaming. `useChat` hook handles message history, streaming rendering, error states. Supports Anthropic as a provider — keeps Claude as the model. The existing `@anthropic-ai/sdk` integration for packing lists and meal plans does NOT need to change — keep it for those one-shot generation routes. |
| `@ai-sdk/anthropic` | latest | Anthropic provider adapter for Vercel AI SDK | Needed to wire Vercel AI SDK to Claude models. |

**Install (for new chat/agent routes only):**
```bash
npm install ai @ai-sdk/anthropic
```

**Strategy:** Do not rip out the existing `@anthropic-ai/sdk` usage. Use it for:
- Packing list generation (`/api/packing`)
- Meal plan generation (`/api/meals`)
- Any one-shot generation

Use Vercel AI SDK (`ai` package) for:
- Chat interface (messenger-style agent)
- Voice journaling transcription → response
- Trip recommendation dialog

Both packages can coexist. The `@ai-sdk/anthropic` adapter wraps the same underlying API.

**Confidence:** HIGH — Vercel AI SDK v6 is current, well-documented, and the canonical choice for Next.js streaming chat.

---

## Postgres Migration (Deploy Phase)

### Database

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| Neon | managed | Serverless Postgres for Vercel deployment | Scale-to-zero billing (free at personal-project traffic). Native serverless driver designed for Vercel Functions. Instant branching for PR preview environments. Prisma has first-class Neon support. Better Vercel integration than Supabase for a Prisma-first project. |
| `@neondatabase/serverless` | latest | Neon's serverless HTTP/WebSocket driver | Required for Vercel serverless functions — standard `pg` uses persistent connections that don't work in serverless. |
| `@prisma/adapter-neon` | latest | Prisma adapter for Neon's serverless driver | Official Prisma adapter — lets Prisma use WebSocket connections required by Neon serverless. |

**Install (at deploy time, not now):**
```bash
npm install @neondatabase/serverless @prisma/adapter-neon ws
```

**Migration path (when ready):**
1. Keep SQLite for all local dev — no change to current workflow
2. At deploy: update `prisma/schema.prisma` provider from `sqlite` to `postgresql`
3. Run `npx prisma migrate deploy` against Neon connection string
4. Update `next.config.ts` to wire the Neon adapter
5. Photos: move from `public/photos/` to Vercel Blob Storage (separate step)

**Alternative considered:** Supabase — it's a full backend platform (auth, storage, realtime). Those features don't align with this project's "no auth, Claude handles AI" architecture. Neon is pure Postgres, which is what's needed.

**Confidence:** HIGH — Prisma + Neon + Vercel is the documented recommended stack in Prisma's own deployment guide.

---

## Photo Storage (Deploy Phase)

| Technology | Purpose | Why |
|------------|---------|-----|
| Vercel Blob | Host uploaded photos in production | Current `public/photos/` won't persist on Vercel's ephemeral filesystem. Vercel Blob is the path-of-least-resistance for a Vercel-deployed Next.js app. SDK is `@vercel/blob`. Free tier: 1GB storage. |

**Install (at deploy time):**
```bash
npm install @vercel/blob
```

**Confidence:** MEDIUM — Vercel Blob is the obvious choice for Vercel-hosted apps, but alternatives (Cloudflare R2, S3) are viable if cost becomes an issue. Will's photo volume is moderate so free tier should hold.

---

## Alternatives Considered and Rejected

| Category | Recommended | Rejected | Why Rejected |
|----------|-------------|----------|--------------|
| PWA | `@serwist/next` | `next-pwa` | Abandoned 2+ years ago |
| PWA | `@serwist/next` | Custom service worker | Serwist handles Workbox complexity; not worth reinventing |
| Vector DB | `sqlite-vec` | Vectra | Low npm activity; JSON file storage doesn't fit SQLite-first arch |
| Vector DB | `sqlite-vec` | Chroma / Qdrant | Require external server process; overkill for personal tool |
| Vector DB | `sqlite-vec` | LangChain JS | Heavy abstraction, frequent breaking changes, unnecessary for single KB |
| HA bridge | Raw fetch | `node-home-assistant` | Package last updated 2017; HA REST API is simple enough to wrap in-house |
| Postgres | Neon | Supabase | Supabase adds auth/realtime features not needed; Neon is pure Postgres |
| Postgres | Neon | PlanetScale | MySQL, not Postgres; Prisma schema would require more changes |
| AI chat | Vercel AI SDK | Raw `@anthropic-ai/sdk` streaming | SDK already used for simple routes; AI SDK cuts boilerplate for streaming UI |
| Voice | `react-speech-recognition` | Whisper API | Adds per-transcription cost; Web Speech API is free and sufficient |
| Voice | `react-speech-recognition` | Deepgram | Requires API key + cost; over-engineered for trip journaling |

---

## Full Installation Reference

```bash
# PWA / Offline
npm install @serwist/next serwist
npm install leaflet.offline

# RAG / Knowledge Base
npm install sqlite-vec better-sqlite3
npm install -D @types/better-sqlite3

# AI Chat Streaming
npm install ai @ai-sdk/anthropic

# Voice Input
npm install react-speech-recognition
npm install -D @types/react-speech-recognition

# --- Deploy phase only (do not install now) ---
# Postgres
npm install @neondatabase/serverless @prisma/adapter-neon ws
# Photo storage
npm install @vercel/blob
```

---

## Environment Variables to Add

```bash
# Home Assistant (Phase 3 — add when HA hardware arrives)
HA_URL=http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token

# Deploy phase
DATABASE_URL=postgresql://...  # Neon connection string
BLOB_READ_WRITE_TOKEN=...       # Vercel Blob token
```

---

## Sources

- [Official Next.js PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — confirmed Serwist, confirmed Webpack requirement (2026-03-25 update)
- [@serwist/next on npm](https://www.npmjs.com/package/@serwist/next) — v9.5.7, published 15 days ago
- [sqlite-vec JS docs](https://alexgarcia.xyz/sqlite-vec/js.html) — v0.1.8, Node.js usage patterns
- [sqlite-vec GitHub](https://github.com/asg017/sqlite-vec) — active maintenance confirmed
- [Vercel AI SDK](https://ai-sdk.dev/docs/introduction) — v6.0.141 current
- [AI SDK Anthropic provider](https://ai-sdk.dev/providers/ai-sdk-providers/anthropic) — confirmed Claude support
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/) — v2026.3.4
- [Prisma + Neon + Vercel guide](https://www.prisma.io/docs/guides/frameworks/nextjs) — official Prisma docs
- [Neon vs Supabase 2026](https://www.devpick.io/compare/neon-vs-supabase) — comparison with Vercel integration context
- [react-speech-recognition npm](https://www.npmjs.com/package/react-speech-recognition) — v4.0.1, published 6 months ago
- [leaflet.offline GitHub](https://github.com/allartk/leaflet.offline) — IndexedDB tile caching for Leaflet
