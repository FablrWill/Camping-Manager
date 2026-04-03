# Phase 18: Fuel & Last Stop Planner - Research

**Researched:** 2026-04-03
**Domain:** OpenStreetMap Overpass API, Next.js API routes, React component patterns
**Confidence:** HIGH

## Summary

This phase adds a read-only informational card to TripPrepClient that queries the OpenStreetMap Overpass API for fuel stations, grocery stores, and outdoor/gear shops within 50km of the trip's destination. The implementation follows the exact same independent-fetch-on-mount pattern already established by WeatherCard in TripPrepClient, and introduces one new utility file (`lib/overpass.ts`) and one new API route (`app/api/trips/[id]/last-stops/route.ts`).

The Overpass API is free, requires no API key, and returns JSON nodes with `lat`, `lon`, and `tags` (including `name`). The Haversine formula calculates straight-line distance from destination coordinates. No schema changes, no new npm packages, no caching layer — re-fetch on every mount, same as weather.

All user decisions are locked from the CONTEXT.md discussion. The planner's primary job is sequencing three tasks: utility file, API route, and TripPrepClient card injection.

**Primary recommendation:** Build in this order — (1) `lib/overpass.ts` with Haversine + Overpass fetch, (2) API route wiring Prisma + overpass.ts, (3) TripPrepClient card using independent useEffect fetch.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** If trip has no destination (location is null or lat/lon is null), hide the card entirely — no placeholder, no prompt. Same silent-omit pattern as WeatherCard.
- **D-02:** Re-fetch from Overpass on every page load — no DB caching, no schema changes. Simple is right for a personal tool. Same approach as WeatherCard (fetches on mount).
- **D-03:** Three categories: Fuel (`amenity=fuel`), Grocery (`shop=supermarket`), Outdoor / Gear (`shop=outdoor` + `shop=sports` with `shop=hardware` as fallback)
- **D-04:** Show closest **2** results per category
- **D-05:** Search radius: 50km from destination coordinates
- **D-06:** Category labels: "⛽ Fuel", "🛒 Grocery", "🏕️ Outdoor / Gear"
- **D-07:** Each result shows store name + approximate straight-line distance in miles
- **D-08:** "None found nearby — plan ahead" shown per category if 0 results within radius
- **D-09:** Card renders immediately after WeatherCard, before PackingList
- **D-10:** Card fetches independently on mount (own `useEffect`), not through the `/api/trips/[id]/prep` flow

### Claude's Discretion

- Loading state design (animate-pulse skeleton matching existing pattern in TripPrepClient)
- Error state messaging if Overpass API fails
- Distance calculation method (Haversine formula in lib/overpass.ts)
- Exact TypeScript interface names for Overpass response types

### Deferred Ideas (OUT OF SCOPE)

- Emergency services card (urgent care, hospitals, police) — future phase
- 24-hour business filtering — unreliable Overpass `opening_hours` data in rural areas
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FUEL-01 | New API endpoint `app/api/trips/[id]/last-stops/route.ts` — queries Overpass API for fuel, supermarket, hardware stops within 50km of trip destination coordinates; returns sorted-by-distance results | Overpass API URL + node response format confirmed; pattern mirrors existing `app/api/trips/[id]/route.ts` |
| FUEL-02 | New utility `lib/overpass.ts` — wraps Overpass API queries for amenity=fuel, shop=supermarket, shop=hardware; calculates distance from destination; returns structured results | Haversine formula is standard, no library needed; Overpass POST to `https://overpass-api.de/api/interpreter` confirmed |
| FUEL-03 | "Fuel & Last Stops" card added to `components/TripPrepClient.tsx` — shows after weather card, before packing list; renders 3 categories with name + distance; shows loading state; shows "None found nearby" fallback | TripPrepClient structure read in full; insertion point is between PREP_SECTIONS map and the Ready Checklist div |
</phase_requirements>

## Standard Stack

### Core (all already installed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 | API route at `app/api/trips/[id]/last-stops/route.ts` | Project standard |
| React | 19.2.4 | TripPrepClient card component | Project standard |
| TypeScript | 5 | Type-safe interfaces for Overpass response | Project standard |
| Tailwind CSS 4 | via PostCSS | Card styling matching existing pattern | Project standard |
| native `fetch` | Node.js built-in | Overpass API call from API route | Explicitly required by spec |

