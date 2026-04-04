# Phase 39: Personal Signal Map - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Visualize existing signal quality data on the spots map. Surface colored dot badges on location markers, add a "Signal" layer toggle, and add signal filter chips so Will can see which campsites have good connectivity before a trip.

**This phase is visualization only.** All data already exists in `SignalLog` records and `Location.cellSignal`/`starlinkSignal` fields. No new data collection, no schema changes.

**Out of scope:** HA Companion → auto-log signal automation. The API endpoint (`POST /api/signal/auto-log`) already exists; the HA automation config is deferred to Phase 33 / S10 (HA Integration) when hardware is ready.

</domain>

<decisions>
## Implementation Decisions

### Signal Badge Style
- **D-01:** Signal indicators are **colored dots only** — no text labels, no bar graph icons. Simple filled circles: green / yellow / red / gray.
- **D-02:** Dot positioned at the **bottom-right corner** of the location marker. Overlaid on the pin, unobtrusive, consistent with mobile status badge conventions.
- **D-03:** Dot must be implemented as an **HTML string in a Leaflet DivIcon** — no React rendering inside Leaflet marker callbacks. A `<span>` with inline styles or Tailwind-equivalent classes.

### Signal Tier Color Mapping
- **D-04:** Green = LTE or 5G with 3+ bars, OR Starlink strong/excellent
- **D-05:** Yellow = any cell signal with 1–2 bars, OR Starlink moderate, OR LTE/5G with <3 bars
- **D-06:** Red = cellType "none" or cellBars 0
- **D-07:** Gray = no signal logs AND no `cellSignal`/`starlinkSignal` summary string on Location (unknown)

### Layer Default State
- **D-08:** Signal layer is **OFF by default**, consistent with all other map layers (photos, path, places, heatmap are all off on load). User toggles it when they want signal context.

### Filter Chip Placement
- **Claude's Discretion:** Placement and style of signal filter chips (All / Good signal / No signal / Unknown). Should follow the FilterChip component patterns from S16 and feel consistent with the existing layer toggle area.

### HA Auto-Log (Deferred)
- `POST /api/signal/auto-log` is already implemented and functional. The missing piece is the HA Companion automation that sends iPhone cellular sensor data to that endpoint. **Deferred to Phase 33 / S10** (HA Integration, currently blocked ~mid-April 2026).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Signal Infrastructure (already built)
- `components/SignalLogPanel.tsx` — existing per-location signal log UI; shows log form + history list
- `app/api/locations/[id]/signal/route.ts` — GET (list logs) + POST (create log) per location
- `app/api/signal/auto-log/route.ts` — POST endpoint for HA Companion auto-logging; accepts GPS + signal data, finds nearest location

### Map Architecture
- `components/SpotMap.tsx` — Leaflet map component; exports `MapLocation`, `Layers`, `SpotMapProps`. Layers interface and marker render loop are the integration points.
- `app/spots/spots-client.tsx` — client component that owns Layers state, layer toggle buttons, and passes props to SpotMap

### Data Model
- `prisma/schema.prisma` — `SignalLog` model (carrier, cellBars 0-4, cellType, signalStrength, starlinkQuality, speedDown, speedUp); `Location` model has `cellSignal String?` and `starlinkSignal String?` summary fields

### UI Conventions
- `.planning/codebase/CONVENTIONS.md` — naming, import order, component patterns
- `components/ui/index.ts` — UI component barrel; FilterChip available from S16

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `Layers` interface in `SpotMap.tsx` — add `signal: boolean` following the exact same pattern as `photos`, `spots`, `path`, `places`, `heatmap`
- `FilterChip.tsx` (from S16) — reuse for the signal filter chips (All / Good signal / No signal / Unknown)
- `MapLocation` interface already has `cellSignal?` and `starlinkSignal?` — these are available in marker render loop without any additional fetching

### Established Patterns
- Layer toggle buttons in `spots-client.tsx` around line 359-371 — signal toggle follows the same pattern
- Leaflet DivIcon for custom marker content: use `L.divIcon({ html: '<span ...>' })` — HTML string only, React doesn't render in this context
- Stone color palette + Tailwind dark mode throughout; signal dot colors should use inline hex or Tailwind's raw values

### Integration Points
- `SpotMap.tsx` marker render loop (lines ~396-440) — where signal dot overlay is added
- `spots-client.tsx` layer state initialization (`layers` object, line ~72) — add `signal: false`
- `spots-client.tsx` `useEffect` on mount — add fetch of `/api/locations/signal-summary`

</code_context>

<specifics>
## Specific Ideas

- The signal dot should be small enough not to obscure the location name label on the marker — aim for ~10–12px diameter
- Will mentioned wanting HA Companion to auto-log signal at camp via the existing `/api/signal/auto-log` endpoint. That's already built server-side; the HA automation YAML config is the missing piece (deferred to S10).

</specifics>

<deferred>
## Deferred Ideas

- **HA Companion → auto-log signal automation** — `POST /api/signal/auto-log` exists and works. Need HA REST command + automation YAML to push iPhone cellular sensors (carrier, bars, type, GPS) to the endpoint. Belongs in Phase 33 / S10 (HA Integration, ~mid-April 2026 when hardware arrives).

</deferred>

---

*Phase: 39-personal-signal-map*
*Context gathered: 2026-04-04*
