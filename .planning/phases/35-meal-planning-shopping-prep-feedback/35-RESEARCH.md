# Phase 35: Meal Planning — Shopping, Prep & Feedback — Research

**Researched:** 2026-04-03
**Domain:** Next.js App Router / Prisma / Claude AI / React client components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Feedback UX**
- D-01: Rating buttons are always visible on meal cards — no trip-end gate, no state machine.
- D-02: Interaction is 👍 / 👎 + optional note textarea. Tapping either thumb reveals textarea. Fast and phone-friendly.
- D-03: Per-meal only — no whole-plan rating. mealId is always set on MealFeedback rows.

**Shopping List**
- D-04: On-demand generate — "Generate Shopping List" button in the Shopping tab. Regenerate button appears after first generation.
- D-05: All items start unchecked when first generated.
- D-06: Copy to clipboard (plain text) button in the Shopping tab header.
- D-07: When the meal plan is regenerated, re-generate the shopping list but preserve checked=true for items whose name matches (case-insensitive). New items unchecked. Dropped items deleted. No confirm dialog.

**Prep Guide**
- D-08: On-demand, separate "Generate Prep Guide" button in the Prep tab.
- D-09: Lives in a separate "Prep" tab inside MealPlanClient. Tab structure: Plan / Shopping / Prep.

**Dashboard Card**
- D-10: Shows status + action nudge for the soonest upcoming trip: trip name + one-line status. Tapping navigates to TripPrepClient meals tab.
- D-11: Shows soonest upcoming trip only.

### Claude's Discretion
- Exact shopping list plain-text format for clipboard
- Prep guide tab empty state copy when no guide has been generated
- Feedback button placement within each meal card (bottom-right vs inline below description)
- Exact Tailwind styling — follow existing MealPlanClient card patterns

### Deferred Ideas (OUT OF SCOPE)
- Syncing shopping list to Instacart/AnyList
- Sharing shopping list externally (beyond copy-to-clipboard)
- Pre-checking items Will already owns (gear inventory cross-reference)
- Whole-plan rating (mealId = null entries) — no UI entry point
- Dietary restriction fields
- ML/embedding-based feedback
</user_constraints>

---

<phase_requirements>
## Phase Requirements

No pre-assigned requirement IDs. Requirements derive from CONTEXT.md decisions and V2-SESSIONS.md S12 spec.

| ID | Description | Research Support |
|----|-------------|------------------|
| SHOP-01 | ShoppingListItem model in schema + migration | Prisma model analysis; pattern: Meal model with mealPlanId FK |
| SHOP-02 | GET/POST/PATCH /api/trips/[id]/meal-plan/shopping-list | API route pattern from meal-plan/route.ts |
| SHOP-03 | PATCH/DELETE /shopping-list/[itemId] | Per-item routes follow [itemId] pattern from meals/[mealId] |
| SHOP-04 | generateShoppingList() in lib/claude.ts | Claude JSON parse pattern fully established |
| SHOP-05 | ShoppingListClient component with checkboxes + copy-to-clipboard | React state + navigator.clipboard API |
| SHOP-06 | Checked state preserved on meal plan regeneration (name match, case-insensitive) | Merge logic in POST /shopping-list handler |
| PREP-01 | prepGuide JSON field on MealPlan + migration | Single JSON column; same pattern as packingListResult on Trip |
| PREP-02 | generatePrepGuide() in lib/claude.ts | Structured JSON output, same parseClaudeJSON<T>() pattern |
| PREP-03 | POST /api/trips/[id]/meal-plan/prep-guide and GET via main meal-plan GET | RESTful sub-route pattern |
| PREP-04 | PrepGuideClient component: before/at-camp sections | New component, tabbed within MealPlanClient |
| FEED-01 | MealFeedback model in schema + migration | Append-only, @@index not @unique (same as TripFeedback) |
| FEED-02 | POST/GET /api/trips/[id]/meal-plan/feedback | Standard CRUD route pattern |
| FEED-03 | MealFeedbackButton component (👍/👎 + textarea) | Inline React state; revealed on tap |
| FEED-04 | generateMealPlan() updated with feedback history injection | Last 10 MealFeedback records queried in generate route |
| DASH-01 | Dashboard card shows meal plan status for soonest upcoming trip | app/page.tsx query extended; DashboardClient prop added |
| TABS-01 | MealPlanClient refactored to Plan / Shopping / Prep tabs | Tab state in client component |
</phase_requirements>

