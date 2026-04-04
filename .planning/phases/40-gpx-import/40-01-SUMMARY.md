---
phase: 40-gpx-import
plan: 01
subsystem: database
tags: [gpx, geojson, prisma, sqlite, migration, vitest, togeojson, xmldom]

# Dependency graph
requires: []
provides:
  - "@tmcw/togeojson + @xmldom/xmldom GPX parsing dependencies installed"
  - "Trail Prisma model with geoJson, color, locationId fields"
  - "trails Trail[] relation on Location model"
  - "lib/gpx-to-geojson.ts: gpxToGeoJson() converts GPX XML to GeoJSON FeatureCollection"
  - "MultiLineString normalization for Leaflet 1.9.4 compatibility"
  - "4 unit tests verifying conversion + normalization + edge cases"
  - "Migration history fixed to apply cleanly on fresh dev.db"
affects:
  - 40-02-PLAN
  - 40-03-PLAN
  - spots/map page (trail overlay rendering)
  - any feature importing or displaying trail data

# Tech tracking
tech-stack:
  added:
    - "@tmcw/togeojson@7.1.2 — GPX to GeoJSON conversion"
    - "@xmldom/xmldom@0.9.9 — Node.js DOMParser for server-side XML parsing"
    - "@types/geojson — TypeScript types for GeoJSON"
  patterns:
    - "Use @xmldom/xmldom DOMParser (not browser DOMParser) for server-side GPX parsing"
    - "Normalize MultiLineString to LineString features for Leaflet 1.9.4 compatibility"
    - "Direct import in vitest tests (require() with @/ alias does not resolve)"
    - "Manual migration creation + migrate deploy for migration history with pre-existing conflicts"

key-files:
  created:
    - lib/gpx-to-geojson.ts
    - lib/__tests__/gpx-to-geojson.test.ts
    - prisma/migrations/20260404260000_add_trail_model/migration.sql
    - prisma/migrations/20260404239900_add_agent_job_kit_preset/migration.sql
    - prisma/migrations/20260404150001_add_gear_research_fields/migration.sql
    - prisma/migrations/20260404260001_add_trip_emergency_contacts/migration.sql
  modified:
    - prisma/schema.prisma
    - package.json
    - package-lock.json
    - prisma/migrations/20260404100000_phase35_shopping_prep_feedback/migration.sql

key-decisions:
  - "Use direct ESM import in vitest tests — require() with @/ alias fails because vitest alias resolution only applies to ESM imports, not CommonJS require()"
  - "Manual migration creation + migrate deploy pattern — shadow database validation rejects duplicate migrations in this project's history"
  - "Fix migration history to enable fresh dev.db creation — multiple columns (emergencyContactName, researchResult) were missing from migrations"
  - "Trail.color defaults to #22c55e (Tailwind green-500) — established as the default trail color for GPX overlays"

patterns-established:
  - "vitest TDD: use direct import (`import { fn } from '../module'`), not require() inside test bodies"
  - "New migration files use timestamp format YYYYMMDDHHMMSS with descriptive names"
  - "Migration history fixup: add missing migrations for fresh DB creation alongside feature migrations"

requirements-completed: [GPX-01, GPX-02, GPX-03]

# Metrics
duration: 11min
completed: 2026-04-04
---

# Phase 40 Plan 01: GPX Foundation Summary

**GPX parsing foundation: @tmcw/togeojson library installed, Trail Prisma model migrated, gpxToGeoJson() converting GPX XML to normalized GeoJSON FeatureCollections with 4 passing unit tests**

## Performance

- **Duration:** 11 min
- **Started:** 2026-04-04T19:38:27Z
- **Completed:** 2026-04-04T19:49:14Z
- **Tasks:** 2
- **Files modified:** 11

## Accomplishments
- Installed @tmcw/togeojson, @xmldom/xmldom, @types/geojson — all required GPX parsing dependencies
- Added Trail model to schema.prisma with geoJson, color, locationId, distanceKm, elevationGainM fields + trails[] relation on Location
- Implemented gpxToGeoJson() with MultiLineString normalization (Leaflet 1.9.4 bug workaround)
- All 4 unit tests pass: valid track, multi-segment normalization, missing elevation, waypoint-only GPX
- Fixed migration history so fresh dev.db applies all 42 migrations cleanly
- TypeScript build passes

## Task Commits

1. **Task 1: Install dependencies and add Trail schema** - `7e446c7` (feat)
2. **Task 2 RED: Add failing tests for gpxToGeoJson** - `29f7145` (test)
3. **Task 2 GREEN: Implement gpxToGeoJson** - `36d1285` (feat)

