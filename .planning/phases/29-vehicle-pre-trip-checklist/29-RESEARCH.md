# Phase 29: Vehicle Pre-Trip Checklist - Research

**Researched:** 2026-04-03
**Domain:** Next.js App Router, Prisma SQLite, Claude AI, Trip Prep section extension
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Always show the full checklist regardless of whether a location/roadCondition is set. No terrain filtering, no conditional item sets. Flat, complete list.
- **D-02:** No terrain tagging or visual distinction on items. Flat list, action-focused.
- **D-03:** AI-generated via Claude. Not a static template.
- **D-04:** Claude receives two inputs: vehicle specs (year, make, model, drivetrain, groundClearance from Vehicle profile) and trip context (trip length in days, destination name, `Location.roadCondition`, `Location.clearanceNeeded`).
- **D-05:** Mods list and weather data are NOT included in the generation prompt for this phase.
- **D-06:** Add 'vehicle-check' as a 6th entry in `PREP_SECTIONS` in `lib/prep-sections.ts`. Positioned after 'departure'. Emoji: 🚙.
- **D-07:** The section card shows only checklist items — no inline vehicle specs. Vehicle details remain on the Vehicle page.
- **D-08:** Add two fields to the Trip model: `vehicleChecklistResult` (String?) and `vehicleChecklistGeneratedAt` (DateTime?). Same pattern as `packingListResult` / `packingListGeneratedAt`.
- **D-09:** Generate once on first open, persist to DB. Show a "Regenerate" button. User triggers refresh manually.
- **D-10:** Check-off state lives inside the `vehicleChecklistResult` JSON blob (item text + checked boolean per item). No separate DB model.

### Claude's Discretion

- Exact checklist items and categories within the list (grouping, ordering, wording)
- How to gracefully handle a trip with no vehicle assigned (empty state prompt)
- Whether to include a "notes" field per item or keep it purely checkbox-based
- Offline behavior (whether to cache checklist in offline snapshot)

### Deferred Ideas (OUT OF SCOPE)

- Including vehicle mods in the generation prompt
- Weather-aware checklist items
- Terrain tagging / terrain-filtered views
</user_constraints>

---

## Summary

Phase 29 adds a Vehicle Pre-Trip Checklist as a 6th section in the existing Trip Prep flow. The implementation is entirely pattern-following — every required pattern already exists in the codebase with clear canonical references called out in CONTEXT.md.

The three implementation layers are: (1) schema migration adding two fields to the Trip model, (2) two new API routes (generate/fetch + check-off), and (3) a new React component rendered inside TripPrepClient. All three layers have established patterns to copy from Phase 26 (DepartureChecklist) and Phase 6 (PackingList/MealPlan).

The most significant design risk is the check-off endpoint routing: the departure checklist stores in its own model (DepartureChecklist) and uses `[id]` as the checklist record ID. The vehicle checklist stores directly on the Trip model, so its check endpoint should use tripId, not a separate checklist ID. This architectural difference needs to be handled clearly in the plan.

**Primary recommendation:** Follow the exact patterns of `packing-list/route.ts` for generation/fetch and `departure-checklist/[id]/check/route.ts` for the check-off toggle (adapting for Trip-field storage), add a Zod schema to `lib/parse-claude.ts`, add `generateVehicleChecklist()` to `lib/claude.ts`, and render via a new `VehicleChecklistCard` component inside `TripPrepClient`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Next.js App Router | 16.2.1 | API routes + page server components | Project standard |
| Prisma | 6.19.2 | Schema migration + DB access | Project standard |
| @anthropic-ai/sdk | 0.80.0 | Claude generation | Already initialized in `lib/claude.ts` |
| Zod | (bundled with project) | JSON schema validation for Claude output | Project standard — `parseClaudeJSON` in `lib/parse-claude.ts` |
| React | 19.2.4 | UI component | Project standard |
| Tailwind CSS 4 | (via postcss) | Styling | Project standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `lib/safe-json.ts` | project | `safeJsonParse()` — safe JSON.parse wrapper | All DB JSON blob reads |
| `lib/parse-claude.ts` | project | `parseClaudeJSON()` + Zod schemas | All Claude response parsing |
| `lib/prep-sections.ts` | project | PREP_SECTIONS array | Add new section entry here |
| `components/TripPrepSection.tsx` | project | Collapsible section wrapper | Reuse directly |

