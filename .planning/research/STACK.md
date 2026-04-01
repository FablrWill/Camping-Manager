# Stack Research — v1.1 Close the Loop (Additions Only)

**Project:** Outland OS (camping second brain)
**Researched:** 2026-04-01
**Scope:** NEW libraries needed for v1.1 features only. Does NOT re-document the existing stack (Next.js 16, Prisma, SQLite, Leaflet, Claude API, Tailwind, Vercel AI SDK, sqlite-vec, react-speech-recognition, serwist, leaflet.offline — all documented in the previous milestone research).

---

## What This Milestone Adds

The four v1.1 feature areas and their library needs:

| Feature Area | New Library Needed? | Verdict |
|---|---|---|
| Zod validation (Claude API response parsing) | Yes — Zod 4 | Add now |
| PWA / offline — "Leaving Now" cache | Already researched (serwist, leaflet.offline) | No new library; clarify config pattern below |
| Safety email on departure | Yes — nodemailer | Add now |
| Trip Day Sequencer / learning loop | No new library | Pure logic on existing stack |
| Offline data reads (trip data in field) | Partially covered — clarify IndexedDB pattern | idb for structured read cache |

---

## New Libraries for v1.1

### 1. Zod — Runtime Validation for Claude API Responses

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `zod` | 4.3.6 | Parse and validate all Claude API JSON responses | Claude returns untyped JSON. TypeScript only catches type errors at compile time — Zod catches schema errors at runtime. The `parseClaudeJSON<T>` utility (already in TASKS.md) wraps every Claude response in a Zod schema before it reaches the UI. Prevents the "JSON parsing" bugs listed in the v1.1 stabilize list. |

**Install:**
```bash
npm install zod
```

**Import pattern (v4):**
```typescript
import { z } from 'zod'
```

The package root exports Zod 4 as of August 2025. Do not use `zod/v4` subpath — that was a transitional pattern that is now deprecated.

**Usage pattern for `parseClaudeJSON<T>`:**
```typescript
// lib/parseClaudeJSON.ts
import { z, ZodSchema } from 'zod'

export function parseClaudeJSON<T>(raw: string, schema: ZodSchema<T>): T {
  const json = JSON.parse(raw)
  return schema.parse(json)
}

// Example schema for packing list
const PackingListSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    category: z.string(),
    priority: z.enum(['essential', 'recommended', 'optional']),
    reason: z.string().optional(),
  })),
  weather_note: z.string().optional(),
})
```

Apply to: packing list route, meal plan route, voice debrief extraction route, trip recommendation route.

**Version status:** Zod 4.3.6, published ~March 2026. Zod 4 is stable (shipped August 2025). Not breaking from Zod 3 for standard validation patterns.

**Confidence:** HIGH — official npm, 40M+ weekly downloads, Zod 4 stable confirmed via official release notes and InfoQ announcement.

---

### 2. Nodemailer — Safety Email on Departure

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `nodemailer` | 8.0.4 | Send the "trip float plan" safety email to an emergency contact when the user taps "Leaving Now" | Standard Node.js email library. Used in Next.js API routes. Handles SMTP transports — Gmail with an App Password is the zero-cost path for a personal tool. No external email service account needed for personal use. The safety email is a one-shot send (not a marketing campaign), so deliverability complexity doesn't apply here. |

**Install:**
```bash
npm install nodemailer
npm install -D @types/nodemailer
```

**nodemailer has bundled TypeScript types in v8** — the `@types/nodemailer` package (v7.0.11) is still needed for older versions but should be checked at install time. As of v8, built-in types may replace the DefinitelyTyped package. Install both, let TypeScript resolve.

**Transport config (Gmail App Password — personal use):**
```typescript
// lib/email.ts
import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_FROM,
    pass: process.env.EMAIL_APP_PASSWORD, // Gmail App Password, not account password
  },
})
```

**Required env vars:**
```
EMAIL_FROM=your.email@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx   # Google account → Security → App Passwords
EMAIL_EMERGENCY_CONTACT=emergency@example.com
```

**What the safety email contains:** Trip name, destination, expected return date, saved location GPS coords, vehicle description, emergency note. All data from existing Prisma models — no new DB schema needed.

