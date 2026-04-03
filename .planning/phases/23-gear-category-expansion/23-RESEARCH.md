# Phase 23: Gear Category Expansion - Research

**Researched:** 2026-04-03
**Domain:** TypeScript shared module extraction, Prisma schema migration, React filter UI, Next.js API routes
**Confidence:** HIGH

## Summary

This phase is a contained refactor + schema extension with no new external dependencies. The work breaks into four distinct tracks: (1) create a shared `lib/gear-categories.ts` module, (2) run a Prisma migration to add three optional string fields to `GearItem`, (3) update every category consumer to import from the shared module, and (4) update the gear page UI to show grouped filter chips.

All category constants are currently duplicated across six files with slightly different shapes. The migration from 7 to 15 categories is purely additive for the `category` field (it is already a free `String` in the schema, not an enum), so no existing data breaks — only the 9 seed items listed in CONTEXT.md need category updates via `seed.ts` re-categorization.

The `power.ts` exclusion list at line 272 (`!['shelter', 'sleep', 'clothing', 'hygiene', 'cook'].includes(i.category)`) is the most fragile consumer because it hard-codes which categories are NOT power consumers. After expansion, the new non-consumer categories (lighting, furniture, safety, navigation, hiking, dog) will automatically fall through to the consumers list — which may be intentional or not. This needs a deliberate decision in the plan.

**Primary recommendation:** Create `lib/gear-categories.ts` first (Wave 0), then replace all consumers in a single wave, then migrate schema and API routes, then update UI. Ordering matters because the shared module must exist before consumers can import it.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Category Structure — 15 categories in 4 visual groups:**
- Living: shelter (⛺), sleep (🛏️), cook (🍳), hydration (💧), clothing (🧥)
- Utility: lighting (💡), tools (🔧), safety (🛟), furniture (🪑)
- Tech/Power: power (🔋), electronics (📡), vehicle (🚙)
- Action: navigation (🧭), hiking (🥾), dog (🐕)

**Shared Module:** `lib/gear-categories.ts` is the single source of truth for all categories, groups, emojis, helpers. All local duplicates must be removed from: GearClient, DashboardClient, claude.ts, power.ts, agent tools.

**Schema Changes:** Add 3 optional fields to GearItem: `modelNumber` (String?), `connectivity` (String?), `manualUrl` (String?). Requires Prisma migration. Category field is already a free String — no enum migration needed.

**UI Changes:** Gear page shows grouped filter chips using the 4 visual groups. GearForm adds modelNumber, connectivity, manualUrl fields (for tech gear). Out of scope: changing gear card visual design beyond adding category group headers.

**Key Files to Modify:** `lib/gear-categories.ts` (NEW), `components/GearClient.tsx`, `components/GearForm.tsx`, `components/DashboardClient.tsx`, `lib/claude.ts`, `lib/power.ts`, `lib/agent/tools/gear.ts`, `lib/agent/tools/listGear.ts`, `prisma/schema.prisma`, `prisma/seed.ts`, `app/api/gear/route.ts`, `app/api/gear/[id]/route.ts`

**Seed Re-categorizations:**
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

### Deferred Ideas (OUT OF SCOPE)

None — S08 spec covers full phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GEAR-CAT-01 | `lib/gear-categories.ts` is the single source of truth — all category definitions, emojis, groups, and helpers exported from this module | Shared module pattern; TypeScript const arrays and Record types |
| GEAR-CAT-02 | 15 categories in 4 visual groups (Living/Utility/Tech-Power/Action) | Locked in CONTEXT.md; implemented in gear-categories.ts |
| GEAR-CAT-03 | Gear page shows grouped filter chips using the 4 visual groups | React state for active category/group filter; Tailwind chip styling already present |
| GEAR-CAT-04 | GearForm includes 3 new optional fields: modelNumber, connectivity, manualUrl | Extend GearForm with new input fields; GearItem interface update |
| GEAR-CAT-05 | Prisma migration adds modelNumber, connectivity, manualUrl to GearItem | `prisma migrate dev` with new optional String fields |
| GEAR-CAT-06 | Seed data re-categorizes 9 items | Update `category:` value in 9 `prisma.gearItem.upsert` calls in seed.ts |
| GEAR-CAT-07 | All local category duplicates removed — all import from shared module | Replace CATEGORIES, CATEGORY_EMOJI, CATEGORY_EMOJIS, CATEGORY_FALLBACK consumers |
</phase_requirements>

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no JS
- No `alert()` — state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- All API routes must have try-catch + `console.error` + JSON error response
- Immutable patterns — no in-place mutation of state
- File size limit: 800 lines max, functions 50 lines max
- No hardcoded values — use constants or config
- TASKS.md and docs/changelog must be updated every session
- GSD workflow required — do not make direct edits outside GSD

