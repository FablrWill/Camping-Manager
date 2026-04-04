# S30: Road Trip Scenic Layer — Summary

**Completed:** 2026-04-04
**Session:** S30 (V2 queue)

## What Was Shipped

- **fetchScenicStops()** in `lib/overpass.ts` — Overpass query for tourism=viewpoint/waterfall/attraction, historic=*, leisure=nature_reserve; ScenicStop interface; results capped at 6, unnamed filtered
- **GET /api/trips/[id]/scenic-stops** — reads trip location coords, calls fetchScenicStops(), returns {stops:[]}
- **ScenicStopsCard** (`components/ScenicStopsCard.tsx`) — loading skeleton / empty / loaded list; type emoji + name + distance; tap opens OSM link
- **TripPrepClient integration** — ScenicStopsCard renders below LastStopsCard in trip prep

## Schema Changes

None. Fetched on demand via Overpass API.

## Key Notes

- Results capped at 6 to keep card scannable
- Unnamed POIs filtered (Overpass often returns many noisy unnamed results)
- Type emojis: 🏞️ viewpoint, 💧 waterfall, 🏛️ historic, 🌿 nature reserve
- OSM link per result — consistent with free/no-API-key philosophy
- Ran after S29 to avoid TripPrepClient.tsx conflict

## Follow-On

- Future: filter scenic stops by type (e.g., only waterfalls)
- Future: add scenic stops to packing list context (e.g., "You're passing a waterfall — pack water shoes")
