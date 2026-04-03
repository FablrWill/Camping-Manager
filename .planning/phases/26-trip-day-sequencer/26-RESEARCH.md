# Phase 26: Trip Day Sequencer - Research

**Researched:** 2026-04-03
**Domain:** Next.js / Prisma / Claude AI — enhancing existing departure checklist with time-anchored task sequencing
**Confidence:** HIGH

## Summary

Phase 26 is a surgical enhancement of an already-built system. The departure checklist infrastructure from Phase 7 is fully in place: `DepartureChecklist` model, `/api/departure-checklist` route, `DepartureChecklistClient.tsx`, `DepartureChecklistItem.tsx`, `lib/parse-claude.ts` Zod schemas, and the server page at `/trips/[id]/depart/page.tsx`. This phase threads one new database field (`departureTime DateTime?` on Trip), one new JSON field (`suggestedTime: string | null` on each checklist item), a prompt upgrade in `lib/claude.ts`, and modest UI additions to `DepartureChecklistClient.tsx`.

The fuel/last-stop data from Phase 18 lives at `app/api/trips/[id]/last-stops/route.ts` and is not persisted to the database — it is fetched on-demand from Overpass. The departure checklist API route (POST) must call this endpoint or reuse `lib/overpass.ts`'s `fetchLastStops()` directly at generation time. The trip location coordinates (`trip.location.latitude`, `trip.location.longitude`) are already included in the `POST /api/departure-checklist` database query via `include: { location: true }`, so no additional join is needed.

The Trip PATCH path does not yet exist; the current route only has GET, PUT, and DELETE. A PATCH handler for `departureTime` needs to be added to `app/api/trips/[id]/route.ts`. The `PUT` handler already uses an explicit field mapping pattern — the new PATCH must follow the same approach. The `DepartureChecklistClient` will need a new prop (`departureTime?: string | null`) threaded from the server page, and a small UI element (input or display) for setting or showing the departure time.

**Primary recommendation:** Follow the Phase 6 AI persistence pattern (already used by this component) — departureTime is set via a PATCH to the trip, generation prompt is enriched with it, and existing checklists render times immediately without regen.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Add `departureTime` (DateTime) field to the Trip model. Set on the trip itself (trip card or prep page input). This is the anchor for the entire sequence — without it, tasks fall back to relative slot labels.
- **D-02:** Full date + time granularity (e.g., "Fri Apr 18 7:00 AM"). Enables actual clock times in the sequence ("Pack cooler by 9:00 PM Thursday", "Leave by 7:00 AM").
- **D-03:** Enhance the existing `/trips/[id]/depart` page — it becomes the full sequencer. No new page, no "Departure Day" section added to the prep page. The depart page link from trip prep remains the entry point.
- **D-04:** Regen is explicit only (user presses Regenerate). Setting a departure time does NOT auto-trigger regen. Follows Phase 6 D-01/D-02 persistence pattern.
- **D-05:** Route contributes a "Leave by X" task. Claude derives departure deadline from trip location coordinates (no origin address required). Phrased as "Leave by [time] to reach [destination]."
- **D-06:** If Phase 18 fuel/grocery stop cards exist for this trip, include a reminder task in the sequence (e.g., "Stop at Ingles before taking 26E — last resupply point").
- **D-07:** Meal plan -> phase-level reminder: "Prep meals (see meal plan)" as one task. Claude adds specificity only for time-sensitive items it spots (e.g., "Marinate meat tonight"). No step-by-step extraction.
- **D-08:** Power -> "Charge EcoFlow to 100%". If `currentBatteryPct` is available on the trip, Claude adds context: "Currently at [X]% — needs ~Yh to full."
- **D-09:** Extend the existing `DepartureChecklist` JSON shape. Add optional `suggestedTime: string | null` to each item. Backwards compatible — existing checklists without times still render correctly. New checklists include time strings like "9:00 PM", "T-30 min", or "7:00 AM departure".
- **D-10:** Trip model needs `departureTime DateTime?` field and a new migration.

