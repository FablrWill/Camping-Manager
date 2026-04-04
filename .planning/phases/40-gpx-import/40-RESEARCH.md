# Phase 40: GPX Import (AllTrails/Wikiloc trail overlays) - Research

**Researched:** 2026-04-04
**Domain:** GPX parsing, GeoJSON storage, Leaflet trail rendering, Next.js file handling
**Confidence:** HIGH

---

## Summary

This phase extends the existing GPX import infrastructure (which already creates Location records from waypoints) to also persist trail track data as colored polyline overlays on the Spots map. The codebase already has `lib/gpx.ts` (hand-rolled regex parser) and `app/api/import/gpx/route.ts` (accepts JSON body with `gpx` string). The scope here is: add a `Trail` model, store the full GeoJSON of tracks, render them as a new layer in `SpotMap.tsx`, and add a trails list/toggle UI in `SpotsClient`.

**Critical discovery:** The existing `lib/gpx.ts` is a hand-rolled regex parser that does not produce GeoJSON. This works for waypoint extraction but is inadequate for reliable track rendering. The decision to replace it vs. extend it is a key planning choice — this research recommends **extending** rather than replacing (keep the waypoint path, add `@tmcw/togeojson` for track GeoJSON output used for persistence and rendering).

**Primary recommendation:** Add `@tmcw/togeojson` + `@xmldom/xmldom` for server-side GPX-to-GeoJSON conversion. Store the resulting FeatureCollection JSON in a `Trail` model TEXT column. Render from stored GeoJSON using `L.geoJSON()` in SpotMap. Client sends raw GPX text as JSON body (current pattern — keep it).

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@tmcw/togeojson` | 7.1.2 | GPX/KML to GeoJSON | 98k weekly downloads, actively maintained (last publish May 2025), TypeScript built-in, no dependencies, handles AllTrails/Wikiloc quirks |
| `@xmldom/xmldom` | 0.9.9 | XML DOM parser for Node.js | Required by togeojson in Node — DOMParser is browser-only, xmldom handles invalid XML that DOMParser silently truncates |
| Prisma 6 (existing) | 6.19.2 | New `Trail` model | Already in use — TEXT column for JSON storage |
| Leaflet `L.geoJSON()` (existing) | 1.9.4 | Render FeatureCollection as polyline overlay | Built into Leaflet, handles `LineString` automatically with correct coordinate conversion |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `geojson` (types only) | `@types/geojson` | TypeScript types for FeatureCollection, Feature, LineString | Import for type annotations |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@tmcw/togeojson` | existing `lib/gpx.ts` | Hand-rolled regex works for waypoints but is fragile for AllTrails tracks (multi-segment, route elements, `<extensions>` tags) — togeojson is battle-tested and handles GPX edge cases |
| `@tmcw/togeojson` | `gpxparser` (npm) | gpxparser 0.16.0, last published 2022-09-20, 3 years stale — do not use |
| `@tmcw/togeojson` | `togeojson` (mapbox fork) | 0.16.2, last published same era, unmaintained — do not use |
| Server-side parse | Client-side parse | Client-side reduces server load but increases bundle size and breaks if parsing library isn't tree-shaken; server-side keeps client bundle clean and matches existing pattern |

**Installation:**
```bash
npm install @tmcw/togeojson @xmldom/xmldom
npm install --save-dev @types/geojson
```

**Version verification (confirmed 2026-04-04):**
- `@tmcw/togeojson`: 7.1.2, published 2025-05-31
- `@xmldom/xmldom`: 0.9.9, current
- `@types/geojson`: install to get `FeatureCollection`, `Feature`, `LineString`, `MultiLineString` types

---

## Architecture Patterns

### Parse Location: Server-Side (keep existing pattern)

The current `handleGpxFile` in `SpotsClient` reads the file with `file.text()`, sends raw GPX XML as a JSON string to `/api/import/gpx`. This is the correct pattern — keep it. No FormData/multipart needed. The API route body is JSON with `{ gpx: string }`.

**Why server-side is correct:**
- GPX files are typically 10–500KB of text — well under Next.js's route handler body limit (~4MB default for JSON in practice, not officially documented as per-route configurable in App Router)
- Keeps `@tmcw/togeojson` + `@xmldom/xmldom` server-only (no bundle impact on mobile client)
- The PWA offline constraint does not apply to the import action itself — importing requires connectivity regardless

