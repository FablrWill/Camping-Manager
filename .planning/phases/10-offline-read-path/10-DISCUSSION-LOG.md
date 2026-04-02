# Phase 10: Offline Read Path & PWA Completion - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 10-offline-read-path
**Areas discussed:** Offline trip rendering, Tile prefetch scope, Service worker fallback, Test strategy, Offline write queue scope, Cache update behavior, Phase 8 verification closure

---

## Offline Trip Rendering

| Option | Description | Selected |
|--------|-------------|----------|
| Dual-mode components | Existing components accept data prop; same UI online/offline, read-only badges | ✓ |
| Dedicated offline viewer | New lightweight component, single scrollable page, different layout | |
| You decide | Claude picks simplest approach | |

**User's choice:** Dual-mode components (Recommended)
**Notes:** Same components serve both online and offline, minimizing new code.

### Interactive Elements Offline

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled with visual cue | Grayed out with lock icon/tooltip | |
| Hidden entirely | Strip all interactive controls when offline | |
| Allow check-offs offline | Queue writes for sync on reconnect | ✓ |

**User's choice:** Allow check-offs offline
**Notes:** User wants to check off departure items in the field without signal.

### Offline Write Sync

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-sync on reconnect | Queue in IndexedDB, auto-replay when online returns | ✓ |
| Manual sync button | User controls when writes go to server | |
| You decide | Claude picks simplest | |

**User's choice:** Auto-sync on reconnect (Recommended)
**Notes:** Fire-and-forget, no conflict resolution needed for single user.

---

## Tile Prefetch Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Trip destination + nearby spots | Bounding box from trip + spots within 20mi, ±2 zoom levels | ✓ |
| Trip destination only | Only trip coordinates, simpler, fewer tiles | |
| You decide | Claude picks based on estimates | |

**User's choice:** Trip destination + nearby spots (Recommended)
**Notes:** Matches Phase 8 D-13/D-14 decisions.

### Tile Progress Display

| Option | Description | Selected |
|--------|-------------|----------|
| Step with tile count | Show "Map tiles: 127/340 cached" with progress bar | |
| Simple step status | Spinner then checkmark, no count | |
| You decide | Claude picks to match CachingProgressOverlay | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion on progress display format.

---

## Service Worker Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Client-side detection | Components use useOnlineStatus, read IndexedDB directly | ✓ |
| Service worker intercepts | SW catches failed fetches, reads IndexedDB, returns JSON | |
| You decide | Claude picks based on feasibility | |

**User's choice:** Client-side detection (Recommended)
**Notes:** Simpler, avoids SW↔IndexedDB bridge complexity.

### SC-2 Wording Conflict

| Option | Description | Selected |
|--------|-------------|----------|
| Intent matters, not mechanism | Update SC wording to match client-side approach | ✓ |
| Honor SC literally | Implement SW interception as written | |

**User's choice:** Intent matters, not mechanism
**Notes:** Goal is "user sees cached data offline" regardless of mechanism.

---

## Test Strategy

| Option | Description | Selected |
|--------|-------------|----------|
| Unit tests with mocks | Mock idb-keyval, fetch, navigator.onLine; test in isolation | ✓ |
| Integration with MSW | Mock Service Worker for offline simulation | |
| You decide | Claude picks simplest approach | |

**User's choice:** Unit tests with mocks (Recommended)
**Notes:** Fast, reliable, no browser needed. All 32 stubs get real tests.

---

## Offline Write Queue Scope

| Option | Description | Selected |
|--------|-------------|----------|
| Checklist only | Only departure checklist check-offs queue offline | ✓ |
| Checklist + usage tracking | Also queue "used/didn't need" marks | |
| Everything writable | Queue all writes | |

**User's choice:** Checklist only (Recommended)
**Notes:** Keeps queue simple, focused on departure scenario.

---

## Cache Update Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Full re-cache | Overwrite entire snapshot with fresh data | |
| Skip if recent | Skip if < 1 hour old | |
| You decide | Claude picks simplest | ✓ |

**User's choice:** You decide
**Notes:** Claude's discretion on re-cache behavior.

---

## Phase 8 Verification Closure

| Option | Description | Selected |
|--------|-------------|----------|
| Phase 10 creates them | Retroactively create Phase 8 SUMMARY.md and VERIFICATION.md | ✓ |
| Separate Phase 8 cleanup first | Run Phase 8 verification separately before Phase 10 | |

**User's choice:** Phase 10 creates them (Recommended)
**Notes:** One phase closes the loop on both 8 and 10.

---

## Claude's Discretion

- Tile caching progress display format (D-08)
- Re-cache behavior on repeat "Leaving Now" tap (D-09)
- Offline empty states for non-trip pages

## Deferred Ideas

- Offline usage tracking (used/didn't need while offline)
- Offline voice debrief recording
- Cache cleanup / storage management
- Full region map tile pre-download
- Background sync API
