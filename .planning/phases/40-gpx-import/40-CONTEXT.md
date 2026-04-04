---
phase: 40-gpx-import
title: GPX Import (AllTrails/Wikiloc trail overlays)
milestone: v4.0
status: ready for planning
created: 2026-04-04
---

# Phase 40: GPX Import — Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Import GPX files from AllTrails, Wikiloc, or any GPS app. Extract track data as GeoJSON and store in a new `Trail` model. Render trails as colored polyline overlays on the Spots map with a toggle layer. Existing waypoint→Location import logic is preserved and extended (not replaced).

This phase does NOT include: per-trail color picker, trail-to-location editing after import, trail rename, advanced trail metadata display.

</domain>

<decisions>
## Implementation Decisions

### Location Linking
- **D-01:** Trails import as standalone — no prompt to link to an existing Location during import. The `Trail.locationId` FK remains optional/null by default. Linking can be added in a future phase. Import flow stays fast.

### Trails List & Management UI
- **D-02:** Add a **"Trails" toggle** to the existing layer toggle bar (Photos, Spots, Path, Places, Heatmap → + Trails). This follows the established pattern exactly.
- **D-03:** Below the layer toggles (or in the existing import/management panel), show a **trails list with per-trail delete button**. Each row: trail name + delete action. No rename, no visibility per-trail in this phase.

### Waypoints + Tracks (dual-content GPX files)
- **D-04:** When a GPX file contains both waypoints AND a track (common with AllTrails exports), **do both**: create Location records from waypoints (existing behavior, unchanged) AND create a Trail record from the track. One import produces both results. No user prompt needed.

### Trail Color
- **D-05:** Auto-assign a default color (`#22c55e` green as research recommends). No color picker in this phase. All trails render green. Color picker is a future enhancement.

### Technical Approach (from research — locked)
- **D-06:** Use `@tmcw/togeojson` + `@xmldom/xmldom` for server-side GPX-to-GeoJSON conversion. Keep `lib/gpx.ts` for waypoint extraction (it works). Add `lib/gpx-to-geojson.ts` as a new module for track conversion.
- **D-07:** Store full FeatureCollection JSON in `Trail.geoJson TEXT` column (not raw GPX, not coordinate array). Leaflet consumes it directly at render time via `L.geoJSON()`.
- **D-08:** Normalize `MultiLineString` → `LineString` array at conversion time (Leaflet 1.9.4 bug workaround, documented in research).
- **D-09:** Client sends raw GPX text as JSON body to `/api/import/gpx` (existing pattern — keep it, extend the route handler).

### Claude's Discretion
- Trail popup content (what shows on click) — name and distance are obvious; Claude can decide what else to include (activity type, created date)
- Exact placement of trails list in the Spots UI — within the existing panel layout, Claude chooses what fits best
- Whether `distanceKm` is calculated and stored or left null — Claude can decide based on what togeojson exposes

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Infrastructure
- `lib/gpx.ts` — existing hand-rolled GPX parser (waypoints only); keep for waypoint path
- `app/api/import/gpx/route.ts` — existing import route; extend to add trail persistence
- `components/SpotMap.tsx` — existing map component; `Layers` interface at line 162; LayerGroup pattern at lines 209-254
- `app/spots/spots-client.tsx` — existing SpotsClient; layer toggle pattern at lines 71-115; handleGpxFile at line 118
- `prisma/schema.prisma` — existing schema; add Trail model here

### Research
- `.planning/phases/40-gpx-import/40-RESEARCH.md` — full architecture, code examples, pitfall list (MultiLineString bug, DOMParser Node.js incompatibility, Prisma relation fields requirement). READ IN FULL before planning.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Layers` interface (SpotMap.tsx:162) — add `trails: boolean` to this type
- LayerGroup pattern (SpotMap.tsx:209-254) — new `trailLayersRef` follows same pattern as `pathLayersRef`
- Layer toggle UI (SpotsClient:71-115) — `toggleLayer` handles any key in `Layers` automatically
- `handleGpxFile` (SpotsClient:118) — already sends raw GPX as JSON body; extend to show trail result

### Established Patterns
- JSON body (not FormData) for file content — existing GPX import uses this
- TEXT column for JSON storage — `ActivitySegment.waypoints String?` is a precedent
- Server-side parsing — keeps heavy libs out of client bundle

### Integration Points
- `/api/import/gpx` route — add track parsing + Trail creation alongside existing waypoint logic
- SpotMap `layers` prop — add `trails` boolean + `trails` overlay data
- Layer toggles in SpotsClient — `trails` key slots in naturally

</code_context>

<specifics>
## Specific Ideas

No specific UI references given — open to standard approaches consistent with the existing Spots page design.

</specifics>

<deferred>
## Deferred Ideas

- **Trail color picker** — user selects color at import time. Noted for a future enhancement phase.
- **Trail-to-Location linking** — UI to associate an imported trail with a saved spot. Schema supports it (optional FK), deferred from import flow.
- **Per-trail visibility toggle** — individual show/hide per trail rather than all-or-none layer toggle.
- **Trail rename** — edit trail name after import.

</deferred>

---

*Phase: 40-gpx-import*
*Context gathered: 2026-04-04*