---

## Standard Stack

This phase uses only the project's existing stack. No new packages needed.

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5 | Shared module types | Already in use throughout codebase |
| Prisma | 6.19.2 | Schema migration | Existing ORM |
| React | 19.2.4 | Grouped filter UI | Existing UI framework |
| Tailwind CSS 4 | (via PostCSS) | Chip styling | Existing styling system |
| Next.js | 16.2.1 | API route updates | Existing framework |

### No New Packages Required

All work is refactoring existing code and adding Prisma fields. No `npm install` needed.

---

## Architecture Patterns

### Shared Module: `lib/gear-categories.ts`

This is the core deliverable. The module must export everything the planner needs:

```typescript
// Source: project conventions (CLAUDE.md + TypeScript rules)

export type CategoryValue =
  | 'shelter' | 'sleep' | 'cook' | 'hydration' | 'clothing'
  | 'lighting' | 'tools' | 'safety' | 'furniture'
  | 'power' | 'electronics' | 'vehicle'
  | 'navigation' | 'hiking' | 'dog'

export interface Category {
  value: CategoryValue
  label: string
  emoji: string
}

export interface CategoryGroup {
  name: string
  categories: Category[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Living',
    categories: [
      { value: 'shelter',   label: 'Shelter',   emoji: '⛺' },
      { value: 'sleep',     label: 'Sleep',     emoji: '🛏️' },
      { value: 'cook',      label: 'Cook',      emoji: '🍳' },
      { value: 'hydration', label: 'Hydration', emoji: '💧' },
      { value: 'clothing',  label: 'Clothing',  emoji: '🧥' },
    ],
  },
  // ... Utility, Tech/Power, Action
]

// Flat list for dropdowns and iteration
export const CATEGORIES: Category[] = CATEGORY_GROUPS.flatMap((g) => g.categories)

// O(1) emoji lookup — replaces all local Record<string, string> maps
export const CATEGORY_EMOJI: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.value, c.emoji]))

// Helper: emoji with fallback
export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📦'
}

// Helper: label with fallback
export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}
```

**Why `as const` is NOT used on CATEGORY_GROUPS:** The `CategoryGroup[]` type annotation is explicit, and `as const` would make the inner arrays `readonly` tuples which complicates `flatMap`. Keep typed but not const-asserted.

### Prisma Migration Pattern

Adding optional fields to SQLite via Prisma is straightforward:

```prisma
// prisma/schema.prisma — add to GearItem model
modelNumber   String?  // e.g. "ESP32-WROOM-32"
connectivity  String?  // e.g. "WiFi, Bluetooth"
manualUrl     String?  // URL to product manual
```

SQLite `ALTER TABLE ADD COLUMN` supports nullable columns. Prisma migration generates:
```sql
ALTER TABLE "GearItem" ADD COLUMN "modelNumber" TEXT;
ALTER TABLE "GearItem" ADD COLUMN "connectivity" TEXT;
ALTER TABLE "GearItem" ADD COLUMN "manualUrl" TEXT;
```

No data migration needed — all existing rows get NULL for the new fields.

### API Route Pattern — New Fields

The POST/PUT handlers in `app/api/gear/route.ts` and `app/api/gear/[id]/route.ts` currently use explicit field mapping (Phase 13 hardened this — no unsafe body pass-through). The new fields follow the same pattern:

```typescript
// Add to data object in both POST and PUT handlers
modelNumber:  body.modelNumber  || null,
connectivity: body.connectivity || null,
manualUrl:    body.manualUrl    || null,
```

### Grouped Filter Chips Pattern

Current GearClient uses a flat list of category chips with `activeCategory` state. The expansion adds a visual group layer. Two implementation options are within Claude's discretion:

**Option A: Inline in GearClient** — map CATEGORY_GROUPS, render group label + chips, single `activeCategory` string state unchanged.