### Claude's Discretion

- Number of time slots and their labels (e.g., "Night Before / Morning Of / 30 Min Out / Go Time")
- Whether to show a "No departure time set" prompt or generate a time-slot sequence anyway
- Exact wording of the "Leave by" route task
- Whether to surface a "departure time not set" warning on the depart page

### Deferred Ideas (OUT OF SCOPE)

- **Time display format discussion skipped** — Will accepted the recommended approach (absolute clock times where departure time is set, relative slot labels as fallback). Claude has discretion on exact format.
- **Origin-aware drive time** — Skipped for now. Drive time is a rough estimate / "Leave by" note, not turn-by-turn. Origin address data entry deferred to a future phase.
- **Departure time UI placement** — Will left this to Claude's discretion. Reasonable placements: trip prep page header, trip card "..." menu, or a prompt on the depart page itself.
</user_constraints>

---

## Standard Stack

### Core (already in project)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js | 16.2.1 | App Router, server components, API routes | Project foundation |
| Prisma | 6.19.2 | ORM, migrations, SQLite access | Project foundation |
| Zod | (via existing parse-claude.ts) | Schema validation of Claude responses | Already used for DepartureChecklistResultSchema |
| @anthropic-ai/sdk | 0.80.0 | Claude API calls for checklist generation | Already used in lib/claude.ts |
| React | 19.2.4 | Client component state management | Project foundation |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Vitest | existing | Unit tests for route handlers and pure functions | All new API routes and schema changes |

**No new dependencies needed.** This phase is entirely within the existing stack.

## Architecture Patterns

### Established Pattern: AI Output Persistence (Phase 6)

The pattern already governs `DepartureChecklist`:
1. User triggers generation (POST `/api/departure-checklist`)
2. API route fetches trip data, calls Claude, persists to `DepartureChecklist.result`
3. Component loads saved result on mount (GET `/api/departure-checklist?tripId=...`)
4. Regenerate is behind explicit button + `ConfirmDialog`

Phase 26 follows this exactly — no deviation.

### Established Pattern: Trip PATCH for Scalar Fields

Phase 20 (SharedLocation), Phase 22 (fallbackFor/fallbackOrder) all used Trip field additions via explicit PUT mapping. Phase 26 adds a PATCH handler for `departureTime` only (isolated, lightweight operation).

### Recommended File Change Map

```
prisma/schema.prisma
  └── Add departureTime DateTime? to Trip model

prisma/migrations/
  └── New migration: add_departure_time_to_trip

lib/parse-claude.ts
  └── DepartureChecklistItemSchema: add suggestedTime z.string().nullable().optional()

lib/claude.ts
  └── generateDepartureChecklist: add departureTime param + fuel stop names param
  └── Update prompt with time anchoring instructions + suggestedTime field

app/api/trips/[id]/route.ts
  └── Add PATCH handler accepting { departureTime: string | null }

app/api/departure-checklist/route.ts
  └── POST: include trip.departureTime + fetch last-stop names + pass to generateDepartureChecklist

app/trips/[id]/depart/page.tsx
  └── Select departureTime from trip query, pass to DepartureChecklistClient

components/DepartureChecklistClient.tsx
  └── Accept departureTime prop
  └── Add departure time display/input UI (Claude's discretion on placement)
  └── Pass departureTime to POST body for generation

components/DepartureChecklistItem.tsx
  └── Accept and display suggestedTime badge (if present)
```

### Pattern: PATCH for departureTime

The existing PUT at `app/api/trips/[id]/route.ts` requires all trip fields (name, startDate, endDate). A PATCH is correct for the single-field `departureTime` update — it follows the same pattern already used by the check-off endpoint (`/api/departure-checklist/[id]/check`).

