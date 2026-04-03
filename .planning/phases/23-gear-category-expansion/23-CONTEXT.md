# Phase 23: Gear Category Expansion - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning
**Source:** V2-SESSIONS.md S08 spec (PRD equivalent)

<domain>
## Phase Boundary

Expand gear from 7 to 15 categories with visual grouping. Add 3 new schema fields for tech gear. Re-categorize existing items. Centralize category definitions in a shared module. No changes to gear card visual design beyond adding category group headers.

</domain>

<decisions>
## Implementation Decisions

### Category Structure
- 15 categories in 4 visual groups:
  - **Living:** shelter (⛺), sleep (🛏️), cook (🍳), hydration (💧), clothing (🧥)
  - **Utility:** lighting (💡), tools (🔧), safety (🛟), furniture (🪑)
  - **Tech/Power:** power (🔋), electronics (📡), vehicle (🚙)
  - **Action:** navigation (🧭), hiking (🥾), dog (🐕)

### Shared Module
- `lib/gear-categories.ts` — NEW: single source of truth for all categories, groups, emojis, helpers
- All local category duplicates must be removed from: GearClient, DashboardClient, claude.ts, power.ts, agent tools

### Schema Changes
- Add 3 optional fields to GearItem: `modelNumber` (String?), `connectivity` (String?), `manualUrl` (String?)
- Requires Prisma migration
- Category field is already a free String — no enum migration needed for categories

### UI Changes
- Gear page shows grouped filter chips using the 4 visual groups
- GearForm adds modelNumber, connectivity, manualUrl fields (for tech gear)
- Out of scope: changing gear card visual design beyond adding category group headers

### Key Files to Modify
- `lib/gear-categories.ts` — NEW: single source of truth
- `components/GearClient.tsx` — replace local CATEGORIES with import, add grouped filter chips
- `components/GearForm.tsx` — add modelNumber, connectivity, manualUrl fields
- `components/DashboardClient.tsx` — replace local CATEGORY_EMOJI with import
- `lib/claude.ts` — replace local CATEGORY_EMOJIS, update packing prompt
- `lib/power.ts` — update exclusion list + CATEGORY_FALLBACK
- `lib/agent/tools/gear.ts` + `listGear.ts` — update category description strings
- `prisma/schema.prisma` — add modelNumber, connectivity, manualUrl to GearItem
- `prisma/seed.ts` — re-categorize 9 items
- `app/api/gear/route.ts` + `[id]/route.ts` — handle 3 new fields

### Seed Re-categorizations
- fairy lights, wall sconces, flood lights → `lighting`
- camp table, Helinox Chair → `furniture`
- fire extinguisher, first aid kit → `safety`
- Garmin inReach → `navigation`
- water jug pump → `hydration`

### Claude's Discretion
- TypeScript types/interfaces for category groups
- Helper function signatures in gear-categories.ts
- Grouped filter chip component implementation details
- Whether to use a separate component for grouped chips or inline in GearClient

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Data
- `prisma/schema.prisma` — Current GearItem model definition
- `prisma/seed.ts` — Current seed data with items to re-categorize

### Category Consumers (local duplicates to replace)
- `components/GearClient.tsx` — Local CATEGORIES constant
- `components/GearForm.tsx` — Category options in form
- `components/DashboardClient.tsx` — Local CATEGORY_EMOJI mapping
- `lib/claude.ts` — Local CATEGORY_EMOJIS for packing prompts
- `lib/power.ts` — CATEGORY_FALLBACK and exclusion list
- `lib/agent/tools/gear.ts` — Category description strings
- `lib/agent/tools/listGear.ts` — Category listing

### API Routes
- `app/api/gear/route.ts` — Gear CRUD (POST, GET)
- `app/api/gear/[id]/route.ts` — Gear CRUD (PUT, DELETE)

</canonical_refs>

<specifics>
## Specific Ideas

- User story: Will has HA sensors, solar panels, a dog crate, camp furniture, and safety gear — none fit cleanly into the current 7 categories. After expansion, he opens the gear page and sees 15 categories organized into 4 visual groups. Adding an ESP32 board, he picks "electronics" and fills in model number and connectivity type.

</specifics>

<deferred>
## Deferred Ideas

None — S08 spec covers full phase scope.

</deferred>

---

*Phase: 23-gear-category-expansion*
*Context gathered: 2026-04-03 via V2-SESSIONS.md S08 spec*
