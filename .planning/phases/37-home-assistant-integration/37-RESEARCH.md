# Phase 37: Home Assistant Integration - Research

**Researched:** 2026-04-04
**Domain:** Home Assistant REST API + Next.js server-side proxy + Prisma Settings singleton
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Server-side proxy — Next.js API routes forward to HA from the server; HA token never reaches the browser. Avoids CORS regardless of HA hosting (local IP, Tailscale, Nabu Casa).
- **D-02:** REST API only (`/api/states/<entity_id>`). No WebSocket. Polling is sufficient.
- **D-03:** Poll every 30 seconds on the dashboard Campsite card using `useEffect`/`fetch` interval.
- **D-04:** Extend the existing `Settings` singleton model with: `haUrl` (String?), `haToken` (String?), `haEntityIds` (String? — JSON array, max 10), `haEntityCache` (String? — JSON blob of last-fetched states), `haLastFetched` (DateTime?).
- **D-05:** Token write-only — `GET /api/settings` must never return `haToken`. Stored as plaintext (personal tool, local SQLite, v1).
- **D-06:** Test Connection button calls `POST /api/ha/test`. Server fetches `GET <haUrl>/api/` with stored token. Returns entity count from `/api/states`. UI shows "Connected — N entities found" or error string.
- **D-07:** Entity picker: `GET /api/ha/entities` returns all HA entities, searchable, grouped by domain. Max 10 selected. Selection saved to `haEntityIds` in Settings.
- **D-08:** Dashboard Campsite card — visible only when `haEntityIds` non-empty. Polls `GET /api/ha/states` every 30s. Shows entity `friendly_name` + `state` + `unit_of_measurement`.
- **D-09:** Offline fallback — show stale values from `haEntityCache` + "Offline — last updated X ago" using `haLastFetched`. If no cache: "Offline — no data yet."
- **D-10:** Each successful poll updates `haEntityCache` and `haLastFetched` in the Settings row (server-side write on every successful proxy call).
- **D-11:** Trip prep shows HA snapshot section when `haEntityIds` configured. Fetches on page load, no auto-refresh. Read-only.

### Claude's Discretion
- Timeout and retry behavior for the HA proxy (how long before "unreachable" is declared)
- Exact UI layout and iconography for the Campsite card (value formatting, units display)
- How to handle HA entities that return unavailable/unknown state
- Whether entity cache stores the full HA state object or just friendly_name + state + unit
- Order of entities in the Campsite card (use selection order vs. sort by domain)
- Loading skeleton for the Campsite card during initial 30s poll

### Deferred Ideas (OUT OF SCOPE)
- WebSocket real-time subscriptions
- Push webhooks from HA to Outland OS
- MQTT integration
- MCP server integration
- iOS Companion App sensor bridging
</user_constraints>

## Summary

Phase 37 adds a campsite sensor overlay to Outland OS by connecting to a Home Assistant instance via its REST API. The architecture is a Next.js server-side proxy: three new API routes (`/api/ha/test`, `/api/ha/entities`, `/api/ha/states`) forward requests to HA using the stored token, which never leaves the server. The Settings singleton is extended with five new HA fields via a Prisma migration. On the dashboard a new Campsite card polls every 30 seconds and degrades gracefully to cached stale values when HA is unreachable. Trip prep shows a one-time HA snapshot.

The HA REST API is simple, stable, and well-documented. All requests use a single `Authorization: Bearer <token>` header. The key endpoints are `GET /api/` (health check), `GET /api/states` (all entities), and `GET /api/states/<entity_id>` (single entity). Each entity state object carries `entity_id`, `state`, `attributes.friendly_name`, and `attributes.unit_of_measurement`.

The project already has an established Settings singleton pattern (`app/api/settings/route.ts`), a "test endpoint" pattern (`app/api/settings/test-email/route.ts`), and a server-proxied external API call pattern (`components/GearResearchTab.tsx`, `lib/claude.ts`). This phase follows all three patterns closely with no new architectural primitives needed.