### External Services (free, no key)

| Service | URL | Auth | Rate Limit |
|---------|-----|------|------------|
| Overpass API | `https://overpass-api.de/api/interpreter` | None | ~10,000 queries/day — well within single-user usage |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Overpass API | Google Places | Requires paid API key — out of scope for this personal tool |
| Haversine in lib/overpass.ts | npm `geolib` | D-02/no new deps constraint; Haversine is ~10 lines |
| Re-fetch on mount | DB caching (`Trip.lastStopsData`) | D-02 locks re-fetch; caching deferred |

**Installation:** No new packages needed.

## Architecture Patterns

### Recommended File Structure (new files only)

```
lib/
└── overpass.ts           # New: Overpass API client + Haversine (mirrors weather.ts)
app/
└── api/
    └── trips/
        └── [id]/
            └── last-stops/
                └── route.ts   # New: GET endpoint, reads trip coords + calls overpass.ts
components/
└── TripPrepClient.tsx    # Modified: add LastStopsCard (or inline) after WeatherCard section
```

### Pattern 1: lib/overpass.ts — Utility File Structure

**What:** Follows `lib/weather.ts` exactly — named TypeScript interfaces at top, private helper functions, one exported async function.

**When to use:** Any time an external API is called and results need type-safe transformation.

```typescript
// Source: lib/weather.ts (read directly from codebase)
// Interfaces at top — named exports
export interface LastStop {
  name: string
  distanceMiles: number
  category: 'fuel' | 'grocery' | 'outdoor'
}

export interface LastStopsResult {
  fuel: LastStop[]
  grocery: LastStop[]
  outdoor: LastStop[]
}

// Private helper — Haversine formula
function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 3958.8 // Earth radius in miles
  const dLat = (lat2 - lat1) * Math.PI / 180
  const dLon = (lon2 - lon1) * Math.PI / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) *
    Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}

// Exported function — one entry point
export async function fetchLastStops(
  latitude: number,
  longitude: number,
): Promise<LastStopsResult> { ... }
```

### Pattern 2: Overpass API Query

**What:** POST request with OverpassQL body to the interpreter endpoint. Returns JSON with `elements` array.

**Confirmed endpoint:** `https://overpass-api.de/api/interpreter` (verified via OSM wiki)

```typescript
// Source: OSM Overpass wiki + V2-SESSIONS.md S03 spec
const query = `
[out:json][timeout:25];
(
  node["amenity"="fuel"](around:50000,${latitude},${longitude});
  node["shop"="supermarket"](around:50000,${latitude},${longitude});
  node["shop"="outdoor"](around:50000,${latitude},${longitude});
  node["shop"="sports"](around:50000,${latitude},${longitude});
  node["shop"="hardware"](around:50000,${latitude},${longitude});
);
out body;
`

const res = await fetch('https://overpass-api.de/api/interpreter', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: `data=${encodeURIComponent(query)}`,
})

const data = await res.json()
// data.elements: Array<{ type: 'node', id: number, lat: number, lon: number, tags: Record<string, string> }>
// tags.name — store name (may be undefined for unnamed nodes — filter these out)
```

### Pattern 3: API Route Structure

**What:** Mirrors existing `app/api/trips/[id]/route.ts` — async params, Prisma lookup for trip coords, delegates to utility, returns JSON.

```typescript
// Source: app/api/trips/[id]/route.ts (read directly)
import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { fetchLastStops } from '@/lib/overpass'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { location: { select: { latitude: true, longitude: true } } },
    })
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    if (!trip.location?.latitude || !trip.location?.longitude) {
      return NextResponse.json({ fuel: [], grocery: [], outdoor: [] })
    }
    const result = await fetchLastStops(trip.location.latitude, trip.location.longitude)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch last stops:', error)
    return NextResponse.json({ error: 'Failed to fetch last stops' }, { status: 500 })
  }
}
```

### Pattern 4: TripPrepClient Card Injection

**What:** Independent `useEffect` + state (same pattern as departure checklist fetch on lines 103-116 of TripPrepClient.tsx). Card renders outside the `PREP_SECTIONS.map()` loop — it is NOT a prep section, just an informational card.