**Body size:** AllTrails exports are typically 20–200KB XML text. As JSON-encoded string in a body, these are safely under any reasonable limit. A 2000-point trail encoded as JSON adds ~10% overhead — still ~220KB. No size limit changes needed.

### GeoJSON Storage Strategy: Option A (full FeatureCollection in TEXT column)

Store the complete `FeatureCollection` JSON string in a `Trail.geoJson` TEXT column.

**Rationale:**
- Leaflet's `L.geoJSON()` consumes a FeatureCollection directly — no transformation needed at render time
- SQLite TEXT columns handle arbitrary JSON with no schema constraints
- A 2000-point trail at `[lng, lat, ele]` per point ≈ `2000 × 30 bytes = ~60KB` JSON — fine for SQLite
- Option C (store raw GPX, parse on read) adds server overhead every render and keeps raw XML in DB (larger)
- Option B (coordinate array only) loses feature properties (name, description, activity type) needed for popup content

### Recommended Project Structure

```
lib/
├── gpx.ts                    # EXISTING — keep for waypoint extraction
├── gpx-to-geojson.ts         # NEW — togeojson wrapper for server-side conversion
app/
├── api/
│   ├── import/gpx/route.ts   # EXTEND — add trail persistence logic
│   └── trails/
│       ├── route.ts          # NEW — GET all trails, DELETE trail
│       └── [id]/route.ts     # NEW — GET single trail GeoJSON
components/
├── SpotMap.tsx               # EXTEND — add trail GeoJSON layer
├── SpotsClient.tsx (spots-client.tsx)  # EXTEND — trails state, toggle layer
prisma/
└── schema.prisma             # EXTEND — add Trail model + migration
```

### Pattern 1: Server-Side GPX to GeoJSON Conversion

**What:** Parse GPX XML using togeojson on the server, extract FeatureCollection, persist
**When to use:** In `/api/import/gpx` route handler after receiving `{ gpx: string }` body

```typescript
// lib/gpx-to-geojson.ts
// Source: https://togeojson.docs.placemark.io/
import { gpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection } from 'geojson';

export function gpxToGeoJson(gpxString: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(gpxString, 'text/xml');
  return gpx(doc) as FeatureCollection;
}
```

**Node.js Note:** Must use `@xmldom/xmldom`'s `DOMParser`, not the global browser `DOMParser`. The browser `DOMParser` is not available in Next.js Route Handler execution context (Node.js runtime).

### Pattern 2: Prisma Trail Model

```prisma
model Trail {
  id          String   @id @default(cuid())
  name        String
  description String?
  sourceFile  String?  // original filename, e.g. "my-hike.gpx"
  geoJson     String   // JSON: GeoJSON FeatureCollection from @tmcw/togeojson
  distanceKm  Float?   // computed from track points
  elevationGainM Float? // computed from elevation data
  locationId  String?  // optional FK to a Location (trailhead)
  color       String   @default("#22c55e") // default green, user-editable later
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  location Location? @relation(fields: [locationId], references: [id], onDelete: SetNull)

  @@index([locationId])
  @@index([createdAt])
}
```

**Location model update required:** Add `trails Trail[]` relation field.

### Pattern 3: Leaflet GeoJSON Layer for Trail Rendering

```typescript
// In SpotMap.tsx — add a trailLayersRef and effect
// Source: https://leafletjs.com/examples/geojson/
import type { FeatureCollection } from 'geojson';

interface TrailRecord {
  id: string;
  name: string;
  geoJson: string; // serialized FeatureCollection
  color: string;
}

// In component:
const trailLayersRef = useRef<L.LayerGroup>(L.layerGroup());

useEffect(() => {
  const map = mapRef.current;
  if (!map || !ready) return;
  trailLayersRef.current.clearLayers();
  if (!layers.trails) return;

  trails.forEach((trail) => {
    const fc = JSON.parse(trail.geoJson) as FeatureCollection;
    const layer = L.geoJSON(fc, {
      style: {
        color: trail.color,
        weight: 3,
        opacity: 0.8,
      },
      // L.geoJSON handles [lng, lat] → [lat, lng] conversion automatically
      // MultiLineString from togeojson outputs as LineString per track segment
      // — no workaround needed with togeojson output
    });
    layer.bindPopup(`<strong>${escHtml(trail.name)}</strong>`);
    trailLayersRef.current.addLayer(layer);
  });
}, [trails, layers.trails, ready]);
```