**Primary recommendation:** Extend Settings via Prisma migration, implement three thin HA proxy routes, add a Campsite card component that self-polls with interval cleanup, and wire a read-only snapshot into trip prep. No new npm packages needed — Node's built-in `fetch` (available in Next.js 16) is sufficient.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 (in project) | Server-side proxy routes | Already installed; server components prevent token exposure |
| Prisma | 6.19.2 (in project) | Settings singleton extension | Already the ORM; `prisma migrate dev` adds HA fields |
| Node.js `fetch` | Built-in (Next.js 16) | HTTP calls from server to HA | No extra dep needed; Next.js 16 polyfills/uses native fetch |
| React hooks (`useEffect`, `useState`) | 19.2.4 (in project) | 30s polling on dashboard | Established pattern in this codebase |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 1.7.0 (in project) | Icons for Campsite card | Use `Wifi`, `WifiOff`, `Battery`, `Thermometer`, `MapPin` icons from existing import |
| Vitest | 3.2.4 (in project) | Unit tests for route handlers | Same test pattern as `tests/gear-research-route.test.ts` |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Native fetch | `axios` or `node-fetch` | No benefit — native fetch is sufficient for simple GET requests to HA |
| Plaintext token storage | Encrypted storage (e.g., AES via `crypto`) | Overkill for v1 personal tool on local SQLite; CONTEXT.md explicitly says "no encryption for v1" |
| Poll interval | WebSocket subscriptions | Explicitly deferred in CONTEXT.md |

**Installation:** No new packages required.

## Architecture Patterns

### Recommended New Files Structure
```
app/
  api/
    ha/
      test/route.ts       — POST: health check, returns entity count
      entities/route.ts   — GET: all HA entities, grouped by domain
      states/route.ts     — GET: selected entity states, updates cache + haLastFetched
    settings/route.ts     — existing, extend PUT handler to accept haUrl/haToken/haEntityIds
components/
  CampsiteCard.tsx        — new dashboard card, self-polls every 30s
  HAEntityPicker.tsx      — new entity picker modal (search + max-10 select)
  HASnapshotSection.tsx   — new trip prep read-only snapshot section
```

### Pattern 1: Server-Side HA Proxy
**What:** Next.js API route reads `haUrl` and `haToken` from Settings (server-side DB read), then `fetch`es HA. Never passes token to client.
**When to use:** All three HA proxy routes.

```typescript
// Source: pattern from app/api/settings/test-email/route.ts + lib/claude.ts
export async function POST() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
    if (!settings?.haUrl || !settings?.haToken) {
      return NextResponse.json({ error: 'Home Assistant not configured' }, { status: 400 });
    }
    const res = await fetch(`${settings.haUrl}/api/`, {
      headers: { Authorization: `Bearer ${settings.haToken}` },
      signal: AbortSignal.timeout(8000), // 8s timeout — Claude's discretion
    });
    if (!res.ok) {
      return NextResponse.json({ error: `HA returned ${res.status}` }, { status: 502 });
    }
    // ...
  } catch (error) {
    console.error('HA test failed:', error);
    return NextResponse.json({ error: 'Could not reach Home Assistant' }, { status: 502 });
  }
}
```

### Pattern 2: Token Write-Only in Settings GET
**What:** Omit `haToken` from the GET response. Return a boolean `haTokenSet` instead.
**When to use:** `GET /api/settings` response.

```typescript
// Extend existing GET handler
const { haToken, ...safeSettings } = settings ?? {};
return NextResponse.json({
  ...safeSettings,
  haTokenSet: Boolean(haToken),  // never expose the token value
});
```

### Pattern 3: 30-Second Dashboard Polling
**What:** `useEffect` sets up an interval, clears on unmount. First fetch fires immediately.
**When to use:** `CampsiteCard.tsx`.

