# Phase 10: Offline Read Path & PWA Completion — Research

**Researched:** 2026-04-02
**Domain:** IndexedDB read path, PWA offline rendering, service worker tile caching, Vitest unit testing with mocked browser APIs
**Confidence:** HIGH — all findings grounded in direct codebase inspection and verified library docs

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Offline Trip Rendering**
- **D-01:** Dual-mode components — existing components (PackingList, MealPlan, WeatherDisplay, DepartureChecklist, SpotMap) accept a data prop. When online they fetch from API; when offline they receive IndexedDB snapshot data. Same UI, read-only badges on interactive elements where needed.
- **D-02:** Allow departure checklist check-offs while offline — queue writes in IndexedDB for auto-sync when connectivity returns.
- **D-03:** Auto-sync queued writes on reconnect — fire-and-forget replay to server. No conflict resolution needed (single user, local-first).
- **D-04:** Offline write queue scope is checklist only — usage tracking and voice notes require connectivity.

**Service Worker Fallback**
- **D-05:** Client-side detection, not SW interception — components use `useOnlineStatus` hook. When offline, read IndexedDB directly via `getTripSnapshot()` instead of fetching /api/. Service worker just serves the app shell and caches tiles.
- **D-06:** Success criteria reworded for intent — "user sees cached data offline" via client-side detection, not a specific SW interception pattern.

**Map Tile Prefetch**
- **D-07:** Prefetch tiles for trip destination + saved spots within 20 miles — bounding box from trip coordinates + nearby locations. Prefetch at current zoom ±2 levels (~200-800 tiles).
- **D-08:** Tile caching progress display in overlay — Claude's discretion on tile count vs simple spinner, matching CachingProgressOverlay pattern.

**Cache Update Behavior**
- **D-09:** Re-cache behavior on repeat "Leaving Now" tap — Claude's discretion. Full re-cache or skip-if-recent.

**Test Strategy**
- **D-10:** Unit tests with mocks — mock IndexedDB (idb-keyval), mock fetch/navigator.onLine. Test each module in isolation. No MSW or browser-level integration tests.
- **D-11:** All 32 existing test stubs must have real implementations (not `it.todo()`).

**Phase 8 Verification Closure**
- **D-12:** Phase 10 retroactively creates Phase 8 SUMMARY.md and VERIFICATION.md after implementing tests and closing gaps.

### Claude's Discretion
- Tile caching progress display format (D-08)
- Re-cache behavior on repeat tap (D-09)
- Service worker cache strategy for app shell (already partially implemented)
- Offline empty states for non-trip pages
- How dual-mode data prop is structured/typed

