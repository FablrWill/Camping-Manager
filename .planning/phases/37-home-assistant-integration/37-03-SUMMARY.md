---
phase: 37-home-assistant-integration
plan: "03"
subsystem: frontend
tags: [home-assistant, campsite-card, dashboard, polling, stale-fallback]
dependency_graph:
  requires: [37-01, 37-02]
  provides: [CampsiteCard, dashboard-campsite-integration]
  affects: [components/CampsiteCard.tsx, components/DashboardClient.tsx, app/page.tsx]
tech_stack:
  added: []
  patterns: [polling-interval, stale-fallback, conditional-render]
key_files:
  created:
    - components/CampsiteCard.tsx
  modified:
    - components/DashboardClient.tsx
    - app/page.tsx
decisions:
  - "Polls /api/ha/states every 30 seconds (D-03)"
  - "Stale values shown with 'Last seen X min ago' when HA unreachable (D-09)"
  - "CampsiteCard only renders when haEntityIds is configured (D-08)"
  - "Uses setInterval in useEffect — cleared on unmount to prevent memory leak"
  - "unavailable/unknown state rendered as em dash (—) per Claude's discretion"
metrics:
  duration_seconds: 360
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 3
---

# Phase 37 Plan 03: CampsiteCard Dashboard Integration — Summary

**One-liner:** Dashboard CampsiteCard polling HA states every 30s with stale-value fallback when HA is offline

## What Was Built

### Task 1: CampsiteCard component

- `components/CampsiteCard.tsx` — shows selected entity values (friendly_name, state, unit_of_measurement)
- States: loading / loaded / stale / offline-no-cache
- Polls /api/ha/states every 30s via setInterval in useEffect
- Stale: shows cached values with "Last seen X min ago" using haLastFetched
- Offline (no cache): "Offline — no data yet"
- unavailable/unknown state → "—"

### Task 2: Dashboard integration

- `components/DashboardClient.tsx` — renders CampsiteCard when haIsConfigured prop is true
- `app/page.tsx` — server-side check: `haIsConfigured = !!(settings?.haEntityIds && settings.haEntityIds !== '[]')` passed as prop

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None. CampsiteCard is real — it will poll live HA when hardware is available.

## Self-Check: PASSED

- components/CampsiteCard.tsx: FOUND
- components/DashboardClient.tsx contains `CampsiteCard`: FOUND
- app/page.tsx contains `haIsConfigured`: FOUND
