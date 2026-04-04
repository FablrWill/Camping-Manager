---
phase: 29-vehicle-pre-trip-checklist
plan: 03
type: execute
wave: 3
depends_on: ["29-02"]
files_modified:
  - lib/prep-sections.ts
  - components/VehicleChecklistCard.tsx
  - components/TripPrepClient.tsx
autonomous: false
requirements:
  - SC-1
  - SC-2
  - SC-5

must_haves:
  truths:
    - "Trip prep page shows a Vehicle Check section with checklist items"
    - "Checklist items can be tapped to toggle checked state"
    - "Progress bar shows how many items are done"
    - "Empty state prompts user to generate or assign a vehicle"
    - "Regenerate button shows confirmation dialog before replacing checklist"
  artifacts:
    - path: "lib/prep-sections.ts"
      provides: "vehicle-check entry in PREP_SECTIONS array"
      contains: "vehicle-check"
    - path: "components/VehicleChecklistCard.tsx"
      provides: "VehicleChecklistCard component with loading, empty, and loaded states"
      min_lines: 100
    - path: "components/TripPrepClient.tsx"
      provides: "Vehicle Check section rendering via VehicleChecklistCard"
      contains: "VehicleChecklistCard"
  key_links:
    - from: "components/VehicleChecklistCard.tsx"
      to: "/api/vehicle-checklist"
      via: "fetch in useEffect and generate handler"
      pattern: "fetch.*api/vehicle-checklist"
    - from: "components/VehicleChecklistCard.tsx"
      to: "/api/vehicle-checklist/[tripId]/check"
      via: "fetch PATCH on checkbox toggle"
      pattern: "fetch.*check"
    - from: "components/TripPrepClient.tsx"
      to: "components/VehicleChecklistCard.tsx"
      via: "import and render inside vehicle-check section"
      pattern: "VehicleChecklistCard"
---

<objective>
Build the VehicleChecklistCard component and wire it into TripPrepClient as the 6th PREP_SECTIONS entry. This is the user-facing layer that renders the checklist, handles check-off interactions, and manages loading/empty/error states.

Purpose: Give Will a tappable vehicle pre-trip checklist in the trip prep flow.
Output: Working vehicle check section in trip prep with all states rendered per UI-SPEC.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-CONTEXT.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-UI-SPEC.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-02-SUMMARY.md

<interfaces>
<!-- From lib/prep-sections.ts (current state) -->
```typescript
export type PrepStatus = 'ready' | 'in_progress' | 'not_started'

export interface SectionConfig {
  key: string
  label: string
  emoji: string
}

export const PREP_SECTIONS: SectionConfig[] = [
  { key: 'weather', label: 'Weather', emoji: '\u{1F324}' },
  { key: 'packing', label: 'Packing List', emoji: '\u{1F392}' },
  { key: 'meals', label: 'Meal Plan', emoji: '\u{1F373}' },
  { key: 'power', label: 'Power Budget', emoji: '\u{1F50B}' },
  { key: 'departure', label: 'Departure', emoji: '\u{1F4CB}' },
]
```

<!-- From lib/parse-claude.ts (types for checklist) -->
```typescript
export type VehicleChecklistResult = {
  items: VehicleChecklistItem[]
}
export type VehicleChecklistItem = {
  id: string
  text: string
  checked: boolean
}
```

<!-- From components/TripPrepSection.tsx (section wrapper props) -->
```typescript
// TripPrepSection wraps each section — pass status, title, emoji, summary
// It handles expand/collapse and status badge rendering
```