### Deferred Ideas (OUT OF SCOPE)
- Offline usage tracking (marking gear as used/didn't need while offline)
- Offline voice debrief recording
- Cache cleanup / storage management
- Full region map tile pre-download
- Background sync API for more reliable sync
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| OFF-01 | User can install the app to their phone's home screen as a PWA | `app/manifest.ts` and icons exist. `ServiceWorkerRegistration.tsx` exists and is wired. Code complete — needs tests and VERIFICATION.md. |
| OFF-02 | User can open the app offline and see the app shell (navigation, cached pages) | `public/sw.js` with SHELL_ASSETS caching exists. `OfflineBanner.tsx` exists. Code complete — needs tests and VERIFICATION.md. |
| OFF-03 | User can tap "Leaving Now" and have all trip data cached, then view it offline | Write path complete. Read path is the gap: no component calls `getTripSnapshot()` to render cached data when offline. Dual-mode components + `useOnlineStatus` branching are the implementation pattern. |
| OFF-04 | User can view cached map tiles for trip area while offline | Service worker passively caches tiles. Proactive tile prefetch not yet implemented. Phase 10 D-07 scopes this as a new `cacheTiles` step in `cacheTripData`. OSM ToS allows fetching tiles that will be immediately displayed — proactive prefetch for a single trip bounding box is acceptable at the ~200-800 tile scale. |
</phase_requirements>

---

## Summary

Phase 8 built all the infrastructure. Phase 10 wires it to the UI and proves it works with real tests.

The three concrete implementation gaps from the milestone audit are:
1. **Read path not implemented** — `getTripSnapshot()` is exported but no component calls it. Every trip-display component currently fetches from `/api/` unconditionally. The fix is adding `useOnlineStatus()` branching and a `data` prop path to PackingList, MealPlan, WeatherCard/display, and DepartureChecklistClient.
2. **Tile prefetch not implemented** — The service worker passively caches tiles as the user views them. A proactive prefetch step must be added to `cacheTripData()` that calculates a bounding box from trip coordinates and fetches tile URLs into the service worker Cache API.
3. **All 32 test stubs are `it.todo()`** — Vitest + jsdom + @testing-library/react are already installed. Mocking patterns for `idb-keyval` and `navigator.onLine` are well-established in the Vitest ecosystem.

**The offline write queue for check-offs** (D-02/D-03) is partially implied by existing code. `DepartureChecklistClient` already disables check-offs when offline and shows "Check-offs sync when you reconnect" — but there is no actual queue. The queue must be implemented in IndexedDB (same `idb-keyval` pattern) with a `useEffect` that replays on the `online` event.

**Primary recommendation:** Implement in this order: (1) write tests for all 32 stubs, (2) build dual-mode PackingList/MealPlan/DepartureChecklist, (3) add proactive tile prefetch to `cacheTripData`, (4) implement offline write queue for check-offs, (5) create Phase 8 SUMMARY.md and VERIFICATION.md.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout; `public/sw.js` stays vanilla JS (no TypeScript in service worker scope)
- No `alert()` — all UI feedback via React state (existing pattern)
- All React hooks must have correct, minimal dependency arrays
- API routes: try-catch with `console.error` + JSON error response
- 800 line max per file — watch DepartureChecklistClient.tsx (currently ~395 lines — offline queue will push it; extract if needed)
- Immutable patterns: IndexedDB queue writes produce new queue entries, never mutate snapshots
- No hardcoded secrets
- Commit messages: imperative mood, concise
- Before Edit/Write: must work through GSD execute-phase workflow

---

## Standard Stack

### Core (already installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `idb-keyval` | 6.2.2 | IndexedDB for TripSnapshot storage + offline write queue | Already used in `lib/offline-storage.ts`; same store pattern for queue |
| `useOnlineStatus` hook | — | Browser online/offline detection | Already in `lib/use-online-status.ts`; used by OfflineBanner, LeavingNowButton, DepartureChecklistClient |
| `getTripSnapshot()` | — | Read cached trip data from IndexedDB | Already in `lib/offline-storage.ts`; currently only called by LeavingNowButton and OfflineBanner |
| Vitest | 3.2.4 | Unit test runner | Already configured in `vitest.config.ts` with jsdom environment |
| @testing-library/react | 16.3.2 | React component testing | Already in devDependencies; used for OfflineBanner/InstallBanner tests |
| jsdom | 27.0.1 | Browser API simulation for tests | Already in devDependencies; configured in vitest.config.ts |

### Supporting (no new installs needed)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Cache API (browser native) | — | Service worker tile cache | Tile prefetch writes to `tile-cache-v1` via `caches.open()` in `public/sw.js` or via `postMessage` to SW |
| `navigator.storage.persist()` | Browser API | Prevent iOS 7-day storage eviction | Already noted in Phase 8 research; call once at install time |

### No New Dependencies
All required libraries are already installed. This phase adds no new npm packages.

**Version verification:** idb-keyval@6.2.2 (confirmed in package.json), vitest@3.2.4 (confirmed), @testing-library/react@16.3.2 (confirmed), jsdom@27.0.1 (confirmed).

---

## Architecture Patterns

### Current State (What Exists)

```
lib/
├── offline-storage.ts      — saveTripSnapshot, getTripSnapshot, getCachedTripIds, getSnapshotAge (COMPLETE)
├── cache-trip.ts           — cacheTripData orchestrator, 7 steps (COMPLETE, needs tile step)
├── use-online-status.ts    — useOnlineStatus() hook (COMPLETE)
└── __tests__/
    ├── offline-storage.test.ts  — 7 stubs, all it.todo
    ├── cache-trip.test.ts       — 6 stubs, all it.todo
    ├── use-online-status.test.ts — 5 stubs, all it.todo
    └── manifest.test.ts         — 4 stubs, all it.todo

components/
├── LeavingNowButton.tsx         — triggers cacheTripData (COMPLETE, needs tile step)
├── CachingProgressOverlay.tsx   — shows step progress (COMPLETE, needs tile step added)
├── OfflineBanner.tsx            — shows offline status (COMPLETE)
├── InstallBanner.tsx            — PWA install prompt (COMPLETE)
└── __tests__/
    ├── OfflineBanner.test.tsx   — 5 stubs, all it.todo
    └── InstallBanner.test.tsx   — 5 stubs, all it.todo

public/
└── sw.js                   — app shell caching + passive tile caching (COMPLETE, needs postMessage tile prefetch handler)

app/
└── manifest.ts             — PWA manifest (COMPLETE)
```

### Phase 10 Additions

```
lib/
├── offline-write-queue.ts  — NEW: IndexedDB queue for offline check-off writes
└── __tests__/
    └── offline-write-queue.test.ts — NEW: tests for queue module

components/
├── PackingList.tsx          — MODIFIED: add offline data prop + useOnlineStatus branch
├── MealPlan.tsx             — MODIFIED: add offline data prop + useOnlineStatus branch
├── DepartureChecklistClient.tsx — MODIFIED: add offline data prop + write queue wire-up
└── WeatherCard.tsx (or display component) — MODIFIED: add offline data prop

public/
└── sw.js                   — MODIFIED: add message handler for proactive tile prefetch

.planning/phases/08-pwa-and-offline/
├── 08-SUMMARY.md           — NEW (created after tests pass)
└── 08-VERIFICATION.md      — NEW (created after tests pass)
```

### Pattern 1: Dual-Mode Component with Data Prop

**What:** Components receive an optional `offlineData` prop. When online, they fetch from `/api/` as normal. When offline, they skip the fetch and render from `offlineData`.

**When to use:** All trip-display components: PackingList, MealPlan, DepartureChecklistClient, WeatherCard.

**Key insight from codebase:** PackingList and MealPlan currently accept `{ tripId, tripName }` as props. The parent (TripPrepClient) is a client component that fetches `/api/trips/[id]/prep`. The cleanest pattern is to have the parent call `getTripSnapshot(tripId)` when offline and pass the snapshot data down to child components via props. This avoids each component independently querying IndexedDB.

**Example pattern:**
```typescript
// In TripPrepClient.tsx — centralized snapshot read
import { useOnlineStatus } from '@/lib/use-online-status'
import { getTripSnapshot, type TripSnapshot } from '@/lib/offline-storage'

// On mount when offline, load snapshot
useEffect(() => {
  if (isOnline) return
  async function loadSnapshot() {
    const snap = await getTripSnapshot(trip.id)
    setOfflineSnapshot(snap ?? null)
  }
  loadSnapshot()
}, [isOnline, trip.id])

// Pass to child components
<PackingList
  tripId={trip.id}
  tripName={trip.name}
  offlineData={isOnline ? undefined : offlineSnapshot?.packingList}
/>
```

**In the child component:**
```typescript
interface PackingListProps {
  tripId: string
  tripName: string
  offlineData?: unknown  // TripSnapshot['packingList'] — use actual type when known
}

// In the loadSaved useEffect:
useEffect(() => {
  if (offlineData) {
    // Render from IndexedDB snapshot
    setPackingList(offlineData as PackingListResult)
    return
  }
  // Otherwise fetch from API as normal
  async function loadSaved() { ... }
  loadSaved()
}, [tripId, offlineData])
```

### Pattern 2: Offline Write Queue

**What:** Check-off writes that fail (or are skipped) while offline are queued in IndexedDB and replayed when connectivity returns.

**When to use:** DepartureChecklistClient check-off writes only (D-04).

**Implementation:** New `lib/offline-write-queue.ts` using the same `idb-keyval` + `createStore` pattern as `offline-storage.ts`.

```typescript
// lib/offline-write-queue.ts
import { get, set, del, keys, createStore } from 'idb-keyval'

const queueStore = createStore('outland-queue', 'writes')

export interface QueuedWrite {
  id: string           // unique ID for the write (e.g., `check:${checklistId}:${itemId}`)
  checklistId: string
  itemId: string
  checked: boolean
  queuedAt: string
}

export async function queueCheckOff(checklistId: string, itemId: string, checked: boolean): Promise<void>
export async function getPendingWrites(): Promise<QueuedWrite[]>
export async function removeWrite(id: string): Promise<void>
export async function clearQueue(): Promise<void>
```

**Sync on reconnect (in DepartureChecklistClient):**
```typescript
const isOnline = useOnlineStatus()

useEffect(() => {
  if (!isOnline) return
  async function syncQueue() {
    const pending = await getPendingWrites()
    for (const write of pending) {
      try {
        await fetch(`/api/departure-checklist/${write.checklistId}/check`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ itemId: write.itemId, checked: write.checked }),
        })
        await removeWrite(write.id)
      } catch {
        // Leave in queue — will retry next reconnect
      }
    }
  }
  syncQueue()
}, [isOnline])
```

**Important:** The existing `handleCheck` in DepartureChecklistClient already fires a fire-and-forget PATCH. When offline, the PATCH will reject (network error) silently due to `.catch(() => {})`. The write queue adds: (1) when offline, call `queueCheckOff()` instead, and (2) when online returns, replay the queue.

### Pattern 3: Proactive Tile Prefetch

**What:** When "Leaving Now" is tapped, calculate tile URLs for the trip bounding box and fetch them into the service worker tile cache.

**Mechanism:** Client-side bounding box calculation → send tile URL list to service worker via `postMessage` → service worker fetches and caches each tile URL.

**Why postMessage (not direct fetch):** The Cache API is only writable from service worker scope. The client can't write to `caches` directly (or can via `caches.open()` but SW already owns the tile cache name). Using postMessage keeps cache ownership in the SW.

**Alternative — direct fetch from client:** The simpler approach that avoids postMessage complexity: the client fetches each tile URL directly (the SW intercepts these requests and caches them via the existing tile caching logic). No postMessage needed — the proactive prefetch IS the SW's fetch handler.

**Decision for planner:** Use the direct-fetch approach — simpler and reuses existing SW tile-caching logic. The client calculates tile URLs, fires `fetch(tileUrl)` for each, and the SW intercepts them into `tile-cache-v1` automatically.

**Tile URL calculation (OSM schema):**
```typescript
// lib/tile-prefetch.ts
function tileUrl(z: number, x: number, y: number): string {
  // Rotate among a/b/c subdomains to avoid rate limiting
  const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3]
  return `https://${subdomain}.tile.openstreetmap.org/${z}/${x}/${y}.png`
}

