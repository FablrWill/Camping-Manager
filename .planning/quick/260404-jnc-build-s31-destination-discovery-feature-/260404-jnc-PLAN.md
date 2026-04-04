---
phase: quick
plan: 260404-jnc
type: execute
wave: 1
depends_on: []
files_modified:
  - lib/destination-discovery.ts
  - app/api/destinations/suggest/route.ts
  - components/DestinationSuggesterSheet.tsx
  - components/DashboardClient.tsx
  - lib/agent/tools/suggest-destination.ts
  - lib/agent/tools/index.ts
autonomous: true
requirements: [S31]

must_haves:
  truths:
    - "Dashboard shows 'Where should I go?' button in quick actions"
    - "Tapping button opens full-height sheet with date picker defaulting to next Fri-Sun"
    - "Clicking 'Find spots' fetches and shows up to 3 scored suggestions with weather, distance, rating, reasoning"
    - "'Plan this trip' navigates to /trips with location+dates prefilled via query params"
    - "Chat agent answers 'where should I go next weekend?' with scored suggestions"
    - "Gracefully handles fewer than 3 locations with coordinates"
  artifacts:
    - path: "lib/destination-discovery.ts"
      provides: "Scoring engine with suggestDestinations()"
      exports: ["suggestDestinations", "SuggestionResult", "DiscoveryParams"]
    - path: "app/api/destinations/suggest/route.ts"
      provides: "POST endpoint for destination suggestions"
      exports: ["POST"]
    - path: "components/DestinationSuggesterSheet.tsx"
      provides: "Full-height sheet UI with date picker and suggestion cards"
    - path: "lib/agent/tools/suggest-destination.ts"
      provides: "Chat agent tool definition and executor"
      exports: ["suggestDestinationTool", "executeSuggestDestination"]
  key_links:
    - from: "components/DestinationSuggesterSheet.tsx"
      to: "/api/destinations/suggest"
      via: "fetch POST on 'Find spots' click"
      pattern: "fetch.*api/destinations/suggest"
    - from: "app/api/destinations/suggest/route.ts"
      to: "lib/destination-discovery.ts"
      via: "import suggestDestinations"
      pattern: "suggestDestinations"
    - from: "lib/destination-discovery.ts"
      to: "lib/weather.ts"
      via: "import fetchWeather for each location"
      pattern: "fetchWeather"
    - from: "lib/agent/tools/index.ts"
      to: "lib/agent/tools/suggest-destination.ts"
      via: "import and register in AGENT_TOOLS + executeAgentTool"
      pattern: "suggest_destinations"
---

<objective>
Build S31 Destination Discovery — "Where should I go this weekend?" AI feature that scores saved locations against weather, recency, seasonal rating, and distance, surfacing top 3 suggestions.

Purpose: Let Will quickly find the best camping spot for an upcoming weekend without manually checking weather for each location.
Output: Scoring engine, API endpoint, UI sheet on dashboard, chat agent tool.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@CLAUDE.md
@lib/weather.ts
@lib/agent/tools/index.ts
@lib/agent/tools/weather.ts
@components/DashboardClient.tsx
@prisma/schema.prisma

<interfaces>
<!-- Key types and contracts the executor needs -->

From lib/weather.ts:
```typescript
export interface DayForecast {
  date: string; dayLabel: string; highF: number; lowF: number;
  precipProbability: number; precipInches: number; weatherCode: number;
  weatherLabel: string; weatherEmoji: string; windMaxMph: number;
  windGustMph: number; uvIndexMax: number; sunrise: string; sunset: string;
}
export interface WeatherForecast {
  latitude: number; longitude: number; elevation: number;
  days: DayForecast[]; alerts: WeatherAlert[];
}
export async function fetchWeather(
  latitude: number, longitude: number,
  startDate: string, endDate: string
): Promise<WeatherForecast>;
```

From prisma/schema.prisma (Location model):
```prisma
model Location {
  id String @id @default(cuid())
  name String
  latitude Float?
  longitude Float?
  type String?
  rating Int?       // 1-5
  visitedAt DateTime?
  notes String?
  seasonalRatings SeasonalRating[]
  // ...other fields
}
model SeasonalRating {
  id String @id @default(cuid())
  locationId String
  season String   // "spring" | "summer" | "fall" | "winter"
  rating Int      // 1-5
  @@unique([locationId, season])
}
```

From lib/agent/tools/index.ts:
```typescript
export const AGENT_TOOLS: Tool[] = [ /* 12 tools */ ];
export async function executeAgentTool(name: string, input: ToolInput): Promise<string>;
// Pattern: import tool + executor, add to AGENT_TOOLS array, add case to switch
```

