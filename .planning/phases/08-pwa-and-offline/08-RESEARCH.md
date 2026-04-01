# Phase 8: PWA and Offline — Research

**Researched:** 2026-04-01
**Domain:** Progressive Web Apps, Service Workers, IndexedDB, Leaflet map tile caching
**Confidence:** HIGH (core PWA stack), MEDIUM (map tile approach — see OSM policy issue below)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Button placement is Claude's discretion — use UI best practices (departure page, prep page, or both)
- **D-02:** No confirmation dialog on "Leaving Now" tap. Start caching immediately.
- **D-03:** Full-screen progress overlay showing what's being cached: checkmarks for each data type.
- **D-04:** Cache scope is "trip essentials" only: weather snapshot, packing list, meal plan, departure checklist, emergency contact info, spot coordinates + notes, vehicle info. No full gear inventory, chat history, or photos.
- **D-05:** Multiple trips can be cached simultaneously.
- **D-06:** Trip-focused with basic nav — other pages still render with whatever browser cache has.
- **D-07:** Persistent slim banner when offline: "Offline — snapshot from 2h ago" with relative time. Always visible, reappears on page nav.
- **D-08:** AI-dependent features (chat, generate checklist, etc.) offline handling is Claude's discretion per component.
- **D-09:** IndexedDB for offline data storage (not Cache API). Structured JSON, survives service worker updates.
- **D-10:** Auto-refresh silently when connectivity returns.
- **D-11:** No post-trip cache cleanup for now.
- **D-12:** Cache map tiles at "Leaving Now" time, not during trip planning.
- **D-13:** Cache the visible viewport plus 2 zoom levels in and 2 out (~200-800 tiles).
- **D-14:** Cache tiles around saved locations within ~20 miles of the trip destination.
- **D-15:** Missing/uncached tiles show as gray placeholders with "Cached area only — connect for more."
- **D-16:** Custom dismissible install banner on first visit with iOS and Android paths.
- **D-17:** Standalone PWA experience matching stone/amber design system.
- **D-18:** Generate placeholder app icon using Outland OS colors.
- **D-19:** Claude's discretion on offline write strategy (queue-and-sync or read-only).

### Claude's Discretion
- Button placement for "Leaving Now" (D-01)
- Standalone mode styling (D-17)
- AI feature behavior when offline (D-08)
- Offline write strategy for check-offs (D-19)
- Service worker strategy and tooling (next-pwa, Workbox, hand-rolled)

### Deferred Ideas (OUT OF SCOPE)
- Post-trip cache cleanup / storage management
- Full region map tile pre-download
- Offline chat with cached knowledge base
- Background sync for offline writes (if queue-and-sync chosen, keep simple for v1.1)
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OFF-01 | User can install the app to their phone's home screen as a PWA | `app/manifest.ts` + icons in `public/` + service worker registration; requires HTTPS; iOS needs custom install banner with "Add to Home Screen" instructions |
| OFF-02 | User can open the app offline and see the app shell (navigation, cached pages) | Service worker with app shell caching strategy (cache-first for static assets); `public/sw.js` registered in root layout |
| OFF-03 | User can tap "Leaving Now" and have all trip data cached for offline use | Client-side fetch of all trip endpoints → `idb-keyval` writes to IndexedDB; progress overlay shows sequential steps |
| OFF-04 | User can view cached map tiles for trip area while offline | **Critical: OSM bulk pre-fetching is prohibited.** Must use service worker Cache API to intercept tiles as they load normally, or switch tile provider. See OSM Policy section below. |
</phase_requirements>

---

## Summary

Phase 8 adds PWA installation support, app-shell offline caching, a "Leaving Now" data snapshot, and map tile offline access.

The core PWA stack (manifest + service worker + install prompt) is well-supported in Next.js 16 App Router without third-party plugins. The official Next.js docs provide a clear pattern: `app/manifest.ts` for the web app manifest, `public/sw.js` as a hand-authored service worker registered from the root layout, and `next.config.ts` headers to set correct Cache-Control on the service worker file.

The IndexedDB layer for offline data is cleanly handled by `idb-keyval` (295 bytes, no schema needed). The "Leaving Now" flow fetches existing API endpoints, serializes the JSON responses, and stores them keyed by trip ID. No new API routes are needed for the snapshot itself — reads are client-side only.

