---
phase: 40-gpx-import
plan: 01
type: tdd
wave: 1
depends_on: []
files_modified:
  - package.json
  - package-lock.json
  - prisma/schema.prisma
  - lib/gpx-to-geojson.ts
  - lib/__tests__/gpx-to-geojson.test.ts
autonomous: true
requirements: [GPX-01, GPX-02, GPX-03]

must_haves:
  truths:
    - "gpxToGeoJson() converts a valid GPX XML string to a GeoJSON FeatureCollection"
    - "gpxToGeoJson() normalizes MultiLineString features into individual LineString features"
    - "gpxToGeoJson() handles GPX files with missing elevation without throwing"
    - "Trail model exists in schema.prisma and Location model has trails relation"
    - "npm test passes for gpx-to-geojson.test.ts"
  artifacts:
    - path: "lib/gpx-to-geojson.ts"
      provides: "Server-side GPX → GeoJSON conversion"
      exports: ["gpxToGeoJson"]
    - path: "lib/__tests__/gpx-to-geojson.test.ts"
      provides: "Unit tests for conversion + normalization + edge cases"
    - path: "prisma/schema.prisma"
      provides: "Trail model + Location.trails relation"
      contains: "model Trail"
  key_links:
    - from: "lib/gpx-to-geojson.ts"
      to: "@xmldom/xmldom"
      via: "import { DOMParser } from '@xmldom/xmldom'"
      pattern: "DOMParser.*@xmldom"
    - from: "lib/gpx-to-geojson.ts"
      to: "@tmcw/togeojson"
      via: "import { gpx as toGeojsonGpx } from '@tmcw/togeojson'"
      pattern: "toGeojsonGpx"
---

<objective>
Install GPX parsing dependencies, add the Trail Prisma model, and build + TDD-verify the `gpxToGeoJson()` conversion library.

Purpose: This is the foundation that all other plans depend on. Without `lib/gpx-to-geojson.ts` and the Trail schema, neither the API layer (P02) nor the UI layer (P03) can be built.
Output: Installed deps, Trail schema migration, `lib/gpx-to-geojson.ts`, passing unit tests.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/40-gpx-import/40-CONTEXT.md
@.planning/phases/40-gpx-import/40-RESEARCH.md

Relevant source files:
@lib/gpx.ts
@prisma/schema.prisma
</context>

<interfaces>
<!-- Types the executor needs. Extracted from codebase. -->

From lib/gpx.ts (keep unchanged — waypoint path uses this):
```typescript
export interface GpxWaypoint {
  name: string | null
  description: string | null
  lat: number
  lon: number
  elevation: number | null
  time: string | null
}
export interface GpxTrack { name: string | null; points: GpxTrackPoint[] }
export interface GpxData { name: string | null; waypoints: GpxWaypoint[]; tracks: GpxTrack[] }
```