**No new packages required.**

---

## Architecture Patterns

### Pattern 1: Schema Migration (JSON blob on Trip)

**What:** Add two nullable fields directly to the `Trip` model. No new model needed.

**Mirrors:** `packingListResult` / `packingListGeneratedAt` already on Trip.

```typescript
// prisma/schema.prisma — add to Trip model
vehicleChecklistResult      String?   // JSON blob: { items: [{ id, text, checked }] }
vehicleChecklistGeneratedAt DateTime? // Phase 29
```

Migration command: `npx prisma migrate dev --name add-vehicle-checklist-to-trip`

### Pattern 2: Zod Schema in lib/parse-claude.ts

**What:** Add `VehicleChecklistResultSchema` alongside existing schemas. Claude returns a flat array of items.

```typescript
// Source: lib/parse-claude.ts (existing patterns)

const VehicleChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
})

export const VehicleChecklistResultSchema = z.object({
  items: z.array(VehicleChecklistItemSchema),
})

export type VehicleChecklistResult = z.infer<typeof VehicleChecklistResultSchema>
export type VehicleChecklistItem = z.infer<typeof VehicleChecklistItemSchema>
```

### Pattern 3: Generation Function in lib/claude.ts

**What:** Add `generateVehicleChecklist()` alongside existing `generatePackingList()` and `generateDepartureChecklist()`.

**Model selection:** Use `claude-sonnet-4-20250514` (same as other generators). Vehicle checklist is simple and structured — 1000 tokens max_tokens is sufficient.

**Prompt context per D-04:** vehicle specs (year, make, model, drivetrain, groundClearance) + trip context (trip length, destination name, roadCondition, clearanceNeeded).

```typescript
// Source: lib/claude.ts (existing pattern)
export async function generateVehicleChecklist(params: {
  vehicleYear: number | null
  vehicleMake: string | null
  vehicleModel: string | null
  drivetrain: string | null
  groundClearance: number | null
  tripDays: number
  destinationName: string | null
  roadCondition: string | null
  clearanceNeeded: string | null
}): Promise<VehicleChecklistResult> { ... }
```

**Item ID format:** `vc-{index}` (0-based), e.g. `vc-0`, `vc-1`. Consistent with `chk-{slot}-{item}` pattern.

**Prompt structure:**
- Vehicle details block
- Trip context block
- Instructions: action-oriented (verb-first), practical, specific to this vehicle
- JSON-only output: `{ "items": [{ "id": "vc-0", "text": "...", "checked": false }] }`

### Pattern 4: API Routes

**What:** Two new route files. Follow packing-list pattern for generation, departure-checklist check pattern for toggle.

**Route 1: `/app/api/vehicle-checklist/route.ts`** (GET + POST)
- GET: `?tripId=...` → reads `trip.vehicleChecklistResult`, parses, returns `{ result, generatedAt }`
- POST: `{ tripId }` → fetches trip+vehicle+location, generates via Claude, writes back to Trip fields

**Route 2: `/app/api/vehicle-checklist/[tripId]/check/route.ts`** (PATCH)
- PATCH: `{ itemId, checked }` → reads Trip.vehicleChecklistResult, toggles item, writes back
- Use `prisma.$transaction` (same as departure-checklist check route) to prevent race conditions
- Key difference from departure-checklist: find by `tripId` on Trip model, not a checklist record ID

