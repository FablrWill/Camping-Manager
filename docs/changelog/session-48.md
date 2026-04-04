# Session 48 — S30 Road Trip Scenic Layer

**Date:** 2026-04-04
**Branch:** claude/infallible-margulis (worktree)

## Summary

S30: Scenic stops card in trip prep — waterfalls, viewpoints, historic sites, nature reserves within 50km of destination via Overpass API extension.

## Changes

### New Files
- `components/ScenicStopsCard.tsx` — loading skeleton / empty / loaded list; type emoji + name + distance; tap opens OSM link
- `app/api/trips/[id]/scenic-stops/route.ts` — GET: trip location coords → fetchScenicStops() → {stops:[]}

### Modified Files
- `lib/overpass.ts` — add fetchScenicStops(), ScenicStop interface; tourism=viewpoint/waterfall/attraction, historic=*, leisure=nature_reserve; cap at 6, filter unnamed
- `components/TripPrepClient.tsx` — render ScenicStopsCard below LastStopsCard

## Schema Changes

None. Fetched on demand from Overpass API.

## Key Notes

- Type emojis: 🏞️ viewpoint, 💧 waterfall, 🏛️ historic, 🌿 nature
- Results capped at 6, unnamed POIs filtered
- OSM links — no API key required

## Commits

- `fe9a41b` feat: scenic stops card via Overpass API extension