**Critical finding on map tiles:** The OSM tile usage policy explicitly prohibits bulk pre-fetching and offline downloading. The "Leaving Now" decision (D-12 through D-15) specifying pre-caching of viewport + 2 zoom levels is in direct conflict with OSM's ToS. The plan must choose between: (a) service worker intercept-only caching (tiles cache passively as the user views them — no proactive download at "Leaving Now"), or (b) switching to a tile provider that permits offline caching. MapTiler's free tier permits personal caching. This decision must be made before planning the map tile wave.

**Primary recommendation:** Use hand-authored `public/sw.js` (no Serwist/next-pwa) for app shell caching, `idb-keyval` for structured trip data, and service worker intercept-only for map tiles to stay within OSM ToS. Flag the OSM vs. proactive tile cache conflict as a decision point for Will before planning the map tile task.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — service worker file is plain JavaScript (service worker scope does not support TypeScript directly); keep it vanilla JS in `public/sw.js`
- No `alert()` — all UI feedback via React state
- All React hooks must have correct, minimal dependency arrays
- API routes must have try-catch with `console.error` + JSON error response
- File size limit: 800 lines max per file — split large service worker or hook files
- Immutable patterns: IndexedDB writes should produce new snapshots, not mutate existing records
- No hardcoded secrets — service worker and manifest contain no credentials

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Web App Manifest (`app/manifest.ts`) | Next.js built-in | Makes app installable | Official Next.js App Router pattern; no extra package |
| `public/sw.js` (hand-authored) | Vanilla JS | App shell caching, tile intercept | Avoids Serwist/Webpack conflict; STATE.md already decided this |
| `idb-keyval` | 6.2.2 | IndexedDB key-value store for trip data | 295B, zero schema, promise-based, handles structured JSON |
| `navigator.onLine` + online/offline events | Browser API | Network status detection | No library needed; standard Web API |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `idb` | latest | IndexedDB with full cursor/index support | If idb-keyval is insufficient (complex queries); leaflet.offline also depends on it |
| `leaflet.offline` | latest | Leaflet tile layer with IndexedDB caching | Only if switching from service worker intercept to explicit tile seeding |
| Storage API (`navigator.storage.persist()`) | Browser API | Request persistent storage mode on iOS | Call at install time to prevent 7-day eviction on iOS Safari |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Hand-authored `public/sw.js` | Serwist / `@serwist/next` | Serwist requires Webpack (`--webpack` flag), adds complexity; STATE.md confirms manual sw.js preferred |
| Hand-authored `public/sw.js` | `next-pwa` (shadowwalker) | next-pwa is unmaintained for App Router; do not use |
| `idb-keyval` | `localforage` | localforage is 7KB vs 295B; overkill for this use case |
| Service worker tile intercept | `leaflet.offline` tile seeding | Seeding violates OSM ToS; intercept-only is policy-safe |

**Installation:**
```bash
npm install idb-keyval
```

---

## Architecture Patterns

### Recommended Project Structure (new files this phase)
```
public/
├── sw.js                    # Hand-authored service worker
├── manifest.json            # OR use app/manifest.ts (Next.js native)
├── icon-192x192.png         # Android install icon
├── icon-512x512.png         # Android maskable icon
└── apple-touch-icon.png     # iOS home screen icon (180x180)

app/
├── manifest.ts              # Next.js native manifest (preferred over public/manifest.json)
└── layout.tsx               # Add SW registration + <link rel="manifest">

lib/
└── offline-storage.ts       # idb-keyval wrapper: get/set/delete trip snapshots

components/
├── OfflineBanner.tsx         # Slim online/offline indicator
├── InstallBanner.tsx         # iOS + Android install prompt
├── CachingProgressOverlay.tsx # "Leaving Now" full-screen progress
└── LeavingNowButton.tsx      # Trigger button (departure page + prep page)
```

### Pattern 1: Next.js App Router Manifest
**What:** `app/manifest.ts` exports a function returning a MetadataRoute.Manifest object. Next.js serves it at `/manifest.webmanifest` automatically.
**When to use:** Always — this is the official App Router pattern.
**Example:**
```typescript
// app/manifest.ts
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Outland OS',
    short_name: 'Outland',
    description: 'Personal camping second brain',
    start_url: '/',
    display: 'standalone',
    background_color: '#0c0a09',
    theme_color: '#d97706',
    orientation: 'portrait',
    icons: [
      { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
```

