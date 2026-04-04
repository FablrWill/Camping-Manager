# Phase 37: Home Assistant Integration — Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Connect Outland OS to a campsite Home Assistant instance via a server-side proxy. Will can configure the HA URL and token in Settings, test the connection, pick up to 10 entities to display, and see live sensor values (battery, propane, weather, vehicle, dog GPS) on the dashboard. A Campsite card polls every 30s and degrades gracefully to cached stale values when HA is unreachable. Trip prep shows a HA snapshot when configured.

</domain>

<decisions>
## Implementation Decisions

### Connection Architecture
- **D-01:** Server-side proxy — the app calls Next.js API routes (e.g., `/api/ha/states`), which forward requests to HA from the server. The HA token never reaches the browser. This satisfies ROADMAP success criterion #6 and avoids CORS issues regardless of how HA is hosted (local IP, Tailscale, Nabu Casa).
- **D-02:** REST API only — use HA's `/api/states/<entity_id>` endpoint. No WebSocket. Simpler to implement; polling is sufficient for sensor data (battery %, propane, weather, GPS).
- **D-03:** Poll every 30 seconds on the dashboard Campsite card. Simple interval polling — fits the existing `useEffect`/`fetch` patterns in the codebase.

### Config Storage (Settings model)
- **D-04:** Extend the singleton `Settings` model (not a new model). Add `haUrl` (String?), `haToken` (String?), `haEntityIds` (String? — JSON array of up to 10 selected entity IDs), `haEntityCache` (String? — JSON blob of last-fetched entity states), and `haLastFetched` (DateTime?). Follows the established Settings singleton pattern.
- **D-05:** Token is write-only: the Settings GET endpoint (`/api/settings`) must never return `haToken`. On save, store as-is (no encryption for v1 — personal tool, local SQLite). The API layer enforces the omission.

### Test Connection
- **D-06:** "Test Connection" button calls a new endpoint `/api/ha/test`. Server fetches `GET <haUrl>/api/` with the stored token. On success, returns entity count from `/api/states`. UI shows "Connected — N entities found" or an error string.

### Entity Picker
- **D-07:** After Test Connection succeeds, entity picker fetches all HA entities from `/api/ha/entities`. Displays a searchable list grouped by domain (sensor, binary_sensor, device_tracker, etc.). Will selects up to 10. Selection is saved back to `haEntityIds` in Settings.

### Dashboard Campsite Card + Dedicated Campsite Route
- **D-08:** New "Campsite" card on the main dashboard — visible only when `haEntityIds` is non-empty. Polls `/api/ha/states` every 30s. Shows entity friendly_name + state + unit.
- **D-08b:** Dedicated `/campsite` route — a fullscreen tablet-optimized dashboard, designed for a 10" tablet mounted in camp. Shows all selected entities in a large-value card grid. **Dark mode by default** (easier outdoor reading), live auto-refresh indicator (e.g., spinning icon or "last updated Xs ago"), offline state clearly visible. This replaces needing a separate small card on the dashboard as the primary HA view; the dashboard card can link to `/campsite`.
- **D-09:** When HA is unreachable (fetch fails or server proxy returns error): show stale values from `haEntityCache` with "Offline — last updated X ago" using `haLastFetched`. If no cache exists, show "Offline — no data yet." Applies to both the dashboard card and /campsite route.
- **D-10:** Each successful poll updates `haEntityCache` and `haLastFetched` in the Settings row.

### Trip Prep Integration
- **D-11:** Trip prep shows a HA snapshot section when `haEntityIds` is configured. Reuses the same selected entities (no separate slot configuration for trip prep). Fetches on trip prep page load — no auto-refresh in trip prep. Read-only, no interaction.

### Claude's Discretion
- Timeout and retry behavior for the HA proxy (how long before "unreachable" is declared)
- Exact card layout on /campsite (grid columns, card sizing, font sizes for tablet readability)
- How to handle HA entities that return unavailable/unknown state (render as "—")
- Whether entity cache stores the full HA state object or just friendly_name + state + unit
- Order of entities in the Campsite card / /campsite route (use selection order vs. sort by domain)
- Loading skeleton for the Campsite card and /campsite during initial poll
- Whether /campsite has a nav link in the main nav or is accessed via a "Full View" button on the dashboard card

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Settings Architecture
- `prisma/schema.prisma` — `Settings` model (singleton pattern to extend with HA fields)
- `app/api/settings/route.ts` — GET/PUT pattern; follow the write-only pattern for haToken
- `components/SettingsClient.tsx` — Form section pattern to add HA config section

### Dashboard Pattern
- `components/DashboardClient.tsx` — Prop-driven server component; add Campsite card here
- `app/page.tsx` — Dashboard data fetching; add haEntityIds check to conditionally fetch HA data

### HA Research
- `/Users/willis/.claude/projects/-Users-willis-Camping-Manager/memory/reference_ha_integration.md` — HA REST API endpoints, long-lived token format, planned hardware sensors

### Prior Phase Patterns
- `app/api/settings/test-email/route.ts` — "Test" endpoint pattern (POST, inline success/error response)
- `components/GearResearchTab.tsx` — Server-proxied external API call pattern
- `lib/claude.ts` — External API wrapper pattern (error handling, timeout)

</canonical_refs>