**Insertion point:** Between the `PREP_SECTIONS.map()` block close and the "Ready Checklist" div (lines ~298-302 of TripPrepClient.tsx).

```tsx
// Source: TripPrepClient.tsx lines 103-116 (departure checklist independent fetch pattern)
const [lastStops, setLastStops] = useState<LastStopsResult | null>(null)
const [lastStopsLoading, setLastStopsLoading] = useState(false)

useEffect(() => {
  if (!trip.location?.latitude || !trip.location?.longitude) return
  setLastStopsLoading(true)
  fetch(`/api/trips/${trip.id}/last-stops`)
    .then(r => r.ok ? r.json() : null)
    .then(data => { setLastStops(data); setLastStopsLoading(false) })
    .catch(() => setLastStopsLoading(false))
}, [trip.id, trip.location])

// Card rendering — after PREP_SECTIONS.map() block, before Ready Checklist div
// Only render if trip has location coords (D-01)
{trip.location?.latitude && trip.location?.longitude && (
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
    {/* card content */}
  </div>
)}
```

### Anti-Patterns to Avoid

- **Joining PREP_SECTIONS:** The Fuel card is informational — it must NOT be added to the `PREP_SECTIONS` constant in `lib/prep-sections.ts`. It renders outside the sections map.
- **Fetching through /api/trips/[id]/prep:** The card fetches independently on mount (D-10). Do not wire it into the prep endpoint.
- **Mutating state:** Follow immutable patterns — `setLastStops(data)` not `lastStops.fuel.push(...)`.
- **alert() for errors:** Inline error state only, no alert(). Per CLAUDE.md project rule.
- **console.log:** Only `console.error('Failed to fetch last stops:', error)` in the API route catch block. No client-side logging.
- **Filtering by unnamed nodes late:** Filter Overpass elements without a `tags.name` property before sorting/slicing — otherwise unnamed POIs pollute results.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Great-circle distance | Custom trig from scratch | Haversine formula (~10 lines, well-known) | Standard formula, no library needed |
| POI data | Custom database of gas stations | Overpass API (OSM community data) | Free, global, no key, constantly updated |
| OSM API wrapper | npm package like `query-overpass` | Native fetch + raw OverpassQL | No new deps constraint (D-02/spec) |

**Key insight:** The Overpass API is the established free solution for this exact use case. The Haversine formula is the standard method for straight-line distance between coordinates — no library adds meaningful value here.

## Common Pitfalls

### Pitfall 1: Unnamed OSM Nodes

**What goes wrong:** Many Overpass nodes (especially fuel stations in rural areas) have `amenity=fuel` but no `name` tag. Displaying them without a name shows empty strings or `undefined` in the UI.

**Why it happens:** OSM data quality varies. Community volunteers add tags incrementally.

**How to avoid:** Filter `elements` to only those with `tags?.name` before sorting. In the utility function, add: `const named = elements.filter(e => e.tags?.name)`.

**Warning signs:** Test query against Overpass Turbo for a rural NC area — check how many results lack names.

### Pitfall 2: Overpass API Timeout on Slow Networks

**What goes wrong:** Default Overpass queries can take 2-10 seconds. The card must show a loading skeleton while the request is in flight, or the UI looks broken.

**Why it happens:** Overpass runs complex spatial queries over the global OSM database.

**How to avoid:** Set `[timeout:25]` in the OverpassQL query header. Show `animate-pulse` skeleton during `lastStopsLoading === true`. This matches the existing loading skeleton pattern in TripPrepClient.

### Pitfall 3: Overpass POST Body Encoding

**What goes wrong:** Sending the OverpassQL query as raw JSON body returns a 400 or empty response. Overpass expects `application/x-www-form-urlencoded` with the query in a `data` parameter.

**Why it happens:** Overpass is a legacy API that predates REST conventions.

**How to avoid:** Always use:
```
method: 'POST',
headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
body: `data=${encodeURIComponent(query)}`
```

### Pitfall 4: Deduplication Across OSM Tags

**What goes wrong:** The Outdoor / Gear category queries `shop=outdoor`, `shop=sports`, and `shop=hardware` separately. A single store that has multiple of these tags may appear in the Overpass response multiple times (once per matching element).

**Why it happens:** Overpass returns one element per matching node tag match, not per unique node.

**How to avoid:** Deduplicate by OSM node `id` before sorting. Use a Map keyed on element `id`.