### Pattern 2: Service Worker Registration
**What:** Register `public/sw.js` from a `useEffect` in the root layout (client component) or a dedicated `ServiceWorkerRegistration` component.
**When to use:** Once, in the root layout.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
useEffect(() => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js', {
      scope: '/',
      updateViaCache: 'none',  // Always fetch fresh sw.js
    })
  }
}, [])
```

### Pattern 3: App Shell Service Worker (Cache First)
**What:** Service worker caches Next.js app shell assets on install; serves cached assets on fetch.
**When to use:** `public/sw.js` install event.
**Example:**
```javascript
// public/sw.js — app shell caching
const CACHE_NAME = 'outland-shell-v1'
const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  )
  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  // Network-first for API calls; cache-first for shell
  if (event.request.url.includes('/api/')) {
    event.respondWith(fetch(event.request).catch(() => new Response('Offline', { status: 503 })))
    return
  }
  event.respondWith(
    caches.match(event.request).then((cached) => cached || fetch(event.request))
  )
})
```

### Pattern 4: IndexedDB Trip Snapshot via idb-keyval
**What:** Serialize trip data from API endpoints into a single JSON blob, stored keyed by trip ID.
**When to use:** "Leaving Now" tap.
**Example:**
```typescript
// lib/offline-storage.ts
import { get, set, del, keys } from 'idb-keyval'

export interface TripSnapshot {
  tripId: string
  cachedAt: string  // ISO timestamp
  weather: unknown
  packingList: unknown
  mealPlan: unknown
  departureChecklist: unknown
  spots: unknown[]
  emergencyInfo: unknown
  vehicleInfo: unknown
}

export async function saveTripSnapshot(snapshot: TripSnapshot): Promise<void> {
  await set(`trip-snapshot:${snapshot.tripId}`, snapshot)
}

export async function getTripSnapshot(tripId: string): Promise<TripSnapshot | undefined> {
  return get(`trip-snapshot:${tripId}`)
}

export async function getCachedTripIds(): Promise<string[]> {
  const allKeys = await keys()
  return (allKeys as string[])
    .filter((k) => k.startsWith('trip-snapshot:'))
    .map((k) => k.replace('trip-snapshot:', ''))
}
```

### Pattern 5: Offline/Online Status Hook
**What:** Custom hook wrapping `navigator.onLine` and `online`/`offline` window events.
**When to use:** `OfflineBanner`, `LeavingNowButton`, disable states for AI features.
**Example:**
```typescript
// lib/use-online-status.ts
import { useState, useEffect } from 'react'

