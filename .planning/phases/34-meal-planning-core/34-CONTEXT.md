# Phase 34: Meal Planning Core - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Extend the existing meal plan system with three additions: (1) individual meal slot regeneration — tap a specific meal to regenerate just that one without replacing the whole plan; (2) trip card compact status indicator showing whether a meal plan exists; (3) dog and meal-prep context in the Claude prompt when relevant. The core generation, day×slot layout, shopping list, prep timeline, and whole-plan regeneration already exist and are not being redesigned.

</domain>

<decisions>
## Implementation Decisions

### Individual meal regeneration — UX
- **D-01:** Trigger lives in the expanded meal view — tap a meal row to expand it, then a small "↻ Regenerate this meal" button appears in the expanded detail. No always-visible icon on collapsed rows.
- **D-02:** While regenerating, the specific meal slot shows a spinner/skeleton. Other meals stay visible and interactive — no whole-plan lock.
- **D-03:** Skip ConfirmDialog for per-meal regen — low stakes (only one meal replaced). Show inline "Meal updated" feedback instead of a confirm prompt.

### Individual meal regeneration — API
- **D-04:** New PATCH endpoint on `/api/meal-plan` — accepts `{ tripId, day: number, mealType: 'breakfast' | 'lunch' | 'dinner' }`. Returns the updated single meal. Planner decides whether to regenerate via Claude mini-call or full prompt with instruction to update one slot.
- **D-05:** After per-meal regen, update only the target slot in the stored JSON blob (upsert the MealPlan row with the modified result). Shopping list and prep timeline can regenerate with the whole plan regen — per-meal regen only updates the meal itself.

### Dog awareness in meal planning
- **D-06:** Pass `bringingDog: boolean` from trip to `generateMealPlan()` params. When true, add a context note to the Claude prompt: "A dog is coming on this trip." Claude naturally avoids heavy use of foods toxic to dogs (onions, garlic, chocolate) and may suggest dog-friendly snack ideas. No separate dog shopping list section.

### Meal prep context in prompt
- **D-07:** Add to the Claude meal plan prompt: Will does pre-trip meal prep at home using a vacuum sealer and sous vide. This enriches the existing `prepType: 'home'` vs `'at camp'` distinction — Claude can suggest vacuum-sealed sous vide meals for home prep days.

### Trip card status badge
- **D-08:** Add "🍽️ Meal plan ready" to the stats row on the collapsed TripCard — same row as "backpack N packed" / "camera N photos". Only show when a meal plan exists; no "No meal plan" text (silence = no plan, consistent with packing items behavior).
- **D-09:** Trip query (in `app/trips/page.tsx`) needs `include: { mealPlan: { select: { id: true } } }` added to fetch plan existence without loading the full JSON blob. Pass `hasMealPlan: boolean` (derived from `!!trip.mealPlan`) down to TripCard.

### Claude's Discretion
- Exact Claude prompt wording for dog context and meal prep context
- Icon choice for meal plan status in stats row (🍽️ or alternative)
- How to display "Meal updated" inline feedback after per-meal regen (toast, brief text flash, etc.)
- Whether per-meal regen updates shopping list/prepTimeline or leaves them stale until whole regen

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing meal plan implementation
- `app/api/meal-plan/route.ts` — Current GET + POST meal plan API; upsert pattern, weather integration, cooking gear filtering
- `components/MealPlan.tsx` — Full meal plan component; expand/collapse meal rows, shopping list, prep timeline, ConfirmDialog pattern
- `lib/claude.ts` (lines 116–160, 333–490) — `MealPlanResult` type definition and `generateMealPlan()` function signature
- `lib/parse-claude.ts` — `MealPlanResultSchema` (Zod) and `parseClaudeJSON` utility

### Trip card and data
- `components/TripCard.tsx` — Collapsed card layout; stats row (lines 175–192); existing `bringingDog` usage (line 106); MealPlan embed in expanded view (line 276)
- `app/trips/page.tsx` — Trip query with `include` and `_count`; where to add `mealPlan: { select: { id: true } }`

### Prior phase decisions (carry forward)
- `STATE.md` → Phase 06-stabilization: `MealPlan uses @unique on tripId (one per trip)`; `parseClaudeJSON<T> uses Zod .safeParse() returning discriminated union`; `AI results persist on generation and load on component mount`; `Both PackingList and MealPlan guard regenerate with ConfirmDialog — first-time generation skips confirm`
- `STATE.md` → Phase 06-stabilization: `TripCard extracted to standalone file — PackingList/MealPlan child state no longer destroyed on parent re-render`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `MealPlan.tsx` expand/collapse pattern: `expandedMeal` state tracks which meal is open by key `day{N}-{mealType}` — per-meal regen button can live in the expanded detail block
- `ConfirmDialog` component: already used in MealPlan.tsx — skip for per-meal regen per D-03
- `Button` with `loading` prop: already used throughout — spinner state for per-meal regen
- `parseClaudeJSON<MealPlanResultSchema>`: use for any Claude response in the PATCH handler

### Established Patterns
- Fire-and-forget AI save: user sees AI result immediately; DB write failure doesn't block UI (from Phase 06)
- `safeJsonParse` for reading stored JSON blobs — use when loading MealPlan.result from DB
- State-based inline errors, no `alert()` — per CLAUDE.md conventions

### Integration Points
- PATCH `/api/meal-plan` is a new route handler needed alongside existing GET/POST in `app/api/meal-plan/route.ts`
- `generateMealPlan()` in `lib/claude.ts` needs `bringingDog` and `mealPrepContext` params added
- `TripCard` props interface needs `hasMealPlan: boolean` added
- `app/trips/page.tsx` query needs `mealPlan: { select: { id: true } }` in the include block

</code_context>

<specifics>
## Specific Ideas

- Will does pre-trip meal prep at home: vacuum sealer + sous vide. Claude should know this so home-prep meals are genuinely home-prep style (not just "make sandwiches at home").
- Dog context note in prompt should be minimal — just tell Claude the dog is coming; let Claude decide how to handle it rather than over-specifying.

</specifics>

<deferred>
## Deferred Ideas

- Per-meal regen also updating shopping list / prep timeline — complex; defer to whole-plan regen for those sections
- Dog food/treats as a dedicated shopping list section — Will handles dog logistics separately
- Snacks individual regeneration — only breakfast/lunch/dinner get per-meal regen; snacks are a flat list

</deferred>

---

*Phase: 34-meal-planning-core*
*Context gathered: 2026-04-04*
