# Phase 35: Meal Planning — Shopping, Prep & Feedback — Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Three additions on top of the Phase 34 meal plan core:
1. **Shopping list** — consolidated ingredient list from all meals, grouped by category, with checkboxes that persist across page reloads and a copy-to-clipboard button
2. **Prep guide** — before-you-leave vs at-camp steps, generated on-demand by Claude, leveraging Will's vacuum sealer/sous vide context
3. **Feedback loop** — 👍/👎 per-meal ratings with optional notes, stored and injected into future meal plan generations

**Out of scope:** syncing to Instacart/AnyList, sharing shopping list externally, pre-checking gear-inventory items, whole-plan rating, dietary restriction fields, ML/embedding-based feedback.

</domain>

<decisions>
## Implementation Decisions

### Feedback UX
- **D-01:** Rating buttons are **always visible** on meal cards — no trip-end gate, no state machine based on trip dates. Will can rate before or after the trip.
- **D-02:** Interaction is **👍 / 👎 + optional note textarea**. Tapping either thumb reveals a small optional textarea for a note. Fast and phone-friendly.
- **D-03:** **Per-meal only** — no whole-plan rating. mealId is always set on MealFeedback rows (nullable field in spec kept for schema flexibility but no UI entry point for null mealId).

### Shopping List
- **D-04:** **On-demand generate** — a "Generate Shopping List" button in the Shopping tab. Will taps when ready. Regenerate button appears after first generation. Matches the meal plan generate flow.
- **D-05:** All items start **unchecked** when first generated.
- **D-06:** **Copy to clipboard** (plain text) button in the Shopping tab header. Copies full list as plain text for texting or notes apps.
- **D-07:** When the meal plan is **regenerated**, re-generate the shopping list but **preserve checked=true** for any item whose name matches an item in the old list. New items start unchecked. Items that disappear from the new plan are dropped. No confirm dialog needed — the merge behavior is safe.

### Prep Guide
- **D-08:** **On-demand, separate button** — a "Generate Prep Guide" button in the Prep tab. Will can skip it entirely if he doesn't need it for a given trip.
- **D-09:** Lives in a **separate "Prep" tab** inside MealPlanClient. Tab structure: **Plan / Shopping / Prep**. Matches the spec and keeps meal planning cohesive within one component.

### Dashboard Card
- **D-10:** Shows **status + action nudge** for the soonest upcoming trip: trip name + one-line status (e.g., "Meal plan ready — shopping list pending" or "No meal plan yet"). Tapping navigates to TripPrepClient meals tab.
- **D-11:** Shows **soonest upcoming trip only** (the next trip with a future start date). One card on the dashboard — not a list of all upcoming trips.

### Claude's Discretion
- Exact shopping list plain-text format for clipboard
- Prep guide tab empty state copy when no guide has been generated
- Feedback button placement within each meal card (e.g., bottom-right vs inline below description)
- Exact Tailwind styling — follow existing MealPlanClient card patterns

</decisions>

<specifics>
## Specific Ideas

### Shopping list merge on meal plan regeneration
Preserve `checked=true` by matching on item name (case-insensitive). New items unchecked. Dropped items deleted. No confirmation needed — behavior is safe (checked items are preserved, nothing is lost).

### Feedback injection prompt block (from spec)
```
On plan generation, query last 10 MealFeedback records (any trip).
Summarize: "Previously liked: [names]. Previously disliked: [names] — reason: [notes]. Avoid: [patterns from dislike notes]."
Inject into generateMealPlan() prompt as a "Will's meal history" block.
```

### Prep guide structure (from spec)
Claude returns JSON: `{ beforeLeave: [{step, meals}], atCamp: [{day, mealSlot, steps}] }`. Persisted in `prepGuide JSON` field on MealPlan.

### Will's cooking context (locked from Phase 34)
```
"Car camping — full cooler available. Will has a vacuum sealer and sous vide at home for pre-trip prep. Prefer one-pot or simple multi-component meals. Minimize dishes."
```
This context must remain in the prep guide generation prompt.

</specifics>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Phase 35 spec (primary)
- `.planning/V2-SESSIONS.md` lines 516–575 — Full S12 spec: data models (ShoppingListItem, MealFeedback), key files, generation approaches, acceptance criteria, constraints

### Phase 34 context (prior phase — decisions locked)
- `.planning/phases/34-meal-planning-core/34-CONTEXT.md` — Schema decisions, API route structure, MealPlanClient patterns, cooking prompt constraints

### Schema (source of truth)
- `prisma/schema.prisma` — Current MealPlan + Meal models (basis for adding ShoppingListItem, MealFeedback, prepGuide field)

### Existing components to modify
- `components/MealPlanClient.tsx` — Add Plan/Shopping/Prep tabs; add MealFeedbackButton to each meal card
- `components/DashboardClient.tsx` — Add meal plan status card for soonest upcoming trip

### Per-trip API patterns to follow
- `app/api/trips/[id]/meal-plan/route.ts` — Existing per-trip RESTful pattern; new shopping-list and feedback routes follow same structure

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/MealPlanClient.tsx` (423 lines) — Phase 34 component with day-by-day collapsible meals; Phase 35 modifies to add tabs and feedback buttons
- `components/ui/` — ConfirmDialog, Button, card patterns already established

### Established Patterns
- Per-trip RESTful routes: `GET/POST/DELETE /api/trips/[id]/[feature]/...`
- Claude JSON parsing via `parseClaudeJSON<T>()` in lib utilities (Zod safeParse, 422 on schema mismatch)
- Upsert pattern for plan-level data (MealPlan uses tripId @unique)
- Dashboard cards: DashboardClient fetches all data server-side, passes to client components

### Integration Points
- `MealPlanClient.tsx` is the hub — tabs live here, feedback buttons render inside day accordion
- `DashboardClient.tsx` needs a new server-side query for soonest upcoming trip + its meal plan status
- `lib/claude.ts` gets: `generateShoppingList()`, `generatePrepGuide()`, updated `generateMealPlan()` with feedback injection

</code_context>

<deferred>
## Deferred Ideas

- Syncing shopping list to Instacart/AnyList — out of scope
- Sharing shopping list externally (beyond copy-to-clipboard) — out of scope
- Pre-checking items Will already owns (gear inventory cross-reference) — out of scope per spec
- Whole-plan rating (mealId = null entries) — decided against; no UI entry point
- Dietary restriction fields — deferred to future feedback history phase

</deferred>

---

*Phase: 35-meal-planning-shopping-prep-feedback*
*Context gathered: 2026-04-03*