---

## Summary

Phase 35 extends the Phase 34 meal planning system with three additive features: a shopping list with persistent checkbox state, an on-demand prep guide, and a per-meal feedback loop that injects history into future generation prompts. All three features follow patterns already established in the codebase — Prisma models, RESTful per-trip routes, `parseClaudeJSON<T>()` for Claude responses, and client-side state with on-demand generation buttons.

The primary implementation surfaces are: two new Prisma models (`ShoppingListItem`, `MealFeedback`), one new field on `MealPlan` (`prepGuide JSON`), four new API route files, three new React components (`ShoppingListClient`, `PrepGuideClient`, `MealFeedbackButton`), modifications to `MealPlanClient.tsx` (tab structure + feedback buttons), `lib/claude.ts` (three new/updated functions), and `app/page.tsx` + `DashboardClient.tsx` (meal plan status card).

The feedback injection pattern is straightforward: the generate route queries the last 10 `MealFeedback` records across all trips before calling `generateMealPlan()`, and the function signature gains an optional `mealHistory` string parameter that gets injected into the system prompt.

**Primary recommendation:** Plan four implementation waves — (0) schema + stubs, (1) shopping list API + component, (2) prep guide + feedback API + components, (3) dashboard card + MealPlanClient tabs wiring. This matches the dependency order: schema first, then the APIs, then UI, then dashboard.

---

## Standard Stack

### Core (all already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | ORM for new ShoppingListItem/MealFeedback models | Already the project ORM |
| @anthropic-ai/sdk | 0.80.0 | generateShoppingList, generatePrepGuide, updated generateMealPlan | Already wired in lib/claude.ts |
| Zod | (via existing) | Schema validation for new Claude response shapes | parseClaudeJSON<T>() pattern already established |
| React 19 | 19.2.4 | New client components (ShoppingListClient, PrepGuideClient, MealFeedbackButton) | Project standard |
| Next.js | 16.2.1 | New API routes under app/api/trips/[id]/meal-plan/ | Project standard |

### No New Packages Required

All functionality is achievable with existing dependencies:
- Checkbox persistence: Prisma + existing API routes
- Copy to clipboard: `navigator.clipboard.writeText()` — browser native, no library needed
- Shopping list categorization: Claude call with JSON response (same parseClaudeJSON pattern)
- Tab UI: React state (`useState<'plan' | 'shopping' | 'prep'>`) + Tailwind — no tab library needed

**Installation:** None needed.

---

## Architecture Patterns

### Recommended File Structure

```
prisma/
  schema.prisma               — add ShoppingListItem + MealFeedback + MealPlan.prepGuide
  migrations/                 — new migration for Phase 35 schema additions

app/api/trips/[id]/meal-plan/
  route.ts                    — existing (GET returns prepGuide field too)
  generate/route.ts           — existing (update to inject feedback history + regenerate shopping list)
  shopping-list/
    route.ts                  — GET (fetch list), POST (generate/regenerate)
    [itemId]/route.ts         — PATCH (toggle checked), DELETE
  prep-guide/
    route.ts                  — POST (generate), GET via meal-plan route
  feedback/
    route.ts                  — GET (fetch), POST (save rating + note)

lib/
  claude.ts                   — add generateShoppingList(), generatePrepGuide(), update generateMealPlan()
  parse-claude.ts             — add ShoppingListResultSchema, PrepGuideResultSchema, MealFeedbackSchema

components/
  ShoppingListClient.tsx      — NEW: grouped ingredient list with checkboxes + copy button
  PrepGuideClient.tsx         — NEW: before-leave / at-camp step sections
  MealFeedbackButton.tsx      — NEW: inline 👍/👎 + optional textarea
  MealPlanClient.tsx          — MODIFY: add Plan/Shopping/Prep tabs; add MealFeedbackButton to meal cards

app/
  page.tsx                    — MODIFY: extend upcomingTrip query to include mealPlanGeneratedAt + shoppingListCount
  components/
    DashboardClient.tsx       — MODIFY: add meal plan status card with nudge text
```