<!-- From components/ui/ (reusable components) -->
```typescript
// Button: variant="primary" (amber), variant="ghost" (transparent), size="sm"
// EmptyState: emoji, title, description, action (ReactNode)
// ConfirmDialog: open, onClose, onConfirm, title, message, confirmLabel, variant
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: PREP_SECTIONS registration + VehicleChecklistCard component</name>
  <files>lib/prep-sections.ts, components/VehicleChecklistCard.tsx</files>
  <read_first>
    - lib/prep-sections.ts (full file — add vehicle-check entry)
    - components/TripPrepSection.tsx (full file — understand section wrapper API)
    - components/DepartureChecklistClient.tsx (full file — checklist rendering pattern with checkbox rows, optimistic check-off, loading skeleton)
    - components/ui/Button.tsx (variant and size props)
    - components/ui/EmptyState.tsx (props: emoji, title, description, action)
    - components/ui/ConfirmDialog.tsx (props: open, onClose, onConfirm, title, message, confirmLabel)
    - .planning/phases/29-vehicle-pre-trip-checklist/29-UI-SPEC.md (full visual/interaction contract)
    - lib/parse-claude.ts (VehicleChecklistResult and VehicleChecklistItem types)
  </read_first>
  <action>
    **Step 1: Add vehicle-check to PREP_SECTIONS**

    In lib/prep-sections.ts, add a 6th entry at the end of the PREP_SECTIONS array (after 'departure', per D-06):
    ```typescript
    { key: 'vehicle-check', label: 'Vehicle Check', emoji: '\u{1F699}' },
    ```

    **Step 2: Create components/VehicleChecklistCard.tsx**

    Props interface:
    ```typescript
    interface VehicleChecklistCardProps {
      tripId: string
      hasVehicle: boolean  // whether trip.vehicleId is non-null
    }
    ```

    Add `'use client'` directive at top.

    State variables:
    - `checklist: VehicleChecklistResult | null` — fetched checklist
    - `generatedAt: string | null` — ISO timestamp
    - `loading: boolean` — true during fetch or generate
    - `error: string | null` — error message
    - `showConfirm: boolean` — regenerate confirmation dialog

    **useEffect on mount:** Fetch `GET /api/vehicle-checklist?tripId=${tripId}`. If `hasVehicle` is false, skip fetch entirely. Set `checklist` and `generatedAt` from response.

    **handleGenerate:** POST to `/api/vehicle-checklist` with `{ tripId }`. Set `loading=true`, clear error. On success set `checklist` and `generatedAt`. On failure set `error`.

    **handleCheck(itemId, checked):** Optimistic update — immediately update local `checklist` state with the toggled item. Then fire-and-forget `fetch PATCH /api/vehicle-checklist/${tripId}/check` with `{ itemId, checked }`. Do NOT await or handle failure (fire-and-forget pattern from DepartureChecklistClient.tsx).

    **handleRegenerate:** Set `showConfirm=true`. On confirm, call `handleGenerate`. On close, set `showConfirm=false`.

    **Rendering states per UI-SPEC:**

    1. **No vehicle (`hasVehicle=false`):**
       ```tsx
       <EmptyState emoji="🚙" title="No vehicle assigned" description="Assign a vehicle to this trip to generate a pre-trip checklist." />
       ```

    2. **No checklist yet (`checklist === null && !loading`):**
       ```tsx
       <EmptyState emoji="📋" title="No checklist yet" description="Generate a pre-trip checklist tailored to your vehicle and trip.">
         <Button variant="primary" onClick={handleGenerate}>Generate Vehicle Checklist</Button>
       </EmptyState>
       ```

    3. **Loading (`loading=true`):**
       - Text: `"Claude is building your checklist..."` in `text-sm text-stone-500`
       - 8 skeleton rows: `animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-10 w-full`

    4. **Error:**
       - Red text error message + "Try Again" button (inline link style)

    5. **Loaded (`checklist !== null`):**
       - Progress bar: amber fill on stone track, `h-2 rounded-full`, with `transition-all duration-300`
       - Label: `"{checkedCount} of {totalCount} items done"` or `"All {totalCount} items done"` — `text-sm font-semibold text-amber-600 dark:text-amber-400`
       - Percentage on right: `text-sm text-stone-400 dark:text-stone-500`
       - Item rows in card: `bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden`
       - Each row: `min-h-[44px]` (mobile touch target), flex with checkbox left and text right
       - Checkbox: native `<input type="checkbox">` with `accent-amber-600`
       - Item text: `text-sm`. When checked: `line-through text-stone-400 dark:text-stone-500`
       - Regenerate button below items: `<Button variant="ghost" size="sm">Regenerate Checklist</Button>`
       - ConfirmDialog for regenerate: title="Regenerate Checklist?", message="This will replace your current checklist. Your check-off progress will be lost.", confirmLabel="Regenerate Checklist"

    **Status computation (for TripPrepSection summary):**
    - No vehicle: status=`not_started`, summary=`"No vehicle assigned"`
    - No checklist: status=`not_started`, summary=`"Not generated"`
    - Partial: status=`in_progress`, summary=`"{N} of {total} done"`
    - Complete: status=`ready`, summary=`"All done"`

    Export the component as default.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - lib/prep-sections.ts contains `{ key: 'vehicle-check', label: 'Vehicle Check', emoji: '\u{1F699}' }`
    - lib/prep-sections.ts PREP_SECTIONS has exactly 6 entries
    - components/VehicleChecklistCard.tsx exists
    - components/VehicleChecklistCard.tsx contains `'use client'`
    - components/VehicleChecklistCard.tsx contains `interface VehicleChecklistCardProps`
    - components/VehicleChecklistCard.tsx contains `fetch(` calls to `/api/vehicle-checklist`
    - components/VehicleChecklistCard.tsx contains `min-h-[44px]` (mobile touch target)
    - components/VehicleChecklistCard.tsx contains `accent-amber-600` (checkbox color)
    - components/VehicleChecklistCard.tsx contains `line-through` (checked item styling)
    - components/VehicleChecklistCard.tsx contains `ConfirmDialog` import
    - components/VehicleChecklistCard.tsx contains `EmptyState` import
    - components/VehicleChecklistCard.tsx does NOT contain `alert(`
    - `npm run build` exits 0
  </acceptance_criteria>
  <done>PREP_SECTIONS has vehicle-check entry, VehicleChecklistCard renders all states per UI-SPEC, build passes</done>
</task>

<task type="auto">
  <name>Task 2: Wire VehicleChecklistCard into TripPrepClient</name>
  <files>components/TripPrepClient.tsx</files>
  <read_first>
    - components/TripPrepClient.tsx (full file — understand how existing sections render, especially departure section which fetches independently)
    - components/VehicleChecklistCard.tsx (just created in Task 1 — props interface)
    - components/TripPrepSection.tsx (section wrapper — how status/summary/emoji are passed)
  </read_first>
  <action>
    In components/TripPrepClient.tsx:

    1. Import VehicleChecklistCard:
       ```typescript
       import VehicleChecklistCard from './VehicleChecklistCard'
       ```

    2. Find where sections are rendered (likely a map over PREP_SECTIONS or individual section blocks). Add vehicle-check section rendering after the departure section block.

    3. The vehicle-check section should follow the same independent-fetch pattern as departure (per RESEARCH.md open question 1). It does NOT go through `/api/trips/[id]/prep`. The VehicleChecklistCard handles its own data fetching.

    4. Render inside a TripPrepSection wrapper:
       ```tsx
       <TripPrepSection
         title="Vehicle Check"
         emoji="🚙"
         status={vehicleCheckStatus}
         summary={vehicleCheckSummary}
       >
         <VehicleChecklistCard
           tripId={tripId}
           hasVehicle={!!trip.vehicleId}
         />
       </TripPrepSection>
       ```

    5. For status and summary: the VehicleChecklistCard manages its own state internally. For the TripPrepSection wrapper, use a simple approach:
       - If `!trip.vehicleId`: status=`not_started`, summary=`"No vehicle assigned"`
       - Otherwise: status=`not_started`, summary=`""` (the card handles its own status display internally; the section wrapper just needs a reasonable default)

       Note: If TripPrepClient already has a pattern where sections compute their own status and pass it up (check the departure section implementation), follow that pattern instead. The key point is that vehicle-check renders below departure and uses VehicleChecklistCard for all content.

    6. Ensure the trip data passed to this component includes `vehicleId` (or `vehicle`). Check the server page that renders TripPrepClient to confirm vehicle data is already included in the Trip query. If not, add `vehicleId: true` to the select/include.

    7. Also check `app/trips/[id]/prep/page.tsx` (or equivalent server page). If the Trip query does not already include `vehicleId`, add it to the Prisma query select. The VehicleChecklistCard only needs `hasVehicle` (boolean), so `vehicleId` is sufficient.
  </action>
  <verify>
    <automated>npm run build 2>&1 | tail -5</automated>
  </verify>
  <acceptance_criteria>
    - components/TripPrepClient.tsx contains `import VehicleChecklistCard`
    - components/TripPrepClient.tsx contains `VehicleChecklistCard` JSX usage
    - components/TripPrepClient.tsx contains `Vehicle Check` or `vehicle-check` string
    - components/TripPrepClient.tsx does NOT contain `alert(`
    - `npm run build` exits 0
    - `npx vitest run` exits 0 (full test suite, no regressions)
  </acceptance_criteria>
  <done>Vehicle Check section appears in trip prep page, all states render correctly, full test suite passes, build passes</done>
</task>

</tasks>

<task type="checkpoint:human-verify" gate="blocking">
  <what-built>Vehicle Pre-Trip Checklist — full feature: Claude-generated checklist in trip prep with tappable check-off items, progress bar, regenerate confirmation, and empty states for no-vehicle and no-checklist scenarios.</what-built>
  <how-to-verify>
    1. Open any trip that has a vehicle assigned in trip prep
    2. Scroll to the Vehicle Check section (6th section, after Departure)
    3. Tap "Generate Vehicle Checklist" — should show loading skeleton then checklist items
    4. Tap a few items to check them off — should show strikethrough + progress bar updates
    5. Tap "Regenerate Checklist" — should show confirmation dialog, confirm, then fresh checklist
    6. Refresh the page — check-off state should persist (items you checked before regenerate are gone, but items you check after regenerate persist)
    7. Open a trip with NO vehicle assigned — should show "No vehicle assigned" empty state, no generate button
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

<verification>
- `npm run build` passes
- `npx vitest run` — full suite green, no regressions
- Vehicle Check section visible in trip prep
- Check-off persists across page refresh
- Empty states render for no-vehicle and no-checklist
- Regenerate shows confirmation dialog
</verification>

<success_criteria>
- PREP_SECTIONS has 6 entries including vehicle-check (D-06)
- Vehicle Check section renders in trip prep after Departure (D-06)
- Section shows only checklist items, no inline vehicle specs (D-07)
- Checklist is AI-generated via Claude (D-03)
- Check-off state persists in vehicleChecklistResult JSON blob (D-10)
- Generate once on first open, regenerate button for manual refresh (D-09)
- Full flat checklist regardless of road condition (D-01, D-02)
- No terrain tagging or visual distinction (D-02)
- Build passes (SC-5)
</success_criteria>

<output>
After completion, create `.planning/phases/29-vehicle-pre-trip-checklist/29-03-SUMMARY.md`
</output>