```typescript
// app/api/trips/[id]/route.ts — new PATCH handler
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const data = await req.json()
    const trip = await prisma.trip.update({
      where: { id },
      data: { departureTime: data.departureTime ? new Date(data.departureTime) : null },
    })
    return NextResponse.json({ departureTime: trip.departureTime?.toISOString() ?? null })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    console.error('Failed to update departure time:', error)
    return NextResponse.json({ error: 'Failed to update departure time' }, { status: 500 })
  }
}
```

### Pattern: Zod Schema Extension (backwards compatible)

```typescript
// lib/parse-claude.ts — DepartureChecklistItemSchema
const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(), // NEW — absent in old checklists = undefined
})
```

Old persisted checklists that lack `suggestedTime` will parse fine because `.optional()` makes it non-required. New checklists from Claude include it. The component renders the badge only when `suggestedTime` is truthy.

### Pattern: Fuel Stop Data at Generation Time

Phase 18 stores nothing in the database — fuel/grocery stop data is always fetched fresh from Overpass. The departure checklist POST must call `fetchLastStops()` from `lib/overpass.ts` directly (same function used by `app/api/trips/[id]/last-stops/route.ts`). Only the stop names are needed in the Claude prompt — no full structured data.

```typescript
// app/api/departure-checklist/route.ts POST — additional data to fetch
import { fetchLastStops } from '@/lib/overpass'

// In POST handler, after fetching trip:
let lastStopNames: string[] = []
if (trip.location?.latitude && trip.location?.longitude) {
  try {
    const stops = await fetchLastStops(trip.location.latitude, trip.location.longitude)
    const allStops = [...stops.fuel, ...stops.grocery, ...stops.outdoor]
    lastStopNames = allStops.slice(0, 3).map((s) => s.name)
  } catch {
    // Non-blocking — checklist generates without fuel stops if Overpass fails
  }
}
```

### Pattern: Prompt Upgrade in lib/claude.ts

The current `generateDepartureChecklist` prompt does not mention `suggestedTime`. The upgrade adds:
1. `departureTime` parameter in the params object
2. `lastStopNames` parameter for fuel stop reminder
3. Prompt section explaining time anchoring (absolute times if `departureTime` set, relative labels if not)
4. Updated JSON schema example showing `suggestedTime` field
5. Updated Zod response expectations

### Pattern: DepartureChecklistItem Time Badge

The `DepartureChecklistItem` component currently renders item text + unpacked warning icon. Adding a time badge:

```typescript
// components/DepartureChecklistItem.tsx — right side of item row
{item.suggestedTime && (
  <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0 ml-auto">
    {item.suggestedTime}
  </span>
)}
```

### Anti-Patterns to Avoid

- **Auto-regen on departureTime change:** D-04 explicitly forbids this. Setting `departureTime` ONLY saves the field; it does NOT trigger checklist regeneration.
- **Separate departure time API route:** The PATCH goes on the existing `/api/trips/[id]/route.ts`, not a new route. Stays consistent with how other trip scalar fields are updated.
- **Blocking checklist generation on Overpass failure:** Fuel stop lookup must be fire-and-forget. If Overpass times out, the checklist generates without it.
- **Mutating the checklist result JSON in the DB to add times retroactively:** Times only appear on freshly generated checklists. Old ones render without times via the `.optional()` Zod field.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing/validation of Claude responses | Custom parser | Existing `parseClaudeJSON<T>` + Zod | Already handles markdown fences, .safeParse, error messages |
| Optimistic check-off with offline queue | Custom sync | Existing `queueCheckOff()` + `AppShell` replay | Already built in Phase 7/8 |
| Overpass fuel stop data | Custom fetch | Existing `fetchLastStops()` from `lib/overpass.ts` | Already handles distance calc, error handling |
| Trip field PATCH | New model | `prisma.trip.update()` with explicit mapping | Pattern established across all prior phases |