function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const y = Math.floor(
    ((1 - Math.log(Math.tan((lat * Math.PI) / 180) + 1 / Math.cos((lat * Math.PI) / 180)) / Math.PI) / 2) *
      Math.pow(2, zoom)
  )
  return { x, y }
}

export function getTileUrlsForBoundingBox(
  lat: number,
  lon: number,
  radiusMiles: number,
  zoomLevels: number[] = [10, 11, 12, 13, 14]
): string[] { ... }
```

**OSM ToS note:** Proactive fetching of ~200-800 tiles for a single trip departure is within acceptable use for a personal app. The Phase 8 research flagged bulk pre-fetching as a ToS concern for region-level downloads (100s of thousands of tiles). Single-trip bounding box at 5 zoom levels is not bulk downloading. The service worker subdomain rotation (a/b/c) further distributes load.

### Pattern 4: Vitest Mocking for Browser APIs

**What:** Unit tests for offline modules require mocking `idb-keyval`, `navigator.onLine`, and React hooks.

**idb-keyval mock:**
```typescript
// In test file or setup
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  createStore: vi.fn(() => 'mock-store'),
}))
```

**navigator.onLine mock:**
```typescript
Object.defineProperty(navigator, 'onLine', {
  writable: true,
  value: true,
})
// In test: (navigator as { onLine: boolean }).onLine = false
```

**useOnlineStatus testing (renderHook):**
```typescript
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/lib/use-online-status'

