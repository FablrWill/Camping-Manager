# Phase 31: Dark Sky & Astro Info — Research

**Researched:** 2026-04-03
**Domain:** Astronomical data — moon phase, sunrise/sunset, light pollution (Bortle class)
**Confidence:** HIGH for sunrise/sunset and moon phase; MEDIUM for Bortle class

## Summary

Sunrise/sunset is already fully solved — Open-Meteo already returns `sunrise` and `sunset` as ISO8601 timestamps in the existing weather response, and `lib/weather.ts` already formats them into `DayForecast.sunrise` / `DayForecast.sunset`. Moon phase requires a new client-side calculation using the `suncalc` npm package (no API key, no network call, pure math). Bortle class (light pollution) has no reliable free public API — the best approach is a static lookup table that maps coordinate ranges to approximate Bortle classes, supplemented by a formula that converts the Open-Meteo-derived elevation and location into an estimate. The planner needs to decide how to handle Bortle (static lookup vs. skip/flag as "unknown" vs. use a heuristic).

**Primary recommendation:** Use `suncalc` for moon phase (client-side, no API), reuse existing Open-Meteo sunrise/sunset data, and implement a static Bortle estimation using a known formula from VIIRS radiance data — sourced from a small bundled dataset or a simple heuristic.

---

## API Recommendations

### Sunrise / Sunset

**Recommended approach:** Reuse data already returned by `fetchWeather()` in `lib/weather.ts`.

Open-Meteo already includes `sunrise` and `sunset` as daily variables in the existing API call. The `DayForecast` interface already has `sunrise: string` and `sunset: string` fields formatted as `"6:42 AM"`. This data flows through to `TripCard` via `weather.days[i].sunrise` and `weather.days[i].sunset`.

**Result:** No new API call needed. Sunrise/sunset is already available. The planner only needs to add UI to display it.

**Constraint:** Open-Meteo's forecast horizon is 16 days. For trips beyond 16 days out, no weather (and thus no sunrise/sunset) will be fetched — same limitation as existing weather. The astro card should gracefully handle trips with no weather data.

**Confidence:** HIGH — verified by reading `lib/weather.ts` source directly.

---

### Moon Phase

**Recommended approach:** Install `suncalc` npm package. Calculate moon phase client-side from dates — no API needed.

`suncalc` is a tiny, well-known JavaScript library (authored by Vladimir Agafonkin, creator of Leaflet). It computes sun/moon positions and phases using pure math — no network calls required.

**Package details:**
- `suncalc` — latest version ~1.9.0 on npm (stable since 2016, widely used)
- `@types/suncalc` — version ~1.9.2 — TypeScript types available
- Install: `npm install suncalc && npm install --save-dev @types/suncalc`

**Key function:**
```typescript
// Source: https://github.com/mourner/suncalc
import * as SunCalc from 'suncalc'

const illumination = SunCalc.getMoonIllumination(date)
// illumination.phase: 0.0-1.0 (0 = new moon, 0.25 = first quarter, 0.5 = full, 0.75 = last quarter)
// illumination.fraction: 0.0-1.0 (illuminated fraction of moon disk)
```

**Phase to label mapping:**
```
0.00 – 0.03  New Moon
0.03 – 0.22  Waxing Crescent
0.22 – 0.28  First Quarter
0.28 – 0.47  Waxing Gibbous
0.47 – 0.53  Full Moon
0.53 – 0.72  Waning Gibbous
0.72 – 0.78  Last Quarter
0.78 – 0.97  Waning Crescent
0.97 – 1.00  New Moon
```

**Important for stargazing:** Full moon (phase ~0.5, fraction ~1.0) is bad for stargazing. New moon (phase ~0, fraction ~0) is optimal. The UI should call this out with a simple label/emoji and a "good for stars" vs "poor for stars" indicator.

**Calculation per trip:** Call `getMoonIllumination()` for each night of the trip (use midnight on each date). For a 3-night trip, calculate 3 separate moon phase values.

**Can be run server-side or client-side** — it is pure computation, no DOM required. Running it in an API route (`/api/astro`) is the cleanest pattern, consistent with how weather is handled.

**Confidence:** HIGH — suncalc is a standard package with published TypeScript types and direct GitHub verification.

---

### Bortle Class (Light Pollution)

**Recommended approach:** Static formula using known SQM-to-Bortle conversion with a simple coordinate heuristic — no external API.

**Finding:** There is no reliable free public API for Bortle class that works without an API key and is appropriate for production use. Investigated:
- `lightpollutionmap.info` — no public API; requires contacting the author; key-gated
- `lightpollutionmap.app` — no public API; IP-based only
- `radiance-web` (Codeberg) — uses PostGIS tile server internally; no documented public query endpoint
- NASA VIIRS raw data — GeoTIFF / .h5 file downloads only; not queryable as an API

