# Phase 31: Dark Sky & Astro Info — Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add an AstroCard to TripCard that shows moon phase per night, sunrise/sunset times per day, and a Bortle class link for the trip location. Uses suncalc for moon phase (client-side, no API key), existing Open-Meteo sunrise/sunset data (already in DayForecast), and a lightpollutionmap.info deep link for Bortle. No new pages, no schema changes.

</domain>

<decisions>
## Implementation Decisions

### Bortle Class
- **D-01:** Use Option A — placeholder + deep link. Display "Check light pollution →" as an external link to `https://www.lightpollutionmap.info/#zoom=10&lat={lat}&lng={lon}` pre-loaded to the trip's coordinates. No estimation, no bundled dataset. Honest and unblocking.
- **D-02:** The Bortle link only appears when the trip has a linked location with lat/lon. If no location, the Bortle row is hidden (not shown as an empty placeholder).

### Sunrise/Sunset Placement
- **D-03:** Sunrise and sunset times appear in the AstroCard only — not added to WeatherCard per-day rows. Clean separation: WeatherCard = weather conditions, AstroCard = astronomical data.
- **D-04:** Sunrise/sunset sourced from existing `DayForecast.sunrise` / `DayForecast.sunset` fields in the already-fetched weather data. No new API call needed.

### No-Location Fallback
- **D-05:** When a trip has no linked location, the AstroCard still appears and shows moon phase for each night (pure date math, no coordinates needed). Sunrise/sunset rows and the Bortle link are hidden. A subtle note appears: "Add a location to see sunrise/sunset times."
- **D-06:** When a trip has a location but no weather data (beyond 16-day forecast window), moon phase still shows (uses trip dates only). Sunrise/sunset rows show "—" or are hidden — same graceful handling as WeatherCard for missing data.

### Claude's Discretion
- Moon phase computation location: API route (`/api/astro`) vs. client-side in component — either pattern is acceptable; pick the simpler one (client-side computation is likely simpler since suncalc is pure JS and removes a network hop)
- `suncalc` vs. inline 20-line formula for moon phase — suncalc preferred (accuracy, established package)
- Exact loading skeleton design for AstroCard (follow WeatherCard skeleton pattern from UI-SPEC)
- Whether the AstroCard is collapsed by default or expanded — follow WeatherCard's default collapsed behavior

</decisions>

<specifics>
## Specific Ideas

- The UI-SPEC is approved: AstroCard uses indigo tint (`bg-indigo-50 dark:bg-indigo-950/30`, `border-indigo-200 dark:border-indigo-800`), mirrors WeatherCard expand/collapse pattern, per-night rows with moon emoji + label + "Good for stars" / "Poor for stars" badge
- "Good for stars" = amber badge (`bg-amber-50 text-amber-700`) when `moonFraction < 0.25`; muted stone badge otherwise
- Moon emoji set: 🌑🌒🌓🌔🌕🌖🌗🌘 per suncalc phase value (see RESEARCH.md for exact mapping)

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### UI Design Contract (locked)
- `.planning/phases/31-dark-sky-astro-info/31-UI-SPEC.md` — Approved design contract: AstroCard component spec, indigo color tokens, typography, spacing, moon emoji display, "Good for stars" badge rules, loading skeleton, WeatherCard mirroring pattern

### Technical Research
- `.planning/phases/31-dark-sky-astro-info/31-RESEARCH.md` — Full technical investigation: suncalc API, NightAstro/TripAstroData interfaces, Bortle decision rationale, data flow architecture, validation architecture, known test dates for moon phase

### Existing Pattern to Mirror
- `components/WeatherCard.tsx` — Mirror this exactly: tinted card container, expand/collapse chevron, loading skeleton, per-day row layout, offline-aware prop forwarding
- `lib/weather.ts` — `DayForecast` interface with `sunrise`/`sunset` fields (already formatted as "6:42 AM"). Pattern to follow for `lib/astro.ts`
- `app/api/weather/route.ts` — API route pattern to follow if `/api/astro` route is created (GET handler, query params, try-catch, JSON response)

### Integration Points
- `components/TripsClient.tsx` (lines 163–196) — Weather fetch/state pattern to mirror for astro data fetch (`weatherByTrip`, `weatherLoading`, `weatherErrors`)
- `components/TripCard.tsx` — AstroCard renders below WeatherCard in the expanded trip detail section
- `tests/clothing-guidance.test.ts` — TDD pattern: `require()` inside test bodies for RED stubs when source files don't exist yet

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DayForecast.sunrise` / `DayForecast.sunset` in `lib/weather.ts` — already formatted as "6:42 AM", already flows to TripCard via weather prop. Zero new data-layer work for sunrise/sunset.
- `weatherByTrip`, `weatherLoading`, `weatherErrors` state pattern in `TripsClient.tsx` — mirror exactly for `astroByTrip`, `astroLoading`, `astroErrors`
- `WeatherCard.tsx` — Component to mirror structurally. AstroCard should feel like a sibling.

### Established Patterns
- Trip data includes `TripData.location.latitude` / `TripData.location.longitude` — coordinates already available in TripsClient for the Bortle link and astro fetch
- API routes use GET with query params (`?lat=&lon=&start=&end=`) — follow weather route pattern
- Test pattern: vitest + `require()` inside test bodies for TDD RED stubs (prevents compile-time failures before source files exist)

### Integration Points
- AstroCard drops into `TripCard.tsx` below WeatherCard in the expanded detail section
- `TripsClient.tsx` orchestrates data fetching — astro fetch added alongside weather fetch in `useEffect`

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 31-dark-sky-astro-info*
*Context gathered: 2026-04-03*