it('updates to false on offline event', () => {
  const { result } = renderHook(() => useOnlineStatus())
  act(() => {
    window.dispatchEvent(new Event('offline'))
  })
  expect(result.current).toBe(false)
})
```

**fetch mock:**
```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => ({ items: [] }),
})
```

### Anti-Patterns to Avoid

- **Reading IndexedDB in every child component independently:** Each component independently calling `getTripSnapshot()` creates multiple IDB reads per render. Read once in the parent (TripPrepClient) and pass down.
- **Using SW interception instead of client detection (D-05):** The decision is explicitly client-side branching, not SW response interception. Do not add IndexedDB reads to `public/sw.js` fetch handler.
- **it.todo() stubs remaining:** All 32 stubs must become real test implementations. Even minimal assertions beat empty stubs.
- **Mutating the TripSnapshot:** Writes to the checklist write queue use a separate IDB store. Never modify the snapshot object written by `saveTripSnapshot`.
- **Tile prefetch without zoom level capping:** Uncapped zoom levels produce exponential tile counts. Cap at zoom 14 max, ±2 from a baseline of zoom 12 = zooms 10-14.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| IndexedDB boilerplate | Custom IDB wrapper | `idb-keyval` (already installed) | Already used in offline-storage.ts; consistent store pattern |
| Online/offline detection | Custom event listeners | `useOnlineStatus` hook (already exists) | Hook already handles SSR safety, event cleanup |
| Tile URL math | Custom lat/lon-to-tile | Standard OSM tile math formula | Well-documented, deterministic — just copy the formula |
| Test mocking | Complex mock factories | `vi.mock('idb-keyval', () => ({...}))` | Vitest module mocking is the standard approach |
| React hook testing | Manual DOM setup | `renderHook` from @testing-library/react | Already installed, correct approach for hook tests |

---

## Common Pitfalls

### Pitfall 1: TripSnapshot `unknown` Types
**What goes wrong:** `TripSnapshot` fields are typed as `unknown`. Components expect typed data (e.g., `PackingListResult`). Casting `offlineData as PackingListResult` without validation may fail at runtime if the snapshot is malformed.
**Why it happens:** Phase 8 used `unknown` to avoid coupling the snapshot schema to specific component types.
**How to avoid:** Add runtime type guard or use optional chaining when reading from offline data. The snapshot was serialized from a valid API response — trust it but add null checks.
**Warning signs:** TypeScript errors when passing `snapshot.packingList` to typed props.

### Pitfall 2: useEffect Dependency Array with offlineData
**What goes wrong:** If `offlineData` is an object reference that changes on every render, the `useEffect` that reads it will loop.
**Why it happens:** Parent passes new object reference each render even with same content.
**How to avoid:** Either memoize the offlineSnapshot in TripPrepClient, or check `offlineData !== undefined` rather than `offlineData` reference. Use `useMemo` to stabilize the extracted fields.
**Warning signs:** Infinite render loops or excessive re-fetches in dev tools.

### Pitfall 3: Vitest jsdom Missing Browser APIs
**What goes wrong:** Tests fail because `window.matchMedia`, `navigator.storage`, or `indexedDB` are not available in jsdom.
**Why it happens:** jsdom is not a full browser — some APIs need manual mocking.
**How to avoid:** Mock specific missing APIs in test files. For InstallBanner, mock `window.matchMedia`. For offline-storage, mock `idb-keyval` entirely (don't try to run real IDB in jsdom).
**Warning signs:** `TypeError: window.matchMedia is not a function` or `ReferenceError: indexedDB is not defined`.

### Pitfall 4: Tile Count Explosion
**What goes wrong:** Prefetching tiles at zoom levels 10-14 for a 20-mile radius produces thousands of tiles, not hundreds.
**Why it happens:** Tile count at zoom Z = (tiles per degree)^2 * area. Each zoom level doubles tile density.
**How to avoid:** Cap radius at 20 miles, cap zoom at 14, use zoom levels [10, 11, 12, 13, 14]. Test tile count with a real trip coordinate before finalizing. Budget ~200-800 tiles; if count exceeds 1000, reduce zoom range.
**Warning signs:** "Leaving Now" taking more than 10 seconds for tile caching step.

### Pitfall 5: Offline Write Queue Double-Write
**What goes wrong:** When `handleCheck` fires, an optimistic state update + a failed network write queues the write. But if the fetch actually succeeds after a delay, the reconnect sync replays the same write.
**Why it happens:** Race between queuing an offline write and a slow network request succeeding.
**How to avoid:** Queue writes ONLY when `!isOnline`. Don't queue when online. The existing fire-and-forget `.catch(() => {})` already handles the online case. The queue is only for when `!isOnline` is true at call time.
**Warning signs:** Duplicate check-off PATCH requests logged on reconnect.

### Pitfall 6: DepartureChecklistClient Size
**What goes wrong:** DepartureChecklistClient is already ~395 lines. Adding offline queue logic + offline data prop will push it toward the 800-line limit.
**Why it happens:** The component handles checklist generation, check-offs, float plan, and now offline state.
**How to avoid:** Extract the offline write queue sync into a custom hook `useChecklistSync(checklistId, isOnline)`. Extract float plan into a sub-component if needed.
**Warning signs:** File exceeding 600 lines before queue is fully implemented.

---

## Code Examples

### Verified Pattern: idb-keyval Module Mock (Vitest)
```typescript
// Source: Vitest docs + idb-keyval API
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { saveTripSnapshot, getTripSnapshot } from '@/lib/offline-storage'