**Coordinate order:** `L.geoJSON()` handles GeoJSON `[longitude, latitude]` automatically — it calls `coordsToLatLngs` internally. No manual coordinate swapping needed.

### Pattern 4: Extended API Route Handler

```typescript
// app/api/import/gpx/route.ts — extended
import { gpxToGeoJson } from '@/lib/gpx-to-geojson';

// In POST handler, after existing waypoint processing:
const geojson = gpxToGeoJson(body.gpx);

// Filter to only LineString/MultiLineString features (tracks/routes)
const trackFeatures = geojson.features.filter(
  (f) => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'
);

if (trackFeatures.length > 0) {
  const trackCollection: FeatureCollection = {
    type: 'FeatureCollection',
    features: trackFeatures,
  };
  const trailName = data.name ?? body.filename ?? 'Imported Trail';
  await prisma.trail.create({
    data: {
      name: trailName,
      geoJson: JSON.stringify(trackCollection),
      sourceFile: body.filename ?? null,
    },
  });
  trailsCreated++;
}
```

### Anti-Patterns to Avoid

- **Storing raw GPX XML in DB:** Larger storage, requires re-parsing on every read. Store GeoJSON instead.
- **Parsing GPX client-side:** Adds `@tmcw/togeojson` to the browser bundle. GPX files arrive as user uploads — parse on server, return metadata only.
- **Using `DOMParser` (global) in Node.js API routes:** Not available in Node.js — must import from `@xmldom/xmldom`.
- **Registering a new `trails` Leaflet layer type:** Use `L.geoJSON()` on the FeatureCollection — it handles all geometry types automatically.
- **Using `export const config = { api: { bodyParser: false } }`:** This is the Pages Router pattern. App Router route handlers do NOT use `export const config` for body parsing. Use `await request.json()` — it works as-is.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| GPX → GeoJSON conversion | Custom regex/DOM parser | `@tmcw/togeojson` | AllTrails uses `<extensions>` elements, multi-segment tracks, Garmin extensions — regex breaks on these |
| XML parsing in Node.js | Manual string parsing | `@xmldom/xmldom` | Invalid XML (common in GPX) silently truncates with native DOMParser; xmldom is lenient |
| Coordinate order conversion in Leaflet | Manual `[coord[1], coord[0]]` swap | `L.geoJSON()` native handling | L.geoJSON handles [lng,lat] → [lat,lng] automatically per GeoJSON spec |
| GeoJSON type definitions | Inline interfaces | `@types/geojson` | Standard types: `FeatureCollection`, `Feature`, `LineString`, `MultiLineString` |

**Key insight:** GPX parsing has many real-world edge cases (missing elevation, `<extensions>`, multi-track files, route vs. track distinction, AllTrails-specific metadata). The existing `lib/gpx.ts` works for waypoints but is known-fragile for track rendering. Use `@tmcw/togeojson` for the GeoJSON output path.

---

## Common Pitfalls

### Pitfall 1: `DOMParser` Not Available in Node.js

**What goes wrong:** Calling `new DOMParser()` in an API route throws `DOMParser is not defined`.
**Why it happens:** `DOMParser` is a browser Web API, not available in Node.js runtime used by Next.js route handlers.
**How to avoid:** Always import `DOMParser` from `@xmldom/xmldom` in server-side code.
**Warning signs:** `ReferenceError: DOMParser is not defined` in route handler logs.

```typescript
// WRONG (browser only):
const doc = new DOMParser().parseFromString(xml, 'text/xml');

// CORRECT (Node.js server):
import { DOMParser } from '@xmldom/xmldom';
const doc = new DOMParser().parseFromString(xml, 'text/xml');
```

### Pitfall 2: Leaflet MultiLineString Rendering Bug (Unfixed in 1.9.4)

**What goes wrong:** A `MultiLineString` GeoJSON feature renders only the first line segment in Leaflet 1.9.4.
**Why it happens:** GitHub issue #9533, reported Nov 2024, PR #9540 was closed without merge as of April 2025. Bug is unfixed in the current 1.9.4 release.
**How to avoid:** `@tmcw/togeojson` outputs GPX tracks as `LineString` features (one per `<trkseg>`), not `MultiLineString`. This sidesteps the bug entirely. Verify by checking output type — if `MultiLineString` appears, flatten to individual `LineString` features before storing.
**Warning signs:** Trail renders only first segment on map; toggle off/on doesn't help.

