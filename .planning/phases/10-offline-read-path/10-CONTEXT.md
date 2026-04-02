# Phase 10: Offline Read Path & PWA Completion - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Complete the offline data read path so cached trip data actually renders when the device is offline. The write path (LeavingNowButton → cacheTripData → saveTripSnapshot → IndexedDB) already works. This phase builds the read path (IndexedDB → component rendering), adds proactive map tile prefetch, implements real tests for all Phase 8 modules, and creates Phase 8's SUMMARY.md and VERIFICATION.md.

No new features — this closes all 4 unsatisfied OFF requirements, 2 integration gaps, and 1 broken E2E flow from the v1.1 milestone audit.

</domain>

<decisions>
## Implementation Decisions

### Offline Trip Rendering
- **D-01:** Dual-mode components — existing components (PackingList, MealPlan, WeatherDisplay, DepartureChecklist, SpotMap) accept a data prop. When online they fetch from API; when offline they receive IndexedDB snapshot data. Same UI, read-only badges on interactive elements where needed.
- **D-02:** Allow departure checklist check-offs while offline — queue writes in IndexedDB for auto-sync when connectivity returns.
- **D-03:** Auto-sync queued writes on reconnect — fire-and-forget replay to server. No conflict resolution needed (single user, local-first).
- **D-04:** Offline write queue scope is checklist only — usage tracking (used/didn't need) and voice notes require connectivity.

### Service Worker Fallback
- **D-05:** Client-side detection, not SW interception — components use `useOnlineStatus` hook. When offline, read IndexedDB directly via `getTripSnapshot()` instead of fetching /api/. Service worker just serves the app shell and caches tiles.
- **D-06:** Roadmap SC-2 reworded for intent over mechanism — the goal is "user sees cached data offline," not a specific SW interception pattern. Update success criteria wording to match client-side approach.

### Map Tile Prefetch
- **D-07:** Prefetch tiles for trip destination + saved spots within 20 miles — calculate bounding box from trip coordinates and nearby saved locations. Prefetch at current zoom ±2 levels (~200-800 tiles per Phase 8 D-13/D-14).
- **D-08:** Tile caching progress display in overlay — Claude's discretion on whether to show tile count or simple spinner, matching CachingProgressOverlay pattern.

### Cache Update Behavior
- **D-09:** Re-cache behavior on repeat "Leaving Now" tap — Claude's discretion. Full re-cache or skip-if-recent, whichever is simplest.

### Test Strategy
- **D-10:** Unit tests with mocks — mock IndexedDB (idb-keyval), mock fetch/navigator.onLine. Test each module in isolation: offline-storage, cache-trip, useOnlineStatus, components. No MSW or browser-level integration tests.
- **D-11:** All 32 existing test stubs must have real implementations (not `it.todo()`).

### Phase 8 Verification Closure
- **D-12:** Phase 10 retroactively creates Phase 8 SUMMARY.md and VERIFICATION.md after implementing tests and closing gaps. One phase closes the loop on both 8 and 10.

### Claude's Discretion
- Tile caching progress display format (D-08)
- Re-cache behavior on repeat tap (D-09)
- Service worker cache strategy for app shell (already partially implemented)
- Offline empty states for non-trip pages
- How dual-mode data prop is structured/typed

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 8 Context & Plans (the foundation being completed)
- `.planning/phases/08-pwa-and-offline/08-CONTEXT.md` — All Phase 8 design decisions (D-01 through D-19), especially IndexedDB storage, "Leaving Now" UX, offline banner, tile caching scope
- `.planning/phases/08-pwa-and-offline/08-01-PLAN.md` — PWA foundation plan (manifest, SW, registration)
- `.planning/phases/08-pwa-and-offline/08-02-PLAN.md` — Offline infrastructure plan (idb-keyval, storage, hooks, banners)
- `.planning/phases/08-pwa-and-offline/08-03-PLAN.md` — "Leaving Now" caching flow plan
- `.planning/phases/08-pwa-and-offline/08-04-PLAN.md` — Map tile caching + offline UI polish plan

### Milestone Audit (gap identification)
- `.planning/v1.1-MILESTONE-AUDIT.md` — Detailed gap analysis: 4 unsatisfied OFF requirements, 2 integration gaps, broken E2E flow

### Requirements
- `.planning/REQUIREMENTS.md` — OFF-01 through OFF-04 definitions, plus Out of Scope items (no full region tile download, no two-way sync)

### Existing Offline Code (read before modifying)
- `lib/offline-storage.ts` — IndexedDB operations: saveTripSnapshot, getTripSnapshot, deleteTripSnapshot, getCachedTripIds, getSnapshotAge
- `lib/cache-trip.ts` — Orchestrates fetching 7 data types with step callbacks
- `lib/use-online-status.ts` — Online/offline detection hook
- `public/sw.js` — Service worker with app shell caching, tile passthrough
- `components/LeavingNowButton.tsx` — Triggers caching flow, shows update variant
- `components/CachingProgressOverlay.tsx` — Step-by-step progress modal
- `components/OfflineBanner.tsx` — Offline indicator with snapshot age
- `components/InstallBanner.tsx` — PWA install prompt
- `components/ServiceWorkerRegistration.tsx` — SW registration in AppShell

### Test Stubs (all need real implementations)
- `lib/__tests__/offline-storage.test.ts` — 7 pending tests
- `lib/__tests__/cache-trip.test.ts` — 6 pending tests
- `lib/__tests__/use-online-status.test.ts` — 5 pending tests
- `lib/__tests__/manifest.test.ts` — 4 pending tests
- `components/__tests__/OfflineBanner.test.tsx` — 5 pending tests
- `components/__tests__/InstallBanner.test.tsx` — 5 pending tests

### Components That Need Offline Mode
- `components/PackingList.tsx` — Needs data prop for offline rendering
- `components/MealPlan.tsx` — Needs data prop for offline rendering
- `components/DepartureChecklistClient.tsx` — Needs offline data + write queue
- `components/SpotMap.tsx` — Map tiles need to render from cache
- Trip prep/weather display components — Need offline data path

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/offline-storage.ts`: Full IndexedDB CRUD via idb-keyval — saveTripSnapshot, getTripSnapshot, getSnapshotAge already exported
- `lib/use-online-status.ts`: Hook already used by OfflineBanner, LeavingNowButton, DepartureChecklistClient
- `components/CachingProgressOverlay.tsx`: Step-based progress UI — tile prefetch step can be added here
- `components/OfflineBanner.tsx`: Already calls getTripSnapshot for age display when offline

### Established Patterns
- Components use `'use client'` with useState/useEffect hooks
- Data fetching: server components fetch → pass props to client components
- API routes: try-catch with JSON error responses
- Design system: Button, Card, Modal primitives in components/ui/

### Integration Points
- `getTripSnapshot()` is exported but only called by LeavingNowButton and OfflineBanner — needs to be called by trip display components when offline
- `useOnlineStatus` hook already returns boolean — components can branch on this
- `cacheTripData()` callbacks provide step-by-step progress — tile prefetch adds a new step
- `public/sw.js` fetch handler needs tile-specific caching logic for proactive prefetch
- DepartureChecklistClient already uses useOnlineStatus — write queue integrates here

</code_context>

<specifics>
## Specific Ideas

- The offline queue for check-offs should use the same IndexedDB store pattern as trip snapshots — keep it consistent with idb-keyval
- Auto-sync on reconnect should use the `online` event listener already in useOnlineStatus
- Phase 8 SUMMARY.md/VERIFICATION.md should be created AFTER all tests pass and offline path is verified — not before

</specifics>

<deferred>
## Deferred Ideas

- Offline usage tracking (marking gear as used/didn't need while offline) — kept simple for v1.1, queue only checklist check-offs
- Offline voice debrief recording — requires connectivity for Whisper transcription
- Cache cleanup / storage management — per Phase 8 D-11, build if storage becomes a problem
- Full region map tile pre-download — out of scope per REQUIREMENTS.md
- Background sync API — if auto-sync needs more reliability, explore in future

</deferred>

---

*Phase: 10-offline-read-path*
*Context gathered: 2026-04-01*