// Mock the entire module — prevent real IDB access in jsdom
vi.mock('idb-keyval', () => ({
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  keys: vi.fn(),
  createStore: vi.fn(() => 'mock-store'),
}))

import { get, set } from 'idb-keyval'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('offline-storage', () => {
  it('saveTripSnapshot stores data in IndexedDB', async () => {
    const snapshot = { tripId: 'trip-1', cachedAt: new Date().toISOString(), weather: {}, packingList: {}, mealPlan: {}, departureChecklist: {}, spots: [], emergencyInfo: { name: null, email: null }, vehicleInfo: {} }
    await saveTripSnapshot(snapshot as any)
    expect(set).toHaveBeenCalledWith('trip:trip-1', snapshot, 'mock-store')
  })

  it('getTripSnapshot retrieves stored snapshot by tripId', async () => {
    const mockSnapshot = { tripId: 'trip-1', cachedAt: '2026-04-01T00:00:00Z' }
    vi.mocked(get).mockResolvedValueOnce(mockSnapshot)
    const result = await getTripSnapshot('trip-1')
    expect(result).toBe(mockSnapshot)
    expect(get).toHaveBeenCalledWith('trip:trip-1', 'mock-store')
  })

  it('getTripSnapshot returns undefined for missing tripId', async () => {
    vi.mocked(get).mockResolvedValueOnce(undefined)
    const result = await getTripSnapshot('nonexistent')
    expect(result).toBeUndefined()
  })
})
```

### Verified Pattern: renderHook for useOnlineStatus
```typescript
// Source: @testing-library/react renderHook docs
import { renderHook, act } from '@testing-library/react'
import { useOnlineStatus } from '@/lib/use-online-status'