### Pattern 1: Prisma Model Addition (ShoppingListItem)

**What:** Add new model with FK to MealPlan, create migration
**When to use:** Adding persistent state that belongs to a plan

```typescript
// Source: prisma/schema.prisma — MealPlan and Meal models as reference
model ShoppingListItem {
  id          String   @id @default(cuid())
  mealPlanId  String
  item        String
  quantity    String
  unit        String   @default("")
  category    String   @default("other") // produce/protein/dairy/dry/other
  checked     Boolean  @default(false)
  notes       String?
  createdAt   DateTime @default(now())

  mealPlan MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)

  @@index([mealPlanId])
}

model MealFeedback {
  id         String   @id @default(cuid())
  mealId     String   // always set per D-03
  mealPlanId String
  rating     String   // "liked" | "disliked" | "neutral"
  notes      String?
  createdAt  DateTime @default(now())

  meal     Meal     @relation(fields: [mealId], references: [id], onDelete: Cascade)
  mealPlan MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)

  @@index([mealPlanId])
  @@index([mealId])
  @@index([createdAt])
}
```

**MealPlan additions:**
```typescript
// Add to MealPlan model in schema.prisma
prepGuide   String?  // JSON: { beforeLeave: [{step, meals}], atCamp: [{day, mealSlot, steps}] }

// Relations to add
shoppingItems ShoppingListItem[]
feedbacks     MealFeedback[]
```

**Meal additions:**
```typescript
// Add to Meal model in schema.prisma
feedbacks MealFeedback[]
```

### Pattern 2: Shopping List API Route

**What:** POST generates list from all meal ingredients + Claude categorization, GET fetches, PATCH bulk updates checked state
**When to use:** On-demand generation with persistent state

```typescript
// Source: app/api/trips/[id]/meal-plan/generate/route.ts pattern
// POST /api/trips/[id]/meal-plan/shopping-list

// Generation logic:
// 1. Fetch MealPlan with meals (get mealPlanId from tripId)
// 2. Aggregate all meal.ingredients JSON arrays
// 3. Call generateShoppingList() → Claude categorizes + merges duplicates
// 4. Load existing ShoppingListItem rows (for checked state preservation on regenerate)
// 5. For each new item: if case-insensitive match exists with checked=true → preserve checked=true
// 6. Delete all old ShoppingListItem rows for this mealPlanId
// 7. Create new rows with merged checked states
// 8. Return new list

// PATCH /api/trips/[id]/meal-plan/shopping-list — bulk update checked states
// Body: [{ id, checked }]
// Use prisma.$transaction for atomic multi-row update
```

### Pattern 3: Feedback Injection into generateMealPlan()

**What:** Query last 10 MealFeedback records before generation, build summary string, inject into prompt
**When to use:** Every time meal plan is generated or regenerated

```typescript
// Source: lib/claude.ts buildFeedbackSection() pattern for gear feedback
// In generate route, before calling generateMealPlan():

const recentFeedback = await prisma.mealFeedback.findMany({
  orderBy: { createdAt: 'desc' },
  take: 10,
  include: { meal: { select: { name: true } } },
})

const likedMeals = recentFeedback.filter(f => f.rating === 'liked').map(f => f.meal.name)
const dislikedMeals = recentFeedback.filter(f => f.rating === 'disliked')

// Build history string for prompt injection
const mealHistorySection = buildMealHistorySection(likedMeals, dislikedMeals)

// Pass to generateMealPlan() as new optional param
await generateMealPlan({ ..., mealHistory: mealHistorySection })
```

### Pattern 4: Tab State in MealPlanClient

**What:** Client-side tab state using `useState<'plan' | 'shopping' | 'prep'>('plan')`
**When to use:** Single-component tabbed UI — no router-level tab state needed (same trip prep page)

```typescript
// Minimal tab bar pattern following existing MealPlanClient header style
type Tab = 'plan' | 'shopping' | 'prep'
const [activeTab, setActiveTab] = useState<Tab>('plan')

// Tab bar renders below the header, above the content area
// Each tab button: px-3 py-1.5 text-sm font-medium, underline or border-b-2 for active indicator
// Content: {activeTab === 'plan' && <PlanContent />}
// ShoppingListClient and PrepGuideClient receive tripId + mealPlanId as props
```