```typescript
// Source: pattern from components/FuelCard (Phase 18) and general React
useEffect(() => {
  const fetchStates = async () => { /* ... */ };
  fetchStates(); // immediate first fetch
  const interval = setInterval(fetchStates, 30_000);
  return () => clearInterval(interval); // cleanup on unmount
}, []); // empty deps — no values used from closure that change
```

### Pattern 4: Offline Fallback Display
**What:** API route returns cached state + metadata when HA is unreachable. Client renders stale indicator.
**When to use:** `GET /api/ha/states` + `CampsiteCard.tsx`.

Cache should store the minimum needed for display: `{ entityId, friendlyName, state, unit, lastUpdated }[]`. Avoid storing full HA state objects with their large `attributes` blobs — keep the cache compact for SQLite JSON column.

### Pattern 5: Entity Picker with Domain Grouping
**What:** `GET /api/ha/entities` proxies `GET <haUrl>/api/states`, returns all entities grouped by domain prefix (`sensor`, `binary_sensor`, `device_tracker`, etc.).
**When to use:** After Test Connection succeeds, entity picker modal opens.

HA entity IDs always follow `<domain>.<object_id>` format (e.g., `sensor.battery_state_of_charge`). Extract domain by splitting on the first `.`.

### Anti-Patterns to Avoid
- **Storing haToken in localStorage or returning it from GET /api/settings:** Violates D-05. Always omit from GET response.
- **Fetching HA states directly from the browser (client-side):** Causes CORS errors when HA is on a local IP or Tailscale address not accessible from the browser origin. Use the server-side proxy.
- **Reading haEntityIds as a raw string in components:** Always `JSON.parse(settings.haEntityIds)` with a `try/catch`; treat null/undefined as empty array.
- **Polling on the trip prep page:** D-11 says fetch on page load only. Do not add a 30s interval to trip prep.
- **Mutating the haEntityCache field from the client:** Cache updates happen on the server only, inside the `/api/ha/states` route after a successful HA fetch.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP timeout | Manual race/Promise.race | `AbortSignal.timeout(ms)` | Built into fetch, no extra code |
| HA entity grouping | Custom parser | `entityId.split('.')[0]` | HA domain is always the prefix before first `.` |
| Token storage | Custom crypto | Plaintext in SQLite (v1 explicit decision) | Personal tool, local-only; D-05 explicitly opted out of encryption |
| Entity state caching | Separate model | `haEntityCache` JSON column on Settings | Singleton fits; at most 10 entities, tiny payload |

**Key insight:** HA's REST API is intentionally minimal — no client library needed. A `fetch` with one header is all that's required.

## Runtime State Inventory

> Not a rename/refactor/migration phase. This section is skipped.

## Common Pitfalls

### Pitfall 1: CORS When Fetching HA from the Browser
**What goes wrong:** If a component ever calls `fetch('http://192.168.1.x:8123/api/states')` directly, the browser blocks it (CORS). HA does not send CORS headers for arbitrary origins.
**Why it happens:** Developer forgets the proxy layer and calls HA directly for "simplicity."
**How to avoid:** All HA calls go through `/api/ha/*` routes. Never import HA URL into client components.
**Warning signs:** `Access-Control-Allow-Origin` errors in browser console.

### Pitfall 2: haToken Leaking in GET Response
**What goes wrong:** The Settings GET returns the token in the JSON body; client stores it in React state; it's visible in Redux DevTools / network tab.
**Why it happens:** Forgetting to omit the field when spreading the Prisma result.
**How to avoid:** Destructure `haToken` out explicitly: `const { haToken, ...rest } = settings`. Return `haTokenSet: Boolean(haToken)` instead.
**Warning signs:** `haToken` visible in `/api/settings` network response.

