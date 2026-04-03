# Phase 29: Vehicle Pre-Trip Checklist - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Add a terrain-aware vehicle pre-trip checklist to the Trip Prep flow. Claude generates the checklist from vehicle specs + trip context. Users check items off. State persists per trip. Surfaces as a new 6th section in PREP_SECTIONS (after Departure). No new DB model — JSON blob on Trip.

</domain>

<decisions>
## Implementation Decisions

### Terrain Detection
- **D-01:** Always show the full checklist regardless of whether a location/roadCondition is set. No terrain filtering, no conditional item sets. The list is flat and complete.
- **D-02:** No terrain tagging or visual distinction on items — even when `Location.roadCondition` is populated. Flat list, action-focused.

### Checklist Generation
- **D-03:** AI-generated via Claude. Not a static template.
- **D-04:** Claude receives two inputs: vehicle specs (year, make, model, drivetrain, ground clearance from Vehicle profile) and trip context (trip length in days, destination name, `Location.roadCondition`, `Location.clearanceNeeded`).
- **D-05:** Mods list and weather data are NOT included in the generation prompt for this phase.

### Placement in Trip Prep
- **D-06:** Add 'vehicle-check' as a 6th entry in `PREP_SECTIONS` in `lib/prep-sections.ts`. Positioned after 'departure'. Emoji: 🚙 (matches gear category convention from Phase 23).
- **D-07:** The section card shows only checklist items — no inline vehicle specs (drivetrain, ground clearance, etc.). Vehicle details remain on the Vehicle page.

### State Persistence
- **D-08:** Add two fields to the Trip model: `vehicleChecklistResult` (String? — JSON blob) and `vehicleChecklistGeneratedAt` (DateTime?). Same pattern as `packingListResult` / `packingListGeneratedAt`.
- **D-09:** Generate once on first open, persist to DB. Show a "Regenerate" button like Meal Plan and Packing List. User triggers refresh manually if vehicle or trip changes.
- **D-10:** Check-off state lives inside the `vehicleChecklistResult` JSON blob (item text + checked boolean per item). No separate DB model.

### Claude's Discretion
- Exact checklist items and categories within the list (grouping, ordering, wording)
- How to gracefully handle a trip with no vehicle assigned (e.g., empty state prompt to assign vehicle)
- Whether to include a "notes" field per item or keep it purely checkbox-based
- Offline behavior (whether to cache checklist in offline snapshot alongside other trip data)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Trip Prep Architecture
- `lib/prep-sections.ts` — PREP_SECTIONS array, PrepSection/PrepState interfaces. Add new section here. Key is extensible string (D-06 from Phase 26).
- `components/TripPrepClient.tsx` — Main Trip Prep component. Add vehicle-check section rendering here.
- `components/TripPrepSection.tsx` — Collapsible section wrapper. Reuse for vehicle check section.

### Generation Pattern (follow Meal Plan)
- `app/api/meal-plan/route.ts` — Claude generation pattern to follow (prompt structure, storing result as JSON blob on Trip)
- `lib/claude.ts` — Claude utility functions. Add `generateVehicleChecklist()` here following existing patterns.

### State Persistence Pattern
- `app/api/packing-list/route.ts` — JSON blob storage pattern for Trip (`packingListResult`, `packingListGeneratedAt`)
- `prisma/schema.prisma` — Add `vehicleChecklistResult` (String?) and `vehicleChecklistGeneratedAt` (DateTime?) to Trip model. Requires migration.

### Check-off Pattern
- `app/api/departure-checklist/[id]/check/route.ts` — Existing check-off API. Vehicle check will need its own endpoint following same pattern.
- `lib/offline-write-queue.ts` — Offline check-off queue. May need to extend for vehicle check items.

### Vehicle Data
- `app/api/vehicle/route.ts` — Vehicle CRUD. Vehicle specs (year, make, model, drivetrain, groundClearance) read from here for generation.
- `prisma/schema.prisma` Vehicle model — `drivetrain`, `groundClearance` are the terrain-relevant fields for Claude context.

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/prep-sections.ts`: PREP_SECTIONS — just add a new entry. PrepSection interface already supports arbitrary `data: unknown` payload.
- `components/TripPrepSection.tsx`: Collapsible section wrapper — reuse directly for vehicle check rendering.
- `lib/claude.ts`: Anthropic SDK already initialized. Add `generateVehicleChecklist()` alongside `generatePackingList()`.
- `components/ui/`: Button, EmptyState, etc — all available for the checklist UI.

### Established Patterns
- JSON blob on Trip: `packingListResult` stores PackingListResult JSON, regenerated on demand. Exactly the pattern for D-08/D-09.
- Claude generation: `generatePackingList()` in `lib/claude.ts` → called by API route → result stored on Trip. Follow same structure.
- PREP_SECTIONS extensibility: `key` is a string, not a union type — adding 'vehicle-check' doesn't break existing TypeScript.

### Integration Points
- `app/trips/[id]/prep/page.tsx` (or equivalent) — Server page that builds PrepState and passes sections to TripPrepClient.
- Trip model in Prisma — add two fields + migration.
- New API routes needed: `app/api/vehicle-checklist/route.ts` (generate + fetch) and `app/api/vehicle-checklist/[id]/check/route.ts` (toggle item).

</code_context>

<specifics>
## Specific Ideas

- The checklist is for the driver (Will), not a passenger manifest — items should be practical and action-oriented (check X, verify Y, confirm Z). Not a reading list.
- Will's vehicle is a 2022 Santa Fe Hybrid — Claude should know this and generate accordingly when specs are available.

</specifics>

<deferred>
## Deferred Ideas

- Including vehicle mods in the generation prompt — noted but scoped out. Could add in a later phase once the baseline checklist is working.
- Weather-aware checklist items (coolant mix for cold, AC check for desert) — deferred. Could fold into Phase 31 (weather/astro) or a future checklist enhancement.
- Terrain tagging / terrain-filtered views — user chose flat list. Could add filtering as enhancement if list gets long.

</deferred>

---

*Phase: 29-vehicle-pre-trip-checklist*
*Context gathered: 2026-04-03*