```typescript
// Source: app/api/departure-checklist/[id]/check/route.ts (pattern)
// Adapted: use prisma.trip instead of prisma.departureChecklist
await prisma.$transaction(async (tx) => {
  const trip = await tx.trip.findUnique({ where: { id: tripId } })
  if (!trip) throw new Error('NOT_FOUND')
  const result = safeJsonParse<VehicleChecklistResult>(trip.vehicleChecklistResult ?? '')
  if (!result) throw new Error('PARSE_ERROR')
  const item = result.items.find(i => i.id === itemId)
  if (!item) throw new Error('ITEM_NOT_FOUND')
  item.checked = checked  // this is acceptable mutation inside a transaction-scoped local object
  await tx.trip.update({
    where: { id: tripId },
    data: { vehicleChecklistResult: JSON.stringify(result) },
  })
})
```

### Pattern 5: TripPrepClient Integration

**What:** The section fetches its own data independently via `useEffect`, mirroring the departure checklist pattern in TripPrepClient. Does NOT go through `/api/trips/[id]/prep` (the prep endpoint is for status summaries, not inline data).

**State:** `vehicleChecklist: VehicleChecklistResult | null`, `vehicleChecklistGeneratedAt: string | null`, `vehicleChecklistLoading: boolean`, `vehicleChecklistError: string | null`

**Component:** New `VehicleChecklistCard` component (or inline in TripPrepClient for simplicity — see recommendation below).

**PREP_SECTIONS addition:**
```typescript
// lib/prep-sections.ts — add to PREP_SECTIONS array
{ key: 'vehicle-check', label: 'Vehicle Check', emoji: '\u{1F699}' }  // 🚙
```

**Status logic:**
- `not_started` — no result stored
- `in_progress` — result exists with unchecked items
- `ready` — result exists with all items checked

### Pattern 6: Empty State (No Vehicle)

Per Claude's discretion: if the trip has no vehicle assigned (`trip.vehicle === null`), render an empty state with a prompt: "No vehicle assigned to this trip. Add a vehicle in trip settings to generate a pre-trip checklist."

### Recommended Project Structure for New Files

```
app/api/vehicle-checklist/
├── route.ts                    # GET + POST (fetch/generate)
└── [tripId]/
    └── check/
        └── route.ts            # PATCH (toggle item)
components/
└── VehicleChecklistCard.tsx    # (optional extraction — see pitfall below)
lib/
└── parse-claude.ts             # Add VehicleChecklistResultSchema here
    claude.ts                   # Add generateVehicleChecklist() here
    prep-sections.ts            # Add vehicle-check entry
prisma/
└── migrations/
    └── [timestamp]_add_vehicle_checklist_to_trip/
        └── migration.sql
```

### Anti-Patterns to Avoid

- **Separate DB model for vehicle checklist:** D-10 is explicit — JSON blob on Trip. Do not create a `VehicleChecklist` model.
- **Routing check-off by a checklist record ID:** The checklist lives on the Trip. Use tripId in the check route, not a separate record ID.
- **Including mods or weather in the prompt:** D-05 explicitly defers this. Keep the prompt to vehicle specs + trip context only.
- **Terrain-conditional item sets:** D-01 is explicit — flat, complete list always. Do not implement conditional sections.
- **Using `alert()` or console.log:** Project rule — state-based errors, no alerts, no client-side logs.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude JSON parsing | Custom parse function | `parseClaudeJSON` + Zod schema in `lib/parse-claude.ts` | Handles markdown fences, Zod validation, 422 vs 500 routing |
| Safe JSON reads from DB | try/catch JSON.parse | `safeJsonParse` from `lib/safe-json.ts` | Returns null instead of throwing |
| Race conditions on rapid check-off | optimistic UI | `prisma.$transaction` | Precedent in departure-checklist route |
| Section wrapper UI | custom collapsible | `TripPrepSection` component | Already implements status badge, expand/collapse, summary line |
| Status badge rendering | custom badge | `Badge` from `components/ui/` | Design system consistency |