**Option B: Separate `GroupedCategoryFilter` component** — cleaner separation, easier to test, consistent with CLAUDE.md "high cohesion, low coupling" principle.

Given GearClient is already complex (~400+ lines), Option B is recommended. It keeps GearClient under the 800-line limit after adding new fields to the GearItem interface.

### Seed Re-categorization Pattern

Each of the 9 items uses `prisma.gearItem.upsert` with `update: {}` or a partial update. The category field is in `create` only for items that haven't changed. Since these items already exist, the `update` object needs `category: 'new-value'`:

```typescript
// WRONG — current pattern for unchanged items
await prisma.gearItem.upsert({
  where: { id: 'gear-fire-extinguisher' },
  update: {},   // <-- category not updated on re-seed
  create: { ... category: 'tools' ... },
})

// CORRECT — must add category to update object
await prisma.gearItem.upsert({
  where: { id: 'gear-fire-extinguisher' },
  update: { category: 'safety' },  // <-- re-categorize existing record
  create: { ... category: 'safety' ... },
})
```

**This is a critical pitfall.** Running `npm run db:seed` on an existing database uses the `update` path, not `create`. All 9 items to re-categorize MUST have their new category added to the `update` object.

### `power.ts` Exclusion List — Required Update

Current exclusion list at line 272:
```typescript
!['shelter', 'sleep', 'clothing', 'hygiene', 'cook'].includes(i.category)
```

After expansion, 8 new categories exist. Non-electrical categories (lighting, furniture, safety, navigation, hiking, dog) should NOT be power consumers by default. The updated list should exclude all non-electrical categories:

```typescript
// Proposed update — exclude categories that don't draw power
!['shelter', 'sleep', 'clothing', 'cook', 'hydration', 'furniture',
  'navigation', 'hiking', 'dog', 'safety'].includes(i.category)
```

Note: `lighting` and `electronics` CAN draw power (keep as consumers). `tools` was already included as a consumer. `vehicle` was already included. This keeps the existing consumer behavior for tools/vehicle while correctly excluding camping supply categories.

### Anti-Patterns to Avoid

- **Don't use TypeScript `enum` for CategoryValue:** CLAUDE.md conventions + project TS rules prefer string literal unions over enums. Current project uses no enums.
- **Don't pass CATEGORIES as a prop to GearForm from GearClient:** GearForm should import directly from `lib/gear-categories.ts`. GearForm currently receives `categories` as a prop from GearClient — this indirection is unnecessary once the shared module exists. The prop interface can be simplified or removed.
- **Don't forget `description` field in seed upsert:** The `create` object has `description` for some items. When only adding `category` to `update`, don't accidentally drop description on re-seed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Prisma schema migration | Manual SQL ALTER TABLE | `npm run db:migrate` (prisma migrate dev) | Prisma generates and tracks migration files automatically |
| Category lookup performance | Binary search or Map() | Plain `Object.fromEntries` Record | 15 items — O(1) property lookup is sufficient and simple |
| Grouped filter chip state | Complex reducer | Single `activeCategory: string \| null` useState | A single active category is all that's needed; group headers are display-only |

---

## Runtime State Inventory

This phase renames category strings for 9 existing gear items via seed re-run. It also adds 8 new category values to constants.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `dev.db` GearItem rows with category values 'tools' (for fairy lights, wall sconces, flood lights, camp table, Helinox Chair, fire extinguisher, first aid kit, water pump) and 'tools' (for Garmin inReach) | Re-run `npm run db:seed` with updated `update` objects — OR run a manual migration SQL. Seed re-run is the standard path but requires `update` objects to include `category`. |
| Live service config | None — no external services store category strings | None |
| OS-registered state | None | None |
| Secrets/env vars | None — category strings are not secrets | None |
| Build artifacts | None — no compiled artifacts reference category strings | None |

**Key risk:** The 9 items in `dev.db` currently have `category: 'tools'`. A seed re-run with only `create`-side changes will NOT update existing records. The `update` object in each `upsert` call must explicitly set the new category.

---

## Common Pitfalls