From @types/geojson (installed in this plan):
```typescript
interface FeatureCollection { type: 'FeatureCollection'; features: Feature[] }
interface Feature { type: 'Feature'; geometry: Geometry; properties: Record<string, unknown> | null }
type Geometry = LineString | MultiLineString | Point | ...
interface LineString { type: 'LineString'; coordinates: number[][] }
interface MultiLineString { type: 'MultiLineString'; coordinates: number[][][] }
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Install dependencies and add Trail schema</name>
  <read_first>
    - prisma/schema.prisma (read full file to understand Location model and existing patterns before modifying)
    - package.json (verify @tmcw/togeojson, @xmldom/xmldom, @types/geojson are NOT already present)
  </read_first>
  <files>package.json, package-lock.json, prisma/schema.prisma</files>
  <action>
**Step 1: Install npm packages**
```bash
npm install @tmcw/togeojson @xmldom/xmldom
npm install --save-dev @types/geojson
```
Expected versions: @tmcw/togeojson@7.1.2, @xmldom/xmldom@0.9.9

**Step 2: Add Trail model to prisma/schema.prisma**

Add the following model at the bottom of schema.prisma (before any closing comments, after the last model):

```prisma
model Trail {
  id             String    @id @default(cuid())
  name           String
  description    String?
  sourceFile     String?
  geoJson        String    // JSON: GeoJSON FeatureCollection from @tmcw/togeojson
  distanceKm     Float?
  elevationGainM Float?
  locationId     String?
  color          String    @default("#22c55e")
  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  location Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)

  @@index([locationId])
  @@index([createdAt])
}
```

Also add the reverse relation to the existing `Location` model. Find the `model Location` block and add `trails Trail[]` to the relation fields list (alongside `trips`, `photos`, `signalLogs`, `seasonalRatings`).

**Step 3: Create and apply migration**
```bash
npx prisma migrate dev --name add-trail-model
```
This creates a migration file in prisma/migrations/ and applies it to dev.db.

**Step 4: Regenerate Prisma client**
```bash
npx prisma generate
```
  </action>
  <verify>
    <automated>node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log(typeof p.trail.findMany)"</automated>
  </verify>
  <acceptance_criteria>
    - package.json contains `"@tmcw/togeojson"` in dependencies
    - package.json contains `"@xmldom/xmldom"` in dependencies
    - package.json contains `"@types/geojson"` in devDependencies
    - prisma/schema.prisma contains `model Trail {`
    - prisma/schema.prisma contains `trails Trail[]` in the Location model block
    - prisma/schema.prisma contains `geoJson        String`
    - prisma/schema.prisma contains `color          String    @default("#22c55e")`
    - `node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log(typeof p.trail.findMany)"` prints `function`
    - A new migration file exists under prisma/migrations/
  </acceptance_criteria>
  <done>Trail model in schema, migration applied, Prisma client regenerated, deps installed</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Build gpx-to-geojson.ts with TDD (RED → GREEN)</name>
  <read_first>
    - .planning/phases/40-gpx-import/40-RESEARCH.md (full file — contains the exact code for gpx-to-geojson.ts and test fixtures)
    - lib/gpx.ts (do not modify; understand the existing waypoint parser to confirm gpx-to-geojson.ts is a separate new file)
    - lib/__tests__/bulk-import.test.ts (read first 40 lines for test file structure / vitest patterns used in this project)
  </read_first>
  <files>lib/gpx-to-geojson.ts, lib/__tests__/gpx-to-geojson.test.ts</files>
  <behavior>
    - Test GPX-01: `gpxToGeoJson(validGpxWithTrack)` returns object with `type === 'FeatureCollection'` and `features.length > 0`
    - Test GPX-02: `gpxToGeoJson(multiLineStringGpx)` returns FeatureCollection where every feature has `geometry.type === 'LineString'` (no MultiLineString present)
    - Test GPX-03: `gpxToGeoJson(gpxWithoutElevation)` returns valid FeatureCollection without throwing (elevation field missing from trkpt elements)
    - Test GPX-04: `gpxToGeoJson(waypointOnlyGpx)` returns FeatureCollection (may have 0 LineString features — that is acceptable)
    - Test edge: empty string input returns FeatureCollection with `features: []` or throws a caught error (not an uncaught crash)
  </behavior>
  <action>
**RED phase — write tests first:**

Create `lib/__tests__/gpx-to-geojson.test.ts`:

```typescript
// @vitest-environment node
import { describe, it, expect } from 'vitest';

// Use require() inside test bodies so vitest doesn't fail at compile time
// before the source file exists (pattern established in Phase 33/29)

const TRACK_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Test Trail</name>
    <trkseg>
      <trkpt lat="35.5951" lon="-82.5515"><ele>800</ele></trkpt>
      <trkpt lat="35.5960" lon="-82.5520"><ele>810</ele></trkpt>
    </trkseg>
  </trk>
</gpx>`;

const WAYPOINT_ONLY_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <wpt lat="35.5951" lon="-82.5515"><name>Summit</name></wpt>
</gpx>`;

const NO_ELEVATION_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>No Elevation</name>
    <trkseg>
      <trkpt lat="35.5951" lon="-82.5515"></trkpt>
      <trkpt lat="35.5960" lon="-82.5520"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

// Simulate a MultiLineString scenario by constructing a FeatureCollection
// that normalizeMultiLineStrings would flatten (tested via white-box unit test)
const MULTI_SEGMENT_GPX = `<?xml version="1.0"?>
<gpx version="1.1" creator="test">
  <trk>
    <name>Multi Segment</name>
    <trkseg>
      <trkpt lat="35.59" lon="-82.55"></trkpt>
      <trkpt lat="35.60" lon="-82.56"></trkpt>
    </trkseg>
    <trkseg>
      <trkpt lat="35.61" lon="-82.57"></trkpt>
      <trkpt lat="35.62" lon="-82.58"></trkpt>
    </trkseg>
  </trk>
</gpx>`;

describe('gpxToGeoJson', () => {
  it('GPX-01: converts valid GPX with track to FeatureCollection', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    const result = gpxToGeoJson(TRACK_GPX);
    expect(result.type).toBe('FeatureCollection');
    expect(Array.isArray(result.features)).toBe(true);
    expect(result.features.length).toBeGreaterThan(0);
  });

  it('GPX-02: normalizes output so no MultiLineString features exist', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    const result = gpxToGeoJson(MULTI_SEGMENT_GPX);
    const multiLineStrings = result.features.filter(
      (f: { geometry: { type: string } }) => f.geometry.type === 'MultiLineString'
    );
    expect(multiLineStrings.length).toBe(0);
  });

  it('GPX-03: handles GPX without elevation gracefully', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    expect(() => gpxToGeoJson(NO_ELEVATION_GPX)).not.toThrow();
    const result = gpxToGeoJson(NO_ELEVATION_GPX);
    expect(result.type).toBe('FeatureCollection');
  });

  it('GPX-04: handles waypoint-only GPX (no tracks) without error', () => {
    const { gpxToGeoJson } = require('@/lib/gpx-to-geojson');
    expect(() => gpxToGeoJson(WAYPOINT_ONLY_GPX)).not.toThrow();
    const result = gpxToGeoJson(WAYPOINT_ONLY_GPX);
    expect(result.type).toBe('FeatureCollection');
  });
});
```

Run tests to confirm RED: `npm test -- lib/__tests__/gpx-to-geojson.test.ts`
All 4 tests should fail with MODULE_NOT_FOUND or similar.

**GREEN phase — implement lib/gpx-to-geojson.ts:**

```typescript
// lib/gpx-to-geojson.ts
// Server-side GPX → GeoJSON conversion using @tmcw/togeojson + @xmldom/xmldom
// Must use xmldom's DOMParser — native browser DOMParser not available in Node.js
import { gpx as toGeojsonGpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection, Feature } from 'geojson';

/**
 * Convert GPX XML string to GeoJSON FeatureCollection.
 * MultiLineString features are normalized to individual LineString features
 * to work around Leaflet 1.9.4 bug (GitHub #9533 — unfixed as of April 2025).
 */
export function gpxToGeoJson(gpxString: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(gpxString, 'text/xml');
  const fc = toGeojsonGpx(doc) as FeatureCollection;
  return normalizeMultiLineStrings(fc);
}

function normalizeMultiLineStrings(fc: FeatureCollection): FeatureCollection {
  const features: Feature[] = fc.features.flatMap((f) => {
    if (f.geometry.type === 'MultiLineString') {
      return f.geometry.coordinates.map((coords) => ({
        type: 'Feature' as const,
        properties: f.properties,
        geometry: { type: 'LineString' as const, coordinates: coords },
      }));
    }
    return [f];
  });
  return { ...fc, features };
}
```

Run tests to confirm GREEN: `npm test -- lib/__tests__/gpx-to-geojson.test.ts`
All 4 tests should pass.
  </action>
  <verify>
    <automated>npm test -- lib/__tests__/gpx-to-geojson.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - lib/gpx-to-geojson.ts exists
    - lib/gpx-to-geojson.ts contains `export function gpxToGeoJson(`
    - lib/gpx-to-geojson.ts contains `import { DOMParser } from '@xmldom/xmldom'`
    - lib/gpx-to-geojson.ts contains `import { gpx as toGeojsonGpx } from '@tmcw/togeojson'`
    - lib/gpx-to-geojson.ts contains `normalizeMultiLineStrings`
    - lib/__tests__/gpx-to-geojson.test.ts exists
    - `npm test -- lib/__tests__/gpx-to-geojson.test.ts` exits 0 with all 4 tests passing
    - `npm run build` exits 0 (TypeScript compiles without errors)
  </acceptance_criteria>
  <done>gpxToGeoJson() converts GPX to GeoJSON, normalizes MultiLineString, handles missing elevation — all 4 unit tests pass</done>
</task>

</tasks>

<verification>
```bash
# Trail model accessible via Prisma client
node -e "const { PrismaClient } = require('@prisma/client'); const p = new PrismaClient(); console.log(typeof p.trail.findMany)"
# → function

# Unit tests pass
npm test -- lib/__tests__/gpx-to-geojson.test.ts

# TypeScript compiles
npm run build
```
</verification>

<success_criteria>
- `@tmcw/togeojson`, `@xmldom/xmldom` in package.json dependencies; `@types/geojson` in devDependencies
- `prisma/schema.prisma` contains `model Trail {` with `geoJson String`, `color String @default("#22c55e")`, and `locationId String?`
- `prisma/schema.prisma` has `trails Trail[]` in Location model
- Migration file in prisma/migrations/ for trail model
- `lib/gpx-to-geojson.ts` exports `gpxToGeoJson(gpxString: string): FeatureCollection`
- All 4 unit tests in `lib/__tests__/gpx-to-geojson.test.ts` pass
- TypeScript build succeeds
</success_criteria>

<output>
After completion, create `.planning/phases/40-gpx-import/40-P01-SUMMARY.md`
</output>
