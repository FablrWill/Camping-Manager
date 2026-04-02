# Session 25 — Phase 8: PWA and Offline

**Date:** 2026-04-01
**Phase:** 08 — PWA and Offline
**Branch:** claude/elegant-hodgkin

## What Was Built

Phase 8 delivers installable PWA support and offline trip data caching — the last piece before the learning loop.

### Plan 00 (Wave 0) — Test Infrastructure
- Installed Vitest + jsdom + @testing-library/react
- Created vitest.config.ts with path alias support
- 6 stub test files (32 todo tests) for all Phase 8 modules

### Plan 01 (Wave 1) — PWA Foundation
- `app/manifest.ts` — web app manifest (standalone, amber/stone theme)
- 3 placeholder PNG icons (192, 512, apple-touch-icon) via sharp
- `public/sw.js` — service worker with app shell caching, OSM tile passive caching, API offline fallback
- `components/ServiceWorkerRegistration.tsx` — registers SW + requests persistent storage
- `next.config.ts` — no-cache headers for sw.js
- `app/layout.tsx` — apple-touch-icon link

### Plan 02 (Wave 2) — Offline Storage & Banners
- `lib/offline-storage.ts` — idb-keyval wrapper for trip snapshots (save, get, delete, list, age)
- `lib/use-online-status.ts` — React hook for online/offline events
- `components/OfflineBanner.tsx` — slim banner when offline, shows snapshot age, staleness warning after 24h
- `components/InstallBanner.tsx` — dismissible install prompt with iOS/Android paths
- Both integrated into AppShell

### Plan 03 (Wave 3) — "Leaving Now" Caching Flow
- `lib/cache-trip.ts` — sequential fetcher for 7 trip data types with progress callbacks
- `components/CachingProgressOverlay.tsx` — full-screen modal with animated step checklist
- `components/LeavingNowButton.tsx` — primary CTA on departure page, shows "Update Cache" if already cached
- Integrated into DepartureChecklistClient

### Plan 04 (Wave 4) — Map Tile Caching & Offline States
- SpotMap: `crossOrigin: 'anonymous'` on tile layers for SW intercept
- SpotMap: gray "Cached area only" placeholder for failed tiles
- DepartureChecklistClient: checkboxes disabled offline, "Check-offs sync when you reconnect" caption
- DepartureChecklistClient: generate/send buttons disabled offline with "Connect to..." labels
- DepartureChecklistItem: accepts `disabled` prop

## Design Decision

**Tile caching is passive-only** (not proactive). OSM's Tile Usage Policy prohibits bulk pre-fetching. Tiles are cached by the service worker as the user browses the map normally. This deviates from the original D-12/D-13/D-14 decisions but complies with OSM terms.

## Files Created (14)
- vitest.config.ts
- app/manifest.ts
- public/sw.js, icon-192x192.png, icon-512x512.png, apple-touch-icon.png
- components/ServiceWorkerRegistration.tsx, OfflineBanner.tsx, InstallBanner.tsx
- components/CachingProgressOverlay.tsx, LeavingNowButton.tsx
- lib/offline-storage.ts, use-online-status.ts, cache-trip.ts
- 6 stub test files in lib/__tests__/ and components/__tests__/

## Files Modified (8)
- package.json (vitest, idb-keyval, test scripts)
- tsconfig.json (exclude vitest.config.ts)
- next.config.ts (sw.js cache headers)
- app/layout.tsx (apple-touch-icon)
- components/AppShell.tsx (SW registration, OfflineBanner, InstallBanner)
- components/SpotMap.tsx (crossOrigin, tileerror handler)
- components/DepartureChecklistClient.tsx (LeavingNowButton, offline states)
- components/DepartureChecklistItem.tsx (disabled prop)