### Pitfall 1: Seed `update: {}` Doesn't Re-categorize Existing Items
**What goes wrong:** Developer updates category in `create` block of `gearItem.upsert` but leaves `update: {}`. Running `npm run db:seed` on an existing database skips the `create` path entirely — existing items keep old categories.
**Why it happens:** Prisma upsert `update` is applied when the record already exists. Empty update object = no change.
**How to avoid:** For all 9 re-categorized items, add `update: { category: 'new-value' }` to the upsert.
**Warning signs:** After seeding, querying `prisma.gearItem.findMany({ where: { category: 'lighting' } })` returns 0 results.

### Pitfall 2: GearForm Props Interface Mismatch After Removing `categories` Prop
**What goes wrong:** If GearForm switches to importing directly from `lib/gear-categories.ts` instead of receiving `categories` as a prop, GearClient still passes the prop and TypeScript will warn about an unused prop (or if the prop is removed from GearFormProps, callers will error).
**Why it happens:** Component interface and callsite must be updated atomically.
**How to avoid:** In the same task that removes the prop from GearFormProps, remove the prop from all GearForm callsites in GearClient.
**Warning signs:** TypeScript compile error: "Type '{ categories: ... }' is not assignable to type 'GearFormProps'".

### Pitfall 3: `power.ts` Exclusion List Misses New Categories
**What goes wrong:** New non-electrical categories (furniture, safety, navigation, hiking, dog) are not excluded from power consumers. Will's power budget shows a camp table drawing watts.
**Why it happens:** `power.ts` has a hardcoded exclusion list that was not updated when categories changed.
**How to avoid:** Update the exclusion array at line 272 of `power.ts` to include the new non-electrical categories.
**Warning signs:** Power budget API returns items like "Helinox Chair" as power consumers.

### Pitfall 4: Agent Tool Description Strings Not Updated
**What goes wrong:** `gear.ts` and `listGear.ts` tool descriptions still say "Filter by category: shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc". Claude's agent will pass old category values when filtering gear.
**Why it happens:** Tool schema descriptions are free-text strings, not imported from the shared module.
**How to avoid:** Update the `description` string in both tool schemas to list all 15 new categories. Consider generating the string from `CATEGORIES.map(c => c.value).join(', ')` to keep it auto-updated.
**Warning signs:** Agent returns empty results when filtering by 'lighting' or 'furniture' because the agent doesn't know these categories exist.

### Pitfall 5: GearItem Interface in Multiple Files Not Updated
**What goes wrong:** Several files define their own local `interface GearItem` with the current fields (GearClient.tsx, GearForm.tsx, lib/power.ts, lib/claude.ts). After adding schema fields, these local interfaces must include `modelNumber`, `connectivity`, `manualUrl` or TypeScript will complain when the API returns the new fields.
**Why it happens:** The project uses local interface definitions rather than a shared type. This is intentional per the existing pattern.
**How to avoid:** Update the `GearItem` interface in each file that renders or processes gear items from the API. At minimum: GearClient.tsx, GearForm.tsx.
**Warning signs:** TypeScript error "Property 'modelNumber' does not exist on type 'GearItem'" in any component file.

---

## Code Examples

### Shared Module Structure (lib/gear-categories.ts)