### Pattern 5: Copy to Clipboard

**What:** `navigator.clipboard.writeText()` for plain-text shopping list export
**When to use:** Shopping tab header button

```typescript
// Source: Browser API — no library needed
// Plain text format (Claude's discretion): category headers + item lines
// Example output:
// PRODUCE
// - 2 cups cherry tomatoes
// - 1 bunch cilantro
//
// PROTEIN
// - 2 ribeye steaks
// - 0.5 lb deli turkey

const handleCopyToClipboard = useCallback(async () => {
  const text = formatShoppingListAsText(items) // groups by category
  try {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  } catch {
    setError('Could not copy to clipboard')
  }
}, [items])
```

### Pattern 6: Prep Guide JSON Field

**What:** Store prep guide as JSON string on MealPlan.prepGuide
**When to use:** On-demand generation via POST /prep-guide

```typescript
// Same pattern as Trip.packingListResult (JSON blob on the parent row)
// No separate model needed — prepGuide field on MealPlan
// GET /api/trips/[id]/meal-plan already fetches MealPlan — extend to include prepGuide
// POST /api/trips/[id]/meal-plan/prep-guide generates and patches MealPlan.prepGuide

// ParsedPrepGuide shape:
interface PrepGuide {
  beforeLeave: Array<{ step: string; meals: string[] }>
  atCamp: Array<{ day: number; mealSlot: string; steps: string[] }>
}
```

### Pattern 7: Dashboard Meal Plan Status Card

**What:** Extend `app/page.tsx` upcomingTrip query to include meal plan status; DashboardClient renders nudge
**When to use:** Always — soonest upcoming trip's meal planning completeness at a glance

```typescript
// Extend app/page.tsx upcomingTrip query:
prisma.trip.findFirst({
  where: { startDate: { gte: new Date() } },
  orderBy: { startDate: 'asc' },
  select: {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    location: { select: { name: true } },
    mealPlanGeneratedAt: true,  // ADD
    mealPlan: {                  // ADD
      select: {
        _count: { select: { shoppingItems: true } }
      }
    }
  },
})

// Status logic in DashboardClient (or compute in page.tsx and pass):
// No meal plan → "No meal plan yet"
// Meal plan + 0 shopping items → "Meal plan ready — shopping list pending"
// Meal plan + shopping items, all checked → "Shopping list complete"
// Meal plan + shopping items, some unchecked → "X items left to shop"

// Dashboard card links to /trips/[id]/prep (existing TripPrepClient with meals tab)
// D-10 specifies: navigate to TripPrepClient meals tab
```

### Anti-Patterns to Avoid

- **Whole-plan MealFeedback rows:** D-03 locks mealId as always required. Never create MealFeedback with null mealId even though schema allows it.
- **Storing shopping list as JSON blob on MealPlan:** Use normalized ShoppingListItem rows so checkbox PATCH operations are per-item — no JSON merge conflicts.
- **FTS virtual table migration interference:** Phase 34 had to apply migrations manually because FTS triggers blocked `prisma migrate deploy`. New Phase 35 models (ShoppingListItem, MealFeedback, prepGuide field) are standard tables — `prisma migrate dev` should work normally. If it fails, fall back to `prisma migrate deploy` with manual migration file.
- **Importing route files at top of test files:** Follow Phase 33/34 pattern — `require()` inside `it()` bodies for TDD stubs so vite doesn't fail at compile time on missing source files.
- **alert() in components:** Use state-based inline error messages per CLAUDE.md conventions.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Shopping list categorization | Custom regex/keyword categorizer | Claude call with JSON response | Claude handles edge cases (is "olive oil" produce or pantry?), returns consistent category strings |
| Ingredient deduplication | Custom string matching merge | Claude aggregation call | "2 tbsp butter" + "1 tbsp butter" → Claude merges naturally; avoids unit conversion logic |
| Prep guide step generation | Template-based step generator | Claude with full meal context | Claude knows Will's sous vide/vacuum sealer context and can sequence prep correctly |
| Tab component library | Install headlessui/radix tabs | useState + Tailwind div/button | Project uses no UI component framework; existing MealPlanClient proves inline tabs work fine |
| Clipboard API polyfill | execCommand('copy') fallback | navigator.clipboard.writeText() | Modern browsers all support this; single-user PWA on known device |