it('updates to false on offline event', () => {
  Object.defineProperty(navigator, 'onLine', { writable: true, value: true })
  const { result } = renderHook(() => useOnlineStatus())
  expect(result.current).toBe(true)

  act(() => {
    Object.defineProperty(navigator, 'onLine', { value: false })
    window.dispatchEvent(new Event('offline'))
  })

  expect(result.current).toBe(false)
})

it('cleans up event listeners on unmount', () => {
  const removeSpy = vi.spyOn(window, 'removeEventListener')
  const { unmount } = renderHook(() => useOnlineStatus())
  unmount()
  expect(removeSpy).toHaveBeenCalledWith('online', expect.any(Function))
  expect(removeSpy).toHaveBeenCalledWith('offline', expect.any(Function))
})
```

### Verified Pattern: OfflineBanner Test
```typescript
// Source: @testing-library/react render + vi.mock
import { render, screen } from '@testing-library/react'
import OfflineBanner from '@/components/OfflineBanner'
import * as useOnlineStatusModule from '@/lib/use-online-status'

vi.mock('@/lib/use-online-status', () => ({
  useOnlineStatus: vi.fn(() => true),
}))

vi.mock('@/lib/offline-storage', () => ({
  getCachedTripIds: vi.fn(() => Promise.resolve([])),
  getTripSnapshot: vi.fn(() => Promise.resolve(undefined)),
  getSnapshotAge: vi.fn(() => '2h ago'),
}))