```typescript
// Source: project conventions — lib/gear-categories.ts (NEW)

export type CategoryValue =
  | 'shelter' | 'sleep' | 'cook' | 'hydration' | 'clothing'
  | 'lighting' | 'tools' | 'safety' | 'furniture'
  | 'power' | 'electronics' | 'vehicle'
  | 'navigation' | 'hiking' | 'dog'

export interface Category {
  value: CategoryValue
  label: string
  emoji: string
}

export interface CategoryGroup {
  name: string
  categories: Category[]
}

export const CATEGORY_GROUPS: CategoryGroup[] = [
  {
    name: 'Living',
    categories: [
      { value: 'shelter',   label: 'Shelter',   emoji: '⛺' },
      { value: 'sleep',     label: 'Sleep',     emoji: '🛏️' },
      { value: 'cook',      label: 'Cook',      emoji: '🍳' },
      { value: 'hydration', label: 'Hydration', emoji: '💧' },
      { value: 'clothing',  label: 'Clothing',  emoji: '🧥' },
    ],
  },
  {
    name: 'Utility',
    categories: [
      { value: 'lighting',  label: 'Lighting',  emoji: '💡' },
      { value: 'tools',     label: 'Tools',     emoji: '🔧' },
      { value: 'safety',    label: 'Safety',    emoji: '🛟' },
      { value: 'furniture', label: 'Furniture', emoji: '🪑' },
    ],
  },
  {
    name: 'Tech/Power',
    categories: [
      { value: 'power',       label: 'Power',       emoji: '🔋' },
      { value: 'electronics', label: 'Electronics', emoji: '📡' },
      { value: 'vehicle',     label: 'Vehicle',     emoji: '🚙' },
    ],
  },
  {
    name: 'Action',
    categories: [
      { value: 'navigation', label: 'Navigation', emoji: '🧭' },
      { value: 'hiking',     label: 'Hiking',     emoji: '🥾' },
      { value: 'dog',        label: 'Dog',        emoji: '🐕' },
    ],
  },
]

export const CATEGORIES: Category[] =
  CATEGORY_GROUPS.flatMap((g) => g.categories)

export const CATEGORY_EMOJI: Record<string, string> =
  Object.fromEntries(CATEGORIES.map((c) => [c.value, c.emoji]))

export function getCategoryEmoji(category: string): string {
  return CATEGORY_EMOJI[category] ?? '📦'
}

export function getCategoryLabel(category: string): string {
  return CATEGORIES.find((c) => c.value === category)?.label ?? category
}
```

### Replacing Local CATEGORY_EMOJI in DashboardClient

```typescript
// BEFORE (DashboardClient.tsx lines 33-41)
const CATEGORY_EMOJI: Record<string, string> = {
  shelter: '⛺', sleep: '🛏️', cook: '🍳',
  power: '🔋', clothing: '🧥', tools: '🔧', vehicle: '🚙',
}

// AFTER
import { getCategoryEmoji } from '@/lib/gear-categories'
// Then use getCategoryEmoji(item.category) at callsite
```

### Replacing Local CATEGORY_EMOJIS in claude.ts

```typescript
// BEFORE (claude.ts lines 25-37)
const CATEGORY_EMOJIS: Record<string, string> = { ... }

// AFTER
import { CATEGORY_EMOJI } from '@/lib/gear-categories'
// Reference CATEGORY_EMOJI[category] ?? '📦' at callsites
```

### Seed Upsert Pattern for Re-categorization

```typescript
// CORRECT: Both update and create set the new category
await prisma.gearItem.upsert({
  where: { id: 'gear-fire-extinguisher' },
  update: { category: 'safety' },      // <-- applies to existing records
  create: {
    id: 'gear-fire-extinguisher',
    name: 'AmzBoom Fire Extinguisher Spray (2-pack)',
    category: 'safety',                 // <-- applies to new records
    // ... rest of fields
  },
})
```

### GearForm New Fields

```typescript
// New fields to add to GearForm — optional, shown for all categories
// (description says "for tech gear" but showing always keeps form simple)

{/* Model Number */}
<div>
  <label htmlFor="gear-modelNumber" ...>Model Number</label>
  <input
    id="gear-modelNumber"
    name="modelNumber"
    type="text"
    defaultValue={item?.modelNumber ?? ''}
    placeholder="e.g. ESP32-WROOM-32"
    ...
  />
</div>

{/* Connectivity */}
<div>
  <label htmlFor="gear-connectivity" ...>Connectivity</label>
  <input
    id="gear-connectivity"
    name="connectivity"
    type="text"
    defaultValue={item?.connectivity ?? ''}
    placeholder="e.g. WiFi, Bluetooth"
    ...
  />
</div>

{/* Manual URL */}
<div>
  <label htmlFor="gear-manualUrl" ...>Manual URL</label>
  <input
    id="gear-manualUrl"
    name="manualUrl"
    type="url"
    defaultValue={item?.manualUrl ?? ''}
    placeholder="https://..."
    ...
  />
</div>
```

---

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — all work is TypeScript/React/Prisma within the existing project stack)

---

## Validation Architecture

