---
phase: 26-trip-day-sequencer
plan: 26-P03
type: execute
wave: 3
depends_on: [26-P01, 26-P02]
files_modified:
  - app/trips/[id]/depart/page.tsx
  - components/DepartureChecklistClient.tsx
  - components/DepartureChecklistItem.tsx
autonomous: false
requirements: [D-01, D-02, D-03, D-04]

must_haves:
  truths:
    - "Server page queries departureTime and passes it to DepartureChecklistClient"
    - "DepartureChecklistClient shows departure time row below PageHeader"
    - "User can set departure time via datetime-local input and it persists via PATCH"
    - "Setting departure time does NOT auto-trigger checklist regeneration (D-04)"
    - "DepartureChecklistItem renders suggestedTime badge when present"
    - "Items without suggestedTime render identically to the current design"
    - "Checked items show line-through on both text and time badge"
  artifacts:
    - path: "app/trips/[id]/depart/page.tsx"
      provides: "departureTime prop threaded to client component"
      contains: "departureTime"
    - path: "components/DepartureChecklistClient.tsx"
      provides: "Departure time row UI + departureTime prop"
      contains: "departureTime"
    - path: "components/DepartureChecklistItem.tsx"
      provides: "suggestedTime badge rendering"
      contains: "suggestedTime"
  key_links:
    - from: "app/trips/[id]/depart/page.tsx"
      to: "components/DepartureChecklistClient.tsx"
      via: "departureTime prop"
      pattern: "departureTime=\\{trip\\.departureTime"
    - from: "components/DepartureChecklistClient.tsx"
      to: "/api/trips/[id]"
      via: "PATCH fetch for departureTime"
      pattern: "fetch.*PATCH.*departureTime"
    - from: "components/DepartureChecklistItem.tsx"
      to: "suggestedTime"
      via: "conditional badge rendering"
      pattern: "item\\.suggestedTime"
---

<objective>
Update the server page, client component, and checklist item component to thread departureTime through the UI, show a departure time input/display row, and render suggestedTime badges on checklist items.

Purpose: The user-facing layer — Will sees the departure time input and clock-time badges on every checklist item.
Output: Complete depart page with time-anchored sequencer UI.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/26-trip-day-sequencer/26-CONTEXT.md
@.planning/phases/26-trip-day-sequencer/26-UI-SPEC.md
@.planning/phases/26-trip-day-sequencer/26-P01-SUMMARY.md
@.planning/phases/26-trip-day-sequencer/26-P02-SUMMARY.md

<interfaces>
<!-- From Plan 01 — PATCH endpoint -->
From app/api/trips/[id]/route.ts:
```typescript
// PATCH accepts: { departureTime: string | null }
// Returns: { departureTime: string | null }
export async function PATCH(req: NextRequest, { params }: Params)
```

<!-- From Plan 01 — updated Zod type -->
From lib/parse-claude.ts:
```typescript
export type DepartureChecklistItem = {
  id: string
  text: string
  checked: boolean
  isUnpackedWarning: boolean
  suggestedTime?: string | null  // NEW — absent in old checklists
}
```

<!-- Existing component props -->
From components/DepartureChecklistClient.tsx:
```typescript
interface DepartureChecklistClientProps {
  tripId: string
  tripName: string
  startDate: string
  endDate: string
  emergencyContactName: string | null
  emergencyContactEmail: string | null
  offlineData?: DepartureChecklistResult
  tripCoords?: { lat: number; lon: number }
}
```

<!-- Existing item props -->
From components/DepartureChecklistItem.tsx:
```typescript
interface DepartureChecklistItemProps {
  item: ChecklistItem
  onCheck: (itemId: string, checked: boolean) => void
  disabled?: boolean
}
```

