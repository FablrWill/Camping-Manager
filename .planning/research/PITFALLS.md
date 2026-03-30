# Domain Pitfalls

**Domain:** Personal camping assistant — adding offline/PWA, RAG, AI agent, Home Assistant integration, and Vercel deployment to an existing Next.js 16 app
**Researched:** 2026-03-30
**Covers:** PWA/offline, Claude API cost management, RAG quality, SQLite→Postgres migration, Home Assistant integration, voice input

---

## Critical Pitfalls

Mistakes that cause rewrites, runaway costs, or deployment blockers.

---

### Pitfall 1: SQLite Is Silently Read-Only on Vercel

**What goes wrong:** Vercel's serverless functions have an ephemeral filesystem. SQLite writes to `/tmp` only, and that directory is wiped between invocations. The database appears to work locally, but all writes silently fail (or the database file disappears entirely) after deployment. Data including gear, trips, and spots is lost on every cold start.

**Why it happens:** SQLite is a file-based database. Vercel's serverless runtime does not provide a persistent disk — there is no shared volume across function instances.

**Consequences:** Total data loss at production deploy. Any feature built after this point that relies on writes (photo tagging, trip creation, gear edits) breaks immediately on Vercel. This is not a warning — it is a hard blocker.

**Warning signs:**
- Working perfectly in local dev but data mysteriously disappears after deployment
- Vercel logs showing database path errors or `SQLITE_CANTOPEN`
- New records created in the app not appearing after page reload

**Prevention:**
1. Migrate the Prisma datasource from `sqlite` to `postgresql` before deploying to Vercel
2. Keep SQLite for local dev via `.env.local` override; use a real Postgres connection string in `.env.production`
3. Use Vercel Postgres (serverless-native, built-in connection pooling) or Supabase as the production database
4. Regenerate migration history after the provider switch — SQLite migrations are not compatible with Postgres SQL syntax and must be recreated with `prisma migrate dev`

**Phase:** Address at the start of the Deploy phase (Phase 4). Do not deploy to Vercel until this is done.

---

### Pitfall 2: Photo Storage on Ephemeral Filesystem

**What goes wrong:** Photos are currently saved to `public/photos/` via filesystem writes. On Vercel, any files written during a function invocation are lost when the container is recycled. Photos upload successfully (you see a 200 response), but they are gone on the next request.

**Why it happens:** Same root cause as SQLite — Vercel's serverless containers have no persistent disk. The `public/` directory that works in local dev is a write target, but on Vercel it is either read-only (for bundled assets) or ephemeral.

**Consequences:** All photo uploads silently disappear in production. Trip photos, gear photos, and map pins with images are all broken. The impact is significant since photos are a core feature.