Nyquist validation is enabled (`workflow.nyquist_validation: true`).

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts at root) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GEAR-CAT-01 | `lib/gear-categories.ts` exports CATEGORIES, CATEGORY_GROUPS, CATEGORY_EMOJI, getCategoryEmoji, getCategoryLabel | unit | `npx vitest run tests/gear-categories.test.ts` | ❌ Wave 0 |
| GEAR-CAT-02 | 15 categories across 4 groups with correct values and emojis | unit | `npx vitest run tests/gear-categories.test.ts` | ❌ Wave 0 |
| GEAR-CAT-03 | GearClient grouped filter chips render | manual-only | Visual inspection — React component with Tailwind | N/A |
| GEAR-CAT-04 | GearForm includes modelNumber, connectivity, manualUrl fields | manual-only | Visual inspection of form | N/A |
| GEAR-CAT-05 | Prisma migration adds fields | integration | `npm run db:migrate && npx vitest run tests/gear-schema.test.ts` | ❌ Wave 0 |
| GEAR-CAT-06 | Seed re-categorizes 9 items correctly | integration | `npm run db:seed && npx vitest run tests/gear-schema.test.ts` | ❌ Wave 0 |
| GEAR-CAT-07 | No local CATEGORIES/CATEGORY_EMOJI/CATEGORY_EMOJIS constants remain outside gear-categories.ts | unit (grep) | `npx vitest run tests/gear-categories.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/gear-categories.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/gear-categories.test.ts` — covers GEAR-CAT-01, GEAR-CAT-02, GEAR-CAT-07
- [ ] `tests/gear-schema.test.ts` — covers GEAR-CAT-05, GEAR-CAT-06 (schema fields present, seed categories correct)

---

## Open Questions

1. **Should GearForm show new fields always or only for Tech/Power categories?**
   - What we know: CONTEXT.md says "for tech gear" but doesn't mandate conditional display
   - What's unclear: Whether showing modelNumber/connectivity on a sleeping bag feels weird to Will
   - Recommendation: Show always (simpler implementation, no category-watching logic); the fields are optional so they stay blank for non-tech gear

2. **Should `power.ts` CATEGORY_FALLBACK be expanded with new categories?**
   - What we know: Current CATEGORY_FALLBACK only covers `tools` and `power` (lines 137-140)
   - What's unclear: Whether `electronics` and `lighting` should have fallback wattage estimates
   - Recommendation: Add `electronics: { watts: 5, hoursPerDay: 4 }` and `lighting: { watts: 10, hoursPerDay: 6 }` as reasonable fallbacks for the power budget calculator

3. **Should agent tool description strings be auto-generated or hand-maintained?**
   - What we know: Both `gear.ts` and `listGear.ts` have hardcoded category lists in description strings
   - What's unclear: Whether Claude the agent will misfire if it sees a too-long string of 15 category names
   - Recommendation: Generate the string from `CATEGORIES.map(c => c.value).join(', ')` — auto-keeps in sync with future expansions

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection: `components/GearClient.tsx` — current CATEGORIES constant (7 items, lines 28-36)
- Direct code inspection: `lib/claude.ts` — CATEGORY_EMOJIS (lines 25-37)
- Direct code inspection: `components/DashboardClient.tsx` — CATEGORY_EMOJI (lines 33-41)
- Direct code inspection: `lib/power.ts` — CATEGORY_FALLBACK (lines 137-140), exclusion list (line 272)
- Direct code inspection: `lib/agent/tools/gear.ts` — category description string (line 10)
- Direct code inspection: `lib/agent/tools/listGear.ts` — category description string (line 12)
- Direct code inspection: `prisma/schema.prisma` — GearItem model (lines 10-31)
- Direct code inspection: `prisma/seed.ts` — all 9 items to re-categorize identified
- Direct code inspection: `app/api/gear/route.ts` and `[id]/route.ts` — current field mapping
- Direct code inspection: `components/GearForm.tsx` — current form structure and props interface
- `.planning/phases/23-gear-category-expansion/23-CONTEXT.md` — all locked decisions
- `.planning/REQUIREMENTS.md` — GEAR-CAT-01 through GEAR-CAT-07

### Secondary (MEDIUM confidence)
- Prisma SQLite migration behavior: adding optional (nullable) fields generates `ALTER TABLE ADD COLUMN` — verified by project's existing migrations pattern and Prisma documentation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all existing libraries well-understood
- Architecture: HIGH — patterns verified from direct code inspection
- Pitfalls: HIGH — seed upsert pitfall and power.ts exclusion list verified from reading source
- Shared module design: HIGH — TypeScript type patterns consistent with project conventions

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack, no fast-moving dependencies)