<!-- Server page current select shape -->
From app/trips/[id]/depart/page.tsx:
```typescript
select: {
  id: true,
  name: true,
  startDate: true,
  endDate: true,
  emergencyContactName: true,
  emergencyContactEmail: true,
  location: { select: { latitude: true, longitude: true } },
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Thread departureTime from server page + update DepartureChecklistClient</name>
  <files>app/trips/[id]/depart/page.tsx, components/DepartureChecklistClient.tsx</files>
  <read_first>
    - app/trips/[id]/depart/page.tsx (full file — server component, select query, prop passing)
    - components/DepartureChecklistClient.tsx (full file — 433 lines, props interface, state, UI structure)
    - .planning/phases/26-trip-day-sequencer/26-UI-SPEC.md (Departure Time Row interaction contract)
    - .planning/phases/26-trip-day-sequencer/26-CONTEXT.md (D-01, D-02, D-03, D-04)
  </read_first>
  <action>
    **1. Update app/trips/[id]/depart/page.tsx:**

    a. Add `departureTime: true` to the Prisma select object (after `emergencyContactEmail: true`).

    b. Pass departureTime to the client component as an ISO string or null:
       ```typescript
       departureTime={trip.departureTime?.toISOString() ?? null}
       ```
       Add this prop to the `<DepartureChecklistClient>` JSX element.

    **2. Update components/DepartureChecklistClient.tsx:**

    a. Add `departureTime: string | null` to the `DepartureChecklistClientProps` interface.

    b. Destructure `departureTime: initialDepartureTime` in the component function params.

    c. Add state for departure time management:
       ```typescript
       const [departureTime, setDepartureTime] = useState<string | null>(initialDepartureTime)
       const [editingDepartureTime, setEditingDepartureTime] = useState(false)
       const [departureTimeError, setDepartureTimeError] = useState<string | null>(null)
       ```

    d. Add import for `Pencil` from lucide-react (alongside existing ArrowLeft, CheckCircle imports).

    e. Add a `handleDepartureTimeSave` callback:
       ```typescript
       const handleDepartureTimeSave = useCallback(async (isoString: string | null) => {
         setDepartureTimeError(null)
         try {
           const res = await fetch(`/api/trips/${tripId}`, {
             method: 'PATCH',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ departureTime: isoString }),
           })
           if (!res.ok) throw new Error('Failed to save')
           const data = await res.json()
           setDepartureTime(data.departureTime)
           setEditingDepartureTime(false)
         } catch {
           setDepartureTimeError("Couldn't save departure time — tap to retry.")
         }
       }, [tripId])
       ```

    f. Add a helper to format departure time for display:
       ```typescript
       const formattedDepartureTime = departureTime
         ? new Date(departureTime).toLocaleDateString('en-US', {
             weekday: 'short',
             month: 'short',
             day: 'numeric',
             hour: 'numeric',
             minute: '2-digit',
             hour12: true,
           })
         : null
       ```

    g. Add a helper to convert ISO to datetime-local input value:
       ```typescript
       const datetimeLocalValue = departureTime
         ? new Date(departureTime).toISOString().slice(0, 16)
         : ''
       ```

    h. **Render the Departure Time Row** immediately below the `<PageHeader>` element and above the `<LeavingNowButton>`. The JSX:

       ```tsx
       {/* Departure time row — per D-01, D-02 */}
       <div className="flex items-center gap-2 flex-wrap min-h-[44px] px-4">
         <span className="text-sm text-stone-500 dark:text-stone-400">Departure time:</span>
         {!editingDepartureTime && departureTime ? (
           <>
             <span className="text-sm font-bold text-stone-900 dark:text-stone-100">
               {formattedDepartureTime}
             </span>
             <button
               onClick={() => setEditingDepartureTime(true)}
               className="p-1 text-stone-400 dark:text-stone-500"
               disabled={!isOnline}
             >
               <Pencil size={14} />
             </button>
           </>
         ) : !editingDepartureTime && !departureTime ? (
           <>
             <span className="text-sm text-amber-600 dark:text-amber-400">
               Not set — times will be relative
             </span>
             <input
               type="datetime-local"
               value=""
               onChange={(e) => {
                 if (e.target.value) handleDepartureTimeSave(new Date(e.target.value).toISOString())
               }}
               className="text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent"
               disabled={!isOnline}
             />
           </>
         ) : (
           <input
             type="datetime-local"
             defaultValue={datetimeLocalValue}
             onBlur={(e) => {
               if (e.target.value) {
                 handleDepartureTimeSave(new Date(e.target.value).toISOString())
               } else {
                 handleDepartureTimeSave(null)
               }
             }}
             autoFocus
             className="text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 focus:border-transparent"
           />
         )}
       </div>
       {departureTimeError && (
         <p className="text-sm text-red-600 dark:text-red-400 px-4">
           {departureTimeError}
         </p>
       )}
       ```

    i. **Disable departure time input when offline** — the `disabled={!isOnline}` is already included in the JSX above.

    j. **Do NOT auto-trigger regen when departure time changes** per D-04. The `handleDepartureTimeSave` only PATCHes the trip — no call to the checklist generation endpoint.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx tsc --noEmit app/trips/[id]/depart/page.tsx components/DepartureChecklistClient.tsx 2>&1 | head -20</automated>
  </verify>
  <acceptance_criteria>
    - app/trips/[id]/depart/page.tsx select object contains `departureTime: true`
    - app/trips/[id]/depart/page.tsx JSX contains `departureTime={trip.departureTime`
    - components/DepartureChecklistClient.tsx DepartureChecklistClientProps contains `departureTime: string | null`
    - components/DepartureChecklistClient.tsx contains `handleDepartureTimeSave`
    - components/DepartureChecklistClient.tsx contains `fetch(\`/api/trips/${tripId}\`.*PATCH`
    - components/DepartureChecklistClient.tsx contains `type="datetime-local"`
    - components/DepartureChecklistClient.tsx contains `Departure time:`
    - components/DepartureChecklistClient.tsx contains `Not set — times will be relative`
    - components/DepartureChecklistClient.tsx contains `Couldn't save departure time`
    - components/DepartureChecklistClient.tsx does NOT contain auto-regen logic tied to departureTime change
    - `npx tsc --noEmit` passes for both files
  </acceptance_criteria>
  <done>Server page passes departureTime prop, client component shows departure time input/display row, PATCH saves on blur, no auto-regen per D-04</done>
</task>

<task type="auto">
  <name>Task 2: Add suggestedTime badge to DepartureChecklistItem</name>
  <files>components/DepartureChecklistItem.tsx</files>
  <read_first>
    - components/DepartureChecklistItem.tsx (full file — 82 lines, current item layout)
    - .planning/phases/26-trip-day-sequencer/26-UI-SPEC.md (Time Badge interaction contract)
    - lib/parse-claude.ts (DepartureChecklistItem type with suggestedTime)
  </read_first>
  <action>
    Modify components/DepartureChecklistItem.tsx to render the suggestedTime badge:

    1. **Add the time badge** inside the outer `div` (the flex container), AFTER the existing `div.flex-1.min-w-0` that contains item text. Place it as the last child of the outer flex row:

       ```tsx
       {/* Time badge — per D-09, UI-SPEC */}
       {item.suggestedTime && (
         <span
           className={`text-xs tabular-nums shrink-0 ml-auto ${
             item.checked
               ? 'line-through text-stone-400 dark:text-stone-600'
               : 'text-stone-400 dark:text-stone-500'
           }`}
           style={{ maxWidth: '80px' }}
         >
           {item.suggestedTime}
         </span>
       )}
       ```

    2. The badge renders ONLY when `item.suggestedTime` is a non-empty string. Items from old checklists without the field render identically to current design — no visual change.

    3. When the item is checked, the time badge gets `line-through` class to match the item text treatment per UI-SPEC.

    4. No changes to the DepartureChecklistItemProps interface needed — the `item` prop type comes from `DepartureChecklistItem` in lib/parse-claude.ts which already has `suggestedTime?: string | null` from Plan 01.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx tsc --noEmit components/DepartureChecklistItem.tsx 2>&1 | head -10</automated>
  </verify>
  <acceptance_criteria>
    - components/DepartureChecklistItem.tsx contains `item.suggestedTime`
    - components/DepartureChecklistItem.tsx contains `text-xs tabular-nums`
    - components/DepartureChecklistItem.tsx contains `ml-auto`
    - components/DepartureChecklistItem.tsx contains `line-through` in the time badge conditional
    - components/DepartureChecklistItem.tsx contains `maxWidth: '80px'`
    - `npx tsc --noEmit` passes
  </acceptance_criteria>
  <done>suggestedTime badge renders right-aligned on items that have it, line-through when checked, invisible for old checklists without the field</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 3: Visual verification of departure time UI + time badges</name>
  <what-built>
    Complete Trip Day Sequencer: departure time input/display on the depart page, clock-time badges on checklist items, fuel stop reminders in generated checklists.
  </what-built>
  <how-to-verify>
    1. Run `npm run dev` and navigate to any trip's depart page (`/trips/[id]/depart`)
    2. Verify the "Departure time:" row appears below the page header, above the Leaving Now button
    3. Confirm the amber "Not set — times will be relative" text appears when no departure time is set
    4. Set a departure time using the datetime-local input — confirm it saves (formatted time appears, pencil icon visible)
    5. Click "Generate Checklist" (or "Regenerate Checklist" if one exists) — confirm:
       a. Each checklist item shows a time badge on the right (e.g., "9:00 PM Thu", "6:30 AM")
       b. Slot headings still render correctly
       c. Checking an item shows line-through on both text AND time badge
    6. Clear the departure time (edit, clear, blur) — confirm it reverts to "Not set" state
    7. Regenerate without a departure time — confirm items have null times (no badges visible)
    8. Verify setting departure time does NOT auto-regenerate the checklist (no network call in DevTools)
  </how-to-verify>
  <resume-signal>Type "approved" or describe issues</resume-signal>
</task>

</tasks>

<verification>
- `npm run build` passes with no type errors
- `npx vitest run tests/` — full suite green
- Visual: depart page shows departure time row and time badges per UI-SPEC
</verification>

<success_criteria>
- Server page threads departureTime to client component
- Departure time row renders in both "not set" and "set" states per UI-SPEC
- datetime-local input saves via PATCH on blur
- No auto-regen when departure time changes (D-04)
- suggestedTime badges appear right-aligned on checklist items
- Old checklists without suggestedTime render unchanged (backwards compat D-09)
- Checked items show line-through on text + time badge
- npm run build passes
</success_criteria>

<output>
After completion, create `.planning/phases/26-trip-day-sequencer/26-P03-SUMMARY.md`
</output>