### Pitfall 5: Trip Props Don't Include location.latitude

**What goes wrong:** If `TripPrepClientProps.trip.location` is null or `latitude`/`longitude` is null, the fetch call throws or returns garbage.

**Why it happens:** The trip location is optional — not all trips have a location set.

**How to avoid:** Guard in both the component (`if (!trip.location?.latitude) return`) and in the API route (return `{ fuel: [], grocery: [], outdoor: [] }` when coords are missing). D-01 locks this: hide the card entirely when location is null.

## Code Examples

### Haversine Formula (standalone, no imports)

```typescript
// Standard implementation — no npm package needed
function haversineDistanceMiles(
  lat1: number, lon1: number,
  lat2: number, lon2: number,
): number {
  const R = 3958.8 // Earth radius in miles
  const toRad = (deg: number) => deg * Math.PI / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) ** 2
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  return R * c
}
```

### Overpass OverpassQL Query (multi-tag, single request)

```typescript
// Single request for all 5 tag types — efficient, one round trip
function buildOverpassQuery(lat: number, lon: number): string {
  return `[out:json][timeout:25];
(
  node["amenity"="fuel"](around:50000,${lat},${lon});
  node["shop"="supermarket"](around:50000,${lat},${lon});
  node["shop"="outdoor"](around:50000,${lat},${lon});
  node["shop"="sports"](around:50000,${lat},${lon});
  node["shop"="hardware"](around:50000,${lat},${lon});
);
out body;`
}
```

### Category Assignment Logic

```typescript
// Assign each named element to a category
// outdoor/sports take priority over hardware (per D-03)
function assignCategory(
  tags: Record<string, string>
): 'fuel' | 'grocery' | 'outdoor' | null {
  if (tags['amenity'] === 'fuel') return 'fuel'
  if (tags['shop'] === 'supermarket') return 'grocery'
  if (tags['shop'] === 'outdoor' || tags['shop'] === 'sports') return 'outdoor'
  if (tags['shop'] === 'hardware') return 'outdoor' // hardware is fallback for outdoor category
  return null
}
```

### Loading Skeleton (matching existing TripPrepClient pattern)

