---
phase: 37-home-assistant-integration
plan: "01"
subsystem: backend
tags: [home-assistant, settings, prisma, write-only-token, ha-types]
dependency_graph:
  requires: []
  provides: [ha-schema-fields, ha-types-lib, settings-api-ha-fields]
  affects: [prisma/schema.prisma, lib/ha.ts, app/api/settings/route.ts]
tech_stack:
  added: []
  patterns: [write-only-token, settings-singleton, shared-types-lib]
key_files:
  created:
    - lib/ha.ts
    - prisma/migrations/add_ha_settings_fields/migration.sql
  modified:
    - prisma/schema.prisma
    - app/api/settings/route.ts
decisions:
  - "haToken is write-only — GET /api/settings returns haTokenSet:bool, never the token value"
  - "HA fields extend Settings singleton (not a new model) — consistent with Phase 07 pattern"
  - "haEntityIds stored as JSON string in SQLite — parsed on read"
  - "haEntityCache stored as JSON string — last-fetched state blob for offline fallback"
  - "SETTINGS_ID = 'user_settings' — hardcoded singleton key consistent with Phase 07"
metrics:
  duration_seconds: 360
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 4
---

# Phase 37 Plan 01: HA Schema + Types + Settings API — Summary

**One-liner:** Settings model extended with HA fields, lib/ha.ts with shared types and utilities, Settings GET/PUT updated with write-only token security

## What Was Built

### Task 1: Schema migration + lib/ha.ts

- `prisma/schema.prisma` — Settings model extended with haUrl (String?), haToken (String?), haEntityIds (String?), haEntityCache (String?), haLastFetched (DateTime?)
- Migration applied
- `lib/ha.ts` — exports: HAEntityState, CachedEntityState, safeParseEntityIds(), SETTINGS_ID, HA_TIMEOUT_MS
  - safeParseEntityIds: parses haEntityIds JSON string → string[] (returns [] on error)
  - HA_TIMEOUT_MS = 5000 (5s timeout for HA proxy requests)

### Task 2: Settings API update

- GET /api/settings — haToken NEVER returned; haTokenSet: boolean returned instead (token truthiness check)
- PUT /api/settings — accepts haUrl, haToken (null = clear), haEntityIds (JSON array → stored as string)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- prisma/schema.prisma contains `haUrl`: FOUND
- lib/ha.ts: FOUND with exports HAEntityState, CachedEntityState, safeParseEntityIds, SETTINGS_ID, HA_TIMEOUT_MS
- app/api/settings/route.ts contains `haTokenSet`: FOUND