**Alternative considered:** Resend, SendGrid, Postmark — all require account setup, API keys, domain verification. Overkill for one email sent per trip to a single contact. Gmail SMTP is sufficient and free.

**Confidence:** HIGH — nodemailer 8.0.4 confirmed active (published April 2026). Gmail App Password SMTP pattern is the documented personal-use approach in the official nodemailer docs.

---

### 3. idb — IndexedDB Wrapper for Offline Trip Data Cache

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| `idb` | 8.0.3 | Store trip data snapshot in browser IndexedDB for field access when offline | The "Leaving Now" flow needs to write trip data (packing list, meal plan, map pins, weather) into browser storage so the app works offline in the field without network access. The Prisma/SQLite database runs server-side — it's not accessible offline. `idb` wraps the IndexedDB API with promises/async-await, reducing ~80% of boilerplate. Used alongside serwist (which caches the app shell) to give the full offline experience. |

**Install:**
```bash
npm install idb
```

**Usage pattern:**
```typescript
// lib/offlineCache.ts — write on "Leaving Now"
import { openDB } from 'idb'

const DB_NAME = 'outland-offline'
const DB_VERSION = 1

export async function cacheTrip(tripId: string, data: OfflineTripData) {
  const db = await openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      db.createObjectStore('trips', { keyPath: 'id' })
    },
  })
  await db.put('trips', { id: tripId, ...data, cachedAt: Date.now() })
}

export async function getCachedTrip(tripId: string): Promise<OfflineTripData | undefined> {
  const db = await openDB(DB_NAME, DB_VERSION)
  return db.get('trips', tripId)
}
```

**What gets cached in IndexedDB on "Leaving Now":**
- Trip details (name, dates, destination)
- Packed items list (from PackingItem table)
- Meal plan (from DB or last AI generation)
- Saved location data for destination (coords, notes, road info)
- Weather snapshot for trip dates
- Emergency contact info