**Key insight:** Claude does the semantic work (categorize, deduplicate, sequence). The app stores and presents Claude's structured output. This is the same pattern used throughout the project (packing list, meal plan, departure checklist, vehicle checklist).

---

## Common Pitfalls

### Pitfall 1: Shopping List Re-generation Drops Checked State

**What goes wrong:** When the meal plan is regenerated (D-07), the shopping list is also regenerated. Naively deleting all ShoppingListItem rows and creating new ones loses the checked=true state the user set while shopping.

**Why it happens:** The generation flow creates new items; old item IDs no longer exist.

**How to avoid:** Before deleting old rows, build a Set of item names where checked=true (case-insensitive). When creating new rows, check if new item name matches any name in the set — if so, create with checked=true. Then delete old rows and insert new ones.

**Warning signs:** If a test doesn't verify that checked state is preserved after regeneration, this will be caught late.

### Pitfall 2: MealFeedback.mealId Deletion Cascade

**What goes wrong:** If a Meal row is deleted (e.g., during plan regeneration via `deleteMany`), and MealFeedback has `onDelete: Cascade`, all feedback for regenerated meals is silently deleted.

**Why it happens:** Plan regeneration in generate/route.ts calls `tx.meal.deleteMany()` and re-creates all Meal rows. New Meal rows get new IDs. Old MealFeedback rows with old mealIds get cascade-deleted.

**How to avoid:** In the schema, consider `onDelete: SetNull` on MealFeedback.mealId — but D-03 says mealId is always set (not nullable). Instead: on plan regeneration, do NOT delete old MealFeedback rows. They reference the old meal IDs but their notes and ratings are still valid history for future prompt injection. The feedback history query uses `take: 10, orderBy: createdAt desc` across all trips — old feedback is still valuable even if the Meal row it references is gone.

**Resolution:** Add `onDelete: Restrict` on MealFeedback → Meal relation, OR make mealId nullable in schema (for future flexibility) but keep UI always setting it. Simplest: `onDelete: NoAction` on MealFeedback.mealId FK — feedback is historical, keep it even if meal is deleted. Alternatively, store mealName as a denormalized field on MealFeedback so the history is readable even after the Meal row is gone.

**Recommendation:** Denormalize `mealName String` on MealFeedback. This way, the feedback history prompt builder doesn't need a JOIN and works even after meal regeneration.

### Pitfall 3: FTS Migration Interference (from Phase 34)

**What goes wrong:** Phase 34 noted that `prisma migrate deploy` was blocked by FTS virtual table triggers. This was a one-time issue from FTS table creation.

**Why it happens:** SQLite FTS triggers don't play well with Prisma migration transaction wrapping.

**How to avoid:** Run `npx prisma migrate dev --name phase-35-shopping-feedback` first. If it fails due to FTS interference, create the migration SQL file manually and apply with `npx prisma migrate deploy`. The new models (ShoppingListItem, MealFeedback, field additions) are standard tables — this is unlikely to recur but worth checking.

### Pitfall 4: Tab State Lost on Prop Changes

**What goes wrong:** If MealPlanClient receives new `mealPlan` prop data (e.g., after generate), the active tab resets to 'plan' unexpectedly.

**Why it happens:** If tab state is computed from or reset alongside meal plan state.

**How to avoid:** Keep `activeTab` state independent of `mealPlan` state. When `setMealPlan` is called (e.g., after generate), do NOT reset `activeTab`. Only reset to 'plan' when the entire component unmounts/remounts.

### Pitfall 5: navigator.clipboard Requires HTTPS

**What goes wrong:** `navigator.clipboard.writeText()` is only available in secure contexts (HTTPS or localhost).

**Why it happens:** Browser security model for clipboard access.

**How to avoid:** The app runs on localhost in dev and over Tailscale HTTPS in production — both are secure contexts. Add a try/catch around the clipboard call and show an inline error if it fails (follow the no-alert rule from CLAUDE.md).

### Pitfall 6: generateMealPlan() Signature Change — Backward Compatibility

**What goes wrong:** Adding `mealHistory?: string` to `generateMealPlan()` params is additive and safe — but the generate route also needs to fetch the feedback data before calling it. If the feedback query fails, it should be non-blocking (same pattern as weather fetch).

