---
phase: 44-google-maps-list-import
plan: "01"
subsystem: import
tags: [google-maps, scraping, api-route, parsing, tdd]
dependency_graph:
  requires: [44-00]
  provides: [lib/gmaps-import.ts, app/api/import/gmaps-list/route.ts]
  affects: [app/spots]
tech_stack:
  added: []
  patterns: [server-side-fetch, regex-extraction, json-ld-fallback, url-validation]
key_files:
  created:
    - lib/gmaps-import.ts
    - app/api/import/gmaps-list/route.ts
    - tests/gmaps-import.test.ts
  modified: []
decisions:
  - "Use ES import (not require()) for fetchGmapsList in tests — Vitest ESM mode does not support require() for TypeScript modules in this project setup"
  - "extractNameNear scans backward 500 chars from coordinate match, replaces escaped quotes before matching, returns last double-quoted 2-80 char string"
  - "JSON-LD fallback safely type-narrows all fields — no any usage, unknown narrowed before access"
metrics:
  duration_seconds: 241
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 3
requirements: [GMAPS-01, GMAPS-02, GMAPS-05]
---

# Phase 44 Plan 01: Google Maps List Import — Core Library and API Route Summary

**One-liner:** Server-side HTML scraper with `[null,null,lat,lng]` regex extraction plus JSON-LD fallback, wrapped in a validated POST endpoint.

## What Was Built

### lib/gmaps-import.ts
Exports `GmapsPlace` interface and `fetchGmapsList(url)` async function:
- Fetches with Chrome browser User-Agent and 15s `AbortSignal.timeout`
- Detects `accounts.google.com` redirect and throws descriptive sign-in error
- Primary extraction: `[null,null,lat,lng]` regex with coordinate range validation, dedup by `lat.toFixed(5),lng.toFixed(5)` key, and backward name scan within 500 chars
- Fallback: JSON-LD `application/ld+json` ItemList blocks with safe `unknown` type narrowing
- Zero results throws `'No places found. The list may be private or the page format has changed.'`

### app/api/import/gmaps-list/route.ts
POST endpoint at `/api/import/gmaps-list`:
- Validates `url` field is present (400 if missing)
- Validates URL starts with `maps.app.goo.gl` or `google.com/maps` (400 if not)
- Calls `fetchGmapsList` and returns `{ places }` on success
- Surfaces library errors (sign-in, zero results) as `{ error }` with status 500
- Follows project pattern: try-catch + `console.error` + `NextResponse.json`

### tests/gmaps-import.test.ts
4 unit tests covering the Wave 0 contract:
1. Extracts places with correct lat/lng from fixture HTML
2. Coordinates are `typeof 'number'` not strings
3. Empty HTML throws `/No places found/`
4. Sign-in redirect throws `/sign-in/i`

All 4 tests pass GREEN.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Switched from require() to ES import in test file**
- **Found during:** Task 1 — RED state verification
- **Issue:** Plan specified `require('../lib/gmaps-import')` inside test bodies (for MODULE_NOT_FOUND RED state per Phase 33/34 pattern). However, this project's Vitest uses ESM mode (`module: esnext`, `moduleResolution: bundler`) and does not support `require()` for TypeScript source files.
- **Fix:** Since the source file is created in the same plan (not a prior plan), switched to standard ES import (`import { fetchGmapsList } from '../lib/gmaps-import'`). Tests run correctly with this approach.
- **Files modified:** `tests/gmaps-import.test.ts`
- **Commit:** 25f0741

## Known Stubs

None — both exported functions are fully implemented and the API route is wired to the real library.

## Self-Check

### Files exist:
- `lib/gmaps-import.ts` — FOUND
- `app/api/import/gmaps-list/route.ts` — FOUND
- `tests/gmaps-import.test.ts` — FOUND

### Commits exist:
- `25f0741` — feat(44-01): implement lib/gmaps-import.ts with fetchGmapsList and coordinate extraction
- `74ae8f4` — feat(44-01): create POST /api/import/gmaps-list API route

## Self-Check: PASSED
