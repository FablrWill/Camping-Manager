# Phase 31: Dark Sky, Astro Info & Activity Gear Recommendations — Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Source:** User discussion session

<domain>
## Phase Boundary

Expand Phase 31 beyond the original "show Bortle/moon/sunrise per location" spec to include:

1. **Dark sky data per location/trip** — Bortle class, moon phase, sunrise/sunset (original scope)
2. **Activities gear category** — New `activities` category in `lib/gear-categories.ts` for leisure/entertainment gear (kayak, telescope, projector, speakers, bike, hammock, fishing rod, camera, etc.)
3. **Location condition inference** — Claude infers activity suitability (dark sky quality, water access, trails) from existing location notes/description/type fields — no new schema fields
4. **Trip planner activity recommendations** — The conversational trip planner (Phase 33, already built) surfaces activity gear suggestions based on inferred location conditions, presented as accept/reject suggestions

Out of scope: structured condition fields on Location model, any new location entry UI changes.
</domain>

<decisions>
## Implementation Decisions

### A. Activities Category Scope
- Category value: `activities` (single category, not split)
- Label: "Activities" — covers outdoor + leisure/entertainment gear
- Emoji: TBD (Claude's discretion — something like 🎯 or ⛵)
- Belongs in: new "Leisure" group in `CATEGORY_GROUPS`, or added to existing "Action" group — Claude's discretion based on visual fit
- Scope of what belongs here: kayak, telescope, projector, speakers, bike, hammock, fishing rod, camera, board games, etc. — broad leisure/entertainment, not just outdoor sports
- Will's current gear to re-categorize into activities: projector, speakers, telescope (wishlist)

### B. Location Condition Inference
- **No new schema fields** on Location model — do not add `darkSkyRating`, `trailAccess`, etc.
- Claude infers activity suitability from existing fields: `description`, `notes`, `type`, `waterAccess` (already exists as Boolean), `cellSignal`, location name
- The `listLocations` tool already returns these fields — the trip planner agent uses them to reason about what activity gear is relevant
- Example inference: notes say "remote ridge, no lights visible" → Claude infers good dark sky; `waterAccess: true` → kayak relevant; description mentions "trailhead" → hiking gear relevant

### C. Trip Planner Recommendation Behavior
- Recommendations are **suggestions, not automatic additions** — user accepts or rejects
- Trigger: trip planner agent, during conversation, checks owned activity gear against inferred location conditions
- Presentation: surfaced as a natural conversational suggestion ("You're heading to a spot with great dark sky access — want to pack your telescope?")
- Wishlist items included: if a wishlist item is relevant, the agent can say "you've been eyeing a telescope — this would be a great trip to use one"
- The `list_gear` tool already exists in trip planner tools and can filter by category — once `activities` category exists, this works with minimal new agent code

### D. Phase Scope Merge
- This phase expands Phase 31's original scope — dark sky data + activity category + recommendation logic are all one cohesive phase
- Do NOT create a separate phase for activities/gear recommendations

### E. Wishlist Nudge
- If the trip planner detects a relevant wishlist item for the trip's location conditions, it surfaces the item:
  - Example: "You're going to a dark sky site — you have a telescope on your wishlist. Might be a great trip to pick one up."
- Applies to all activity wishlist items, not just telescope

## Dark Sky Data (Original Phase 31 Scope)

### Data Sources
- **Bortle class**: Light pollution map API or static dataset — researcher to identify best free option (no API key preferred, consistent with project constraints)
- **Moon phase**: Astronomy API or computed from formula — free, no API key preferred
- **Sunrise/sunset**: Already have Open-Meteo integration; researcher to check if it covers this, otherwise use a free astronomy API

### Where It Appears
- Trip prep view (already exists) — show per-night moon phase + Bortle class for the trip's location
- Location detail / spot view — show Bortle class for the location
- Trip planner agent awareness — agent can reference dark sky quality when discussing a trip

### Display Style
- Claude's discretion — keep it compact and mobile-friendly, consistent with existing trip prep cards

## Canonical Refs

- `lib/gear-categories.ts` — category definitions, CATEGORY_GROUPS, all consumers
- `prisma/schema.prisma` — Location model (no changes needed), GearItem model (category field)
- `lib/agent/tools/trip-planner-tools.ts` — tool registry for trip planner agent
- `lib/agent/tools/listGear.ts` — already filters by category; will auto-pick up `activities` once added
- `lib/agent/tools/listLocations.ts` — check what location fields it returns to trip planner
- `app/api/trips/[id]/prep/route.ts` — where dark sky data should be surfaced
- `.planning/phases/23-gear-category-expansion/23-CONTEXT.md` — category structure decisions from Phase 23

</decisions>

<deferred>
## Deferred Ideas (out of scope for this phase)

- Structured condition fields on Location model (waterAccess already exists; others deferred)
- Activity-specific packing list logic (separate from trip planner suggestions)
- Dark sky photography tips or astro planning guide (content feature, separate phase)
- Gear recommendation engine beyond trip planner (e.g., dashboard "you should get X" nudges)
</deferred>