**How to avoid:** Wrap the MealFeedback query in a try/catch. If it fails, pass `mealHistory: undefined` — Claude just won't have the history context. User still gets a valid meal plan.

---

## Code Examples

### Shopping List Merge Logic (verified pattern from project)

```typescript
// Source: CONTEXT.md D-07 + project upsert patterns from generate/route.ts

async function mergeShoppingListOnRegenerate(
  mealPlanId: string,
  newItems: ShoppingListItemInput[]
): Promise<void> {
  // 1. Load existing checked item names
  const existing = await prisma.shoppingListItem.findMany({
    where: { mealPlanId, checked: true },
    select: { item: true },
  })
  const checkedNames = new Set(existing.map(e => e.item.toLowerCase()))

  // 2. Delete old items
  await prisma.shoppingListItem.deleteMany({ where: { mealPlanId } })

  // 3. Create new items with preserved checked state
  await prisma.shoppingListItem.createMany({
    data: newItems.map(ni => ({
      mealPlanId,
      item: ni.item,
      quantity: ni.quantity,
      unit: ni.unit,
      category: ni.category,
      checked: checkedNames.has(ni.item.toLowerCase()),
    })),
  })
}
```

### Feedback History Section Builder

```typescript
// Source: lib/claude.ts buildFeedbackSection() pattern for gear
// New function for meal feedback history injection

export function buildMealHistorySection(
  feedback: Array<{ mealName: string; rating: string; notes: string | null }>
): string {
  if (feedback.length === 0) return ''

  const liked = feedback.filter(f => f.rating === 'liked').map(f => f.mealName)
  const disliked = feedback.filter(f => f.rating === 'disliked')

  const lines: string[] = []
  if (liked.length > 0) {
    lines.push(`Previously liked: ${liked.join(', ')}.`)
  }
  if (disliked.length > 0) {
    const dislikedText = disliked
      .map(f => f.notes ? `${f.mealName} (${f.notes})` : f.mealName)
      .join(', ')
    lines.push(`Previously disliked: ${dislikedText}.`)
    const avoidPatterns = disliked.filter(f => f.notes).map(f => f.notes!)
    if (avoidPatterns.length > 0) {
      lines.push(`Avoid: ${avoidPatterns.join('; ')}.`)
    }
  }

  return `WILL'S MEAL HISTORY:\n${lines.join('\n')}`
}
```

### Zod Schemas for New Claude Responses

```typescript
// Source: lib/parse-claude.ts pattern — add to existing file

const ShoppingListItemResultSchema = z.object({
  item: z.string(),
  quantity: z.string(),
  unit: z.string().default(''),
  category: z.enum(['produce', 'protein', 'dairy', 'dry', 'other']).default('other'),
})

export const ShoppingListResultSchema = z.object({
  items: z.array(ShoppingListItemResultSchema),
})

const PrepStepSchema = z.object({
  step: z.string(),
  meals: z.array(z.string()).default([]),
})

const AtCampStepSchema = z.object({
  day: z.number(),
  mealSlot: z.string(),
  steps: z.array(z.string()),
})

export const PrepGuideResultSchema = z.object({
  beforeLeave: z.array(PrepStepSchema),
  atCamp: z.array(AtCampStepSchema),
})
```

### MealFeedbackButton Component Pattern

```typescript
// Source: MealPlanClient.tsx meal card pattern + project button/state conventions

// Placement: below description, above ingredients in each meal card
// State: thumbRating ('liked' | 'disliked' | null), noteOpen (bool), noteText, saving

interface MealFeedbackButtonProps {
  mealId: string
  tripId: string
  initialRating?: 'liked' | 'disliked' | 'neutral' | null
  initialNote?: string | null
}

// On 👍 or 👎 tap:
// 1. Set thumbRating state
// 2. setNoteOpen(true) — reveal textarea
// 3. POST /api/trips/[tripId]/meal-plan/feedback { mealId, rating, notes }
// 4. Show brief "Saved" confirmation, then reset noteOpen to false
```

### Dashboard Card Meal Plan Status Logic

```typescript
// Source: DashboardClient.tsx existing upcomingTrip card pattern

