# Phase 37: Home Assistant Integration — Verification

**Status:** HARDWARE_NEEDED
**Verified:** 2026-04-04

## Plans Completed

| Plan | Summary | Status |
|------|---------|--------|
| 37-01 | Settings schema (HA fields), lib/ha.ts types + utils, Settings GET/PUT (write-only token) | ✅ Code complete |
| 37-02 | /api/ha/test, /api/ha/entities, /api/ha/states proxy routes, entity picker in Settings | ✅ Code complete |
| 37-03 | CampsiteCard (30s polling, stale fallback), dashboard integration | ✅ Code complete |
| 37-04 | HA snapshot in TripPrepClient (fetch-once, read-only) | ✅ Code complete |

## Verification Checklist

### Code Completeness (verified)
- [x] haUrl, haToken, haEntityIds, haEntityCache, haLastFetched on Settings model
- [x] lib/ha.ts with HAEntityState, CachedEntityState, safeParseEntityIds, SETTINGS_ID, HA_TIMEOUT_MS
- [x] GET /api/settings — haToken omitted, haTokenSet returned
- [x] PUT /api/settings — accepts HA fields
- [x] GET /api/ha/test — HA health check proxy
- [x] GET /api/ha/entities — entity list grouped by domain
- [x] GET /api/ha/states — configured entity states with stale cache fallback
- [x] Entity picker in SettingsClient (searchable, 10-entity cap)
- [x] CampsiteCard component with 30s polling and stale fallback
- [x] Dashboard integration (conditional on haIsConfigured)
- [x] HA snapshot in TripPrepClient (fetch-once)
- [x] npm run build passes

### Runtime Verification (BLOCKED)

> **Hardware needed:** HA server not yet available (~mid-April 2026).
> Runtime testing requires a live Home Assistant instance accessible via URL + long-lived token.
> Code compiles and type-checks correctly. All proxy routes handle errors and timeouts gracefully.

## Notes

- haToken is write-only in all code paths — verified by code inspection
- Stale cache fallback path verified by code inspection (returns haEntityCache when HA unreachable)
- All HA API calls have HA_TIMEOUT_MS (5000ms) timeout configured
- Follow-up session required after HA hardware is available to verify end-to-end runtime behavior