```tsx
// Source: TripPrepClient.tsx lines 173-178 (existing animate-pulse pattern)
{lastStopsLoading && (
  <div className="space-y-2 py-2">
    {['⛽ Fuel', '🛒 Grocery', '🏕️ Outdoor / Gear'].map(label => (
      <div key={label}>
        <div className="h-3 w-20 animate-pulse bg-stone-200 dark:bg-stone-700 rounded mb-1" />
        <div className="h-4 w-48 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
      </div>
    ))}
  </div>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Custom POI databases | Overpass API (OSM community) | ~2010 OSM growth | Free, no key, global coverage |
| Google Places for POIs | OSM Overpass for non-commercial | Always | No cost, no quota for personal tools |

**Nothing deprecated for this phase** — Overpass API is stable and widely used.

## Open Questions

1. **OSM data coverage for rural NC camping areas**
   - What we know: Overpass returns community-maintained data; rural areas may have sparse coverage
   - What's unclear: How many fuel/grocery results exist within 50km of typical Pisgah/Linville destinations
   - Recommendation: The "None found nearby — plan ahead" fallback (D-08) handles sparse coverage gracefully. No code change needed.

2. **Overpass interpreter URL reliability**
   - What we know: `overpass-api.de` is the primary public instance; occasional downtime occurs
   - What's unclear: Whether to add a fallback to `overpass.kumi.systems` (secondary mirror)
   - Recommendation: Single URL is fine for a personal tool. API route catch block returns error state; card shows error message. Retry not required.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js fetch | API route Overpass call | ✓ | Built into Node 18+ | — |
| Overpass API (external) | lib/overpass.ts | ✓ (public internet) | N/A | Error state in card |
| vitest | Test suite | ✓ | In package.json | — |

**Missing dependencies with no fallback:** None.

**Missing dependencies with fallback:** Overpass API downtime — API route returns 500, card shows error state.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (jsdom environment) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/overpass.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FUEL-02 | Haversine returns correct miles for known coords | unit | `npx vitest run tests/overpass.test.ts` | Wave 0 |
| FUEL-02 | fetchLastStops returns sorted, deduplicated results | unit (mock fetch) | `npx vitest run tests/overpass.test.ts` | Wave 0 |
| FUEL-02 | fetchLastStops filters out unnamed nodes | unit (mock fetch) | `npx vitest run tests/overpass.test.ts` | Wave 0 |
| FUEL-01 | GET returns 200 with results when trip has coords | unit (mock prisma + overpass) | `npx vitest run tests/last-stops-route.test.ts` | Wave 0 |
| FUEL-01 | GET returns empty arrays when trip has no location | unit (mock prisma) | `npx vitest run tests/last-stops-route.test.ts` | Wave 0 |
| FUEL-01 | GET returns 404 when trip not found | unit (mock prisma) | `npx vitest run tests/last-stops-route.test.ts` | Wave 0 |
| FUEL-03 | Card hidden when trip has no location | manual (visual check) | — | manual-only |
| FUEL-03 | Card shows loading skeleton during fetch | manual (visual check) | — | manual-only |
| FUEL-03 | Card shows "None found nearby" fallback | manual (empty mock) | — | manual-only |

**Manual-only justification (FUEL-03 UI tests):** TripPrepClient is a complex client component with multiple effects and context dependencies; unit testing the card render is disproportionate effort for a read-only informational display. The overpass.ts utility (FUEL-02) is the logic layer and is fully unit-testable.

### Sampling Rate

- **Per task commit:** `npx vitest run tests/overpass.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/overpass.test.ts` — covers FUEL-02 (haversine, fetchLastStops, dedup, name filter)
- [ ] `tests/last-stops-route.test.ts` — covers FUEL-01 (route handler with mocked prisma + overpass)

## Project Constraints (from CLAUDE.md)

| Constraint | Source | Impact on Phase |
|------------|--------|-----------------|
| TypeScript throughout | CLAUDE.md | All new files: `.ts` or `.tsx`, explicit types on exports |
| No `alert()` — inline error state | CLAUDE.md | Error state in card uses `useState<string \| null>` |
| All API routes: try-catch + `console.error` + JSON error | CLAUDE.md | Applies to `last-stops/route.ts` |
| All React hooks: correct, minimal dependency arrays | CLAUDE.md | `useEffect` for last-stops fetch deps: `[trip.id, trip.location]` |
| No new npm dependencies | Phase spec + CLAUDE.md | fetch only; no new packages |
| No schema changes | D-02 + phase spec | `lib/overpass.ts` returns results from Overpass directly |
| Functional components + hooks | CLAUDE.md | TripPrepClient card uses useState + useEffect |
| TASKS.md updated every session | CLAUDE.md | Planner should include TASKS.md update step |
| Session changelog file created | CLAUDE.md | New `docs/changelog/session-NN.md` file |
| Immutable state patterns | Global rules | `setLastStops(data)` never mutates existing state |
| Files max 800 lines | Global rules | `lib/overpass.ts` will be ~80 lines; `last-stops/route.ts` ~40 lines |

## Sources

### Primary (HIGH confidence)

- `components/TripPrepClient.tsx` — read directly; WeatherCard fetch pattern, card structure, insertion point confirmed
- `lib/weather.ts` — read directly; utility file structure and export pattern confirmed
- `app/api/trips/[id]/route.ts` — read directly; async params pattern, Prisma lookup, error handling confirmed
- `vitest.config.ts` — read directly; test framework and include paths confirmed
- `.planning/phases/18-fuel-last-stop-planner/18-CONTEXT.md` — all locked decisions confirmed
- `.planning/V2-SESSIONS.md` — S03 spec including Overpass query pattern confirmed

### Secondary (MEDIUM confidence)

- `https://wiki.openstreetmap.org/wiki/Overpass_API` — Overpass interpreter URL, response format, and rate limits verified via WebFetch

### Tertiary (LOW confidence)

- None.

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages confirmed in package.json; Overpass API URL verified
- Architecture: HIGH — directly read TripPrepClient, weather.ts, and existing route patterns
- Pitfalls: HIGH — Overpass encoding format, unnamed node filtering, dedup confirmed from OSM docs and codebase patterns
- Overpass data coverage: LOW — rural NC coverage untested; mitigated by "None found nearby" fallback

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (Overpass API is stable; Next.js patterns won't change in 30 days)