```typescript
// If a MultiLineString appears in togeojson output (rare), normalize it:
function normalizeToLineStrings(fc: FeatureCollection): FeatureCollection {
  const features = fc.features.flatMap((f) => {
    if (f.geometry.type === 'MultiLineString') {
      return f.geometry.coordinates.map((coords) => ({
        type: 'Feature' as const,
        properties: f.properties,
        geometry: { type: 'LineString' as const, coordinates: coords },
      }));
    }
    return f;
  });
  return { type: 'FeatureCollection', features };
}
```

### Pitfall 3: App Router Body Parsing Configuration

**What goes wrong:** Developer adds `export const config = { api: { bodyParser: false } }` expecting it to work with FormData.
**Why it happens:** This is the Pages Router pattern; it does nothing in App Router.
**How to avoid:** App Router route handlers parse body using `await request.json()` (for JSON) or `await request.formData()` (for multipart). No config export needed. The existing GPX route uses `await request.json()` — this is correct.

### Pitfall 4: Large GPX File as JSON-Encoded String

**What goes wrong:** Sending a 5MB GPX file as `JSON.stringify({ gpx: xmlString })` fails with 413.
**Why it happens:** Next.js App Router route handlers don't have a documented per-route body size config. Default behavior in practice allows ~4MB for JSON bodies (varies by deployment context).
**How to avoid:** AllTrails/Wikiloc exports are typically 20–200KB. This is not a real concern for typical usage. If needed, add a client-side file size guard: reject files > 2MB before sending. For a single-user personal tool, no special handling needed.

### Pitfall 5: Missing Location Relation in Prisma After Adding Trail

**What goes wrong:** Adding a `trails Trail[]` relation to the `Location` model without updating both sides causes `prisma generate` errors.
**Why it happens:** Prisma requires explicit relation fields on both models.
**How to avoid:** Add `trails Trail[]` to `Location` model in schema.prisma simultaneously with adding `Trail` model.

---

## Code Examples

### Full gpx-to-geojson.ts Module

```typescript
// lib/gpx-to-geojson.ts
// Source: https://togeojson.docs.placemark.io/
import { gpx as toGeojsonGpx } from '@tmcw/togeojson';
import { DOMParser } from '@xmldom/xmldom';
import type { FeatureCollection, Feature } from 'geojson';

/**
 * Convert GPX XML string to GeoJSON FeatureCollection.
 * Uses xmldom for Node.js compatibility (DOMParser not available server-side).
 */
export function gpxToGeoJson(gpxString: string): FeatureCollection {
  const doc = new DOMParser().parseFromString(gpxString, 'text/xml');
  const fc = toGeojsonGpx(doc) as FeatureCollection;
  // Normalize MultiLineString → LineString array (Leaflet 1.9.4 MultiLineString bug workaround)
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

### Trail API Route GET Handler

```typescript
// app/api/trails/route.ts
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(): Promise<NextResponse> {
  try {
    const trails = await prisma.trail.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        color: true,
        distanceKm: true,
        locationId: true,
        createdAt: true,
        // geoJson excluded from list — fetched individually when rendering
      },
    });
    return NextResponse.json(trails);
  } catch (error) {
    console.error('Failed to fetch trails:', error);
    return NextResponse.json({ error: 'Failed to fetch trails' }, { status: 500 });
  }
}
```

### SpotMap Trails Layer Addition (interface changes)

```typescript
// Additional types in SpotMap.tsx
export interface TrailOverlay {
  id: string;
  name: string;
  geoJson: string; // serialized FeatureCollection
  color: string;
}

// Extend Layers interface:
export interface Layers {
  photos: boolean;
  spots: boolean;
  path: boolean;
  places: boolean;
  heatmap: boolean;
  trails: boolean;  // NEW
}