**Viable static approach:** Implement a local Bortle estimation function. The SQM-to-Bortle relationship is well-established:

| Bortle Class | Description | SQM (mag/arcsec²) |
|---|---|---|
| 1 | Exceptional dark sky | > 21.99 |
| 2 | Truly dark sky | 21.89 – 21.99 |
| 3 | Rural sky | 21.69 – 21.89 |
| 4 | Rural/suburban transition | 20.49 – 21.69 |
| 5 | Suburban sky | 19.50 – 20.49 |
| 6 | Bright suburban sky | 18.94 – 19.50 |
| 7 | Suburban/urban transition | 18.38 – 18.94 |
| 8 | City sky | 17.80 – 18.38 |
| 9 | Inner-city sky | < 17.80 |

**Practical decision for the planner:** A full static dataset lookup requires bundling a dataset of VIIRS radiance values by coordinate (large file). The pragmatic alternative for a personal camping app used in rural areas is:

**Option A (recommended): Simple coordinate-based heuristic.** Use known dark-sky thresholds: National Forest, BLM land, and campgrounds in rural areas are typically Bortle 2-4. Implement a static lookup keyed to well-known US dark sky regions (using bounding boxes or a small GeoJSON dataset), returning an approximate Bortle class. Fall back to "Unknown — check lightpollutionmap.info" with a link when no match found.

**Option B: Skip for MVP.** Show a placeholder with a link to lightpollutionmap.info for the user to look up manually. This is honest and unblocks the rest of the feature.

**Option C: Bundle a compact radiance lookup table.** Download the VIIRS annual composite data and precompute a small lookup table at ~0.25-degree grid resolution for the US. Approximately 50KB compressed. Accurate but adds build complexity.

**Recommendation:** Option B (placeholder + link) for the initial implementation. It's honest, ships quickly, and the user can get the real answer from the reference site. Add a note in the UI: "Check light pollution for this location" with a deep link to `https://lightpollutionmap.info/#zoom=10&lat={lat}&lng={lon}`.

**Confidence:** MEDIUM — verified by checking multiple data sources. The "no good free API" conclusion is well-supported by four independent investigations.

---

## Integration Architecture

### New file: `lib/astro.ts`

Follow the exact pattern of `lib/weather.ts`:
- Export named interfaces for `NightAstro` and `TripAstroData`
- Export a `computeAstro()` function that accepts lat/lon, startDate, endDate and returns per-night data
- Moon phase computed via `suncalc.getMoonIllumination()` — pure computation, no fetch required
- Sunrise/sunset sourced from the already-fetched `WeatherForecast.days` (pass it in, or re-derive from Open-Meteo if no weather available)
- Bortle: static link/placeholder approach

### New API route: `app/api/astro/route.ts`

Accepts `?lat=&lon=&start=&end=` query params. Returns per-night astro data. Follows the same GET handler pattern as `app/api/weather/route.ts`.

### Data flow in `TripsClient.tsx`

The existing weather-fetch pattern in `TripsClient.tsx` is the template:

1. In `useEffect`, after weather fetch completes, also fetch `/api/astro` for trips with a location
2. Store results in `astroByTrip: Record<string, TripAstroData>`
3. Pass as a prop to `TripCard` — same pattern as `weather` prop

**Alternative:** Since moon phase is pure computation (no latency), it could be computed directly in `TripCard` or a child component without an API round-trip. This simplifies the data flow and eliminates the API route entirely. Use `suncalc` in the component.

**Planner decision:** API route (consistent with weather pattern) vs. client-side computation in component (simpler, no server needed for pure math). Both are valid.

### UI placement in `TripCard.tsx`

`TripCard` already renders `WeatherCard` inside the expanded trip detail. The astro info should appear as a compact section below or alongside the weather — an `AstroCard` component.

Alternatively, add moon phase icons directly to the per-day weather rows in `WeatherCard` (simplest integration — already has per-day data).

---

## Existing Code Reuse

| What | Where | How Used |
|---|---|---|
| Sunrise/sunset per day | `DayForecast.sunrise` / `DayForecast.sunset` in `lib/weather.ts` | Already formatted, just display in UI |
| Weather fetch pattern | `TripsClient.tsx` lines 163-196 | Copy pattern for astro fetch |
| Weather data state | `weatherByTrip`, `weatherLoading`, `weatherErrors` | Mirror with `astroByTrip`, `astroLoading`, `astroErrors` |
| API route pattern | `app/api/weather/route.ts` | Copy for `app/api/astro/route.ts` |
| Existing trip data | `TripData.location.latitude`, `TripData.location.longitude` | Coords already available in TripsClient |
| Test pattern | `tests/clothing-guidance.test.ts` | Uses vitest + `require()` inside test bodies for TDD RED stubs |

