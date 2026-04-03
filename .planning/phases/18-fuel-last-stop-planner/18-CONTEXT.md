# Phase 18: Fuel & Last Stop Planner - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a "Fuel & Last Stops" card to TripPrepClient that queries OpenStreetMap Overpass API for the closest gas station, grocery store, and outdoor/gear store near the trip's destination coordinates. Card is informational (read-only) — no user input, no schema changes. Shows immediately before the packing list section.

</domain>

<decisions>
## Implementation Decisions

### No-Location Handling
- **D-01:** If trip has no destination (location is null or lat/lon is null), hide the card entirely — no placeholder, no prompt. Same silent-omit pattern as WeatherCard.

### Data Fetching
- **D-02:** Re-fetch from Overpass on every page load — no DB caching, no schema changes. Simple is right for a personal tool. Same approach as WeatherCard (fetches on mount).

### Stop Categories & OSM Query Tags
- **D-03:** Three categories: **Fuel**, **Grocery**, **Outdoor / Gear**
  - Fuel: `amenity=fuel`
  - Grocery: `shop=supermarket`
  - Outdoor / Gear: `shop=outdoor` + `shop=sports` (query both; outdoor/sporting goods first, then hardware stores as fallback via `shop=hardware`)
- **D-04:** Show closest **2** results per category (not 1, not 3)
- **D-05:** Search radius: 50km from destination coordinates

### Card Label & Display
- **D-06:** Category labels in card: "⛽ Fuel", "🛒 Grocery", "🏕️ Outdoor / Gear"
- **D-07:** Each result shows: store name + approximate straight-line distance in miles
- **D-08:** "None found nearby — plan ahead" shown per category if 0 results within radius

### Integration Point
- **D-09:** Card renders immediately after WeatherCard, before PackingList — matches spec ("after weather, before packing")
- **D-10:** Card fetches independently on mount (own `useEffect`), not through the `/api/trips/[id]/prep` flow

### Claude's Discretion
- Loading state design (animate-pulse skeleton matching existing pattern in TripPrepClient)
- Error state messaging if Overpass API fails
- Distance calculation method (Haversine formula in lib/overpass.ts)
- Exact TypeScript interface names for Overpass response types

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Trip Prep Integration
- `components/TripPrepClient.tsx` — Where the card inserts; see existing WeatherCard fetch pattern (lines ~82-116) and card rendering structure
- `lib/prep-sections.ts` — PREP_SECTIONS constant and PrepSection types; note that Fuel card does NOT need to join this list (it's informational, not a prep checklist item)

### Existing Utility Patterns
- `lib/weather.ts` — Model for a new utility file: exported async function + TypeScript interfaces at top, no default export
- `app/api/trips/[id]/route.ts` — Pattern for trip-scoped API routes using `[id]` dynamic segment

### Requirements
- `.planning/REQUIREMENTS.md` — FUEL-01, FUEL-02, FUEL-03 requirements for this phase

### Phase Spec (V2 source of truth)
- `.planning/V2-SESSIONS.md` — S03 section; full Overpass query pattern, acceptance criteria, and constraints

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `TripPrepClient.tsx` card pattern: `<div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">` — new card should use this exact structure
- Loading skeleton: `animate-pulse bg-stone-200 dark:bg-stone-700 rounded` — use for loading state
- WeatherCard independent fetch: `useEffect(() => { fetch(...) }, [trip.id])` — exact pattern for Fuel card fetch

### Established Patterns
- Utility files in `lib/`: camelCase filename, named exports, TypeScript interfaces at top (see `weather.ts`)
- API routes: try-catch with `console.error('Action:', error)` + `NextResponse.json({ error: '...' }, { status: 500 })`
- No `alert()` — inline error state only

### Integration Points
- `TripPrepClient.tsx` renders cards in order within `<div className="max-w-4xl mx-auto px-4 py-6 space-y-4">` — new card inserts between WeatherCard and PackingList
- Trip props already have `location: { latitude, longitude }` available in TripPrepClientProps

</code_context>

<specifics>
## Specific Ideas

- User also wants **emergency services** (urgent care, hospitals, police) nearby — deferred to future phase (see Deferred section)
- User also wanted 24-hour business filtering — deferred due to unreliable Overpass `opening_hours` data in rural areas

</specifics>

<deferred>
## Deferred Ideas

### Emergency Services Card (future phase)
User wants to know nearest urgent care, hospital, and police station near the campsite. Strong safety use case. Deferred because:
- It's a separate card concept (safety infrastructure vs. provisioning stops)
- Would benefit from better data than Overpass alone (e.g., Google Places for reliable hours/status)
- Should be its own phase once the Overpass utility pattern is proven

### 24-Hour Business Filtering
User wanted to filter for businesses open 24 hours. Deferred because:
- Overpass `opening_hours` data is community-maintained and unreliable, especially in rural areas where this matters most
- V2-SESSIONS.md spec explicitly calls this out of scope for this reason
- Revisit if/when a more reliable data source becomes available

</deferred>

---

*Phase: 18-fuel-last-stop-planner*
*Context gathered: 2026-04-03*
