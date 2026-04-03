---
phase: 26-trip-day-sequencer
plan: 26-P02
type: execute
wave: 2
depends_on: [26-P01]
files_modified:
  - lib/claude.ts
  - app/api/departure-checklist/route.ts
  - tests/departure-checklist-route.test.ts
autonomous: true
requirements: [D-05, D-06, D-07, D-08]

must_haves:
  truths:
    - "generateDepartureChecklist accepts departureTime and lastStopNames parameters"
    - "Claude prompt includes time anchoring instructions when departureTime is provided"
    - "Claude prompt includes fuel stop reminder when lastStopNames are available"
    - "POST /api/departure-checklist fetches fuel stops from lib/overpass and passes names to Claude"
    - "Overpass failure does not block checklist generation"
  artifacts:
    - path: "lib/claude.ts"
      provides: "Enhanced generateDepartureChecklist with time + fuel params"
      contains: "departureTime"
    - path: "app/api/departure-checklist/route.ts"
      provides: "POST handler that fetches fuel stops and passes departureTime"
      contains: "fetchLastStops"
    - path: "tests/departure-checklist-route.test.ts"
      provides: "Tests for fuel stop integration and departureTime passing"
  key_links:
    - from: "app/api/departure-checklist/route.ts"
      to: "lib/overpass.ts"
      via: "fetchLastStops import"
      pattern: "import.*fetchLastStops.*from.*overpass"
    - from: "app/api/departure-checklist/route.ts"
      to: "lib/claude.ts"
      via: "generateDepartureChecklist call with departureTime + lastStopNames"
      pattern: "generateDepartureChecklist.*departureTime"
---

<objective>
Upgrade the Claude prompt in generateDepartureChecklist to produce time-anchored tasks with suggestedTime, and enhance the departure-checklist API route to fetch fuel stop names and pass departureTime at generation time.

Purpose: The brain of the sequencer — Claude now generates clock-time-anchored tasks when a departure time is set, and includes fuel stop reminders from Phase 18 data.
Output: Enhanced claude.ts function, enriched API route, tests green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/26-trip-day-sequencer/26-CONTEXT.md
@.planning/phases/26-trip-day-sequencer/26-RESEARCH.md
@.planning/phases/26-trip-day-sequencer/26-P01-SUMMARY.md

<interfaces>
<!-- From Plan 01 — now available in codebase -->

From lib/parse-claude.ts (updated):
```typescript
const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(),
})
```

From lib/overpass.ts:
```typescript
interface LastStop {
  name: string
  lat: number
  lon: number
  distanceKm: number
  type: 'fuel' | 'grocery' | 'outdoor'
}

interface LastStopsResult {
  fuel: LastStop[]
  grocery: LastStop[]
  outdoor: LastStop[]
}

export async function fetchLastStops(latitude: number, longitude: number): Promise<LastStopsResult>
```

From lib/claude.ts (current signature, lines 430-441):
```typescript
export async function generateDepartureChecklist(params: {
  tripName: string
  startDate: string
  endDate: string
  packingItems: Array<{ name: string; category: string; packed: boolean }>
  mealPlan: { result: string } | null
  powerBudget: string | null
  vehicleName: string | null
  vehicleMods: Array<{ name: string; description: string | null }>
  weatherNotes: string | null
  tripNotes: string | null
}): Promise<DepartureChecklistResult>
```

