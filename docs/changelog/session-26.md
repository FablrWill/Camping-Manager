# Session 26 — Phase 10 Planning (Review Revision)

**Date:** 2026-04-02
**Branch:** claude/elegant-hodgkin
**Phase:** 10 — Offline Read Path & PWA Completion

## What Happened

Replanned Phase 10 incorporating cross-AI review feedback from Gemini and Claude self-review. Plans 02 and 03 were revised to address all HIGH and MEDIUM concerns.

## Changes Made

### Plan 10-02 (Tile Prefetch + Offline Write Queue) — Revised
- Added concurrent tile fetching with `Promise.allSettled` in batches of 6
- Added zoom 15-16 destination detail tiles at 1-mile radius
- Verified sw.js tile caching (network-first handler confirmed)
- Documented `clear(queueStore)` usage for write queue cleanup

### Plan 10-03 (Dual-Mode Components) — Revised
- Added 300ms debounce to `useOnlineStatus` hook to prevent connectivity flapping
- Moved write queue sync from DepartureChecklistClient to AppShell (app-wide)
- Added pending sync count indicator to OfflineBanner
- Replaced `unknown` offlineData typing with concrete types (PackingListResult, MealPlanResult, DayForecast)
- SpotsClient now merges spots from ALL cached trips instead of first only

### Verification
- Plan checker passed all 10 dimensions
- All 4 requirements (OFF-01 through OFF-04) covered
- All HIGH review items addressed, all MEDIUM items addressed or deferred with reasoning

## Review Items Deferred
- Force-sync snapshot on trip save (out of scope — "Leaving Now" is the explicit trigger)
- Tile storage cleanup on new trip cache (future concern if storage becomes a problem)

## Next Steps
- `/gsd:execute-phase 10` — run all 4 plans in 3 waves