// Status string computation (can live in page.tsx before passing to client):
function getMealPlanStatus(trip: UpcomingTripWithMealPlan): string {
  if (!trip.mealPlanGeneratedAt) return 'No meal plan yet'
  const total = trip.mealPlan?._count?.shoppingItems ?? 0
  const checked = trip.mealPlan?._count?.checkedItems ?? 0  // need separate count or load all
  if (total === 0) return 'Meal plan ready — shopping list pending'
  if (checked === total) return 'Shopping list complete'
  return `${total - checked} items left to shop`
}

// Simplest approach: pass mealPlanGeneratedAt + shoppingListItemCount to DashboardClient
// Two-state nudge: no meal plan / meal plan exists (avoid complex checked count query at dashboard level)
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy MealPlanResult (flat shopping list in JSON) | Normalized Meal rows + ShoppingListItem rows | Phase 34/35 | Shopping list is now queryable and patchable per-item |
| Single-tab meal plan view | Plan / Shopping / Prep tabs | Phase 35 | All meal planning in one cohesive component |
| No feedback loop | MealFeedback + prompt injection | Phase 35 | Future meal plans get smarter over time |

**Deprecated:**
- The legacy `MealPlanResult.shoppingList` and `MealPlanResult.prepTimeline` arrays from the old `generateMealPlan()` return shape are still in the code but not used by the UI. Phase 35's `ShoppingListItem` rows fully replace the old `shoppingList` field. The legacy interfaces can be removed or kept as dead code — do not surface them in new UI.

---

## Open Questions

1. **MealFeedback.mealId cascade behavior on plan regeneration**
   - What we know: `deleteMany` on Meal rows during regeneration would cascade-delete MealFeedback if `onDelete: Cascade` is set.
   - What's unclear: Whether old feedback (from before regeneration) is valuable to keep linked or can be orphaned.
   - Recommendation: Denormalize `mealName` on MealFeedback, set `onDelete: SetNull` (making mealId nullable at schema level) or `onDelete: NoAction`. Per D-03, the UI always sets mealId — nullable is fine in schema for resilience. The history query uses `mealName` for prompt injection anyway.