// Extend SpotMapProps:
interface SpotMapProps {
  // ... existing props ...
  trails?: TrailOverlay[];  // NEW
}
```

---

## Runtime State Inventory

This is a greenfield addition (new model, new API routes, new UI layer). No rename/refactor involved.

- **Stored data:** None — new `Trail` table, no existing records to migrate
- **Live service config:** None
- **OS-registered state:** None
- **Secrets/env vars:** None — no new external API keys needed
- **Build artifacts:** None

---

## Environment Availability

All dependencies are npm packages with no external service requirements.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| npm / node | package install | Available | node 23.11.0, npm 10.9.2 | — |
| `@tmcw/togeojson` | lib/gpx-to-geojson.ts | Not yet installed | 7.1.2 available | — |
| `@xmldom/xmldom` | lib/gpx-to-geojson.ts | Not yet installed | 0.9.9 available | — |
| `@types/geojson` | TypeScript types | Not yet installed | latest available | — |
| Prisma migrate | Trail model schema | Available (Prisma 6.19.2) | 6.19.2 | — |

**Missing dependencies with no fallback:** All three npm packages must be installed in Wave 0.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GPX-01 | `gpxToGeoJson()` converts valid GPX string to FeatureCollection | unit | `npm test -- lib/__tests__/gpx-to-geojson.test.ts` | Wave 0 |
| GPX-02 | `gpxToGeoJson()` normalizes MultiLineString to LineStrings | unit | `npm test -- lib/__tests__/gpx-to-geojson.test.ts` | Wave 0 |
| GPX-03 | `gpxToGeoJson()` handles missing elevation gracefully | unit | `npm test -- lib/__tests__/gpx-to-geojson.test.ts` | Wave 0 |
| GPX-04 | POST /api/import/gpx creates Trail record when tracks present | integration (manual) | manual | — |
| GPX-05 | GET /api/trails returns trail list without geoJson blob | integration (manual) | manual | — |

### Wave 0 Gaps

- [ ] `lib/__tests__/gpx-to-geojson.test.ts` — covers GPX-01, GPX-02, GPX-03
- No framework install needed (Vitest already configured)

---

## Sources

### Primary (HIGH confidence)

- `npm view @tmcw/togeojson` — version 7.1.2, published 2025-05-31
- `npm view @xmldom/xmldom` — version 0.9.9, current
- https://togeojson.docs.placemark.io/ — official @tmcw/togeojson docs (Node.js usage, xmldom requirement)
- https://leafletjs.com/examples/geojson/ — L.geoJSON() coordinate handling confirmation
- Codebase read: `lib/gpx.ts`, `app/api/import/gpx/route.ts`, `components/SpotMap.tsx`, `app/spots/spots-client.tsx`, `prisma/schema.prisma`, `package.json`

### Secondary (MEDIUM confidence)

- https://github.com/Leaflet/Leaflet/issues/9533 — MultiLineString render bug, confirmed unfixed/PR closed April 2025
- https://github.com/vercel/next.js/issues/57501 — App Router body size limit is not per-route configurable
- npm trends showing togeojson vs alternatives — ~98k weekly downloads for @tmcw/togeojson vs stale alternatives

### Tertiary (LOW confidence)

- WebSearch results on Next.js App Router body size defaults — confirms ~10MB proxy default, route handler limit unspecified

---

## Open Questions

1. **Trail color persistence:** Research says store `color` column with default `#22c55e`. Whether the user gets a color picker in this phase is left to the planner — research supports it either way.

2. **Trail-to-Location association:** The schema includes optional `locationId` FK. Whether the import UI prompts to link a trail to a location, or leaves it null, is a UX decision for the planner. The schema supports both.

3. **Existing `lib/gpx.ts` coexistence:** The recommendation is to keep `lib/gpx.ts` for waypoint extraction (it works) and add `lib/gpx-to-geojson.ts` for the GeoJSON path. The API route would call both. If the plan prefers a full replacement, `@tmcw/togeojson` can also extract waypoints via `Point` features in the FeatureCollection — but this would require updating the existing waypoint-to-location logic.

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — npm versions verified directly via npm view
- Architecture: HIGH — based on reading existing codebase patterns (JSON body, Leaflet layer groups, Prisma TEXT columns)
- Pitfalls: HIGH — DOMParser issue is documented in togeojson official docs; Leaflet MultiLineString bug verified via GitHub issue tracker
- GeoJSON storage: HIGH — TEXT column pattern already used in project (e.g., `waypoints String?` in ActivitySegment)

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (90 days — stable libraries)
