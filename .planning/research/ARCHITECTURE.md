# Architecture Research

**Domain:** Personal camping assistant — v1.1 Close the Loop (PWA/offline, learning loop, trip execution)
**Researched:** 2026-04-01
**Confidence:** HIGH for PWA/offline patterns; HIGH for learning loop (existing voice debrief infrastructure); HIGH for trip sequencer (existing prep infrastructure)

---

## Existing Architecture Baseline

Before examining new integration points, the existing system is:

```
Browser (Client)
  └── Server Components (data fetch via Promise.all)
        └── Client Components (useState, useCallback, useEffect)
              └── REST API Routes (try/catch, NextResponse.json)
                    └── Prisma ORM → SQLite file
                    └── External Services (Claude API, Open-Meteo, OpenAI Whisper)

lib/
  ├── claude.ts        — packing list, meal plan generation
  ├── weather.ts       — Open-Meteo wrapper
  ├── rag/             — FTS5 + sqlite-vec hybrid search
  ├── agent/           — Claude tool-use orchestrator + SSE streaming
  └── voice/           — Whisper transcription + insight extraction
```

All four v1.1 feature areas integrate with this baseline without disrupting it. Each adds a layer alongside existing layers.

---

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Browser (Client)                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  ┌────────────┐  │
│  │TripsClient│  │TripPrep  │  │VoiceDebrief  │  │OfflineBar  │  │
│  │(enhanced)│  │(+Sequencer│  │(+Learning    │  │(new)       │  │
│  │          │  │+Safety   │  │ Loop)        │  │            │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  └──────┬─────┘  │
│       │              │               │                  │        │
├───────┴──────────────┴───────────────┴──────────────────┴────────┤
│                    Service Worker (public/sw.js)                  │
│  App Shell → stale-while-revalidate                              │
│  Trip API  → network-first, offline fallback                     │
│  Map tiles → cache-first, 50MB quota                             │
├─────────────────────────────────────────────────────────────────┤
│                      Next.js API Routes                          │
│  /api/trips/[id]/cache       (new — "Leaving Now" snapshot)      │
│  /api/trips/[id]/sequencer   (new — day-of checklist)            │
│  /api/trips/[id]/safety-email (new — departure float plan)       │
│  /api/voice/apply (existing) + /api/voice/extract (existing)     │
│  /api/gear/usage             (new — mark used/unused post-trip)  │
└─────────────────────────────────────────────────────────────────┘
│
┌─────────────────────────────────────────────────────────────────┐
│                    Prisma ORM + SQLite                           │
│  Trip (enhanced: cachedAt, cacheData fields)                     │
│  PackingItem (enhanced: usedOnTrip, notUsed, forgotNeeded)       │
│  GearItem (existing: notes field — debrief appends here)         │
│  Location (existing: rating — debrief can update)                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility | Status |
|-----------|---------------|--------|
| `public/sw.js` | Intercept fetches, cache app shell + API + tiles | New |
| `app/manifest.ts` | PWA install metadata | New |
| `lib/offline/useOnlineStatus.ts` | Hook: window online/offline events | New |
| `lib/offline/tripCache.ts` | Snapshot trip data to IndexedDB on "Leaving Now" | New |
| `components/OfflineBar.tsx` | Banner shown when `useOnlineStatus` returns false | New |
| `app/api/trips/[id]/cache/route.ts` | Server: assemble + return full trip snapshot JSON | New |
| `components/TripSequencer.tsx` | Day-of departure checklist ordered by time | New |
| `app/api/trips/[id]/sequencer/route.ts` | Server: build ordered checklist from packing + meals + power | New |
| `app/api/trips/[id]/safety-email/route.ts` | Server: format + send trip summary email via Nodemailer | New |
| `components/InsightsReviewSheet.tsx` | Existing — review voice debrief before applying | Exists |
| `components/VoiceDebriefButton.tsx` | Existing — trigger debrief modal | Exists |
| `app/api/voice/apply/route.ts` | Existing — write gear notes, location rating, trip notes | Exists |
| `components/GearUsageTracker.tsx` | Post-trip: mark each packing item used/unused/forgot | New |
| `app/api/gear/usage/route.ts` | Server: batch update PackingItem usedOnTrip/notUsed flags | New |

---

## Recommended Project Structure (New Files Only)

```
public/
├── sw.js                        # Manual service worker (no Serwist needed)
├── icon-192x192.png             # PWA icons
└── icon-512x512.png

app/
├── manifest.ts                  # Next.js built-in PWA manifest
├── api/trips/[id]/
│   ├── cache/route.ts           # "Leaving Now" data snapshot
│   ├── sequencer/route.ts       # Day-of departure checklist
│   └── safety-email/route.ts    # Departure float plan email
├── api/gear/
│   └── usage/route.ts           # Batch gear usage flags

lib/
└── offline/
    ├── useOnlineStatus.ts       # Hook: navigator.onLine + events
    └── tripCache.ts             # IndexedDB get/set for trip snapshot

components/
├── OfflineBar.tsx               # "You're offline — trip data cached" banner
├── TripSequencer.tsx            # Departure checklist component
└── GearUsageTracker.tsx         # Post-trip used/unused tracker
```

### Structure Rationale

- **`public/sw.js`:** Service workers must be at the root origin to intercept all requests. A manual file avoids Serwist's Webpack requirement and is sufficient for a single-user app.
- **`lib/offline/`:** Keeps IndexedDB logic separate from components. `tripCache.ts` is the only place that reads/writes the offline snapshot — prevents scattered IndexedDB calls.
- **`app/api/trips/[id]/`:** Groups all trip-specific operations together. The cache route is a read-only data aggregator; the sequencer and safety-email routes compute from existing data.

---

## Architectural Patterns

### Pattern 1: "Leaving Now" Snapshot

**What:** When Will taps "Leaving Now", the client calls `/api/trips/[id]/cache` which assembles all trip data into one JSON payload: packing list, meal plan, weather forecast, location details, map center point. The client writes this to IndexedDB. The service worker serves this data when offline.

**When to use:** At the departure trigger point. Not a background sync — it is an explicit user action.

**Trade-offs:** Simple to implement, no continuous sync complexity. Snapshot is stale-as-of-departure (no live updates). Acceptable for trip use: weather was checked at departure, packing list finalized.

**Example:**
```typescript
// lib/offline/tripCache.ts
const DB_NAME = 'outland-offline'
const STORE = 'trip-snapshots'

export async function saveTripSnapshot(tripId: string, data: TripSnapshot) {
  const db = await openDB(DB_NAME, 1, {
    upgrade(db) { db.createObjectStore(STORE) }
  })
  await db.put(STORE, data, tripId)
}

export async function getTripSnapshot(tripId: string): Promise<TripSnapshot | undefined> {
  const db = await openDB(DB_NAME, 1)
  return db.get(STORE, tripId)
}
```

### Pattern 2: Network-First API Caching

**What:** The service worker intercepts `fetch` calls to `/api/*` routes. It tries the network first; on failure (offline), it returns the last cached response for that URL. Non-API fetches (app shell, static assets) use stale-while-revalidate.

**When to use:** All REST API calls during trips. This handles incidental offline reads (checking packing list, viewing weather last-fetched, reading meal plan).

**Trade-offs:** Dead-simple. No sync queue needed for read-heavy use (which trip execution is). Write operations (checking off packing items) still require connectivity OR a separate offline queue. For v1.1, packing item checks can fail gracefully with a "saved when back online" toast — full offline writes are a v2 concern.

**Example:**
```javascript
// public/sw.js (simplified)
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url)

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone()
          caches.open('api-v1').then(cache => cache.put(event.request, clone))
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // App shell: stale-while-revalidate
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  )
})
```

### Pattern 3: Post-Trip Learning Loop

**What:** After a trip completes, the system offers two parallel flows: (1) Gear Usage Tracker — Will marks each packing item as used/not used/forgot; (2) Voice Debrief — existing `InsightsReviewSheet` already handles gear notes, location ratings, trip notes. The learning loop is not a new architectural layer — it is a post-trip state transition that writes back to existing models.

**When to use:** Trip status transitions from "in progress" to "completed" (based on `endDate` passing). Surface both flows on the trip detail page when `now > endDate`.

**Trade-offs:** Reuses existing `InsightsReviewSheet` and `voice/apply` route, which already handle gear/location/trip note updates. The only new piece is the gear usage flag batch update and the "packed but didn't use" intelligence query at packing list generation time.

**Data model additions needed:**
```prisma
// PackingItem additions (new migration)
model PackingItem {
  // ... existing fields
  usedOnTrip   Boolean?   // null=not tracked, true=used, false=not used
  forgotNeeded Boolean?   // true=forgot this + needed it
  reviewedAt   DateTime?  // when Will reviewed this trip's gear
}
```

**Closed-loop packing improvement:**

The existing `generatePackingList` in `lib/claude.ts` already takes gear inventory as context. After the learning loop adds usage data, the next packing list generation can include a history section in the prompt:

```
GEAR HISTORY (from past trips):
- Headlamp: used 4/4 trips — always pack
- Camp chair (heavier): used 1/4 trips — pack only for 2+ nights
- Rain jacket: not packed but needed 1 trip (rainy weekend trip)
```

This requires a `getGearUsageHistory()` query that aggregates PackingItem usage flags across trips, grouped by gearId.

---

## Data Flow

### Request Flow: "Leaving Now"

```
Will taps "Leaving Now" button
    ↓
TripPrepClient → POST /api/trips/[id]/cache
    ↓
Server: assembles TripSnapshot {
  trip, location, weather, packingItems, mealPlan, photos with GPS
}
    ↓
Client: saveTripSnapshot(id, data) → IndexedDB
    ↓
SW: caches all trip API routes for offline
    ↓
Confirmation: "Trip data saved. You're ready to go."
```

### Request Flow: Post-Trip Learning Loop

```
Trip endDate passes (or Will taps "Trip Complete")
    ↓
TripsClient shows "Review this trip" prompt
    ↓
Path A: GearUsageTracker
  Will checks off used/unused/forgot items
  → POST /api/gear/usage { tripId, items: [{gearId, usedOnTrip, forgotNeeded}] }
  → Server: batch update PackingItem rows
  → Next packing list for similar trip includes usage history

Path B: VoiceDebrief (existing)
  Will records voice notes
  → Whisper transcription → Claude insight extraction
  → InsightsReviewSheet UI
  → POST /api/voice/apply → gear notes, location rating, trip notes updated
```

### Request Flow: Day-Of Sequencer

```
Will opens trip on departure day
    ↓
TripPrepClient shows "Day Of" tab (visible when now >= startDate - 1 day)
    ↓
GET /api/trips/[id]/sequencer
    ↓
Server builds time-ordered checklist:
  1. Charge gear with batteries (hasBattery=true from GearItem)
  2. Load packing items by category (shelter/sleep/cook → load in reverse)
  3. Pre-trip meal prep tasks (from mealPlan.prepTimeline)
  4. Safety email trigger
  5. "Leaving Now" button (triggers cache snapshot)
    ↓
TripSequencer component: displays ordered cards, checkable steps
```

### State Management

```
Online state:         useOnlineStatus hook (window events) → OfflineBar
Trip snapshot state:  IndexedDB via tripCache.ts (persists across sessions)
Sequencer state:      useState in TripSequencer (ephemeral — resets per departure)
Gear usage state:     useState in GearUsageTracker → batched POST on "Save"
```

---

## Integration Points

### Existing System → New Features

| Existing Component | How v1.1 Integrates |
|-------------------|---------------------|
| `TripPrepClient.tsx` | Add "Day Of" tab that renders `TripSequencer`; add "Leaving Now" button that calls cache route |
| `TripsClient.tsx` | Add "Review trip" state when `now > endDate`; renders `GearUsageTracker` + debrief prompt |
| `lib/claude.ts generatePackingList()` | Add `gearUsageHistory` param; inject packed-but-unused history into prompt |
| `app/api/trips/[id]/prep/route.ts` | Already returns packing + weather — this feeds the cache snapshot route |
| `PackingItem` model | Add `usedOnTrip`, `forgotNeeded`, `reviewedAt` fields (new migration) |
| `InsightsReviewSheet.tsx` | No changes needed — existing component handles voice debrief review |
| `app/api/voice/apply/route.ts` | No changes needed — already writes back to gear, location, trip |

### New External Dependencies

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Nodemailer (npm) | Server-side: `lib/email.ts` wraps nodemailer; safety-email route calls it | Needs `EMAIL_FROM`, `EMAIL_TO`, `SMTP_*` env vars |
| IndexedDB (native) | Client-side: `lib/offline/tripCache.ts` uses `idb` npm wrapper | `idb` is 1KB; simpler than raw IndexedDB API |
| Service Worker API (native) | `public/sw.js` registered in `AppShell.tsx` useEffect | Register only in production; skip in dev |
| Web App Manifest | `app/manifest.ts` (Next.js built-in) | Zero dependencies |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| `TripPrepClient` ↔ cache route | HTTP POST → JSON snapshot | Snapshot is read-only; no writes from offline client |
| `TripSequencer` ↔ sequencer route | HTTP GET → ordered checklist | Stateless — regenerates each visit |
| `GearUsageTracker` ↔ gear usage route | HTTP POST → batch update | Idempotent: uses upsert on (tripId, gearId) |
| `AppShell` ↔ service worker | `navigator.serviceWorker.register` | SW registered once on app load; `skipWaiting` + `clients.claim` for immediate activation |

---

## Anti-Patterns

### Anti-Pattern 1: Serwist/next-pwa for a simple offline requirement

**What people do:** Install `@serwist/next` or `next-pwa`, add webpack plugin config, write complex SW rules.

**Why it's wrong:** Serwist requires Webpack (not Turbopack). Next.js 16 defaults to Turbopack for dev. Adds build complexity and a large dependency for what is ultimately ~80 lines of custom service worker code.

**Do this instead:** Write a manual `public/sw.js`. Register it in `AppShell.tsx`. Cache the routes you actually need (trip API, app shell). Takes 2 hours to build, zero build tool friction.

### Anti-Pattern 2: Full offline-write sync queue for v1.1

**What people do:** Build IndexedDB mutation queue + Background Sync API + server-side replay logic for all write operations.

**Why it's wrong:** Background Sync API has limited iOS Safari support. A sync queue requires idempotency keys on every mutation model, conflict resolution logic, and debugging complexity that is completely disproportionate for a single-user app where "offline writes" means checking off packing items at a campsite.

**Do this instead:** For v1.1, offline writes fail gracefully with a "Syncing when back online" toast. The "Leaving Now" snapshot covers all reads. True offline writes are a v2 concern if they prove to be a real gap during actual trip use.

### Anti-Pattern 3: Re-generating the packing list as the learning loop output

**What people do:** Run Claude on trip completion to "improve" the packing list and overwrite it.

**Why it's wrong:** Overwrites Will's manual packing decisions. If he deliberately excluded an item, the AI shouldn't add it back.

**Do this instead:** Keep usage history as input to the next *new* packing list generation. The existing packing list stays untouched. When generating a new list for a similar trip, inject the history as a context section (packed/used, packed/unused, forgot/needed). Claude uses it as signal, not gospel.

### Anti-Pattern 4: Service worker in development

**What people do:** Register the SW unconditionally in `AppShell.tsx`.

**Why it's wrong:** SW caches API responses. Dev changes to data or routes don't appear. Hours of debugging "why isn't my change working" that turns out to be a stale cached response.

**Do this instead:**
```typescript
// AppShell.tsx
useEffect(() => {
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
  }
}, [])
```

### Anti-Pattern 5: Safety email via a third-party email SaaS

**What people do:** Sign up for SendGrid or Resend, add API keys, handle webhooks.

**Why it's wrong:** Overkill for one email per trip to one recipient. Will doesn't need delivery tracking, templates, or a dashboard.

**Do this instead:** Nodemailer with Will's Gmail via App Password (SMTP). One npm package, one `.env` entry, done. If Gmail SMTP proves unreliable, swap to Resend's free tier (100/day) later — same interface, same code.

---

## Build Order (v1.1 Dependency Graph)

Build in this sequence to avoid rework:

```
Block 1 — Stabilization (no new architecture, just fixes):
  1. Fix critical bugs (JSON.parse, upsert, CRUD gaps)
  2. Add Zod validation (parseClaudeJSON utility)
  3. Persist packing list + meal plan results to DB

Block 2 — Schema additions (run migration once, unblocks everything):
  4. Add PackingItem: usedOnTrip, forgotNeeded, reviewedAt
  (No Trip schema changes needed — TripSnapshot stored in IndexedDB, not SQLite)

Block 3 — Day-Of features (no offline dependency):
  5. Trip Sequencer route + TripSequencer component
     - GET /api/trips/[id]/sequencer
     - Reads existing packing + meals + gear.hasBattery
     - Adds "Day Of" tab to TripPrepClient
  6. Safety email route + UI trigger
     - POST /api/trips/[id]/safety-email
     - Nodemailer + lib/email.ts
     - "Send Float Plan" button in sequencer

Block 4 — PWA / Offline (can be parallel with Block 3):
  7. app/manifest.ts + PWA icons
  8. public/sw.js (app shell + network-first API caching)
  9. AppShell.tsx SW registration (production only)
  10. lib/offline/useOnlineStatus.ts + OfflineBar component
  11. lib/offline/tripCache.ts (IndexedDB snapshot)
  12. /api/trips/[id]/cache route + "Leaving Now" button in TripPrepClient

Block 5 — Learning Loop (depends on Block 2 schema):
  13. GearUsageTracker component
  14. /api/gear/usage route (batch upsert)
  15. Post-trip "Review" state in TripsClient
  16. Inject usage history into generatePackingList() in lib/claude.ts
```

**Key dependency rule:** Block 5 requires Block 2's schema migration. Everything else is independent — Blocks 3 and 4 can be built in any order after Block 1.

---

## Scalability Notes

This is a single-user app. Scalability means "works well across years of data."

| Concern | v1.1 approach | If it grows |
|---------|--------------|-------------|
| IndexedDB snapshot size | One snapshot per active trip, ~50KB JSON | Prune snapshots older than 30 days |
| Gear usage history query | Simple JOIN on PackingItem + GearItem | Stays fast; add index on (gearId, reviewedAt) if > 500 trips |
| Service worker cache | App shell + last 50 API responses | Set `maxEntries: 50` in SW fetch handler |
| Safety email | Nodemailer SMTP, one email per trip | No scaling concern for personal use |
| Packing list with history context | ~500 extra tokens in Claude prompt | No cost concern for personal use |

---

## Sources

- [Next.js PWA Official Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — HIGH confidence, official docs, updated 2026-03-31
- [LogRocket: Next.js 16 PWA with offline support](https://blog.logrocket.com/nextjs-16-pwa-offline-support/) — MEDIUM confidence (editorial, covers Serwist + idb approach)
- [Next.js: Offline-First with App Router discussion](https://github.com/vercel/next.js/discussions/82498) — MEDIUM confidence (community thread, confirms patterns)
- [idb library](https://dexie.org/) — HIGH confidence (widely used, minimal API surface)
- [Workbox caching strategies (web.dev)](https://web.dev/learn/pwa/workbox) — HIGH confidence, Google reference

---

*Architecture research for: Outland OS v1.1 Close the Loop*
*Researched: 2026-04-01*
