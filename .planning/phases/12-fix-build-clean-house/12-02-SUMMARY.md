---
plan: 12-02
phase: 12-fix-build-clean-house
status: done
session: tender-sinoussi
---

# Plan 12-02 Summary: SW Cache + tripCoords Pipe

## What Was Done

### Task 1: Service Worker Runtime Caching (BUILD-06)
- Added `/chat` to `SHELL_ASSETS` array in `public/sw.js`
- Added runtime cache rule for `/trips/*/depart` and `/trips/*/prep` navigation requests
  - Network-first strategy: fetches fresh, caches on success
  - Falls back to `/trips` shell page when both network and cache fail
  - Placed after OSM tile handler, before the generic cache-first fallback

### Task 2: tripCoords Pipe (BUILD-07)
- **`app/trips/[id]/depart/page.tsx`**: Extended Prisma query to include `location: { select: { latitude: true, longitude: true } }`, computed `tripCoords` from the result, and passed it to `<DepartureChecklistClient>`
- **`components/DepartureChecklistClient.tsx`**: Added `tripCoords?: { lat: number; lon: number }` to `DepartureChecklistClientProps`, destructured it from props, and forwarded it to `<LeavingNowButton>`

## Verification Results
- `grep "depart\|prep" public/sw.js` — runtime cache rule confirmed present
- `grep "tripCoords" depart/page.tsx DepartureChecklistClient.tsx` — prop threading confirmed end-to-end
- `npm test` — 90 tests pass, 0 failures
- TypeScript: pre-existing Prisma client stale errors unchanged; no new errors introduced in prop threading code

## Files Modified
- `public/sw.js`
- `app/trips/[id]/depart/page.tsx`
- `components/DepartureChecklistClient.tsx`