it('renders nothing when online', () => {
  vi.mocked(useOnlineStatusModule.useOnlineStatus).mockReturnValue(true)
  const { container } = render(<OfflineBanner />)
  expect(container.firstChild).toBeNull()
})

it('renders offline indicator when offline', async () => {
  vi.mocked(useOnlineStatusModule.useOnlineStatus).mockReturnValue(false)
  render(<OfflineBanner />)
  expect(await screen.findByText(/Offline/)).toBeInTheDocument()
})
```

### Verified Pattern: OSM Tile URL Calculation
```typescript
// Source: OpenStreetMap Wiki — Slippy map tilenames
// https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames
function latLonToTile(lat: number, lon: number, zoom: number): { x: number; y: number } {
  const x = Math.floor(((lon + 180) / 360) * Math.pow(2, zoom))
  const latRad = (lat * Math.PI) / 180
  const y = Math.floor(
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * Math.pow(2, zoom)
  )
  return { x, y }
}

// Generate all tile URLs for a bounding box
export function getTileUrlsForBoundingBox(
  centerLat: number,
  centerLon: number,
  radiusMiles: number,
  zoomLevels: number[]
): string[] {
  const degreesPerMile = 1 / 69
  const latDelta = radiusMiles * degreesPerMile
  const lonDelta = radiusMiles * degreesPerMile / Math.cos((centerLat * Math.PI) / 180)

  const urls: string[] = []
  for (const zoom of zoomLevels) {
    const topLeft = latLonToTile(centerLat + latDelta, centerLon - lonDelta, zoom)
    const bottomRight = latLonToTile(centerLat - latDelta, centerLon + lonDelta, zoom)
    for (let x = topLeft.x; x <= bottomRight.x; x++) {
      for (let y = topLeft.y; y <= bottomRight.y; y++) {
        const subdomain = ['a', 'b', 'c'][Math.abs(x + y) % 3]
        urls.push(`https://${subdomain}.tile.openstreetmap.org/${zoom}/${x}/${y}.png`)
      }
    }
  }
  return urls
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Service worker intercept for offline data (D-05 originally from Phase 8 CONTEXT) | Client-side detection with IndexedDB read (D-05 from Phase 10 CONTEXT) | Phase 10 context session | Components branch on `useOnlineStatus()` rather than relying on SW to intercept and return cached responses |
| Passive tile caching only (Phase 8 Plan 04) | Passive caching + proactive prefetch at "Leaving Now" time (Phase 10 D-07) | Phase 10 context session | Adds a tile prefetch step to `cacheTripData`; calculates bounding box from trip coordinates |
| All 32 test stubs are `it.todo()` | Real test implementations with mocked IDB and browser APIs | Phase 10 | Provides actual test coverage for all Phase 8 offline modules |

**Phase 8 plan deviation already documented:** Phase 8 Plan 04 notes that proactive tile prefetch was changed to passive intercept-only due to OSM ToS concern. Phase 10 D-07 re-enables proactive prefetch for the trip bounding box (~200-800 tiles), which is within personal use bounds at this scale.

---

## Environment Availability

Step 2.6: Skipped — this phase is code changes only, no external services or CLI tools required beyond the existing Node.js/npm stack.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | npm scripts, Vitest | ✓ | v23.11.0 | — |
| idb-keyval | offline-storage.ts, new queue module | ✓ | 6.2.2 | — |
| vitest | test suite | ✓ | 3.2.4 | — |
| @testing-library/react | component tests | ✓ | 16.3.2 | — |
| jsdom | test environment | ✓ | 27.0.1 | — |

No missing dependencies. No blocking environment issues.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |
| Watch mode | `npm run test:watch` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| OFF-01 | manifest exports required PWA fields | unit | `npm test -- lib/__tests__/manifest.test.ts` | ✅ (stubs) |
| OFF-01 | InstallBanner hides in standalone mode | unit | `npm test -- components/__tests__/InstallBanner.test.tsx` | ✅ (stubs) |
| OFF-02 | OfflineBanner renders when offline | unit | `npm test -- components/__tests__/OfflineBanner.test.tsx` | ✅ (stubs) |
| OFF-02 | useOnlineStatus detects online/offline events | unit | `npm test -- lib/__tests__/use-online-status.test.ts` | ✅ (stubs) |
| OFF-03 | saveTripSnapshot / getTripSnapshot roundtrip | unit | `npm test -- lib/__tests__/offline-storage.test.ts` | ✅ (stubs) |
| OFF-03 | cacheTripData fetches all 7 data types | unit | `npm test -- lib/__tests__/cache-trip.test.ts` | ✅ (stubs) |
| OFF-03 | offline write queue stores and replays check-offs | unit | `npm test -- lib/__tests__/offline-write-queue.test.ts` | ❌ Wave 0 |
| OFF-04 | tile URL calculation covers bounding box | unit | `npm test -- lib/__tests__/tile-prefetch.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test` (full suite, <10 seconds)
- **Per wave merge:** `npm test` (full suite green)
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/offline-write-queue.test.ts` — covers OFF-03 write queue
- [ ] `lib/__tests__/tile-prefetch.test.ts` — covers OFF-04 tile URL math
- [ ] `lib/offline-write-queue.ts` — implementation file (must exist before tests)
- [ ] `lib/tile-prefetch.ts` — implementation file (must exist before tests)

*(All 32 existing stubs need real implementations — these are not new files, they're existing empty files that need content.)*

---

## Key Implementation Gaps (Summary for Planner)

| Gap | Files Affected | Work Type |
|-----|----------------|-----------|
| 1. Read path: components don't call getTripSnapshot | TripPrepClient.tsx, PackingList.tsx, MealPlan.tsx, DepartureChecklistClient.tsx | Code edit |
| 2. Write queue: offline check-offs not queued | DepartureChecklistClient.tsx, lib/offline-write-queue.ts (new) | New module + code edit |
| 3. Tile prefetch: no proactive fetch at "Leaving Now" | lib/tile-prefetch.ts (new), lib/cache-trip.ts, CachingProgressOverlay.tsx | New module + code edit |
| 4. 32 test stubs: all it.todo() | lib/__tests__/*.test.ts, components/__tests__/*.test.tsx | Test implementation |
| 5. Phase 8 docs: no SUMMARY.md or VERIFICATION.md | .planning/phases/08-pwa-and-offline/ | Documentation (after tests pass) |

---

## Sources

### Primary (HIGH confidence)
- Direct codebase inspection: `lib/offline-storage.ts`, `lib/cache-trip.ts`, `lib/use-online-status.ts`, `public/sw.js`, `components/LeavingNowButton.tsx`, `components/CachingProgressOverlay.tsx`, `components/OfflineBanner.tsx`, `components/InstallBanner.tsx`, `components/DepartureChecklistClient.tsx`, `app/manifest.ts`
- `.planning/phases/10-offline-read-path/10-CONTEXT.md` — Phase 10 decisions
- `.planning/phases/08-pwa-and-offline/08-CONTEXT.md` — Phase 8 decisions
- `.planning/v1.1-MILESTONE-AUDIT.md` — Gap identification
- `vitest.config.ts`, `package.json` — test infrastructure confirmed
- OSM Wiki Slippy Map Tilenames: https://wiki.openstreetmap.org/wiki/Slippy_map_tilenames

### Secondary (MEDIUM confidence)
- Vitest docs: module mocking, `renderHook` from @testing-library/react
- idb-keyval v6 API: `get`, `set`, `del`, `keys`, `createStore` confirmed from package source

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries confirmed in package.json; versions verified
- Architecture: HIGH — patterns derived from direct codebase inspection; no speculation
- Pitfalls: HIGH — all identified from actual code structure and test environment constraints
- Tile prefetch: MEDIUM — OSM tile math is standard, tile count estimation based on known formula; actual count depends on trip coordinates

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack, no fast-moving dependencies)