export function useOnlineStatus(): boolean {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    const goOnline = () => setIsOnline(true)
    const goOffline = () => setIsOnline(false)
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  return isOnline
}
```

### Pattern 6: iOS Install Banner (no beforeinstallprompt)
**What:** iOS Safari does not fire `beforeinstallprompt`. Show manual instructions instead.
**When to use:** InstallBanner component, iOS detection path.
**Example:**
```typescript
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
useEffect(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isDismissed = localStorage.getItem('outland_install_dismissed') === 'true'
  setShowInstallBanner(!isStandalone && !isDismissed && isIOS)
}, [])
```

### Anti-Patterns to Avoid
- **Using Serwist with Turbopack:** Serwist requires `--webpack` flag; breaks default `next dev`. Use hand-authored `public/sw.js` instead.
- **Using `next-pwa` (shadowwalker):** Unmaintained for App Router. Do not use.
- **Caching sw.js in the service worker:** The sw.js itself must not be cached; use `updateViaCache: 'none'` on registration and `Cache-Control: no-store` header in next.config.ts.
- **Storing trip data in Cache API:** Decision D-09 requires IndexedDB. Cache API does not survive service worker updates reliably.
- **Proactively fetching OSM tiles for offline use:** Explicitly prohibited by OSM Tile Usage Policy. Will get IP blocked. See OSM Policy section.
- **Calling `navigator.onLine` once without subscribing to events:** `navigator.onLine` is a snapshot; it won't update the UI when connectivity changes.
- **Requesting `navigator.storage.persist()` without checking support:** Gate with `if (navigator.storage && navigator.storage.persist)`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB API | Custom IDB wrapper with open/transaction/objectStore boilerplate | `idb-keyval` | IDB raw API is verbose and error-prone; version upgrade handling, transaction timing, and error propagation are subtle bugs waiting to happen |
| Online/Offline status | Polling `fetch('/api/health')` | `navigator.onLine` + events | Built-in browser API; poll is expensive and unreliable in offline conditions |
| PWA Manifest | Custom `/api/manifest` route | `app/manifest.ts` (Next.js native) | Next.js generates the correct content-type and headers automatically |
| Tile coordinate math | Hand-calculating slippy map tile XYZ from lat/lng | Leaflet's built-in `getTileUrl` + bounds methods | Off-by-one errors in zoom level and tile math are common; Leaflet handles this correctly |

**Key insight:** The IndexedDB raw API looks simple but has version upgrade semantics, cursor management, and transaction scope rules that are extremely easy to get wrong. `idb-keyval` eliminates all of this for the key-value use case this phase requires.

---

## CRITICAL: OSM Tile Usage Policy

**This is a blocking constraint for OFF-04.**

The OpenStreetMap Tile Usage Policy at `operations.osmfoundation.org/policies/tiles/` explicitly states:

> "Offline use is not permitted on tile.openstreetmap.org."
> "Bulk downloading" is defined as "any pre-emptive fetching of tiles other than those a user is actively viewing."

**D-12 through D-15 describe proactive tile pre-fetching at "Leaving Now" time — this is exactly what OSM prohibits.**

### Options for Plan

**Option A: Service Worker Intercept Only (Policy-Safe, Limited Coverage)**
- Service worker caches tiles passively as the user views the map
- No proactive download at "Leaving Now"
- Tiles cached = exactly what the user has already seen
- Tile count at "Leaving Now": whatever was visited organically
- Pro: OSM-compliant, no new dependency, tiles persist from normal app use
- Con: User may not have panned/zoomed to the exact area they need offline

**Option B: Switch Tile Provider (Policy-Safe, Proactive Caching Allowed)**
- MapTiler free tier: permits "temporary personal cache for a single end-user"
- MapTiler free tier: 100,000 tile requests/month — adequate for personal use
- Requires `NEXT_PUBLIC_MAPTILER_KEY` env var
- Pro: Allows proactive caching at "Leaving Now" without policy violation
- Con: Adds env var dependency, tile style may differ from current OSM

**Option C: Silently Omit OSM Pre-fetch, Show Honest UI**
- Keep OSM tiles, keep service worker intercept
- Change "Leaving Now" progress step label: "Map tiles (cached from your recent views)"
- Remove the D-13 "2 zoom levels in and out" specification
- Pro: No provider switch needed
- Con: May disappoint if user hasn't viewed the right area

**Recommendation:** Option A (service worker intercept only) with honest UI copy, and note Option B as the upgrade path if Will wants proactive caching. This avoids adding a paid API dependency to a personal project while staying within policy. The plan should make this explicit in the map tile wave.

---

## Common Pitfalls

### Pitfall 1: Service Worker Cached Indefinitely
**What goes wrong:** If `sw.js` itself gets cached (via browser or Cache API), users never receive service worker updates.
**Why it happens:** Forgetting to set correct cache headers on the sw.js file.
**How to avoid:** Add to `next.config.ts` headers:
```typescript
{ source: '/sw.js', headers: [{ key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' }] }
```
Also use `updateViaCache: 'none'` in the `register()` call.
**Warning signs:** Users report stale UI that doesn't update after deploys.

### Pitfall 2: iOS 7-Day Storage Eviction
**What goes wrong:** iOS Safari clears IndexedDB and all origin storage if the site is not visited within 7 days of browser use.
**Why it happens:** Safari's aggressive storage eviction policy for non-installed origins.
**How to avoid:** Two mitigations:
1. Call `navigator.storage.persist()` at app load — Safari 17+ grants this for Home Screen web apps automatically.
2. Home Screen installation (PWA standalone mode) exempts the app from the 7-day eviction timer.
**Warning signs:** Users report their offline snapshot is gone after not using the app for a week.

### Pitfall 3: `navigator.onLine` Returns True Even When Offline
**What goes wrong:** On some networks (captive portals, DNS failures), `navigator.onLine` returns `true` but fetch calls fail.
**Why it happens:** `navigator.onLine` only reflects whether a network interface exists, not whether requests succeed.
**How to avoid:** This is acceptable for this use case — the offline banner may not show, but cached data still loads. Do not replace with a polling fetch (that breaks offline scenarios). For the "Leaving Now" step, catch individual fetch errors and mark steps failed without blocking the whole flow.

### Pitfall 4: Service Worker Scope Too Narrow
**What goes wrong:** Service worker only intercepts requests on a subset of routes.
**Why it happens:** Registering with `scope: '/trips/'` instead of `scope: '/'`.
**How to avoid:** Always register with `scope: '/'` and serve `sw.js` from the `public/` root.

### Pitfall 5: Multiple idb-keyval Stores Conflicting
**What goes wrong:** Two different parts of the app open different stores with the same name, causing transaction conflicts.
**Why it happens:** `idb-keyval` uses a default store; custom stores need explicit `createStore()` calls.
**How to avoid:** Define all stores in `lib/offline-storage.ts` with explicit `createStore()` calls. Export named store instances. Never use the default store if you have multiple stores.

### Pitfall 6: PWA Installability Requires HTTPS
**What goes wrong:** Install prompt never appears; manifest works but PWA badge doesn't show.
**Why it happens:** Browser requires HTTPS for PWA installability (except localhost).
**How to avoid:** Use `next dev --experimental-https` for local testing of install flows. Production deploys on Vercel are always HTTPS.

### Pitfall 7: iOS `beforeinstallprompt` Never Fires
**What goes wrong:** Android-style install prompt code runs on iOS but the event never fires.
**Why it happens:** iOS Safari does not support `beforeinstallprompt` — this is a known permanent limitation.
**How to avoid:** Detect iOS with `navigator.userAgent` and show manual "Add to Home Screen" instructions instead of trying to intercept an install prompt.

### Pitfall 8: Leaflet Map Tiles Have CORS Issues When Cached
**What goes wrong:** Tile images load from OSM with CORS headers that prevent the service worker from caching them.
**Why it happens:** OSM tiles may return `Access-Control-Allow-Origin: *` but some configurations strip it, causing opaque responses in the service worker cache.
**How to avoid:** Use `{crossOrigin: 'anonymous'}` in the Leaflet tile layer config. In the service worker, handle opaque responses gracefully (they can be stored but cannot be inspected). Test tile caching specifically in a service worker devtools panel.

---

## Code Examples

### Service Worker: sw.js Headers in next.config.ts
```typescript
// next.config.ts
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
          { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        ],
      },
    ]
  },
}
```

### iOS Install Detection Pattern
```typescript
// components/InstallBanner.tsx
// Source: https://nextjs.org/docs/app/guides/progressive-web-apps + MDN
useEffect(() => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  const isDismissed = localStorage.getItem('outland_install_dismissed') === 'true'

  setIsIOS(isIOS)
  setIsStandalone(isStandalone)
  setIsDismissed(isDismissed)
}, [])