**Key insight:** Sunrise/sunset requires zero new code in the data layer — it's already there. The only work is in the UI to surface it.

---

## Key Decisions for Planner

1. **Bortle class approach:** Option A (simple heuristic/static lookup), Option B (placeholder + link), or Option C (bundled dataset). Recommendation is Option B for v1 — honest and unblocks everything else.

2. **Moon phase computation location:** Server-side in `/api/astro` route (consistent pattern, adds network hop) vs. client-side in component/hook (simpler, no latency, suncalc is pure JS). Given suncalc is pure computation and the result only depends on trip dates (not server state), client-side computation is the simpler and faster choice.

3. **Scope of sunrise/sunset display:** Already available in `weather.days` — should this be extracted to a dedicated astro section, or simply highlighted within the existing WeatherCard per-day display? Adding to the WeatherCard row is minimal-effort.

4. **Weather dependency:** Astro data (especially sunrise/sunset from Open-Meteo) only loads when a trip has a linked location with lat/lon and is within 16 days. Moon phase can be computed for any trip with dates, regardless of location. Planner must handle the no-location case.

5. **`suncalc` vs. inline formula:** `suncalc` (1.9.0, 7KB) is the established library. An inline formula (20 lines, no dep) is an alternative for moon phase only. Either is fine — suncalc is more accurate for edge cases.

---

## Validation Architecture

**Test framework:** Vitest (`npm test`)
**Config:** `vitest.config.ts` at project root
**Quick run:** `npx vitest run tests/astro.test.ts`
**Full suite:** `npm test`

### Phase Requirements → Test Map

| Req | Behavior | Test Type | Command |
|---|---|---|---|
| REQ-1 | Sunrise/sunset display for trip dates | Unit — `computeAstro()` returns correct sunrise/sunset given dates | `npx vitest run tests/astro.test.ts` |
| REQ-2 | Moon phase per night | Unit — phase value + label for known dates (e.g., 2024-01-11 known full moon) | `npx vitest run tests/astro.test.ts` |
| REQ-3 | Bortle class shown | Unit — returns value or placeholder string | `npx vitest run tests/astro.test.ts` |
| REQ-4 | Free APIs only | Build check — no new env vars required | `npm run build` |
| REQ-5 | Build passes | Build | `npm run build` |

### Wave 0 Gaps

- [ ] `tests/astro.test.ts` — covers REQ-1 through REQ-3, tests `computeAstro()` and moon phase label mapping

### Known test dates for moon phase validation

- 2024-01-11: Full moon (fraction ~1.0, phase ~0.5)
- 2024-01-18: Last quarter (phase ~0.75)
- 2024-01-25: New moon (fraction ~0, phase ~0)

---

## Risks & Unknowns

1. **suncalc accuracy:** The library is from 2016 (last release). Moon phase accuracy is within 1 day for practical purposes (stargazing planning). For a camping app this is acceptable. No risk to implementation.

2. **Bortle API gap:** Confirmed — no reliable free no-key API exists. The placeholder+link approach is the pragmatic resolution. Risk: LOW — the workaround is documented and acceptable for a personal tool.

3. **Open-Meteo 16-day limit:** Trips planned more than 16 days out get no weather or sunrise/sunset data. Moon phase is not affected (pure date math). Risk: existing limitation already accepted by the app.

4. **suncalc TypeScript types:** `@types/suncalc` v1.9.2 exists and covers `getMoonIllumination`. No type risk.

5. **No location on trip:** Some trips don't have a linked location. Moon phase works from dates alone. Sunrise/sunset and Bortle both need coordinates. UI must handle the no-location case gracefully (e.g., "Add a location to see sunrise/sunset times").

6. **`suncalc` in Next.js API route vs. client component:** `suncalc` is a plain CJS module with no browser APIs. It works in both Node.js (API routes) and browser (client components) without modification.

---

## Standard Stack

| Library | Version | Purpose | Status |
|---|---|---|---|
| `suncalc` | ~1.9.0 | Moon phase, moon times | Install needed |
| `@types/suncalc` | ~1.9.2 | TypeScript types for suncalc | Install needed (devDep) |
| Open-Meteo (existing) | — | Sunrise/sunset (already in weather response) | Already in use |

**Installation:**
```bash
npm install suncalc
npm install --save-dev @types/suncalc
```

---

