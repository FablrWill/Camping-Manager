---
phase: 40-gpx-import
plan: 02
subsystem: api
tags: [gpx, trails, api, prisma, next.js, geojson]

# Dependency graph
requires:
  - "40-01: lib/gpx-to-geojson.ts (gpxToGeoJson function)"
  - "40-01: Trail Prisma model with geoJson, color fields"
provides:
  - "POST /api/import/gpx extended — creates Trail records from track data"
  - "GET /api/trails — list endpoint (no geoJson blob)"
  - "GET /api/trails/[id] — single trail with full geoJson"
  - "DELETE /api/trails/[id] — remove trail"
affects:
  - 40-03-PLAN (map UI consumes these routes)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Next.js 16 async params: await params inside handler, not destructured from signature"
    - "Trail list excludes geoJson field — fetched on demand via /api/trails/[id] to keep list responses small"
    - "GPX import creates at most one Trail per import (all track features merged into one FeatureCollection)"

key-files:
  created:
    - app/api/trails/route.ts
    - app/api/trails/[id]/route.ts
  modified:
    - app/api/import/gpx/route.ts

key-decisions:
  - "Single Trail record per GPX import — all LineString/MultiLineString features collected into one FeatureCollection; trailsCreated is 0 or 1"
  - "Trail name priority: data.name (from GPX) > body.filename > 'Imported Trail'"
  - "List endpoint omits geoJson — full record (including geoJson) available via GET /api/trails/[id]"

requirements-completed: [GPX-04, GPX-05]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 40 Plan 02: API Layer Summary

**Trail API layer: POST /api/import/gpx extended to persist Trail records, GET /api/trails and GET+DELETE /api/trails/[id] created — all routes build cleanly with async params pattern**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-04T19:53:21Z
- **Completed:** 2026-04-04T19:57:33Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Extended POST /api/import/gpx: parses GPX with gpxToGeoJson(), filters LineString/MultiLineString features, creates Trail record when tracks exist, returns trailsCreated in response
- Waypoint→Location logic completely preserved (unchanged)
- Created GET /api/trails: trail list ordered by createdAt desc, geoJson excluded for compact responses
- Created GET /api/trails/[id]: full trail record including geoJson blob
- Created DELETE /api/trails/[id]: removes trail, returns { success: true }
- TypeScript build passes with no errors

## Task Commits

1. **Task 1: Extend GPX import to persist Trail records** - `aab5fff` (feat)
2. **Task 2: Create /api/trails list and /api/trails/[id] routes** - `5f104b4` (feat)

## Files Created/Modified
- `app/api/import/gpx/route.ts` - Added gpxToGeoJson import, track→Trail persistence, trailsCreated response field
- `app/api/trails/route.ts` - GET /api/trails list endpoint (no geoJson, ordered by createdAt desc)
- `app/api/trails/[id]/route.ts` - GET /api/trails/[id] full trail + DELETE /api/trails/[id]

## Decisions Made
- Single Trail record per GPX import — all track features merged into one FeatureCollection; avoids having many tiny Trail rows for multi-segment GPX files
- Trail name priority order: GPX file's name attribute > body.filename > 'Imported Trail'
- List endpoint deliberately excludes geoJson field — the blob can be hundreds of KB; fetched per-trail only when map needs to render it

## Deviations from Plan

### Merge Pre-requisite

**[Rule 3 - Blocking] Merged claude/practical-tharp to bring P01 artifacts into worktree**
- **Found during:** Pre-execution setup
- **Issue:** This worktree (worktree-agent-a40def2e) was on main; lib/gpx-to-geojson.ts and .planning/phases/40-gpx-import/ were only on claude/practical-tharp from P01
- **Fix:** `git merge claude/practical-tharp` — resolved STATE.md/ROADMAP.md conflicts by accepting theirs (more accurate state), schema auto-resolved cleanly with Trail model present
- **Impact:** No plan changes needed; merge was a prerequisite, not scope change

**[Rule 3 - Blocking] npm install needed for @tmcw/togeojson and @xmldom/xmldom**
- **Found during:** Task 1 (npm run build)
- **Issue:** package.json had the dependencies but node_modules lacked them (packages installed in practical-tharp worktree, not shared)
- **Fix:** Ran `npm install` in this worktree
- **Impact:** Build now passes; no code changes

## Known Stubs
None — all three routes have wired database operations, no placeholder returns or hardcoded data.

## Next Phase Readiness
- GET /api/trails ready for P03 (TrailList component)
- GET /api/trails/[id] ready for P03 (Leaflet geoJson overlay loading)
- DELETE /api/trails/[id] ready for P03 (remove trail from list)
- POST /api/import/gpx ready for P03 (GPX upload modal)

---
*Phase: 40-gpx-import*
*Completed: 2026-04-04*
