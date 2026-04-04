# S30: Road Trip Scenic Layer — Context

**Session:** S30
**Date:** 2026-04-04
**Status:** Done

## Background

Will drives to remote spots and passes interesting POIs — waterfalls, viewpoints, historic sites, nature reserves — that he often doesn't notice until after the trip. He wanted a "what's interesting near my destination?" card in trip prep.

## What This Addressed

- Trip prep had fuel/grocery stops (Phase 18) but no scenic/POI stops
- No way to discover what was nearby before leaving home
- Overpass API was already in lib/overpass.ts (from Phase 18 fuel stops)

## Design Decision

- **ScenicStopsCard** in trip prep — list of viewpoints, waterfalls, historic sites, nature reserves within 50km
- **fetchScenicStops()** extension to lib/overpass.ts — new query targeting tourism/historic/leisure tags
- **Capped at 6 results** — keeps card scannable; unnamed POIs filtered out
- **Type emojis** — 🏞️ viewpoint, 💧 waterfall, 🏛️ historic, 🌿 nature reserve
- **Tap to open OSM** — each result links to OpenStreetMap for more details

## Key Decisions

- Extends lib/overpass.ts (no new package — same Overpass API client)
- Cap at 6 results + filter unnamed (Overpass can return many noisy results)
- OSM link (not Google Maps) — consistent with free/no-API-key philosophy
- No schema changes — fetched on demand, not cached
- S30 must run after S29 or accept a one-line merge (both touch TripPrepClient.tsx)