2. **Dashboard card checked item count query cost**
   - What we know: Counting unchecked vs checked items in a Prisma query at dashboard level adds a sub-query.
   - What's unclear: Whether the two-state (meal plan exists / no meal plan) is sufficient vs. the three-state with shopping count.
   - Recommendation: Per D-10, "meal plan ready — shopping list pending" is the primary nudge. Implement two-state at dashboard (has/doesn't have meal plan) to keep the dashboard query simple. Full shopping list state lives in TripPrepClient.

---

## Environment Availability

Step 2.6: SKIPPED — This phase is code-only. No new external services, CLI tools, or runtimes. All dependencies (Prisma, Claude API, Next.js) are already installed and verified working from Phase 34.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 2.x (detected: vitest.config.ts present) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SHOP-01 | ShoppingListItem rows created with correct fields | unit | `npx vitest run tests/shopping-list-route.test.ts` | ❌ Wave 0 |
| SHOP-02 | POST /shopping-list generates items from meal ingredients | unit | `npx vitest run tests/shopping-list-route.test.ts` | ❌ Wave 0 |
| SHOP-03 | PATCH /shopping-list/[itemId] toggles checked | unit | `npx vitest run tests/shopping-list-route.test.ts` | ❌ Wave 0 |
| SHOP-06 | Checked state preserved on regeneration (case-insensitive match) | unit | `npx vitest run tests/shopping-list-route.test.ts` | ❌ Wave 0 |
| PREP-02 | generatePrepGuide() returns valid PrepGuide shape | unit | `npx vitest run tests/prep-guide-schema.test.ts` | ❌ Wave 0 |
| PREP-03 | POST /prep-guide calls generatePrepGuide and patches MealPlan.prepGuide | unit | `npx vitest run tests/prep-guide-route.test.ts` | ❌ Wave 0 |
| FEED-01 | MealFeedback rows created with mealId always set | unit | `npx vitest run tests/meal-feedback-route.test.ts` | ❌ Wave 0 |
| FEED-02 | POST /feedback saves rating + note; GET returns list | unit | `npx vitest run tests/meal-feedback-route.test.ts` | ❌ Wave 0 |
| FEED-04 | generateMealPlan() includes meal history in prompt when feedback exists | unit | `npx vitest run tests/meal-history-injection.test.ts` | ❌ Wave 0 |
| SHOP-05 | ShoppingListClient renders items grouped by category | unit (component) | `npx vitest run components/__tests__/ShoppingListClient.test.tsx` | ❌ Wave 0 |
| DASH-01 | Dashboard status text correct for no-plan vs plan-no-shopping vs complete | unit | `npx vitest run tests/dashboard-meal-status.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/` (route + schema tests only, ~5-10s)
- **Per wave merge:** `npx vitest run` (full suite including component tests)
- **Phase gate:** Full suite green + `npm run build` passes before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/shopping-list-route.test.ts` — covers SHOP-01, SHOP-02, SHOP-03, SHOP-06
- [ ] `tests/prep-guide-route.test.ts` — covers PREP-03
- [ ] `tests/prep-guide-schema.test.ts` — covers PREP-02 (Zod schema validation)
- [ ] `tests/meal-feedback-route.test.ts` — covers FEED-01, FEED-02
- [ ] `tests/meal-history-injection.test.ts` — covers FEED-04 (buildMealHistorySection unit test)
- [ ] `components/__tests__/ShoppingListClient.test.tsx` — covers SHOP-05
- [ ] `tests/dashboard-meal-status.test.ts` — covers DASH-01

All test files follow the established pattern: mock `@/lib/db` and `@/lib/claude` with `vi.mock()`, use `it.todo()` stubs in Wave 0, add implementations in subsequent waves. Route imports are commented until the source files exist (per Phase 33/34 convention).

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify:

- All API routes must have try-catch error handling with `console.error` + JSON error response
- No `alert()` — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- TypeScript throughout — no `any`, use typed interfaces for all props
- Files: 200-400 lines typical, 800 max — ShoppingListClient, PrepGuideClient, MealFeedbackButton should be separate files
- Functions: < 50 lines each
- Immutable patterns — spread operators for state updates
- Commit messages: imperative mood, concise
- TASKS.md must be updated every session
- Changelog: create `docs/changelog/session-NN.md`, add index row to `docs/CHANGELOG.md`
- STATUS.md must match latest session number
- When features are built, mark them ✅ Done in TASKS.md and FEATURE-PHASES.md immediately
- `npm run build` must pass — include as final verification step

---

## Sources

### Primary (HIGH confidence)

- `prisma/schema.prisma` — Current MealPlan + Meal model structure; ShoppingListItem/MealFeedback schemas designed to match these conventions
- `lib/claude.ts` — Full existing generateMealPlan() signature; buildFeedbackSection() pattern for history injection
- `lib/parse-claude.ts` — parseClaudeJSON<T>() utility; Zod schema patterns for new schemas
- `app/api/trips/[id]/meal-plan/generate/route.ts` — Complete generate flow including transaction pattern
- `app/api/trips/[id]/meal-plan/route.ts` — GET/DELETE patterns
- `components/MealPlanClient.tsx` — 423-line component to be extended; all card/header/state patterns
- `components/DashboardClient.tsx` — Existing upcoming trip card; interface extension points
- `app/page.tsx` — Server-side data fetching pattern; upcomingTrip query to extend
- `.planning/phases/35-meal-planning-shopping-prep-feedback/35-CONTEXT.md` — All locked decisions
- `.planning/V2-SESSIONS.md` lines 516-575 — S12 full spec

### Secondary (MEDIUM confidence)

- `tests/meal-plan-route.test.ts` — Confirmed test stub pattern (vi.mock + it.todo + require inside it)
- `vitest.config.ts` — Test include globs, jsdom environment, @/* alias
- `.planning/STATE.md` — Phase 34 decisions affecting Phase 35 (migration, normalization approach)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages; all dependencies verified installed
- Architecture: HIGH — patterns directly sourced from Phase 34 implementation files
- Schema design: HIGH — follows Prisma conventions already in schema.prisma
- Pitfalls: HIGH — cascade/deletion pitfall directly observed from Phase 34 Meal model and generate route
- Test patterns: HIGH — vitest config and existing test files confirm the pattern

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack, 30-day validity)