### Pitfall 3: JSON.parse Crash on haEntityIds
**What goes wrong:** `haEntityIds` is stored as a JSON string in SQLite. If it's null, malformed, or an old format, `JSON.parse()` throws and crashes the route.
**Why it happens:** Not wrapping in try/catch, or not handling the null case.
**How to avoid:** Always use a safe parse helper: `safeParseEntityIds(raw: string | null): string[] { try { return JSON.parse(raw ?? '[]') } catch { return [] } }`.
**Warning signs:** 500 errors on `/api/ha/states` after Settings update.

### Pitfall 4: stale interval after component unmount
**What goes wrong:** `setInterval` in `CampsiteCard` keeps firing after navigation away from dashboard, causing state updates on unmounted component (React warning + potential memory leak).
**Why it happens:** Missing `return () => clearInterval(interval)` in `useEffect` cleanup.
**How to avoid:** Always return the cleanup function. Pattern is established in `FuelCard`.
**Warning signs:** React "Can't perform a state update on unmounted component" warning (or the newer equivalent in React 19).

### Pitfall 5: haUrl Trailing Slash Inconsistency
**What goes wrong:** User enters `http://homeassistant.local:8123/` with trailing slash; proxy builds `http://homeassistant.local:8123//api/` — some proxies tolerate it, others 404.
**Why it happens:** String concatenation without normalizing the base URL.
**How to avoid:** Always strip trailing slash on save: `haUrl.replace(/\/$/, '')` before storing.
**Warning signs:** Test Connection returns 404 for some HA configs.

