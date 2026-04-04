---
phase: 44
plan: 00
name: google-maps-list-import
subsystem: import
tags: [import, google-maps, locations, file-upload, tests]
dependency_graph:
  requires: []
  provides: [google-maps-saved-places-import, google-maps-parser-tests]
  affects: [app/spots, app/api/import/google-maps]
tech_stack:
  added: []
  patterns: [multipart/form-data, GeoJSON FeatureCollection parsing, exported parser functions for testing]
key_files:
  created:
    - lib/__tests__/google-maps-import.test.ts
  modified:
    - app/api/import/google-maps/route.ts
    - app/spots/spots-client.tsx
decisions:
  - Export parseLocationsFromText and parseSavedPlacesJson as named exports — allows direct unit testing without mocking the DB
  - parseSavedPlacesJson reads coordinates from both geometry.coordinates (GeoJSON [lon, lat]) and Location.Geo Coordinates (string fields) — handles format variations across Takeout exports
  - saveLocations() extracted as shared helper — avoids duplicating dedup+create logic between JSON and multipart paths
  - File upload uses multipart/form-data detected via Content-Type header — no URL param needed, clean routing
metrics:
  duration_seconds: 230
  completed_date: "2026-04-04"
  tasks_completed: 3
  files_modified: 3
---

# Phase 44 Plan 00: Google Maps List Import Summary

**One-liner:** Google Takeout Saved Places.json parser + file upload UI with 19 unit tests covering all coordinate extraction patterns.

## What Was Built

### Task 1 — API: Saved Places JSON parser + multipart upload

Extended `app/api/import/google-maps/route.ts`:
- Added `parseSavedPlacesJson(json: unknown): ParsedLocation[]` — handles the Google Takeout GeoJSON FeatureCollection format, extracting name (Business Name > Title), coordinates (geometry first, Geo Coordinates fallback), and address
- Exported `parseLocationsFromText` and `isValidCoord` for testing
- POST endpoint now dispatches on `Content-Type`:
  - `multipart/form-data` → reads `.json` file, parses as Saved Places, saves to DB
  - `application/json` → existing text/URL paste path (unchanged)
- Extracted `saveLocations()` helper shared between both paths

### Task 2 — UI: File upload in Spots import panel

Updated `app/spots/spots-client.tsx`:
- Added `<input type="file" accept=".json">` above the textarea in the Google Maps import panel
- `handleGmapsFileImport()` posts multipart form data, shows progress and results
- Description text updated to mention Saved Places.json from Google Takeout
- Textarea paste remains the fallback/alternative

### Task 3 — Tests: 19 unit tests

Created `lib/__tests__/google-maps-import.test.ts`:
- `isValidCoord`: bounds checking
- `parseLocationsFromText`: URL @lat,lon, /place/ URL, decimal pairs, name+coord patterns, deduplication, multiple locations
- `parseSavedPlacesJson`: geometry coords, Geo Coordinates fallback, Business Name/Title priority, address extraction, invalid coord skipping, non-FeatureCollection returns empty

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run test -- lib/__tests__/google-maps-import.test.ts --run` → 19/19 tests pass
- `npm run build` → passes clean

## Self-Check

- [x] `app/api/import/google-maps/route.ts` — modified (multipart + Saved Places parser)
- [x] `app/spots/spots-client.tsx` — modified (file upload input + handler)
- [x] `lib/__tests__/google-maps-import.test.ts` — created (19 tests)
- Commits: c544c55, 6e94f3a, d125f09
