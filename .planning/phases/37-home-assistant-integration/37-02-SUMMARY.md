---
phase: 37-home-assistant-integration
plan: "02"
subsystem: backend+frontend
tags: [home-assistant, ha-proxy, entity-picker, settings-ui]
dependency_graph:
  requires: [37-01]
  provides: [ha-test-endpoint, ha-entities-endpoint, ha-states-endpoint, entity-picker-ui]
  affects: [app/api/ha/*, components/SettingsClient.tsx]
tech_stack:
  added: []
  patterns: [server-proxy, stale-cache-fallback, domain-grouping]
key_files:
  created:
    - app/api/ha/test/route.ts
    - app/api/ha/entities/route.ts
    - app/api/ha/states/route.ts
  modified:
    - components/SettingsClient.tsx
decisions:
  - "Server-side proxy — HA token never reaches browser (D-01)"
  - "/api/ha/states returns cached values on HA timeout — graceful degradation (D-09)"
  - "Entity picker caps at 10 selected entities (D-07)"
  - "Entities grouped by domain for picker readability"
  - "Test Connection calls GET <haUrl>/api/ — standard HA health check endpoint"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 4
---

# Phase 37 Plan 02: HA API Proxy + Entity Picker — Summary

**One-liner:** Three HA proxy endpoints (test/entities/states) + searchable entity picker in Settings with 10-entity cap

## What Was Built

### Task 1: HA API proxy routes

- `GET /api/ha/test` — fetches GET <haUrl>/api/ with stored token; returns { connected: bool, entityCount: number, error?: string }
- `GET /api/ha/entities` — fetches GET <haUrl>/api/states with stored token; returns entities grouped by domain (sensor, binary_sensor, device_tracker, etc.)
- `GET /api/ha/states` — fetches configured entity states (haEntityIds); on HA timeout returns cached haEntityCache values with `stale: true` flag

### Task 2: Entity picker in SettingsClient

- New HA Configuration section in SettingsClient — haUrl input, haToken input (masked), Test Connection button
- After successful test, entity picker appears — searchable, grouped by domain
- Max 10 entities — additional selections disabled when at cap
- Save selection persists to haEntityIds in Settings

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- app/api/ha/test/route.ts: FOUND
- app/api/ha/entities/route.ts: FOUND
- app/api/ha/states/route.ts: FOUND
- components/SettingsClient.tsx contains entity picker: FOUND