## Files Created/Modified
- `lib/gpx-to-geojson.ts` - GPX XML to GeoJSON conversion + MultiLineString normalization
- `lib/__tests__/gpx-to-geojson.test.ts` - 4 unit tests for conversion, normalization, edge cases
- `prisma/schema.prisma` - Trail model added, trails[] relation on Location
- `package.json` / `package-lock.json` - Added @tmcw/togeojson, @xmldom/xmldom, @types/geojson
- `prisma/migrations/20260404260000_add_trail_model/migration.sql` - Trail table CREATE
- `prisma/migrations/20260404239900_add_agent_job_kit_preset/migration.sql` - Missing AgentJob+KitPreset tables
- `prisma/migrations/20260404150001_add_gear_research_fields/migration.sql` - Missing researchResult/researchedAt columns
- `prisma/migrations/20260404260001_add_trip_emergency_contacts/migration.sql` - Missing emergency contact columns
- `prisma/migrations/20260404100000_phase35_shopping_prep_feedback/migration.sql` - Fixed duplicate prepGuide

## Decisions Made
- Direct ESM import in vitest tests rather than require() inside test bodies — @/ alias only works with ESM imports in vitest, not CommonJS require()
- Manual migration creation + migrate deploy pattern — the project's migration history has pre-existing conflicts that prevent prisma migrate dev shadow DB validation
- Migration history fixup included as part of this plan — multiple prior migrations were missing table/column CREATE statements needed for fresh database creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed require('@/lib/gpx-to-geojson') path alias in vitest tests**
- **Found during:** Task 2 (TDD RED phase)
- **Issue:** Tests used `require('@/lib/gpx-to-geojson')` but vitest's @/ alias only resolves for ESM imports; CJS require() cannot use it
- **Fix:** Changed test to use direct ESM import: `import { gpxToGeoJson } from '../gpx-to-geojson'`
- **Files modified:** lib/__tests__/gpx-to-geojson.test.ts
- **Verification:** All 4 tests pass after fix
- **Committed in:** 36d1285 (Task 2 feat commit)

**2. [Rule 1 - Bug] Fixed duplicate prepGuide in phase35 migration**
- **Found during:** Task 1 (migration apply)
- **Issue:** 20260404100000_phase35_shopping_prep_feedback duplicated ADD COLUMN prepGuide from 20260404000000_add_meal_feedback — failed on fresh DB with "duplicate column name"
- **Fix:** Made second migration idempotent using CREATE TABLE IF NOT EXISTS, removed duplicate ALTER TABLE
- **Files modified:** prisma/migrations/20260404100000_phase35_shopping_prep_feedback/migration.sql
- **Verification:** All 42 migrations apply cleanly to fresh dev.db
- **Committed in:** 7e446c7 (Task 1 commit)

**3. [Rule 1 - Bug] Added missing AgentJob and KitPreset migration**
- **Found during:** Task 1 (migration apply)
- **Issue:** AgentJob table referenced in ALTER TABLE migration but never created; no CREATE TABLE in any migration
- **Fix:** Created 20260404239900_add_agent_job_kit_preset with CREATE TABLE for both models
- **Files modified:** prisma/migrations/20260404239900_add_agent_job_kit_preset/migration.sql (new)
- **Verification:** Migration applies, Prisma client generates p.agentJob.findMany
- **Committed in:** 7e446c7 (Task 1 commit)

**4. [Rule 1 - Bug] Added missing GearItem research fields migration**
- **Found during:** Task 2 (npm run build)
- **Issue:** researchResult and researchedAt in schema.prisma but never in any migration — build failed at prerender
- **Fix:** Created 20260404150001_add_gear_research_fields with ALTER TABLE
- **Files modified:** prisma/migrations/20260404150001_add_gear_research_fields/migration.sql (new)
- **Verification:** Build succeeds after migration applied
- **Committed in:** 36d1285 (Task 2 feat commit)

**5. [Rule 1 - Bug] Added missing Trip emergency contact fields migration**
- **Found during:** Task 2 (npm run build)
- **Issue:** emergencyContactName and emergencyContactEmail commented out in Phase 7 migration (were "already applied" in production) — missing on fresh DB
- **Fix:** Created 20260404260001_add_trip_emergency_contacts with ALTER TABLE
- **Files modified:** prisma/migrations/20260404260001_add_trip_emergency_contacts/migration.sql (new)
- **Verification:** Build succeeds, all pages prerender
- **Committed in:** 36d1285 (Task 2 feat commit)

---

**Total deviations:** 5 auto-fixed (5 Rule 1 bugs)
**Impact on plan:** All fixes necessary for correctness — migration history had multiple gaps preventing fresh database creation. No scope creep.

## Issues Encountered
- Migration history written for production DB state (columns already existed) — not reproducible from scratch. Required systematic identification and patching of missing migrations.
- This pattern is documented in project decisions: "Migration created manually and applied via prisma migrate deploy due to non-interactive agent environment."

## Known Stubs
None — no stub values, placeholder text, or unwired data sources in the delivered code.

## Next Phase Readiness
- lib/gpx-to-geojson.ts exports gpxToGeoJson() — ready for Plan 02 (API layer)
- Trail model accessible via PrismaClient.trail — ready for Plan 02 CRUD routes
- Migration history is now stable — fresh dev.db creation works cleanly
- Plan 02 (API + file upload) and Plan 03 (map UI) can proceed

---
*Phase: 40-gpx-import*
*Completed: 2026-04-04*