**Why not raw IndexedDB:** The native API is callback-based and verbose. `idb` is the canonical lightweight wrapper (1.19kB brotli'd), authored by Jake Archibald (ex-Google, web standards contributor). No abstraction overhead — mirrors the native API with promises added.

**Why not Dexie.js:** Dexie adds cloud sync, realtime, and React hooks — all unnecessary for a single-user local cache. idb is the minimal correct tool here.

**Confidence:** HIGH — idb 8.0.3 is the widely-used standard wrapper, authored by the person who co-created the IDB spec. Active GitHub, MDN-referenced.

---

## What NOT to Add for v1.1

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Resend / Postmark / SendGrid | Requires account + domain verification + API key for a single-trip safety email | nodemailer + Gmail App Password |
| Dexie.js | Cloud sync and React hooks are unnecessary for a read-only offline trip snapshot | idb (1.19kB) |
| WatermelonDB / RxDB | Full offline-first database sync — massive overkill for "cache one trip snapshot" | idb for write-on-departure, Serwist for app shell |
| react-hook-form | Will has no complex multi-step form validation needs in v1.1; Zod is the validation layer, not RHF | Plain `useState` + Zod `safeParse` on submit |
| email-templates / mjml | HTML email templating is unnecessary for a plain-text float plan email | Plain text nodemailer email — readable on any device |
| Zod 3 (via `zod@3.x`) | Zod 4 is stable and the package root default as of August 2025. No reason to pin v3. | `import { z } from 'zod'` |

---

## Pattern: PWA Config Clarification (No New Library, Just Config)

Serwist was already selected in the previous milestone research. The v1.1 "Leaving Now" feature requires clarifying the service worker caching strategy, not adding new libraries.

**Two-layer offline strategy:**

| Layer | Tool | What It Caches |
|-------|------|----------------|
| App shell | `@serwist/next` (Serwist) | JS/CSS/HTML bundles — app loads without network |
| Trip data | `idb` (IndexedDB) | Dynamic trip content written on "Leaving Now" tap |
| Map tiles | `leaflet.offline` (existing) | OSM tiles for destination area |

**Key config detail:** Next.js 16 defaults to Turbopack in `next dev`. Serwist requires Webpack. Change `package.json`:
```json
"dev": "next dev"
```
(Remove `--turbopack` flag if present.) Build remains webpack-based by default.

---

## Learning Loop — No New Libraries

The post-trip learning loop (gear usage tracking, post-trip debrief, feedback-driven packing improvements) is pure application logic on the existing stack:

- **Gear usage tracking** — new Prisma fields on `PackingItem` (used: Boolean, usageNote: String)
- **Post-trip review** — Claude API call (existing `@anthropic-ai/sdk`) with packed items + usage data as context
- **Voice debrief** — already built in v1.0 (react-speech-recognition + Claude extraction)
- **Feedback-driven packing** — pass trip history as context to the packing list generator (existing Claude route)

No new library needed. All learning loop features are data model changes + Claude prompt engineering.

---

## Trip Day Sequencer — No New Libraries

The Trip Day Sequencer (time-sequenced departure checklist from packing + meals + power) is a derived view over existing data. Implementation is:

1. A new API route that reads PackingItem, MealPlan, and PowerBudget for a given trip
2. Sorts and sequences items by time-of-day logic (morning camp breakdown, drive, arrival setup)
3. Renders as a checklist component with completion state in `useState`

No new library. Optional: `date-fns` for time arithmetic — but it's already likely in the project or can be avoided with plain JS Date methods for this use case.

---

## Full Installation for v1.1 New Libraries

```bash
# Validation
npm install zod

# Safety email
npm install nodemailer
npm install -D @types/nodemailer

# Offline trip data cache
npm install idb
```

---

## New Environment Variables for v1.1

```bash
# Safety email (nodemailer + Gmail)
EMAIL_FROM=your.email@gmail.com
EMAIL_APP_PASSWORD=xxxx xxxx xxxx xxxx
EMAIL_EMERGENCY_CONTACT=emergency@example.com
```

---

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| `zod` | 4.3.6 | TypeScript 5, Next.js 16, Node.js 20 | Import from `"zod"` (not `"zod/v4"`) |
| `nodemailer` | 8.0.4 | Node.js 18+, Next.js API routes | Use in API routes only — not client components |
| `idb` | 8.0.3 | All modern browsers, Next.js client components | Browser-only; guard with `typeof window !== 'undefined'` |

---

## Unchanged from Previous Milestone Research

These libraries were already researched and selected — no re-evaluation needed:

- `@serwist/next` + `serwist` — PWA service worker
- `leaflet.offline` — offline map tile caching
- `react-speech-recognition` — voice debrief recording (already built)
- `ai` + `@ai-sdk/anthropic` — streaming chat (already built)
- `sqlite-vec` + `better-sqlite3` — RAG vector search (already built)
- `@anthropic-ai/sdk` — Claude API for all AI generation

---

## Sources

- [Next.js official PWA guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — confirms Serwist, confirms webpack requirement, confirms manifest.ts pattern (updated 2026-03-31)
- [Serwist @serwist/next on npm](https://www.npmjs.com/package/@serwist/next) — v9.5.7, published ~March 2026
- [Zod v4 versioning](https://zod.dev/v4/versioning) — confirms `"zod"` root now exports v4, `"zod/v4"` subpath deprecated
- [Zod 4.3.6 on npm](https://www.npmjs.com/package/zod) — latest stable, published ~March 2026
- [InfoQ: Zod v4 stable release](https://www.infoq.com/news/2025/08/zod-v4-available/) — August 2025 stable release confirmation
- [nodemailer 8.0.4 on npm](https://www.npmjs.com/package/nodemailer) — latest stable, published April 2026
- [@types/nodemailer 7.0.11](https://www.npmjs.com/package/@types/nodemailer) — TS types, published February 2026
- [idb 8.0.3 — Jake Archibald, GitHub](https://github.com/jakearchibald/idb) — IndexedDB wrapper, MDN-referenced
- [Building offline-first PWA with Next.js + IndexedDB (2026)](https://oluwadaprof.medium.com/building-an-offline-first-pwa-notes-app-with-next-js-indexeddb-and-supabase-f861aa3a06f9) — idb usage pattern confirmation
- [Mailtrap Next.js email guide 2026](https://mailtrap.io/blog/nextjs-send-email/) — nodemailer + Gmail App Password pattern for personal-use apps

---

*Stack research for: Outland OS v1.1 Close the Loop (new additions only)*
*Researched: 2026-04-01*