## Common Pitfalls

### Pitfall 1: departureTime Stored as String vs DateTime

**What goes wrong:** Prisma SQLite stores `DateTime` as ISO string in SQLite. Passing a date string directly works, but timezones can silently shift.

**Why it happens:** `new Date('2026-04-18T07:00:00')` is local time; `new Date('2026-04-18T07:00:00Z')` is UTC. The client sends an ISO string; the server must treat it consistently.

**How to avoid:** In the PATCH handler, use `new Date(data.departureTime)` and document that the client passes local ISO format (e.g., `"2026-04-18T07:00:00"`). In the prompt to Claude, format it as human-readable ("Friday April 18 at 7:00 AM") not raw ISO.

**Warning signs:** Times appear off by hours in the generated checklist; "Leave by 7 AM" renders as "Leave by midnight."

### Pitfall 2: Zod Schema Mismatch on suggestedTime

**What goes wrong:** Claude returns `"suggestedTime": null` for some items and the schema rejects it.

**Why it happens:** Zod's `.optional()` permits `undefined` (absent key) but not `null`. Both `.nullable()` and `.optional()` are needed.

**How to avoid:** Use `z.string().nullable().optional()` — accepts `null`, `undefined`, or a string.

**Warning signs:** 422 errors from the departure checklist POST endpoint; "schema mismatch" in server logs.

### Pitfall 3: Offline Mode + departureTime

**What goes wrong:** `DepartureChecklistClient` renders offline mode from IndexedDB snapshot. The snapshot was cached before `departureTime` was set. The offline checklist shows no times.

**Why it happens:** Times only appear in newly-generated checklists; old cached results lack `suggestedTime`.

**How to avoid:** This is expected and acceptable behavior (D-04). The UI should not surface this as an error — just render items without time badges when `suggestedTime` is absent.

**Warning signs:** No warning needed — this is correct behavior per D-09.

### Pitfall 4: PUT vs PATCH Confusion in TripCard/TripsClient

**What goes wrong:** The existing trip edit form uses PUT (requires all fields). Adding `departureTime` to the PUT form would require fetching/sending all trip fields every time.

**Why it happens:** PUT replaces the whole resource; PATCH updates a subset.

**How to avoid:** Use a separate PATCH for `departureTime` only. The depart page sets it in isolation — it does not go through the full trip edit form.

### Pitfall 5: DepartureChecklistClient Props Interface Out of Sync

**What goes wrong:** The server page (`page.tsx`) passes `departureTime` but the client component interface doesn't declare it, or the interface has it but the page doesn't query it.

**Why it happens:** Prisma `select` in `page.tsx` must explicitly include `departureTime`. TypeScript won't catch missing `select` fields at compile time if using `as` casts.

**How to avoid:** Update both the `select` in `page.tsx` and the `DepartureChecklistClientProps` interface in the same plan task.

## Code Examples

### DepartureChecklistResultSchema with suggestedTime

```typescript
// lib/parse-claude.ts
const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(),
})
```

### Claude prompt section for time anchoring

```typescript
// lib/claude.ts — inside generateDepartureChecklist prompt
${departureTime
  ? `DEPARTURE TIME: ${departureTime}
For each task, include a "suggestedTime" field with an absolute clock time (e.g. "9:00 PM Thu", "6:30 AM", "7:00 AM — depart") anchored to this departure time. Night-before tasks get the prior evening. Day-of tasks get morning times. Final task is the departure time itself.`
  : `DEPARTURE TIME: Not set. Use suggestedTime: null for all items. Use slot label names as the only time reference (e.g. "Night Before", "Morning Of").`
}
${lastStopNames.length > 0
  ? `LAST STOPS (include reminder task for the nearest stop): ${lastStopNames.join(', ')}`
  : ''
}
```

### Time badge in DepartureChecklistItem