// Android: capture beforeinstallprompt
useEffect(() => {
  const handler = (e: Event) => {
    e.preventDefault()
    setInstallPromptEvent(e as BeforeInstallPromptEvent)
  }
  window.addEventListener('beforeinstallprompt', handler)
  return () => window.removeEventListener('beforeinstallprompt', handler)
}, [])
```

### "Leaving Now" Sequential Cache Steps
```typescript
// lib/cache-trip.ts — sequential caching with per-step progress callback
export type CacheStep = 'weather' | 'packingList' | 'mealPlan' | 'checklist' | 'emergency' | 'spots' | 'tiles'
export type StepStatus = 'pending' | 'loading' | 'done' | 'error'

export async function cacheTripData(
  tripId: string,
  onStepUpdate: (step: CacheStep, status: StepStatus) => void
): Promise<void> {
  const steps: CacheStep[] = ['weather', 'packingList', 'mealPlan', 'checklist', 'emergency', 'spots', 'tiles']
  const snapshot: Partial<TripSnapshot> = { tripId, cachedAt: new Date().toISOString() }

  for (const step of steps) {
    onStepUpdate(step, 'loading')
    try {
      snapshot[step] = await fetchStepData(tripId, step)
      onStepUpdate(step, 'done')
    } catch {
      onStepUpdate(step, 'error')
      // Do not throw — continue to next step
    }
  }

  await saveTripSnapshot(snapshot as TripSnapshot)
}
```

### Requesting Persistent Storage (iOS eviction prevention)
```typescript
// Call once at app startup in root layout or ServiceWorkerRegistration component
async function requestPersistentStorage(): Promise<void> {
  if (navigator.storage && navigator.storage.persist) {
    const granted = await navigator.storage.persist()
    // granted = true means Safari won't evict this origin's storage
    // Home Screen PWAs get this automatically in Safari 17+
    console.error('Persistent storage granted:', granted)
  }
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next-pwa` (shadowwalker) | Hand-authored `public/sw.js` + `app/manifest.ts` | Next.js 14+ App Router | next-pwa doesn't support App Router; official docs now recommend manual SW |
| Serwist with Webpack | Serwist is still an option but requires `--webpack` | 2024 | Turbopack (default in Next.js 16) incompatible with Serwist without flag |
| localStorage for offline data | IndexedDB via `idb-keyval` | Ongoing | localStorage is synchronous/blocking, limited to 5MB, only stores strings |
| PouchDB for tile caching | `leaflet.offline` (uses `idb`) | 2022+ | PouchDB is ~70KB; `leaflet.offline` uses the lighter `idb` library |
| OSM tiles (offline) | Must use compliant provider or intercept-only | OSM policy in force | OSM explicitly bans bulk pre-fetching; projects using it get IP blocked |

**Deprecated/outdated:**
- `next-pwa` (shadowwalker/next-pwa): Not maintained for App Router. Do not use.
- `workbox-webpack-plugin` directly: Replaced by Serwist for Next.js, but Serwist itself conflicts with Turbopack.

---

## Environment Availability

Step 2.6: SKIPPED for most dependencies (code-only PWA additions). One relevant check:

| Dependency | Required By | Available | Notes |
|------------|------------|-----------|-------|
| HTTPS in dev | Install prompt testing | Available via `next dev --experimental-https` | Must use this flag to test PWA install locally |
| `idb-keyval` npm package | Trip snapshot storage | Not yet installed | `npm install idb-keyval` required |
| App icons (PNG) | OFF-01 installability | Not yet in `public/` | Must generate 192×192, 512×512, 180×180 PNG icons |

**Missing with no fallback:**
- App icons must exist before the PWA is installable (browser requires valid icon in manifest)

**Missing with fallback:**
- HTTPS in dev: `localhost` counts as a secure context for service worker registration (install prompt still won't fire on localhost, but SW registration works)

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | None installed — Vitest recommended |
| Config file | None — Wave 0 must create `vitest.config.ts` |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OFF-01 | manifest.ts returns correct shape | unit | `npx vitest run lib/__tests__/manifest.test.ts` | No — Wave 0 |
| OFF-01 | InstallBanner shows on iOS, hides when standalone | unit | `npx vitest run components/__tests__/InstallBanner.test.tsx` | No — Wave 0 |
| OFF-02 | useOnlineStatus returns false when offline event fires | unit | `npx vitest run lib/__tests__/use-online-status.test.ts` | No — Wave 0 |
| OFF-02 | OfflineBanner renders with correct relative time | unit | `npx vitest run components/__tests__/OfflineBanner.test.tsx` | No — Wave 0 |
| OFF-03 | saveTripSnapshot / getTripSnapshot roundtrip | unit | `npx vitest run lib/__tests__/offline-storage.test.ts` | No — Wave 0 |
| OFF-03 | cacheTripData calls onStepUpdate for each step | unit | `npx vitest run lib/__tests__/cache-trip.test.ts` | No — Wave 0 |
| OFF-04 | Service worker: tile fetch intercepted and stored | manual smoke test | Browser DevTools → Application → Cache Storage | N/A |

**Note on OFF-04:** Service worker behavior cannot be easily unit-tested. Browser DevTools inspection is the validation mechanism. Document the inspection steps in the plan.

### Sampling Rate
- **Per task commit:** `npx vitest run` (if test files exist)
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `vitest.config.ts` — framework configuration
- [ ] `lib/__tests__/offline-storage.test.ts` — covers OFF-03
- [ ] `lib/__tests__/cache-trip.test.ts` — covers OFF-03 step callbacks
- [ ] `lib/__tests__/use-online-status.test.ts` — covers OFF-02
- [ ] `components/__tests__/OfflineBanner.test.tsx` — covers OFF-02 banner
- [ ] `components/__tests__/InstallBanner.test.tsx` — covers OFF-01 banner logic
- [ ] Framework install: `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom`

---

## Open Questions

1. **OSM Tile Pre-fetching Policy Conflict**
   - What we know: OSM explicitly prohibits bulk pre-fetching; D-12 through D-15 specify proactive tile caching
   - What's unclear: Will's preference — accept passive intercept-only caching, or switch to MapTiler free tier?
   - Recommendation: Present both options in the plan intro. Default to Option A (intercept-only, OSM-compliant) unless Will confirms willingness to add MapTiler API key.

2. **`idb-keyval` Version**
   - What we know: Version 6.2.2 is the latest, published ~10 months ago, used by 875+ projects
   - What's unclear: Cannot verify exact version from registry without npm access
   - Recommendation: Run `npm view idb-keyval version` at implementation time before pinning

3. **App Shell Route Coverage**
   - What we know: Pages to cache: `/`, `/gear`, `/trips`, `/spots`, `/vehicle`, `/settings`, `/trips/[id]/prep`, `/trips/[id]/depart`
   - What's unclear: Next.js App Router serves these as RSC payloads and static HTML — the service worker must cache the HTML responses, not just the JS chunks
   - Recommendation: Test app shell caching in Chrome DevTools Network tab with "offline" checkbox after each wave

4. **Offline Write Strategy for Departure Checklist (D-19)**
   - What we know: Claude's discretion; queue-and-sync or read-only
   - Recommendation: **Read-only** is correct for this app. The app is local-first SQLite — if the user has no signal, they cannot hit the API, and the only consumer of check-off state is the user themselves. Read-only with a clear caption ("Check-offs sync when you reconnect") is the simplest, most reliable approach. No queue needed.

---

## Sources

### Primary (HIGH confidence)
- [Next.js Official PWA Guide](https://nextjs.org/docs/app/guides/progressive-web-apps) — manifest setup, service worker registration, install prompt, iOS instructions
- [Next.js Manifest API Reference](https://nextjs.org/docs/app/api-reference/file-conventions/metadata/manifest) — MetadataRoute.Manifest type
- [OSM Tile Usage Policy](https://operations.osmfoundation.org/policies/tiles/) — offline use prohibited, bulk pre-fetch prohibited
- [WebKit Storage Policy Update](https://webkit.org/blog/14403/updates-to-storage-policy/) — Safari 17+ persistent storage, Home Screen installation exemption

### Secondary (MEDIUM confidence)
- [idb-keyval GitHub](https://github.com/jakearchibald/idb-keyval) — 6.2.2, 295B, promise-based key-value store
- [idb-keyval npm](https://www.npmjs.com/package/idb-keyval) — version, weekly downloads
- [leaflet.offline GitHub](https://github.com/allartk/leaflet.offline) — uses `idb`, offline tile layer with IndexedDB
- [MDN: navigator.onLine](https://developer.mozilla.org/en-US/docs/Web/API/Navigator/onLine) — online/offline event pattern
- [MDN: Storage API](https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria) — eviction criteria

### Tertiary (LOW confidence — single source, validate at implementation)
- MapTiler free tier terms: permits personal caching for single end-user — verify ToS before using if Option B chosen
- `@yaga/leaflet-cached-tile-layer` — IndexedDB tile caching; not verified for active maintenance

---

## Metadata

**Confidence breakdown:**
- Standard stack (manifest, sw.js, idb-keyval): HIGH — verified via official Next.js docs
- Architecture patterns: HIGH — based on official docs and existing project conventions
- OSM tile policy: HIGH — verified directly from OSM foundation policy page
- Map tile caching approach: MEDIUM — OSM intercept-only is clear; proactive tile count math (~200-800 tiles) from CONTEXT.md is unverified
- iOS storage eviction: HIGH — verified from WebKit blog directly
- Pitfalls: HIGH for most, MEDIUM for tile CORS behavior

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable domain; check OSM policy if planning > 30 days out)