**Warning signs:**
- Photo upload succeeds but image is missing after refresh
- Broken image placeholders on the map after a Vercel redeploy
- No errors in the UI (the write to `/tmp` or ephemeral path succeeds; it just doesn't persist)

**Prevention:**
1. Build a storage abstraction (`lib/storage.ts`) with two backends: local filesystem for dev, cloud object storage for production
2. Use Vercel Blob (native integration, simplest path) or Cloudflare R2 (S3-compatible, cheaper at scale) for production
3. Store the returned public URL in the database, not the local path
4. Do this work before adding any more photo features — the abstraction layer is the right foundation

**Phase:** Phase 4 (Deploy). The CONCERNS.md already flags this. Do not defer past this milestone.

---

### Pitfall 3: Service Worker Stale Cache Serves Old App After Updates

**What goes wrong:** After deploying a new version of the app, users (including you on mobile) continue seeing the old version because the service worker is caching aggressively. The old worker keeps serving cached HTML/JS even after the new deployment. This is the most reported Next.js PWA issue and it affects real users in subtle ways — you might see stale UI, old bugs you thought you fixed, or broken API contract mismatches.

**Why it happens:** Service workers are long-lived by design. A newly installed worker waits until all tabs are closed before taking over. Without `skipWaiting: true`, the old worker holds on indefinitely.

**Consequences:** You deploy a bug fix and the mobile app keeps showing the broken version. Or you change an API response shape and the cached old JS throws errors against the new API.

**Warning signs:**
- Deployed a change but mobile doesn't show it until you manually close all tabs and reopen
- Errors in production that you can't reproduce in dev
- "Works on desktop but not mobile" reports (because mobile PWA has the app pinned open)

**Prevention:**
1. Configure `skipWaiting: true` and `clientsClaim: true` in the Workbox/Serwist config — this forces the new worker to activate immediately
2. Add a visible update prompt: "New version available — tap to reload." Do not silently update; that causes mid-session disruptions
3. Disable the service worker in development (`disable: process.env.NODE_ENV === 'development'`) to prevent dev caching from masking bugs
4. Use content-hashed filenames for JS chunks (Next.js does this by default) so the cache knows when assets are stale

**Phase:** PWA phase. Set up correctly from the start; retrofitting update behavior is painful.

---

### Pitfall 4: Offline Maps Require Explicit Tile Pre-Caching — Tiles Are Not Cached by Default

**What goes wrong:** The standard service worker setup (even with next-pwa or Serwist) caches app assets — HTML, JS, CSS — but does NOT cache map tiles. If you go offline, the map shows a blank grey grid. This surprises most developers who assume "offline PWA" means "offline map."

**Why it happens:** OpenStreetMap tile URLs are dynamic (lat/lon/zoom encoded in the path). Generic cache strategies don't cover them. Additionally, OSM's tile servers set `Cache-Control: no-cache` on many responses, which the browser honours.

**Consequences:** The app technically works offline (the UI loads), but the primary navigation feature — the spots map — is useless without connectivity. Pre-trip offline preparation becomes impossible.

**Warning signs:**
- PWA works offline but map tiles are blank
- Network tab shows 0 tile requests being served from cache while offline
- The service worker shows in DevTools but map images are not in the cache storage

**Prevention:**
1. Use a dedicated tile caching layer: `leaflet-cachestorage` or `Leaflet.TileLayer.PouchDBCached` to intercept tile requests and store them in the Cache Storage API
2. Implement an explicit "Download for offline" flow that pre-fetches tiles for a bounding box around a planned campsite at zoom levels 10–16
3. Cap tile storage at a sensible limit (100–200MB) and show the user how much space has been used
4. Use `leaflet-cachestorage` over PouchDB for simpler integration with Next.js; PouchDB adds significant bundle weight

**Phase:** PWA phase. This is feature work — build it as "Download for Offline" rather than assuming it's automatic.

---

### Pitfall 5: AI Agent Cost Runaway from Unconstrained Loops

**What goes wrong:** Conversational agent features (chat interface, trip recommendation, orchestration layer) can generate runaway API costs if not constrained. The classic failure: an agent hits an error, retries, the retry hits the same error, and it loops 400+ times over a weekend, burning through API credits. At claude-sonnet-4-6 rates, 100K tokens per minute across a few concurrent threads is $3+/minute.

**Why it happens:** Agentic patterns — tool use, multi-step reasoning, memory — involve multiple API calls per user interaction. Without iteration caps, spend limits, or error circuit breakers, a single broken tool call or misunderstood instruction can spiral.

**Consequences:** A surprise $50–200+ API bill from a single debugging session or background agent loop. For a personal project on a budget, this is a real risk.

**Warning signs:**
- Agent "thinking" without visible progress for more than 10–15 seconds
- API call count in the Anthropic console spiking unexpectedly
- Tool call results growing larger in context on each step (context accumulation spiral)

**Prevention:**
1. Set hard per-request iteration limits on all agent loops (max 5–10 tool calls per user message)
2. Track `input_tokens + output_tokens` per response and expose it in the UI during development
3. Use `claude-haiku-3-5` for lightweight tasks (intent classification, short summaries); use `claude-sonnet-4-6` only for complex reasoning
4. Set Anthropic API spend limits on the project/workspace level as a circuit breaker
5. Use prompt caching (`cache_control: ephemeral`) on system prompts and large knowledge base injections — these repeat on every turn and are the biggest cost driver
6. Never pass the full conversation history unbounded; summarize or truncate after N turns

**Phase:** AI Agent phase (Phase 3). Design limits in from day one — retrofitting spend controls into an existing agent is hard.

---

## Moderate Pitfalls

---

### Pitfall 6: RAG Quality Degrades with Poor Chunking of Camping Knowledge

**What goes wrong:** The NC camping knowledge base is seeded with unstructured content (trail guides, campsite descriptions, local area notes). If documents are chunked at fixed character boundaries without regard for semantic structure, retrieved chunks are either too broad (pull in irrelevant context) or too narrow (split a sentence about a campsite across two chunks). The agent confidently answers using wrong or incomplete context.

**Why it happens:** Fixed-size chunking is the default in most RAG tutorials, and it works poorly for structured knowledge like "Site 14 at Linville Gorge, no dogs, 2 miles from parking, water at spring." That sentence loses all meaning if split.

**Consequences:** Agent gives inaccurate campsite recommendations ("Yes, dogs allowed" when they aren't). Trust in the system erodes fast for a personal tool where accuracy matters for safety planning.

**Warning signs:**
- Agent answers are directionally right but missing key details (capacity, dog rules, fee)
- Retrieval returns chunks that are half a sentence or half a table
- Same query returns wildly different answers on repeated runs

**Prevention:**
1. Use semantic chunking or logical section boundaries (heading-based split) rather than fixed-size character splits
2. Target 256–512 token chunks with 20–30% overlap between adjacent chunks
3. Prefer `voyage-3` or `text-embedding-3-small` (OpenAI) over generic embeddings; a domain-tuned model improves retrieval 20–40% for structured location data
4. Test retrieval quality before building the agent layer: run 10 representative queries and inspect what chunks come back
5. Use structured metadata (location name, region, tags) as pre-filter before vector search — reduces retrieval noise significantly for a camping knowledge base

**Phase:** Intelligence/Agent phase (Phase 3). Build RAG ingestion pipeline carefully before layering the chat interface on top.

---

### Pitfall 7: Home Assistant Integration Blocked by CORS and Local Network Assumptions

**What goes wrong:** The web app runs at `https://your-app.vercel.app` (or even `http://localhost:3000` in dev). Home Assistant runs at `http://192.168.x.x:8123` on the local network. When the browser tries to make a fetch() call from the web origin to the HA origin, the request is blocked by CORS before it leaves the browser. Setting `cors_allowed_origins` in HA's `configuration.yaml` is required but not sufficient — Private Network Access (Chrome's spec for calling `http://` from `https://`) adds a second layer of restriction that most tutorials don't cover.

**Why it happens:** Browsers enforce the Same-Origin Policy, which requires the server to explicitly permit cross-origin requests. HA supports CORS configuration, but private network access (LAN addresses accessed from a secure origin) requires an additional `Access-Control-Allow-Private-Network: true` header that HA does not send by default in all configurations.

**Consequences:** HA integration appears to work in development (both running locally), fails completely in production. Alternatively, it works in Chrome but not Safari or Firefox due to differing private network access implementations.

**Warning signs:**
- Fetch to HA works from `localhost` but fails from Vercel deployment
- Browser console shows `CORS error` or `Access to fetch blocked by CORS policy`
- Request works in curl/Postman but not from the browser
- Preflight OPTIONS request fails for `/api/history` or other HA endpoints

**Prevention:**
1. Build the HA bridge as a Next.js API route proxy (`/api/ha/[...path]`) — the server-to-server call from Vercel to HA bypasses CORS entirely since CORS is a browser security policy
2. The proxy approach also keeps the HA long-lived access token server-side (not exposed in browser JS)
3. For local network access from production, the user's router or Tailscale/Cloudflare Tunnel is required — document this as a setup prerequisite
4. Test on mobile Safari specifically, as it implements Private Network Access restrictions more aggressively than Chrome

**Phase:** Smart Campsite phase (Phase 3). Plan the proxy architecture from the start; retrofitting it after building a direct browser-to-HA fetch pattern means rewriting all the integration code.

---

### Pitfall 8: Prisma Migration History Becomes Incompatible When Switching Providers

**What goes wrong:** SQLite migration files (generated by `prisma migrate dev`) contain SQLite-specific SQL. When you switch `provider` to `postgresql` in `schema.prisma`, running `prisma migrate deploy` against Postgres will fail or produce incorrect schema because the migration SQL is SQLite syntax, not PostgreSQL syntax.

**Why it happens:** Prisma generates provider-specific SQL in each migration file. The files are not cross-compatible. This is documented by Prisma but frequently overlooked because the schema itself is provider-agnostic (Prisma SDL looks the same either way).

**Consequences:** You can't use your existing migration history in production. You need to regenerate migrations from scratch, which is safe but requires care not to lose the dev migration history.

**Warning signs:**
- `prisma migrate deploy` fails with SQL syntax errors in production
- Migration file contains `INTEGER PRIMARY KEY AUTOINCREMENT` (SQLite) instead of `SERIAL` (Postgres)
- Schema looks correct in `schema.prisma` but Postgres tables have wrong column types

**Prevention:**
1. When migrating, do NOT run `prisma migrate deploy` with the old migrations — reset the migration history
2. Strategy: change provider in schema, run `prisma migrate dev --name init` against a fresh Postgres instance to generate new migration files, then deploy those
3. Keep the SQLite migration directory backed up before wiping it
4. Use `prisma db push` for the initial production setup if you want to skip migration history entirely (acceptable for a personal app)
5. Test the full migration locally against a Postgres container (Docker) before deploying to Vercel

**Phase:** Phase 4 (Deploy). Documented in CONCERNS.md as a known future blocker. Plan a full day for this migration — it's mechanical but requires care.

---

### Pitfall 9: Voice Input (Web Speech API) Unreliable on iOS

**What goes wrong:** The Web Speech API (`SpeechRecognition`) works well in Chrome on desktop but is significantly degraded on iOS. The trip debrief / voice ghostwriter feature — likely used on mobile after a camping trip — hits these limitations on the primary device (iPhone). Chrome on iOS uses WebKit (Apple's engine), not Blink, so it does not support the Speech Recognition API at all. Safari on iOS supports it natively but with significant bugs: `isFinal` is sometimes always `false`, interim results duplicate over time, and the API fails silently in PWA (home screen) mode.

**Why it happens:** On iOS, all browsers must use WebKit as the rendering engine (App Store rules). Chrome on iOS is WebKit with Chrome chrome — it does not have Chrome's SpeechRecognition implementation. Safari has its own implementation that is incomplete.

**Consequences:** Voice debrief feature works in desktop testing, breaks for the primary mobile use case. Safari PWA (home screen app) mode makes it worse — the microphone permission prompt may not appear, and the API errors immediately.

**Warning signs:**
- Works in desktop Chrome, fails on iPhone
- `webkitSpeechRecognition` is undefined in Chrome on iOS
- Recording appears to start but `onresult` never fires
- "This feature requires microphone access" appears but mic is already granted

**Prevention:**
1. Treat voice input as a progressive enhancement, not a required feature path — always provide a text input fallback
2. Feature-detect at runtime: `if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window))` — hide the voice button rather than showing a broken experience
3. For the trip debrief feature specifically, consider using the Claude API with a voice-to-text service (Whisper API) as an alternative: record audio via `MediaRecorder`, upload the blob, transcribe server-side
4. Test on actual iOS Safari before building the UI around voice input; do not rely on Chrome DevTools mobile simulation

**Phase:** Phase 3 (Intelligence/Agent). Do not build voice as primary — build text-first, voice as enhancement.

---

## Minor Pitfalls

---

### Pitfall 10: next-pwa Library Is Unmaintained — Use Serwist Instead

**What goes wrong:** The most commonly referenced PWA library for Next.js (`next-pwa` by shadowwalker) has not been updated in 3+ years and does not work properly with the Next.js App Router. Tutorials referencing it are common but outdated.

**Why it happens:** The library predates App Router and uses the older Pages Router patterns. App Router's file-based routing changes how assets are served and cached.

**Prevention:**
1. Use Serwist (`@serwist/next`) — the actively maintained fork of next-pwa with App Router support
2. Alternatively, use Next.js's own PWA guide (published 2025, covers App Router natively)
3. If you encounter tutorials using `next-pwa`, verify the publication date — if it's before 2024, the App Router config will be wrong

**Phase:** PWA phase.

---

### Pitfall 11: IndexedDB Is Required for Meaningful Offline Data — localStorage Is Not Enough

**What goes wrong:** localStorage is synchronous, limited to ~5MB, and cannot store binary data (photos, tiles). If offline data storage is built on localStorage, it hits the limit quickly with tile caches or photo data and throws quota errors with no clean fallback.

**Why it happens:** localStorage is simpler to use than IndexedDB, so developers reach for it first. Service workers cannot access localStorage at all (it's not available in the service worker context).

**Consequences:** Offline gear list or trip data works until it doesn't, with cryptic quota errors and no clear user message.

**Prevention:**
1. Use IndexedDB (via the `idb` wrapper library for ergonomics) for all offline data storage
2. Use the Cache Storage API (available in both service worker and page contexts) for network responses and tile caches
3. Do not use localStorage for anything that needs to survive offline or be accessed from the service worker

**Phase:** PWA phase.

---

### Pitfall 12: Claude API JSON Parsing Is Already Fragile — Do Not Replicate the Pattern

**What goes wrong:** CONCERNS.md (Issue #2) documents that the existing packing list generator parses Claude's JSON response with no error handling. Every new AI feature built on the same pattern inherits this fragility. As more features are added (meal planning, trip recommendations, gear identification), each unprotected `JSON.parse()` becomes a new failure point.

**Why it happens:** The prompt instructs Claude to return JSON, and it usually does. The happy path works, so error handling gets skipped.

**Prevention:**
1. Fix the existing `lib/claude.ts` JSON parsing before building additional AI features (already flagged as High priority in CONCERNS.md)
2. Create a shared `parseClaudeJSON<T>(text: string): T` utility that wraps parse+validate in one place
3. Use Zod schemas to validate the structure of every Claude response before consuming it — catches model drift when Claude changes its output format
4. Return structured `{ success: boolean, data?: T, rawResponse?: string }` from all Claude API routes so callers can handle errors gracefully

**Phase:** Fix immediately (pre-existing concern). The shared utility should be built before Phase 3 AI features.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| PWA/Offline | Service worker stale cache on mobile | Configure skipWaiting + visible update prompt from day one |
| PWA/Offline | Map tiles blank offline | Implement explicit tile pre-fetch flow — not automatic |
| PWA/Offline | Using next-pwa (unmaintained) | Use Serwist or Next.js official PWA guide |
| AI Agent | Runaway API cost loops | Hard iteration caps + spend limit on Anthropic console |
| AI Agent | Claude JSON parsing failures | Fix lib/claude.ts first; build shared parse+validate utility |
| RAG | Poor retrieval quality | Semantic chunking, 256–512 tokens, test retrieval before building chat |
| HA Integration | CORS in production | Proxy via Next.js API route, never direct browser→HA fetch |
| HA Integration | Private Network Access in Chrome/Safari | Document Tailscale or reverse proxy as prerequisite |
| Voice Input | iOS Safari / Chrome on iOS failures | Text-first, voice as enhancement; server-side Whisper as fallback |
| Deploy | SQLite silently fails on Vercel | Migrate to Postgres before deploying — hard blocker |
| Deploy | Photos lost on Vercel redeploy | Storage abstraction layer + Vercel Blob or R2 before deployment |
| Deploy | Prisma migration incompatibility | Regenerate migration history against Postgres; test with Docker |

---

## Sources

- [Next.js PWA Guide (Official, 2025)](https://nextjs.org/docs/app/guides/progressive-web-apps)
- [Next.js 16 PWA Offline Support — LogRocket Blog](https://blog.logrocket.com/nextjs-16-pwa-offline-support/)
- [Offline-First Next.js 15 App Router Discussion — GitHub](https://github.com/vercel/next.js/discussions/82498)
- [Is SQLite Supported in Vercel? — Vercel Knowledge Base](https://vercel.com/kb/guide/is-sqlite-supported-in-vercel)
- [Prisma SQLite/Postgres Switching Discussion — GitHub](https://github.com/prisma/prisma/discussions/3642)
- [Prisma Migrate Limitations and Known Issues — Prisma Docs](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/limitations-and-known-issues)
- [CORS Issue with Home Assistant — Community Forum](https://community.home-assistant.io/t/solved-cross-origin-request-blocked-http-configuration/179510)
- [Preventing AI Agent Runaway Costs — Cloudatler](https://cloudatler.com/blog/the-50-000-loop-how-to-stop-runaway-ai-agent-costs)
- [Best Chunking Strategies for RAG 2025 — Firecrawl](https://www.firecrawl.dev/blog/best-chunking-strategies-rag)
- [Speech Recognition API Browser Compatibility — Can I Use](https://caniuse.com/speech-recognition)
- [Web Speech API Issues on Safari — Apple Developer Forums](https://developer.apple.com/forums/thread/694847)
- [Leaflet TileLayer PouchDBCached — GitHub](https://github.com/MazeMap/Leaflet.TileLayer.PouchDBCached)
- [Six Lessons Learned Building RAG Systems in Production — Towards Data Science](https://towardsdatascience.com/six-lessons-learned-building-rag-systems-in-production/)