Dashboard quick actions grid (components/DashboardClient.tsx ~line 331):
```tsx
<div className="grid grid-cols-2 gap-3">
  <Link href="/gear" ...>Add Gear</Link>
  <Link href="/spots" ...>Save Spot</Link>
  <Link href="/trips" ...>Plan Trip</Link>
  <Link href="/spots" ...>View Map</Link>
</div>
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Scoring engine + API route</name>
  <files>lib/destination-discovery.ts, app/api/destinations/suggest/route.ts</files>
  <action>
Create `lib/destination-discovery.ts`:

1. Export interfaces:
   - `DiscoveryParams { weekendStart: Date; weekendEnd: Date; bringingDog: boolean; maxDriveMiles?: number }`
   - `SuggestionResult { locationId: string; locationName: string; compositeScore: number; weatherScore: number; recencyScore: number; seasonalScore: number; distanceScore: number; dogBoost: number; weatherHeadline: string; driveEstimate: string; seasonalRating: number; reasoning: string }`

2. Export `suggestDestinations(params: DiscoveryParams): Promise<SuggestionResult[]>`:
   - Query all locations with non-null latitude AND longitude, include `seasonalRatings` and `trips` (for visitedAt / last trip date)
   - If zero locations have coordinates, return empty array
   - Compute midpoint date: `new Date((params.weekendStart.getTime() + params.weekendEnd.getTime()) / 2)`
   - Format midpoint as YYYY-MM-DD for weather fetch
   - Fetch weather for each location using `fetchWeather(lat, lng, midpointStr, midpointStr)` — use `Promise.allSettled` so one failure doesn't kill all
   - For each location with successful weather:

   **Weather score (0-40):**
   - Start at 40
   - Subtract `precipProbability * 0.3` (max -30)
   - Subtract 5 if highF > 95 or lowF < 25
   - Subtract 3 if windMaxMph > 25
   - Clamp to [0, 40]

   **Recency score (0-15):**
   - Find most recent visitedAt from location.visitedAt or location.trips[].startDate
   - If never visited or 30+ days ago: 15
   - If 14-29 days ago: 5
   - If < 14 days ago: 0

   **Seasonal score (0-30):**
   - Determine current season from midpoint month: spring (3-5), summer (6-8), fall (9-11), winter (12,1,2)
   - Find matching SeasonalRating for location; if none, use location.rating or default 3
   - Score = rating * 6 (so 1-5 maps to 6-30)

   **Distance score (0-15):**
   - Haversine distance from Asheville (35.5951, -82.5515) to location coords
   - Estimate drive time = distance_miles / 60
   - Under 1hr: 15, under 2hr: 8, under 3hr: 3, 3hr+: 0

   **Dog boost:**
   - If `bringingDog` and location.notes?.toLowerCase().includes('dog'): +10

   Composite = weather + recency + seasonal + distance + dogBoost

   Build reasoning string: e.g. "74F sunny, no rain. 1.5hr drive. Great fall spot. Not visited in 45 days."

   Sort descending by compositeScore, return top 3 (or fewer if fewer locations).

3. Helper: `function haversineDistanceMiles(lat1: number, lon1: number, lat2: number, lon2: number): number` — standard haversine formula returning miles.

4. Helper: `function getSeason(date: Date): string` — returns "spring"|"summer"|"fall"|"winter".

Create `app/api/destinations/suggest/route.ts`:
- POST handler
- Parse body: `{ weekendStart: string, weekendEnd: string, bringingDog: boolean }`
- Validate weekendStart and weekendEnd are valid date strings
- Call `suggestDestinations({ weekendStart: new Date(weekendStart), weekendEnd: new Date(weekendEnd), bringingDog })`
- Return `NextResponse.json({ suggestions })` with 200
- Standard try-catch with `console.error('Failed to suggest destinations:', error)` and 500 JSON error
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/competent-dewdney" && npx tsc --noEmit lib/destination-discovery.ts app/api/destinations/suggest/route.ts 2>&1 | head -30</automated>
  </verify>
  <done>suggestDestinations() compiles, API route handles POST with validation and error handling, haversine and season helpers are pure functions</done>
</task>

<task type="auto">
  <name>Task 2: Destination Suggester UI sheet + Dashboard integration</name>
  <files>components/DestinationSuggesterSheet.tsx, components/DashboardClient.tsx</files>
  <action>
Create `components/DestinationSuggesterSheet.tsx`:
- 'use client' component
- Props: `{ isOpen: boolean; onClose: () => void }`
- Full-height sheet (same overlay pattern as other sheets in the app — fixed inset-0, bg-white, z-50, slide-up)
- Header: "Where should I go?" with X close button
- Date range: two date inputs (start, end) defaulting to next Friday and next Sunday. Helper `getNextFriday()` and `getNextSunday()` compute defaults from today.
- Checkbox: "Bringing the dog?" (boolean toggle)
- Button: "Find spots" — amber/orange styled, calls POST /api/destinations/suggest with the dates + bringingDog
- Loading state: show spinner while fetching
- Results: render up to 3 suggestion cards, each showing:
  - Location name (bold)
  - Weather headline with emoji (e.g. "74F, sunny")
  - Drive estimate (e.g. "~1.5hr drive")
  - Seasonal rating as stars (filled/empty pattern using rating value)
  - Composite score as small badge
  - One-line reasoning string
  - "Plan this trip" button — navigates to `/trips?newTrip=true&locationId={id}&start={start}&end={end}` using Next.js router.push
- Empty state: "No spots with coordinates found. Add coordinates to your saved locations first."
- Error state: inline error message (no alert())
- Import icons from lucide-react: Compass, Star, MapPin, Dog, X, Loader2

Modify `components/DashboardClient.tsx`:
- Add `import { useState } from 'react'` (already imported)
- Add `import { Compass } from 'lucide-react'`
- Add `import DestinationSuggesterSheet from './DestinationSuggesterSheet'`
- Add state: `const [showDestinationSheet, setShowDestinationSheet] = useState(false)`
- In the quick actions grid (after the 4 existing Link items), add a 5th item as a button (not Link):
  ```tsx
  <button
    onClick={() => setShowDestinationSheet(true)}
    className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors col-span-2"
  >
    <div className="w-8 h-8 rounded-lg bg-purple-600 dark:bg-purple-500 flex items-center justify-center">
      <Compass size={16} className="text-white dark:text-stone-900" />
    </div>
    <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Where should I go?</span>
  </button>
  ```
- Render `<DestinationSuggesterSheet isOpen={showDestinationSheet} onClose={() => setShowDestinationSheet(false)} />` at end of component, before closing fragment/div.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/competent-dewdney" && npx tsc --noEmit components/DestinationSuggesterSheet.tsx components/DashboardClient.tsx 2>&1 | head -30</automated>
  </verify>
  <done>Sheet opens from dashboard button, shows date picker + dog toggle, fetches suggestions, renders cards with "Plan this trip" navigation</done>
</task>

<task type="auto">
  <name>Task 3: Chat agent tool + registration</name>
  <files>lib/agent/tools/suggest-destination.ts, lib/agent/tools/index.ts</files>
  <action>
Create `lib/agent/tools/suggest-destination.ts` following the exact pattern of `lib/agent/tools/weather.ts`:

1. Export `suggestDestinationTool: Tool` with:
   - name: `'suggest_destinations'`
   - description: `'Suggest the best camping destinations for a given weekend based on weather, recency, seasonal ratings, and drive distance from Asheville. Returns top 3 scored suggestions.'`
   - input_schema with properties:
     - `weekendStart` (string, description: "Start date YYYY-MM-DD, e.g. next Friday")
     - `weekendEnd` (string, description: "End date YYYY-MM-DD, e.g. next Sunday")
     - `bringingDog` (boolean, description: "Whether bringing a dog")
   - required: ['weekendStart', 'weekendEnd']

2. Export `async function executeSuggestDestination(input: { weekendStart: string; weekendEnd: string; bringingDog?: boolean }): Promise<string>`:
   - Call `suggestDestinations({ weekendStart: new Date(input.weekendStart), weekendEnd: new Date(input.weekendEnd), bringingDog: input.bringingDog ?? false })`
   - Format results as a readable string: for each suggestion, include rank, name, composite score, weather headline, drive estimate, reasoning
   - If no suggestions, return "No locations with coordinates found. Add some spots with coordinates first."
   - Return the formatted string (agent tools return strings)

Modify `lib/agent/tools/index.ts`:
- Add import: `import { suggestDestinationTool, executeSuggestDestination } from './suggest-destination';`
- Add `suggestDestinationTool` to the `AGENT_TOOLS` array (after recommendSpotsTool)
- Add case `'suggest_destinations':` to the `executeAgentTool` switch, calling `executeSuggestDestination(input as Parameters<typeof executeSuggestDestination>[0])`
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/competent-dewdney" && npx tsc --noEmit lib/agent/tools/suggest-destination.ts lib/agent/tools/index.ts 2>&1 | head -30</automated>
  </verify>
  <done>Chat agent has suggest_destinations tool registered, executor calls scoring engine and returns formatted string</done>
</task>

<task type="auto">
  <name>Task 4: Build verification</name>
  <files></files>
  <action>
Run full build to confirm no TypeScript errors across the entire project. Fix any type errors found.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/competent-dewdney" && npm run build 2>&1 | tail -20</automated>
  </verify>
  <done>npm run build succeeds with no errors</done>
</task>

</tasks>

<verification>
- `npm run build` passes with zero TypeScript errors
- Dashboard renders "Where should I go?" button in quick actions
- API route responds to POST /api/destinations/suggest with suggestion array
- Agent tool registered in AGENT_TOOLS and dispatched in executeAgentTool
</verification>

<success_criteria>
- Scoring engine correctly weighs weather (0-40), recency (0-15), seasonal (0-30), distance (0-15), dog boost (+10)
- Sheet defaults to next Fri-Sun, shows up to 3 cards with weather + reasoning
- "Plan this trip" navigates to /trips with query params for pre-fill
- Chat agent answers destination queries with scored results
- Graceful fallback when fewer than 3 locations have coordinates
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/260404-jnc-build-s31-destination-discovery-feature-/260404-jnc-SUMMARY.md`
</output>