```typescript
// components/DepartureChecklistItem.tsx
{item.suggestedTime && (
  <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0 tabular-nums">
    {item.suggestedTime}
  </span>
)}
```

### Departure time input in DepartureChecklistClient

```typescript
// components/DepartureChecklistClient.tsx — Claude has discretion on placement
// Render near the page header or above the checklist:
<div className="flex items-center gap-2">
  <label className="text-sm text-stone-500 dark:text-stone-400">Departure time:</label>
  {departureTime
    ? <span className="text-sm font-medium">{formattedDepartureTime}</span>
    : <span className="text-sm text-amber-600 dark:text-amber-400">Not set — times will be relative</span>
  }
  <input
    type="datetime-local"
    value={localDepartureTime ?? ''}
    onChange={handleDepartureTimeChange}
    className="text-sm ..."
  />
</div>
```

### Prisma migration (new field)

```sql
-- prisma/migrations/YYYYMMDDHHMMSS_add_departure_time_to_trip/migration.sql
ALTER TABLE "Trip" ADD COLUMN "departureTime" DATETIME;
```

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes to an existing Next.js/Prisma/Claude stack. No new external dependencies are introduced.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-09 | `suggestedTime` field parsed correctly (null, string, absent) | unit | `npx vitest run tests/departure-checklist-schema.test.ts` | Wave 0 |
| D-10 | PATCH `/api/trips/[id]` accepts `departureTime`, stores to DB | unit | `npx vitest run tests/trip-patch-departure-time.test.ts` | Wave 0 |
| D-05/D-06 | Fuel stop names fetched and passed to checklist generation | unit | `npx vitest run tests/departure-checklist-route.test.ts` | Wave 0 |
| D-04 | Setting departureTime does NOT auto-trigger regeneration | manual-only | — | Manual: set time, verify no API call fires |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/departure-checklist-schema.test.ts` — covers D-09 (Zod schema with suggestedTime variants)
- [ ] `tests/trip-patch-departure-time.test.ts` — covers D-10 (PATCH route handler)
- [ ] `tests/departure-checklist-route.test.ts` — extends existing departure-checklist API tests with fuel stop integration

*(No new framework install needed — Vitest already configured)*

## Sources

### Primary (HIGH confidence)

- Codebase: `components/DepartureChecklistClient.tsx` — 433 lines, full existing implementation
- Codebase: `app/api/departure-checklist/route.ts` — 118 lines, generate/load/check-off pattern
- Codebase: `lib/parse-claude.ts` — DepartureChecklistResultSchema exact definition
- Codebase: `lib/claude.ts` (lines 430-537) — generateDepartureChecklist signature and prompt
- Codebase: `prisma/schema.prisma` — Trip model, DepartureChecklist model exact definitions
- Codebase: `app/api/trips/[id]/route.ts` — GET/PUT/DELETE, no PATCH yet
- Codebase: `app/api/trips/[id]/last-stops/route.ts` — uses `fetchLastStops()` from lib/overpass
- Codebase: `components/DepartureChecklistItem.tsx` — current item render structure
- Codebase: `app/trips/[id]/depart/page.tsx` — server component, current select shape
- Phase context: `.planning/phases/07-day-of-execution/07-CONTEXT.md` — original checklist decisions
- Phase context: `.planning/phases/26-trip-day-sequencer/26-CONTEXT.md` — locked decisions for this phase

### Secondary (MEDIUM confidence)

- Project patterns: Phase 6 AI persistence pattern (documented in STATE.md and 07-CONTEXT.md)
- Project patterns: Phase 18 fuel stop data — confirmed no DB persistence, always fetched fresh from Overpass

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in use, no new dependencies
- Architecture: HIGH — directly read all files being modified; patterns are established
- Pitfalls: HIGH — sourced from reading actual code and schema; not speculative
- Test strategy: HIGH — Vitest already configured; existing tests follow this exact pattern

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack; no fast-moving external dependencies)
