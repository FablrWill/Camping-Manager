---
phase: 39-personal-signal-map
plan: 02
subsystem: signal-map
tags: [signal, map, ui, leaflet, filter]
dependency_graph:
  requires: [signal-summary-lib, signal-summary-api]
  provides: [signal-map-visualization]
  affects: [SpotMap, spots-client]
tech_stack:
  added: []
  patterns: [useMemo-filter, conditional-render, leaflet-divicon]
key_files:
  created: []
  modified:
    - components/SpotMap.tsx
    - app/spots/spots-client.tsx
decisions:
  - "signalFilteredLocations replaces inline ternary in SpotMap locations prop — single source of truth for displayed locations regardless of signal filter or online state"
  - "Signal filter chips render only when layers.signal is active — avoids cluttering UI when feature is off"
  - "makeIcon signalDot uses inline style span at bottom:-2px right:-2px — Leaflet DivIcon renders raw HTML, no React/CSS class access"
metrics:
  duration: 3m
  completed: 2026-04-04T19:33:24Z
  tasks_completed: 2
  files_changed: 2
---

# Phase 39 Plan 02: Signal Map Visualization Summary

**One-liner:** Colored signal-quality dots on Leaflet location markers with a Signal layer toggle and filter chips (All / Good signal / No signal / Unknown) for filtering spots by connectivity tier.

## What Was Built

### components/SpotMap.tsx
- Added `signal: boolean` to exported `Layers` interface
- Added `signalSummaries?: Record<string, SignalSummary>` to `SpotMapProps`
- Added `import type { SignalSummary } from '@/lib/signal-summary'`
- Added `SIGNAL_DOT_COLORS` constant mapping tier strings to hex colors (green/yellow/red/gray)
- Updated `makeIcon` signature to accept optional `signalDot?: string` parameter — renders 10px colored circle at `bottom:-2px; right:-2px` using inline HTML inside Leaflet DivIcon
- Location marker render loop computes `signalDotColor` when `layers.signal && signalSummaries`, falls back to gray dot for locations without a summary record
- Updated marker `useEffect` dependency array to include `layers.signal` and `signalSummaries`

### app/spots/spots-client.tsx
- Added `useMemo` to React import
- Added `import type { SignalSummary } from '@/lib/signal-summary'`
- Added `import { FilterChip } from '@/components/ui'`
- Added `signal: false` to layers initial state (D-08: off by default)
- Added `signalSummaries: Record<string, SignalSummary>` state
- Added `signalFilter: 'all' | 'good' | 'none' | 'unknown'` state
- Added `useEffect` to fetch `/api/locations/signal-summary` on mount when online
- Added `signalFilteredLocations` computed via `useMemo` — filters source locations by signal tier when signal layer is active, otherwise returns full source list (online/offline aware)
- Added `["signal", "📶 Signal"]` to layer toggle button array
- Added signal filter chips row (conditionally rendered when `layers.signal`) with `FilterChip` components for All / Good signal / No signal / Unknown
- SpotMap now receives `signalFilteredLocations` as `locations` prop and `signalSummaries={signalSummaries}`

## Signal Dot Colors

| Tier   | Color   | Hex       |
|--------|---------|-----------|
| green  | Green   | `#22c55e` |
| yellow | Yellow  | `#eab308` |
| red    | Red     | `#ef4444` |
| gray   | Gray    | `#9ca3af` |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. Signal data is fetched from `/api/locations/signal-summary` (built in Plan 01). Locations without SignalLog records or Location signal string fields receive a gray dot when the layer is active.

## Self-Check

- [x] components/SpotMap.tsx — `signal: boolean` in Layers interface
- [x] components/SpotMap.tsx — `signalSummaries?: Record<string, SignalSummary>` in SpotMapProps
- [x] components/SpotMap.tsx — `import type { SignalSummary } from '@/lib/signal-summary'`
- [x] components/SpotMap.tsx — `SIGNAL_DOT_COLORS` constant present
- [x] components/SpotMap.tsx — `layers.signal && signalSummaries` in marker loop
- [x] components/SpotMap.tsx — `makeIcon` has `signalDot` parameter
- [x] components/SpotMap.tsx — marker useEffect deps include `layers.signal`
- [x] app/spots/spots-client.tsx — `signal: false` in initial layers state
- [x] app/spots/spots-client.tsx — `import type { SignalSummary } from '@/lib/signal-summary'`
- [x] app/spots/spots-client.tsx — `fetch('/api/locations/signal-summary')`
- [x] app/spots/spots-client.tsx — `signalFilter` state variable
- [x] app/spots/spots-client.tsx — `signalFilteredLocations` computed value
- [x] app/spots/spots-client.tsx — `["signal", "📶 Signal"]` in layer toggle array
- [x] app/spots/spots-client.tsx — `<FilterChip` usage for signal filters
- [x] app/spots/spots-client.tsx — `signalSummaries={signalSummaries}` in SpotMap props
- [x] TypeScript: no errors in modified files (pre-existing bulk-import.test.ts error is out of scope)
- [x] Production build passes
- [x] Task 1 commit: 38509e2
- [x] Task 2 commit: 57926de

## Self-Check: PASSED
