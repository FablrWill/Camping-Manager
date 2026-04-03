# Phase 34: Meal Planning Core - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Source:** PRD Express Path (.planning/V2-SESSIONS.md#S11) + direct spec from user

<domain>
## Phase Boundary

Build a normalized meal planning system linked to trips. Given a trip, Claude generates a full meal plan — every meal slot for every day — based on trip duration, headcount, destination/weather, dog status, and available cooking gear. Individual meals can be regenerated without replacing the whole plan.

**Out of scope (S12):** shopping list, prep guide, feedback UI, headcount field on Trip, dietary restrictions/preferences field.

**Key prior art:** Significant meal plan infrastructure already exists:
- `generateMealPlan()` in `lib/claude.ts` — comprehensive, includes weather, cooking gear, pre-trip prep instructions (but lacks `bringingDog` param and `regenerateMeal()`)
- `MealPlan` model in schema uses JSON blob (`result` field) — needs migration to normalized `Meal` rows
- `MealPlan.tsx` component (474 lines) — renders from JSON blob, already wired into TripPrepClient `meals` tab
- `app/api/meal-plan/route.ts` — GET/POST with `?tripId=` query param (not per-trip RESTful)
- `Trip.mealPlanGeneratedAt` — already on Trip model for status tracking
- `Trip.bringingDog` — already on Trip model, needs to flow into meal generation

</domain>

<decisions>
## Implementation Decisions

### Schema Migration
- Add `Meal` model with normalized rows: `id, mealPlanId, day (1-based int), slot (breakfast/lunch/dinner/snack), name, description, ingredients (JSON array of {item, quantity, unit}), cookInstructions, prepNotes, estimatedMinutes`
- Update `MealPlan` model: keep `id, tripId (@unique), generatedAt`; add `notes String?`; **remove `result` JSON blob** and `cachedAt`
- Existing MealPlan rows (if any) will be cleared — personal project, no prod data migration needed
- Write a Prisma migration for both changes

### API Routes (new per-trip RESTful structure)
- `GET  /api/trips/[id]/meal-plan` — fetch plan with all Meal rows
- `DELETE /api/trips/[id]/meal-plan` — clear plan (delete MealPlan + cascade Meals)
- `POST /api/trips/[id]/meal-plan/generate` — call Claude, persist MealPlan + Meal rows, return full plan; also update `Trip.mealPlanGeneratedAt`
- `PATCH /api/trips/[id]/meal-plan/meals/[mealId]` — regenerate single meal via `regenerateMeal()`, update the Meal row in DB
- `DELETE /api/trips/[id]/meal-plan/meals/[mealId]` — delete single meal

### lib/claude.ts Functions
- Update `generateMealPlan()` to accept `bringingDog?: boolean` param and inject into prompt
- Add `regenerateMeal()` function: takes meal context (day, slot, trip details) and generates one replacement meal
- The Claude prompt for meal generation already has vacuum sealer / sous vide constraints — keep and don't change
- Snack slot is optional per spec ("snack optional")

### MealPlanClient.tsx (new component)
- NEW file: `components/MealPlanClient.tsx`
- Replaces/supersedes existing `MealPlan.tsx` for the meals tab in TripPrepClient
- Days as collapsible sections (day number + date as header)
- Meal cards: name, prepType (home/camp), prepNotes, ingredients list, cook instructions
- "Generate Plan" button (when no plan exists)
- "Regenerate All" button (when plan exists)
- Per-meal "↺ Regenerate" button on each meal card
- Loading state during generation/regeneration
- Error state inline (no alert())
- Existing `MealPlan.tsx` can be kept or removed — TripPrepClient will use MealPlanClient

### TripPrepClient wiring
- Update the `meals` section to render `<MealPlanClient tripId={trip.id} tripName={trip.name} />` instead of `<MealPlan ...>`
- Use new per-trip API routes (`/api/trips/${id}/meal-plan`)

### TripsClient status indicator
- Trip cards currently have no meal plan status display
- Add "Meal plan ready" / "No meal plan" badge/indicator on each trip card
- Data: use `trip.mealPlanGeneratedAt` (already on Trip model) — null = no plan

### Claude's Discretion
- Component structure within MealPlanClient (how many sub-components to extract)
- Exact Tailwind styling for meal cards (follow existing TripPrepClient patterns)
- Whether to keep or delete the old `MealPlan.tsx` (can keep for now)
- Error message copy
- Exact behavior when regenerating a single meal while another regeneration is in flight (disable button)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Spec
- `.planning/V2-SESSIONS.md` lines 467–515 — Full S11 spec (data models, key files, Claude prompt context, acceptance criteria, constraints)

### Schema (source of truth)
- `prisma/schema.prisma` — Current MealPlan model (JSON blob, needs migration to normalized rows) + Trip model (bringingDog, mealPlanGeneratedAt fields)

### Existing meal plan code (must read before modifying)
- `lib/claude.ts` lines 116–480 — MealPlanMeal, MealPlanDay, MealPlanResult interfaces + generateMealPlan() implementation
- `app/api/meal-plan/route.ts` — Existing GET/POST route (will be superseded by per-trip routes)
- `components/MealPlan.tsx` — Existing 474-line component (will be superseded by MealPlanClient.tsx)

### Components to update
- `components/TripPrepClient.tsx` — meals section currently renders `<MealPlan>`, needs to render `<MealPlanClient>`
- `components/TripsClient.tsx` — trip cards need meal plan status indicator

### Patterns to follow
- `app/api/trips/[id]/vehicle-checklist/route.ts` (or similar per-trip routes) — follow same per-trip RESTful pattern
- `components/VehicleChecklistCard.tsx` — similar generate/regenerate UX pattern if exists

</canonical_refs>

<specifics>
## Specific Ideas

### Claude prompt constraints (locked — from spec)
```
"Car camping — full cooler available. Will has a vacuum sealer and sous vide at home for pre-trip prep. Prefer one-pot or simple multi-component meals. Minimize dishes."
```

### Meal slot coverage
- Day 1: starts with lunch or dinner (arrival day — no breakfast)
- Middle days: breakfast, lunch, dinner
- Last day: breakfast only (pack-up day)
- Snacks: optional per day

### bringingDog in meal context
- If `trip.bringingDog` is true, Claude should note dog-friendly meal timing (meals that don't require long unattended cooking while managing a dog)

### Individual meal regeneration prompt
- Must include: day number, slot, trip context (name, dates, destination), cooking gear, weather (if available), and the current meal name/description (for contrast/variety)

</specifics>

<deferred>
## Deferred Ideas

- Shopping list (S12)
- Prep guide (S12)
- Feedback/rating UI (S12)
- Headcount field on Trip model (future session)
- Dietary restrictions / preferences field (future — feedback history in S12)
- Offline snapshot for meal plan (existing `cachedAt` field being removed — can add back later)
- Headcount > 1 (assume 1 for now per spec)

</deferred>

---

*Phase: 34-meal-planning-core*
*Context gathered: 2026-04-03 via PRD Express Path (V2-SESSIONS.md#S11)*