---

## Common Pitfalls

### Pitfall 1: Check Route Parameter Name Mismatch
**What goes wrong:** The check route lives at `[tripId]` but the handler references `params.id` (copied from departure-checklist's `[id]` pattern).
**Why it happens:** Copying the departure-checklist check route verbatim without updating param name.
**How to avoid:** Name the route folder `[tripId]` and destructure `{ tripId }` from params. Double-check: `const { tripId } = await params`.
**Warning signs:** TypeScript error on `params.id` vs `params.tripId`, or runtime 404 on check requests.

### Pitfall 2: Regenerate Overwrites Check State
**What goes wrong:** On regenerate (POST), Claude returns `checked: false` for all items. If user had partially checked off items, that state is lost.
**Why it happens:** The generate function always returns fresh items with `checked: false`.
**How to avoid:** On regenerate, this is intentional (same behavior as Packing List / Meal Plan regenerate). Include a ConfirmDialog guard on the regenerate button (existing pattern — `components/ui/ConfirmDialog.tsx`).
**Warning signs:** User reports losing check state after regenerate.

### Pitfall 3: No Vehicle Empty State
**What goes wrong:** POST to generate with no vehicle assigned causes a DB null dereference when building the prompt.
**Why it happens:** Trip may have `vehicleId: null`.
**How to avoid:** In the API route, check `trip.vehicleId` before attempting generation. Return 400 with message "No vehicle assigned to this trip". In the UI, show an empty state when `trip.vehicle === null` and skip the fetch entirely.
**Warning signs:** 500 errors from generation route when vehicle is null.

### Pitfall 4: PREP_SECTIONS Status Out of Sync
**What goes wrong:** The `/api/trips/[id]/prep` endpoint returns status summaries for each section. If `vehicle-check` is added to `PREP_SECTIONS` but not handled in the prep endpoint, it renders with stale/wrong status.
**Why it happens:** Prep endpoint may enumerate PREP_SECTIONS to build its response.
**How to avoid:** Check `app/api/trips/[id]/prep/route.ts` — if it iterates PREP_SECTIONS, add a vehicle-check handler there too. If it uses a fixed map, the status defaults to `not_started` which is acceptable.
**Warning signs:** Vehicle Check section always shows "Not Started" even after generation.

### Pitfall 5: Item ID Collisions with Departure Checklist
**What goes wrong:** If vehicle checklist item IDs use same format as departure checklist IDs (`chk-0-0`), a check-off bug could mutate the wrong checklist.
**Why it happens:** Copy-paste of ID format without changing the prefix.
**How to avoid:** Use distinct prefix `vc-{index}` for vehicle checklist items.
**Warning signs:** Check-off on vehicle item affects departure checklist or vice versa.

---

## Code Examples

### Trip Prep Section Registration
```typescript
// Source: lib/prep-sections.ts
export const PREP_SECTIONS: SectionConfig[] = [
  { key: 'weather',        label: 'Weather',        emoji: '\u{1F324}' },
  { key: 'packing',        label: 'Packing List',   emoji: '\u{1F392}' },
  { key: 'meals',          label: 'Meal Plan',      emoji: '\u{1F373}' },
  { key: 'power',          label: 'Power Budget',   emoji: '\u{1F50B}' },
  { key: 'departure',      label: 'Departure',      emoji: '\u{1F4CB}' },
  { key: 'vehicle-check',  label: 'Vehicle Check',  emoji: '\u{1F699}' },  // NEW
]
```

### Claude Prompt Structure (follows generateDepartureChecklist pattern)
```typescript
// Source: lib/claude.ts (generateDepartureChecklist as model)
const prompt = `You are a vehicle pre-trip inspection assistant for car camping.
Generate a practical, action-oriented pre-trip checklist specific to this vehicle and trip.

VEHICLE:
- Year/Make/Model: ${year ?? 'Unknown'} ${make ?? ''} ${model ?? ''}
- Drivetrain: ${drivetrain ?? 'Unknown'}
- Ground Clearance: ${groundClearance != null ? `${groundClearance}"` : 'Unknown'}

TRIP CONTEXT:
- Duration: ${tripDays} day${tripDays !== 1 ? 's' : ''}
${destinationName ? `- Destination: ${destinationName}` : ''}
${roadCondition ? `- Road Condition: ${roadCondition}` : ''}
${clearanceNeeded ? `- Clearance Needed: ${clearanceNeeded}` : ''}

INSTRUCTIONS:
1. Generate 8-15 practical checklist items for this specific vehicle.
2. Each item should be action-oriented (verb-first: "Check", "Verify", "Inflate", "Top off").
3. Cover: tires, fluids (oil, coolant, washer fluid), lights, battery, emergency kit, cargo security.
4. If road condition indicates dirt/off-road, include items for that (skid plate check, recovery gear, etc.).
5. Generate a unique ID for each item using format "vc-{index}" (0-based).
6. All items start with checked: false.

Respond ONLY with valid JSON (no markdown):
{
  "items": [
    { "id": "vc-0", "text": "Check tire pressure (front/rear)", "checked": false },
    { "id": "vc-1", "text": "Verify oil level", "checked": false }
  ]
}

Rules: Do NOT wrap in markdown code blocks. "checked" is always false in generated output.`
```

### Check-Off Route (adapted from departure-checklist)
```typescript
// Source: app/api/departure-checklist/[id]/check/route.ts (pattern)
// File: app/api/vehicle-checklist/[tripId]/check/route.ts
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tripId: string }> }
) {
  const { tripId } = await params
  const { itemId, checked } = await request.json()
  // ... validation ...
  await prisma.$transaction(async (tx) => {
    const trip = await tx.trip.findUnique({ where: { id: tripId } })
    if (!trip) throw new Error('NOT_FOUND')
    const result = safeJsonParse<VehicleChecklistResult>(trip.vehicleChecklistResult ?? '')
    if (!result) throw new Error('PARSE_ERROR')
    const item = result.items.find(i => i.id === itemId)
    if (!item) throw new Error('ITEM_NOT_FOUND')
    item.checked = checked
    await tx.trip.update({
      where: { id: tripId },
      data: { vehicleChecklistResult: JSON.stringify(result) },
    })
  })
  return NextResponse.json({ success: true })
}
```

---

## Runtime State Inventory

> This phase makes no renames or migrations of existing data. Only additive schema fields.

| Category | Items Found | Action Required |
|----------|-------------|------------------|
| Stored data | No existing vehicleChecklistResult data (new fields) | None — additive migration |
| Live service config | None | None |
| OS-registered state | None | None |
| Secrets/env vars | ANTHROPIC_API_KEY already required for Claude features | None |
| Build artifacts | None | None |

---

## Environment Availability

> Step 2.6: Dependencies are all in-project or already verified running.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| ANTHROPIC_API_KEY | Claude generation | Assumed ✓ | — | API returns 500 with clear error |
| Prisma CLI | Schema migration | ✓ | 6.19.2 | — |
| SQLite dev.db | All DB ops | ✓ | — | — |
| npm run build | Build gate | ✓ | — | — |

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/vehicle-checklist-schema.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | Checklist renders in trip prep | smoke | `npx vitest run tests/vehicle-checklist-schema.test.ts` | ❌ Wave 0 |
| SC-2 | Item check-off toggles and persists | unit | `npx vitest run tests/vehicle-checklist-route.test.ts` | ❌ Wave 0 |
| SC-3 | Zod schema validates Claude output | unit | `npx vitest run tests/vehicle-checklist-schema.test.ts` | ❌ Wave 0 |
| SC-4 | Vehicle specs appear in generation | unit (prompt inspection) | `npx vitest run tests/vehicle-checklist-route.test.ts` | ❌ Wave 0 |
| SC-5 | Build passes | build | `npm run build` | ✓ existing |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/vehicle-checklist-schema.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run build` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/vehicle-checklist-schema.test.ts` — Zod schema validation for VehicleChecklistResultSchema
- [ ] `tests/vehicle-checklist-route.test.ts` — check-off PATCH route unit tests

*(Patterns exist in `tests/departure-checklist-schema.test.ts` and `tests/departure-checklist-route.test.ts` to follow)*

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate model per checklist | JSON blob on Trip | Phase 6 decision | Simpler, consistent with D-10 |
| Claude parses fences manually | `parseClaudeJSON` + Zod | Phase 6 | 422 for schema mismatch, never throws |
| Static packing templates | AI-generated per trip | v1.0 | More relevant, vehicle-specific |

---

## Open Questions

1. **Prep endpoint status integration**
   - What we know: `/api/trips/[id]/prep/route.ts` builds PrepState. The departure section status is computed from DepartureChecklist separately in TripPrepClient (not through the prep endpoint). The vehicle check can follow this pattern too.
   - What's unclear: Whether the prep endpoint needs to be updated to include vehicle-check status in its returned sections array, or whether TripPrepClient can compute it locally from the fetched checklist result.
   - Recommendation: Follow the departure checklist precedent — TripPrepClient fetches vehicle checklist independently and computes status locally. Do NOT route it through `/api/trips/[id]/prep`. This avoids changing the prep endpoint.

2. **VehicleChecklistCard extraction vs inline rendering**
   - What we know: TripPrepClient is large. Other sections (PackingList, MealPlan, PowerBudget) are extracted into separate component files. Departure section is rendered inline with local state.
   - What's unclear: Whether to extract a `VehicleChecklistCard` component or render inline.
   - Recommendation: Extract `VehicleChecklistCard.tsx`. It will have its own state (loading, error, regenerate confirm), and keeping it separate matches the PackingList/MealPlan pattern. Keeps TripPrepClient file from growing larger.

---

## Sources

### Primary (HIGH confidence)
- `/lib/prep-sections.ts` — PREP_SECTIONS array, PrepSection interface, confirmed extensible string key
- `/lib/claude.ts` — All existing generation functions — confirmed patterns for `generateVehicleChecklist`
- `/lib/parse-claude.ts` — All Zod schemas — confirmed location for VehicleChecklistResultSchema
- `/app/api/meal-plan/route.ts` — GET/POST pattern for Claude generation + JSON blob persistence
- `/app/api/packing-list/route.ts` — GET pattern for reading Trip JSON blob field
- `/app/api/departure-checklist/[id]/check/route.ts` — PATCH check-off with `$transaction`
- `/prisma/schema.prisma` — Confirmed Trip model shape; DepartureChecklist as model alternative
- `/components/TripPrepClient.tsx` — Section rendering, independent fetch pattern
- `/components/TripPrepSection.tsx` — Reusable section wrapper
- `/vitest.config.ts` + `/tests/` — Confirmed Vitest framework, existing test patterns

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions D-01 through D-10 — User-locked decisions, project-specific

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — all new files must be `.ts` or `.tsx`
- All API routes must have try-catch with `console.error` + JSON error response
- No `alert()` in components — state-based inline error messages only
- All React hooks must have correct, minimal dependency arrays
- No mutations on React state — use immutable update patterns
- `npm run build` must pass (success criterion)
- Commit messages: imperative mood, concise
- Documentation: update TASKS.md and create changelog entry after session
- Components: functional with hooks, `'use client'` directive on client components

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing libraries
- Architecture: HIGH — locked decisions + direct canonical references in CONTEXT.md
- Pitfalls: HIGH — identified from reading actual route implementations and schema
- Test patterns: HIGH — existing `departure-checklist-*.test.ts` files are direct templates

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable project, no fast-moving dependencies)