From app/api/departure-checklist/route.ts POST handler:
- Trip query already includes `location: true` (line 54)
- Trip query already includes `packingItems`, `mealPlan`, `vehicle` with `mods`
- `trip.currentBatteryPct` available for power budget
- `trip.location?.latitude` and `trip.location?.longitude` available for fuel stop lookup
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Upgrade generateDepartureChecklist in lib/claude.ts</name>
  <files>lib/claude.ts</files>
  <read_first>
    - lib/claude.ts (lines 430-537 — full generateDepartureChecklist function)
    - .planning/phases/26-trip-day-sequencer/26-CONTEXT.md (D-05 through D-08 decisions)
    - .planning/phases/26-trip-day-sequencer/26-RESEARCH.md (prompt upgrade section)
    - lib/parse-claude.ts (updated DepartureChecklistItemSchema with suggestedTime)
  </read_first>
  <action>
    Modify the `generateDepartureChecklist` function in lib/claude.ts:

    1. **Add two new params** to the params object type:
       ```typescript
       departureTime: string | null  // Human-readable format like "Friday April 18 at 7:00 AM"
       lastStopNames: string[]       // Fuel/grocery stop names from Overpass
       ```

    2. **Destructure the new params** alongside existing ones (line ~442-453):
       Add `departureTime` and `lastStopNames` to the destructuring.

    3. **Add time anchoring section to the prompt** (insert after the WEATHER NOTES line, before INSTRUCTIONS):
       ```
       ${departureTime
         ? `DEPARTURE TIME: ${departureTime}
       For each task, include a "suggestedTime" field with an absolute clock time (e.g. "9:00 PM Thu", "6:30 AM", "7:00 AM -- depart") anchored to this departure time. Night-before tasks get the prior evening. Day-of tasks get morning times. Final task is the departure time itself.`
         : `DEPARTURE TIME: Not set. Use suggestedTime: null for all items. Use slot label names as the only time reference (e.g. "Night Before", "Morning Of").`
       }
       ```

    4. **Add fuel stop section to the prompt** (after departure time section):
       ```
       ${lastStopNames.length > 0
         ? `LAST STOPS BEFORE DESTINATION (include a reminder task for the nearest stop): ${lastStopNames.join(', ')}`
         : ''
       }
       ```

    5. **Update the JSON schema example** in the prompt to include suggestedTime:
       Change the example items from:
       ```json
       { "id": "chk-0-0", "text": "Pack sleeping bags and sleep system", "checked": false, "isUnpackedWarning": false }
       ```
       To:
       ```json
       { "id": "chk-0-0", "text": "Pack sleeping bags and sleep system", "checked": false, "isUnpackedWarning": false, "suggestedTime": "9:00 PM Thu" }
       ```

    6. **Add instruction item 9** to the INSTRUCTIONS list:
       ```
       9. Every item MUST include "suggestedTime" — either a clock time string or null.
       ```

    7. **Update meal plan instruction** per D-07 to be explicit:
       Change instruction 5 from "Include meal prep items if a meal plan exists" to:
       ```
       5. If a meal plan exists, include ONE phase-level reminder: "Prep meals (see meal plan)". Only add extra meal tasks for time-sensitive items you spot (e.g. "Marinate meat tonight").
       ```

    8. **Update power instruction** per D-08 to be explicit:
       Change instruction 6 from "Include power-related items if a power budget exists" to:
       ```
       6. If a power budget exists, include "Charge EcoFlow to 100%". If current battery percentage is given, add context: "Currently at X% -- needs ~Yh to full."
       ```
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx tsc --noEmit lib/claude.ts 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - lib/claude.ts generateDepartureChecklist params type contains `departureTime: string | null`
    - lib/claude.ts generateDepartureChecklist params type contains `lastStopNames: string[]`
    - lib/claude.ts prompt string contains `DEPARTURE TIME:`
    - lib/claude.ts prompt string contains `suggestedTime`
    - lib/claude.ts prompt string contains `LAST STOPS BEFORE DESTINATION`
    - lib/claude.ts prompt JSON example contains `"suggestedTime":`
    - lib/claude.ts prompt contains `Every item MUST include "suggestedTime"`
    - `npx tsc --noEmit` passes for lib/claude.ts (no type errors)
  </acceptance_criteria>
  <done>generateDepartureChecklist accepts departureTime + lastStopNames, prompt instructs Claude to produce suggestedTime on every item, types compile</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Enhance POST /api/departure-checklist with fuel stops + departureTime</name>
  <files>app/api/departure-checklist/route.ts, tests/departure-checklist-route.test.ts</files>
  <read_first>
    - app/api/departure-checklist/route.ts (full file — POST handler lines 36-118)
    - lib/overpass.ts (fetchLastStops signature at line 78)
    - lib/claude.ts (updated generateDepartureChecklist signature from Task 1)
    - .planning/phases/26-trip-day-sequencer/26-RESEARCH.md (fuel stop data at generation time section)
  </read_first>
  <behavior>
    - Test 1: POST with a trip that has location coordinates calls fetchLastStops and passes stop names to generateDepartureChecklist
    - Test 2: POST with a trip that has no location coordinates does NOT call fetchLastStops, passes empty lastStopNames array
    - Test 3: POST when fetchLastStops throws an error still generates the checklist successfully (non-blocking)
    - Test 4: POST passes trip.departureTime (formatted as human-readable string) to generateDepartureChecklist when set
    - Test 5: POST passes departureTime as null when trip.departureTime is null
  </behavior>
  <action>
    Modify app/api/departure-checklist/route.ts POST handler:

    1. **Add import** at the top of the file:
       ```typescript
       import { fetchLastStops } from '@/lib/overpass'
       ```

    2. **After the trip query (line 56) and before the packingItems mapping (line 62)**, add fuel stop fetching:
       ```typescript
       // Fetch last-stop names for Claude prompt (non-blocking — silent catch)
       let lastStopNames: string[] = []
       if (trip.location?.latitude != null && trip.location?.longitude != null) {
         try {
           const stops = await fetchLastStops(trip.location.latitude, trip.location.longitude)
           const allStops = [...stops.fuel, ...stops.grocery, ...stops.outdoor]
           lastStopNames = allStops.slice(0, 3).map((s) => s.name)
         } catch {
           // Non-blocking — checklist generates without fuel stops if Overpass fails
         }
       }
       ```

    3. **Format departureTime as human-readable string** (after fuel stop fetch):
       ```typescript
       const departureTimeFormatted = trip.departureTime
         ? trip.departureTime.toLocaleDateString('en-US', {
             weekday: 'long',
             month: 'long',
             day: 'numeric',
             hour: 'numeric',
             minute: '2-digit',
             hour12: true,
           })
         : null
       ```

    4. **Add the two new params** to the generateDepartureChecklist call (line 81-92):
       Add `departureTime: departureTimeFormatted,` and `lastStopNames,` to the params object, after `tripNotes`.

    5. Create tests/departure-checklist-route.test.ts:
       - Mock `@/lib/db` (prisma.trip.findUnique, prisma.departureChecklist.upsert)
       - Mock `@/lib/claude` (generateDepartureChecklist)
       - Mock `@/lib/overpass` (fetchLastStops)
       - Mock `@/lib/safe-json` if needed
       - Test that generateDepartureChecklist is called with `departureTime` and `lastStopNames` params
       - Test the 5 behaviors listed above
       - Follow mocking patterns from tests/last-stops-route.test.ts
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx vitest run tests/departure-checklist-route.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - app/api/departure-checklist/route.ts contains `import { fetchLastStops } from '@/lib/overpass'`
    - app/api/departure-checklist/route.ts POST handler contains `fetchLastStops(trip.location.latitude, trip.location.longitude)`
    - app/api/departure-checklist/route.ts POST handler contains `lastStopNames` variable
    - app/api/departure-checklist/route.ts POST handler passes `departureTime:` to generateDepartureChecklist call
    - app/api/departure-checklist/route.ts POST handler passes `lastStopNames` to generateDepartureChecklist call
    - app/api/departure-checklist/route.ts fetchLastStops call is wrapped in try/catch (non-blocking)
    - tests/departure-checklist-route.test.ts exists and contains `describe(`
    - `npx vitest run tests/departure-checklist-route.test.ts` exits 0 with 5 passing tests
  </acceptance_criteria>
  <done>POST /api/departure-checklist fetches fuel stops non-blockingly, formats departureTime as human-readable, passes both to Claude prompt, tests green</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/departure-checklist-route.test.ts` — all 5 tests pass
- `npx vitest run tests/` — full suite green (no regressions)
- `npm run build` passes
</verification>

<success_criteria>
- Claude prompt now produces suggestedTime on every checklist item
- Fuel stop names from Overpass are included in Claude prompt when available
- departureTime is formatted human-readable and included in prompt
- Overpass failure is gracefully handled (silent catch, empty array)
- 5 new tests green
</success_criteria>

<output>
After completion, create `.planning/phases/26-trip-day-sequencer/26-P02-SUMMARY.md`
</output>
