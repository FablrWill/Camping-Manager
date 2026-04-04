# S30: Road Trip Scenic Layer — Plan

## Goal

Add a scenic POI card to trip prep showing interesting stops (viewpoints, waterfalls, historic sites, nature reserves) near the destination.

## Files Created

- `components/ScenicStopsCard.tsx` — fetches on mount; states: loading skeleton / empty / loaded list; type emoji + name + distance; tap opens OSM link
- `app/api/trips/[id]/scenic-stops/route.ts` — GET: reads trip location coords, calls fetchScenicStops(), returns {stops:[]}

## Files Modified

- `lib/overpass.ts` — add `fetchScenicStops()` targeting tourism=viewpoint/waterfall/attraction, historic=*, leisure=nature_reserve; new `ScenicStop` interface; cap at 6, filter unnamed
- `components/TripPrepClient.tsx` — render ScenicStopsCard below LastStopsCard (fuel/grocery section)

## Key Decisions

- Extends existing lib/overpass.ts (no new package)
- Results capped at 6, unnamed POIs filtered
- OSM link for each result (free, no API key)
- No schema changes — fetched on demand, not cached

## Verification

- `npm run build` passes
- No TypeScript errors