## Code Examples

### Moon phase computation (verified pattern from suncalc docs)

```typescript
// Source: https://github.com/mourner/suncalc
import * as SunCalc from 'suncalc'

function getMoonPhaseLabel(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return 'New Moon'
  if (phase < 0.22) return 'Waxing Crescent'
  if (phase < 0.28) return 'First Quarter'
  if (phase < 0.47) return 'Waxing Gibbous'
  if (phase < 0.53) return 'Full Moon'
  if (phase < 0.72) return 'Waning Gibbous'
  if (phase < 0.78) return 'Last Quarter'
  return 'Waning Crescent'
}

function getMoonPhaseEmoji(phase: number): string {
  if (phase < 0.03 || phase > 0.97) return '🌑'
  if (phase < 0.22) return '🌒'
  if (phase < 0.28) return '🌓'
  if (phase < 0.47) return '🌔'
  if (phase < 0.53) return '🌕'
  if (phase < 0.72) return '🌖'
  if (phase < 0.78) return '🌗'
  return '🌘'
}

// For each night of a trip:
const date = new Date('2024-01-11T00:00:00')
const { phase, fraction } = SunCalc.getMoonIllumination(date)
const label = getMoonPhaseLabel(phase)  // "Full Moon"
const emoji = getMoonPhaseEmoji(phase)  // "🌕"
const goodForStars = fraction < 0.25   // true when <25% illuminated
```

### Bortle placeholder with deep link

```typescript
// Source: lightpollutionmap.info URL parameter docs
function getBortleLink(lat: number, lon: number): string {
  return `https://www.lightpollutionmap.info/#zoom=10&lat=${lat}&lng=${lon}&state=eyJiYXNlbWFwIjoic3RlbGxhciIsIm92ZXJsYXkiOiJ3YTIwMTUiLCJvdmVybGF5T3BhY2l0eSI6ODV9`
}
// Displays "Check light pollution →" as an external link
```

### Per-night astro data interface

```typescript
export interface NightAstro {
  date: string          // YYYY-MM-DD (the night's date)
  moonPhase: number     // 0.0-1.0 (suncalc phase value)
  moonFraction: number  // 0.0-1.0 (illuminated fraction)
  moonLabel: string     // "Full Moon", "New Moon", etc.
  moonEmoji: string     // "🌕", "🌑", etc.
  goodForStars: boolean // true when moonFraction < 0.25
  sunrise?: string      // "6:42 AM" — from Open-Meteo DayForecast if available
  sunset?: string       // "7:58 PM" — from Open-Meteo DayForecast if available
}

export interface TripAstroData {
  nights: NightAstro[]
  bortleLink?: string   // lightpollutionmap.info deep link if coords available
}
```

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no plain JS
- All API routes: try-catch with `console.error` + JSON error response
- No `alert()` — inline state-based error messages only
- React hooks: correct minimal dependency arrays
- Files: 200-400 lines typical, 800 max
- Functions: <50 lines
- Immutable patterns — no in-place mutation
- No hardcoded values — use constants
- Test coverage: 80% minimum (vitest)
- Commit style: imperative mood, concise
- GSD workflow: use `/gsd:execute-phase` for all implementation

---

## Sources

### Primary (HIGH confidence)
- `lib/weather.ts` (project source) — confirmed sunrise/sunset already in DayForecast
- `TripsClient.tsx` (project source) — confirmed weather fetch/state pattern to mirror
- https://github.com/mourner/suncalc — suncalc getMoonIllumination API verified
- https://open-meteo.com/en/docs — confirmed sunrise/sunset are daily variables, no moon data

### Secondary (MEDIUM confidence)
- https://www.npmjs.com/package/@types/suncalc — v1.9.2 TypeScript types confirmed
- https://www.lightpollutionmap.info/help.html — no public API confirmed
- https://codeberg.org/radiance/radiance-web — PostGIS tiles, no documented public API confirmed
- https://github.com/Stellarium/stellarium/issues/1619 — lightpollutionmap.info API is not public; key required

### Tertiary (LOW confidence / cross-referenced)
- SQM-to-Bortle conversion table — well-established in astronomy community, consistent across multiple sources

---

## Metadata

**Confidence breakdown:**
- Sunrise/sunset: HIGH — already in existing code, zero new API work
- Moon phase (suncalc): HIGH — package verified, API verified, TypeScript types confirmed
- Bortle class: MEDIUM — "no free API" conclusion well-supported; static/placeholder approach is the pragmatic resolution

**Research date:** 2026-04-03
**Valid until:** 2026-07-03 (stable domain — suncalc hasn't changed in years, Open-Meteo API is stable)