### Pitfall 6: HA "unavailable" or "unknown" State
**What goes wrong:** A sensor (e.g., Mopeka BLE propane) loses BLE connection. HA sets its state to `"unavailable"`. The UI displays "unavailable" as a raw string.
**Why it happens:** Not handling HA's sentinel state values before rendering.
**How to avoid (Claude's discretion):** Treat `"unavailable"` and `"unknown"` as display sentinels — render "—" or a grayed-out dash rather than the raw string. Include `unit_of_measurement` as empty string for these cases.

### Pitfall 7: Next.js 16 Server-Side `fetch` AbortSignal Support
**What goes wrong:** `AbortSignal.timeout()` may not be available in all Node.js versions that could run Next.js 16 dev mode on older setups.
**Why it happens:** `AbortSignal.timeout()` was added in Node 17.3. If Node is older, it throws `TypeError: AbortSignal.timeout is not a function`.
**How to avoid:** Fallback pattern — check `AbortSignal.timeout` exists or use `setTimeout`+`AbortController` pair. The Mac mini is likely running a recent Node, so this is LOW risk but worth a one-line guard.
**Warning signs:** Server startup error or 500 on first HA test.

## Code Examples

Verified patterns from official sources and project conventions:

### HA REST API Authentication Header
```typescript
// Source: https://developers.home-assistant.io/docs/api/rest/
// HIGH confidence — verified against official HA developer docs
const response = await fetch(`${haUrl}/api/states`, {
  headers: {
    'Authorization': `Bearer ${haToken}`,
    'Content-Type': 'application/json',
  },
  signal: AbortSignal.timeout(8000),
});
```

### HA Entity State Object Shape
```typescript
// Source: https://developers.home-assistant.io/docs/api/rest/
// HIGH confidence — from official HA REST API docs
interface HAEntityState {
  entity_id: string;          // e.g. "sensor.battery_state_of_charge"
  state: string;              // e.g. "85" or "unavailable" or "unknown"
  last_changed: string;       // ISO 8601
  last_updated: string;       // ISO 8601
  attributes: {
    friendly_name?: string;   // e.g. "Battery State of Charge"
    unit_of_measurement?: string; // e.g. "%" or "°C"
    [key: string]: unknown;
  };
}
```

### Entity Cache Shape (what to store in haEntityCache)
```typescript
// Minimal cache — only display data, not full HA state blobs
interface CachedEntityState {
  entityId: string;
  friendlyName: string;
  state: string;
  unit: string;
}
// Store as: JSON.stringify(CachedEntityState[]) in Settings.haEntityCache
```

### Prisma Migration Fields to Add to Settings
```prisma
// Add to Settings model in prisma/schema.prisma
model Settings {
  // ... existing fields ...
  haUrl           String?   // e.g. "http://homeassistant.local:8123"
  haToken         String?   // long-lived access token — write-only
  haEntityIds     String?   // JSON array of up to 10 entity IDs
  haEntityCache   String?   // JSON blob of CachedEntityState[]
  haLastFetched   DateTime? // when haEntityCache was last written
}
```

### Test Connection Route Skeleton
```typescript
// app/api/ha/test/route.ts
// POST — verify HA is reachable and return entity count
export async function POST(): Promise<NextResponse> {
  const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
  if (!settings?.haUrl || !settings?.haToken) {
    return NextResponse.json({ error: 'Home Assistant not configured' }, { status: 400 });
  }
  // 1. Ping /api/ for health
  // 2. Fetch /api/states for entity count
  // Return: { connected: true, entityCount: N } or { error: string }
}
```

### Domain Grouping for Entity Picker
```typescript
// Group entities by HA domain prefix
function groupByDomain(entities: HAEntityState[]): Record<string, HAEntityState[]> {
  return entities.reduce((acc, entity) => {
    const domain = entity.entity_id.split('.')[0];
    return { ...acc, [domain]: [...(acc[domain] ?? []), entity] };
  }, {} as Record<string, HAEntityState[]>);
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `node-fetch` npm package | Native `fetch` in Node 18+ | Node 18 (2022) | No extra dependency needed |
| `AbortController` + `setTimeout` timeout pattern | `AbortSignal.timeout(ms)` | Node 17.3 (2022) | Simpler timeout handling |
| HA authentication via query param `?api_password=` | `Authorization: Bearer <token>` header | HA 0.78+ (2018) | Legacy password auth is removed; always use Bearer token |

**Deprecated/outdated:**
- HA `api_password` query param auth: Removed in HA 2023.4. Never use. Long-lived access tokens (Bearer) are the only approach.
- HA `legacy_api_password` in `configuration.yaml`: Removed entirely.

## Open Questions

1. **HA URL format when behind Tailscale or Nabu Casa**
   - What we know: User will access HA via Tailscale (local mesh) or direct campsite IP when on local network. CONTEXT.md confirms both are supported.
   - What's unclear: Whether the stored `haUrl` needs to handle different URLs per network context (e.g., local vs. Tailscale).
   - Recommendation: Store one URL. The user can update it in Settings when switching contexts. This is a personal tool — no need for multi-URL complexity in v1. Document this limitation in the Settings UI placeholder text.

2. **haEntityCache update strategy during 30s poll**
   - What we know: D-10 says "each successful poll updates haEntityCache and haLastFetched."
   - What's unclear: Whether the Prisma write on every successful poll (every 30s) will cause noticeable SQLite contention with other operations.
   - Recommendation: SQLite is single-writer but the write is tiny (JSON blob update on one row). At 30s intervals this is negligible. No concern.

3. **CampsiteCard initial state before first poll**
   - What we know: Card is visible when `haEntityIds` is non-empty. First poll fires immediately in `useEffect`.
   - What's unclear: What to show in the ~1-2 second window before the first response arrives.
   - Recommendation (Claude's discretion): Show a loading skeleton (pulsing rows matching entity count). If `haEntityCache` is available from the server-side initial page load, show stale data immediately with an "updating..." indicator.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Home Assistant instance | All HA routes | ✗ (hardware ~mid-April 2026) | — | Routes return 400 if haUrl/haToken not configured |
| Node fetch (built-in) | HA proxy routes | ✓ | Next.js 16 bundles it | — |
| Prisma SQLite | Settings extension | ✓ | 6.19.2 | — |
| Vitest | Tests | ✓ | 3.2.4 | — |

**Missing dependencies with no fallback:**
- Physical HA hardware (campsite server). Phase can be coded and tested without hardware — routes return graceful error when not configured.

**Missing dependencies with fallback:**
- None that affect coding. Routes are designed to handle the unconfigured state gracefully.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (project root) |
| Quick run command | `npm test -- tests/ha-*.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HA-01 | Settings GET never returns haToken | unit | `npm test -- tests/ha-settings.test.ts` | ❌ Wave 0 |
| HA-02 | POST /api/ha/test returns success + entity count when HA reachable | unit | `npm test -- tests/ha-test-route.test.ts` | ❌ Wave 0 |
| HA-03 | POST /api/ha/test returns 400 when haUrl/haToken not configured | unit | `npm test -- tests/ha-test-route.test.ts` | ❌ Wave 0 |
| HA-04 | GET /api/ha/states returns cached data when HA unreachable | unit | `npm test -- tests/ha-states-route.test.ts` | ❌ Wave 0 |
| HA-05 | GET /api/ha/states updates haEntityCache on success | unit | `npm test -- tests/ha-states-route.test.ts` | ❌ Wave 0 |
| HA-06 | Entity grouping by domain is correct | unit | `npm test -- tests/ha-entity-grouping.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/ha-*.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green + `npm run build` passes before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/ha-test-route.test.ts` — covers HA-02, HA-03
- [ ] `tests/ha-states-route.test.ts` — covers HA-04, HA-05
- [ ] `tests/ha-settings.test.ts` — covers HA-01 (token omission)
- [ ] `tests/ha-entity-grouping.test.ts` — covers HA-06 (pure function, easy to unit test)

## Project Constraints (from CLAUDE.md)

The following CLAUDE.md directives apply to this phase:

- **TypeScript throughout** — all new files use `.ts`/`.tsx`
- **All API routes must have try-catch error handling** with `console.error` + JSON error response
- **No `alert()` in components** — use state-based inline error messages
- **All React hooks must have correct, minimal dependency arrays** — never include state the hook itself updates
- **No premature abstractions** — build what's needed now (no HA client class unless needed)
- **Functions small (<50 lines), files focused (<800 lines)** — `CampsiteCard.tsx` and `HAEntityPicker.tsx` are separate files
- **Immutable patterns** — spread objects instead of mutating; use `JSON.parse`/`JSON.stringify` for cache updates
- **TASKS.md is the single source of truth** — update after each session
- **Commit messages: imperative mood, concise**
- **Settings singleton uses hardcoded `id='user_settings'`** — must continue using this pattern for upsert
- **Token never returned from GET /api/settings** — enforced at API layer (per D-05)

## Sources

### Primary (HIGH confidence)
- [HA REST API Developer Docs](https://developers.home-assistant.io/docs/api/rest/) — endpoints, entity shape, auth header format
- `app/api/settings/route.ts` (project) — Settings singleton GET/PUT pattern
- `app/api/settings/test-email/route.ts` (project) — "Test" endpoint POST pattern
- `prisma/schema.prisma` (project) — Settings model fields to extend
- `components/SettingsClient.tsx` (project) — Settings form section pattern

### Secondary (MEDIUM confidence)
- [HA Community — Long-Lived Access Token](https://community.home-assistant.io/t/how-to-get-long-lived-access-token/162159) — token generation UX, 10-year validity confirmed
- [HA Authentication Docs](https://www.home-assistant.io/docs/authentication/) — confirmed `api_password` is removed; Bearer token is only method

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; existing project stack confirmed
- Architecture: HIGH — all patterns have direct precedents in this codebase
- HA REST API: HIGH — verified against official developer docs
- Pitfalls: HIGH for CORS/token-leak (well-known); MEDIUM for Node version AbortSignal (env-dependent)

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (HA REST API is stable; patterns are project-internal)
