# Phase 32: Deal Monitoring - Research

**Researched:** 2026-04-04
**Domain:** Claude price-check integration, Prisma schema migration, React tab/modal extension, dashboard collapsible card
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** New "Deals" tab in the gear detail modal — third tab alongside Documents + Research. Only visible for wishlist items.
- **D-02:** "Check Price" button lives inside the Deals tab, not on the gear card or Research tab.
- **D-03:** Wishlist gear cards in the list show a target price badge + a green "Deal" indicator when a price check found a price at or below target.
- **D-04:** Price check results live in the Deals tab: shows found price range, target price, deal status, last checked date, and a "Re-check" button.
- **D-05:** A "deal" is triggered when `foundPriceLow <= targetPrice`. No percentage threshold — simple rule.
- **D-06:** Dashboard surfaces a collapsible "Deals (N)" card listing all wishlist items with an active deal. Pattern mirrors "Upgrade Opportunities" section from Phase 30.
- **D-07:** Claude returns a best-guess price range from training data — no live scraping, no URL generation.
- **D-08:** Price check results include a staleness disclaimer in the UI.
- **D-09:** Staleness threshold = 30 days (shorter than the 90-day research threshold).
- **D-10:** Claude inputs: `name`, `brand`, `modelNumber`, `category`, `price` (user's purchase price if set), `targetPrice`.
- **D-11:** New `GearPriceCheck` Prisma model — one row per GearItem (overwrite on re-check). Fields: `gearItemId`, `foundPriceRange` (String), `foundPriceLow` (Float), `checkedAt`, `isAtOrBelowTarget` (Boolean).
- **D-12:** `targetPrice` added as optional Float field on `GearItem` alongside existing `price` field.

### Claude's Discretion

- Exact Claude prompt design for price checking
- How to handle items with no brand/name (graceful degradation)
- Loading state UX during price check (spinner, progress message)
- Whether to add a tab visibility toggle or always show Deals tab for all wishlist items
- GearPriceCheck model field names (beyond what's specified in D-11)

### Deferred Ideas (OUT OF SCOPE)

- Price history tracking (multiple price check records over time)
- Push notifications or email alerts for price drops
- Real-time price scraping via external API
- Price tracking for owned gear (not just wishlist)
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| HA-01 | Wishlist gear items have optional targetPrice field | Schema migration adds `targetPrice Float?` to GearItem; GearForm + API route updated |
| HA-02 | "Check Price" button triggers Claude to search current prices | New `generateGearPriceCheck` function in `lib/claude.ts` + POST `/api/gear/[id]/price-check` route |
| HA-03 | Results show current price vs target price | GearDealsTab component renders foundPriceRange vs targetPrice with deal badge |
| HA-04 | Dashboard surfaces items currently below target price | `app/page.tsx` fetches `GearPriceCheck` where `isAtOrBelowTarget = true`; DashboardClient renders collapsible Deals card |
| HA-05 | `npm run build` passes | GearClient activeTab type union extended; all new types exported from parse-claude.ts |
| HA-06 through HA-11 | (v3.0 milestone-level success criteria shared across phases) | Covered by the above 5 implementation criteria |
</phase_requirements>

## Summary

Phase 32 adds a deal-monitoring capability to wishlist gear items. The domain is well-understood and fully specified in CONTEXT.md. The implementation follows exactly the same patterns already established in Phase 30 (GearResearch) — new Prisma model, new Claude function, new API route, new tab component, and a dashboard collapsible card. No new libraries are required; every pattern has a working reference in the codebase.

The key technical actions are: (1) schema migration adding `targetPrice Float?` to `GearItem` and creating `GearPriceCheck` model; (2) adding `generateGearPriceCheck` to `lib/claude.ts` and `GearPriceCheckResultSchema` to `lib/parse-claude.ts`; (3) creating `/api/gear/[id]/price-check` route mirroring the research route; (4) adding a "Deals" third tab in `GearClient` (wishlist-only) powered by a `GearDealsTab` component; (5) surfacing active deals on the dashboard with a collapsible card.

The staleness threshold (30 days vs. 90 days for research) and the deal detection rule (`foundPriceLow <= targetPrice`) are both simple — they map to a single comparison at check time and a stored boolean, eliminating any complex real-time query.

**Primary recommendation:** Mirror Phase 30 code exactly. Every structural decision (upsert on re-check, fetch-on-mount, staleness badge, collapsible surface) is already battle-tested.

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | Schema migration + ORM | Already in use; `@unique` on gearItemId for one-to-one |
| @anthropic-ai/sdk | 0.80.0 | Claude API call for price check | Project standard; same client as all other Claude calls |
| Zod | (via parse-claude.ts) | Schema validation for Claude output | Project standard; `GearPriceCheckResultSchema` added alongside existing schemas |
| Next.js App Router | 16.2.1 | API route + server component | Project standard |
| React | 19.2.4 | GearDealsTab client component | Project standard |
| Tailwind CSS 4 | (via PostCSS) | Styling for Deals tab UI | Project standard |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.7.0 | Icons (Tag, RefreshCw, AlertTriangle, CheckCircle) | Deal badge + stale warning icons |

**Installation:** No new packages required. All dependencies are already present.

## Architecture Patterns

### Recommended Project Structure

New files to create:

```
components/
  GearDealsTab.tsx       # Deals tab (mirrors GearResearchTab.tsx)
app/api/gear/[id]/
  price-check/
    route.ts             # GET + POST (mirrors research/route.ts)
tests/
  gear-price-check-route.test.ts   # Test file (mirrors gear-research-route.test.ts)
  gear-price-check-schema.test.ts  # Zod schema tests
```

Files to modify:

```
prisma/schema.prisma             # Add targetPrice to GearItem + GearPriceCheck model
lib/claude.ts                    # Add generateGearPriceCheck function
lib/parse-claude.ts              # Add GearPriceCheckResultSchema
components/GearClient.tsx        # Add 'deals' to activeTab union + Deals tab + deal badges + targetPrice display
components/GearForm.tsx          # Add targetPrice field (wishlist items only)
app/api/gear/[id]/route.ts       # Handle targetPrice in PUT
app/page.tsx                     # Fetch active deals for dashboard
components/DashboardClient.tsx   # Add collapsible Deals card
```

### Pattern 1: GearPriceCheck Schema (follows GearResearch exactly)

**What:** One-to-one model per GearItem with `@unique` on `gearItemId`. Upsert on re-check, no history.
**When to use:** Any AI-generated result stored per gear item.

```prisma
// Source: prisma/schema.prisma — GearResearch model (reference pattern)
model GearPriceCheck {
  id               String   @id @default(cuid())
  gearItemId       String   @unique
  foundPriceRange  String   // e.g. "$89–109"
  foundPriceLow    Float    // lower bound for deal comparison
  checkedAt        DateTime @default(now())
  isAtOrBelowTarget Boolean
  createdAt        DateTime @default(now())

  gearItem GearItem @relation(fields: [gearItemId], references: [id], onDelete: Cascade)
}
```

Add to `GearItem`:
```prisma
targetPrice  Float?   // optional target price for deal monitoring
priceCheck   GearPriceCheck?
```

### Pattern 2: Claude Function (follows generateGearResearch exactly)

**What:** Server-side function in `lib/claude.ts`, calls Anthropic API, returns parsed + validated result.
**When to use:** Any new Claude capability.

```typescript
// Source: lib/claude.ts — generateGearResearch (reference pattern)
export async function generateGearPriceCheck(params: {
  name: string;
  brand: string | null;
  modelNumber: string | null;
  category: string;
  price: number | null;
  targetPrice: number | null;
}): Promise<GearPriceCheckResult> {
  // Build item description, call anthropic.messages.create, parse with parseClaudeJSON
}
```

Expected Claude JSON output shape:
```json
{
  "foundPriceRange": "$89–109",
  "foundPriceLow": 89.0,
  "foundPriceHigh": 109.0,
  "retailers": ["REI", "Amazon", "outdoor retailers"],
  "disclaimer": "Prices based on Claude's training data — may be outdated."
}
```

### Pattern 3: API Route (follows research/route.ts exactly)

**What:** GET returns stored price check (404 if none), POST triggers Claude call and upserts result.

```typescript
// Source: app/api/gear/[id]/research/route.ts (reference pattern)
// GET /api/gear/[id]/price-check
// POST /api/gear/[id]/price-check
```

The upsert stores `foundPriceRange`, `foundPriceLow`, `checkedAt`, and `isAtOrBelowTarget` (computed as `result.foundPriceLow <= item.targetPrice`).

**Deal check logic at upsert time:**
```typescript
const isAtOrBelowTarget = item.targetPrice != null
  ? result.foundPriceLow <= item.targetPrice
  : false;
```

### Pattern 4: GearDealsTab Component (follows GearResearchTab exactly)

**What:** Client component that fetches on mount, shows stale warning (30 days), Check Price button, results card.

Key differences from GearResearchTab:
- Props: `gearItemId`, `gearName`, `targetPrice` (Float | null)
- Stale threshold: 30 days (not 90)
- No "verdict" badge — shows deal status badge instead (green "Deal!" vs. grey "No deal yet")
- Shows: foundPriceRange, targetPrice, deal status, checkedAt, disclaimer text
- Only rendered when `item.isWishlist === true`

```typescript
// Source: components/GearResearchTab.tsx (reference pattern)
const STALE_DAYS = 30  // override from GearResearchTab's 90

interface GearDealsTabProps {
  gearItemId: string
  gearName: string
  targetPrice: number | null
}
```

### Pattern 5: Tab Extension in GearClient

**What:** Add 'deals' to the activeTab union, add Deals tab button (visible only for wishlist items), render GearDealsTab when active.

```typescript
// Source: components/GearClient.tsx line 79 (reference)
// Change:
const [activeTab, setActiveTab] = useState<'documents' | 'research'>('documents')
// To:
const [activeTab, setActiveTab] = useState<'documents' | 'research' | 'deals'>('documents')
```

The Deals tab button is only rendered when `editingItem?.isWishlist === true`. Reset `activeTab` to `'documents'` when modal opens (already done in `openEdit`/`openAdd` at lines 168/174).

### Pattern 6: Deal Badge on Wishlist Cards

**What:** Small green "Deal" badge + target price label on wishlist gear cards. Requires GearItem to carry `priceCheck` data.

The gear list page server component (`app/gear/page.tsx`) already fetches items with `findMany`. It must be extended to include the `priceCheck` relation for wishlist items, or the badge data must be passed separately.

**Recommended approach:** Include `priceCheck` in the `findMany` select for all items — same pattern as `upgradeResearch` is fetched separately. Pass `initialDeals` as a set of gearItemIds where `isAtOrBelowTarget = true`.

### Pattern 7: Dashboard Deals Card (follows Upgrade Opportunities exactly)

**What:** Collapsible card in `DashboardClient`. Fetched server-side in `app/page.tsx`. Hidden when no active deals.

```typescript
// Source: app/page.tsx + components/DashboardClient.tsx — upgradesExpanded/initialUpgrades pattern
// New prop: initialDeals: ActiveDeal[]
interface ActiveDeal {
  gearItemId: string
  gearItemName: string
  targetPrice: number
  foundPriceRange: string
}
```

Fetch in `app/page.tsx`:
```typescript
prisma.gearPriceCheck.findMany({
  where: { isAtOrBelowTarget: true },
  include: { gearItem: { select: { id: true, name: true, targetPrice: true } } },
})
```

### Pattern 8: targetPrice in GearForm

**What:** Optional number input for `targetPrice`, shown only when `isWishlist` is true (or always in the form but conditionally styled). Follows the existing `price` field pattern.

```typescript
// Source: components/GearForm.tsx lines 196-205 (price field reference)
// Add targetPrice field adjacent to price field:
targetPrice: safeParseFloat(form.get('targetPrice')),
```

### Anti-Patterns to Avoid

- **Re-parsing price strings for deal detection:** The `isAtOrBelowTarget` boolean is computed and stored at check time. Dashboard query uses this field directly — never re-parse `foundPriceRange` strings for comparison.
- **Showing Deals tab for owned gear:** The tab must be gated on `editingItem?.isWishlist === true`. Render `null` for owned items.
- **Using alert() for errors:** Follow project convention — state-based error messages, inline display.
- **Forgetting targetPrice in the PUT route:** The `app/api/gear/[id]/route.ts` PUT handler explicitly maps all fields. Add `targetPrice: safeParseFloat(body.targetPrice)` to the data object.
- **Forgetting to include targetPrice in GearClient's GearItem interface:** The local interface (line 10-31 of GearClient.tsx) must include `targetPrice: number | null` to pass it to GearDealsTab.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude output validation | Custom JSON parser | `parseClaudeJSON` + Zod schema in `parse-claude.ts` | Already handles markdown fence stripping, safeParse, error normalization |
| Staleness detection | Date arithmetic inline | Same pattern as GearResearchTab (`Date.now() - new Date(checkedAt).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000`) | Proven, readable |
| Deal comparison | Complex threshold logic | Simple `foundPriceLow <= targetPrice` stored as boolean at write time | User decided this rule; don't add percentage thresholds |
| Prisma upsert | Manual find-then-create | `prisma.gearPriceCheck.upsert({ where: { gearItemId: id }, ... })` | One operation, atomic, avoids race condition |

**Key insight:** This entire phase is an extension of Phase 30's patterns. The codebase already has every abstraction needed — the task is wiring them up for a new domain (price checking vs. research).

## Runtime State Inventory

> Not applicable — this is a greenfield addition (new schema model + new Claude function). No existing runtime state references "price check" data, and there is no rename/refactor involved.

## Common Pitfalls

### Pitfall 1: activeTab union not extended in GearClient
**What goes wrong:** TypeScript error `Type '"deals"' is not assignable to type '"documents" | "research"'` at build time.
**Why it happens:** The union type on line 79 of GearClient.tsx is narrow.
**How to avoid:** Update the union to `'documents' | 'research' | 'deals'` in the same edit as adding the Deals tab button.
**Warning signs:** Build fails with type error on `setActiveTab('deals')`.

### Pitfall 2: targetPrice not propagated to GearClient's local GearItem interface
**What goes wrong:** `editingItem.targetPrice` is undefined in the modal, so GearDealsTab receives `undefined` instead of `null`.
**Why it happens:** GearClient defines its own `GearItem` interface (not importing from Prisma) — it must be manually kept in sync with the schema.
**How to avoid:** Add `targetPrice: number | null` to the GearItem interface in GearClient.tsx, and include it in `initialItems` serialization in `app/gear/page.tsx`.
**Warning signs:** TypeScript shows no error (field is just missing), but tab passes wrong value silently.

### Pitfall 3: targetPrice not in PUT route data mapping
**What goes wrong:** User sets a target price, saves the gear item — but `targetPrice` is silently dropped because the PUT route doesn't include it in the `data` object.
**Why it happens:** `app/api/gear/[id]/route.ts` explicitly maps each field (per Phase 13 fix for safe field mapping). New fields must be added manually.
**How to avoid:** Add `targetPrice: safeParseFloat(body.targetPrice)` to the PUT data object.
**Warning signs:** Target price disappears after saving; no error shown.

### Pitfall 4: isAtOrBelowTarget computed with null targetPrice
**What goes wrong:** If `item.targetPrice` is null, the comparison `foundPriceLow <= null` evaluates oddly (NaN in JS comparisons).
**Why it happens:** `targetPrice` is optional — items may not have one set.
**How to avoid:** Guard in the route: `const isAtOrBelowTarget = item.targetPrice != null ? result.foundPriceLow <= item.targetPrice : false`. Store false when no target is set.
**Warning signs:** Dashboard shows deal badges for items with no target price.

### Pitfall 5: Deals tab visible for owned gear
**What goes wrong:** Owned gear items show a Deals tab that has no meaningful content (deal monitoring is wishlist-only per D-01).
**Why it happens:** Tab visibility not gated on `editingItem?.isWishlist`.
**How to avoid:** Only render the Deals tab button when `editingItem?.isWishlist === true`.
**Warning signs:** Users open owned gear and see an empty Deals tab.

### Pitfall 6: Dashboard fetch missing relation include
**What goes wrong:** `page.tsx` fetches `gearPriceCheck` rows but can't access `gearItem.name` or `gearItem.targetPrice` because `include` is missing.
**Why it happens:** Prisma returns only scalar fields by default without explicit include.
**How to avoid:** Use `include: { gearItem: { select: { id: true, name: true, targetPrice: true } } }` in the dashboard fetch.

## Code Examples

Verified patterns from existing source files:

### Zod Schema (parse-claude.ts pattern)

```typescript
// Source: lib/parse-claude.ts lines 219-236 (GearResearchResultSchema)
export const GearPriceCheckResultSchema = z.object({
  foundPriceRange: z.string(),        // e.g. "$89–109"
  foundPriceLow: z.coerce.number(),   // lower bound
  foundPriceHigh: z.coerce.number().optional(),
  retailers: z.array(z.string()).default([]),
  disclaimer: z.string(),
});

export type GearPriceCheckResult = z.infer<typeof GearPriceCheckResultSchema>;
```

### API Route Upsert (price-check/route.ts pattern)

```typescript
// Source: app/api/gear/[id]/research/route.ts lines 47-61 (reference)
const isAtOrBelowTarget = item.targetPrice != null
  ? result.foundPriceLow <= item.targetPrice
  : false;

const saved = await prisma.gearPriceCheck.upsert({
  where: { gearItemId: id },
  create: {
    gearItemId: id,
    foundPriceRange: result.foundPriceRange,
    foundPriceLow: result.foundPriceLow,
    checkedAt: new Date(),
    isAtOrBelowTarget,
  },
  update: {
    foundPriceRange: result.foundPriceRange,
    foundPriceLow: result.foundPriceLow,
    checkedAt: new Date(),
    isAtOrBelowTarget,
  },
});
```

### Staleness Check (GearDealsTab pattern)

```typescript
// Source: components/GearResearchTab.tsx line 127-129 (reference, 90 days)
const STALE_DAYS = 30  // Phase 32 uses 30 days per D-09
const isStale = priceCheck?.checkedAt
  ? Date.now() - new Date(priceCheck.checkedAt).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
  : false
```

### GearClient activeTab Extension

```typescript
// Source: components/GearClient.tsx line 79 (current)
const [activeTab, setActiveTab] = useState<'documents' | 'research'>('documents')
// Change to:
const [activeTab, setActiveTab] = useState<'documents' | 'research' | 'deals'>('documents')
```

### Dashboard Deals Fetch (app/page.tsx)

```typescript
// Source: app/page.tsx lines 5-36 (reference — Promise.all pattern)
// Add to the Promise.all array:
prisma.gearPriceCheck.findMany({
  where: { isAtOrBelowTarget: true },
  include: {
    gearItem: {
      select: { id: true, name: true, targetPrice: true }
    }
  }
})
```

### Claude Prompt Pattern (lib/claude.ts)

```typescript
// Source: lib/claude.ts lines 762-822 (generateGearResearch reference)
const prompt = `You are a camping gear price research assistant.
Given details about a gear item, return your best estimate of the current retail price range.

GEAR:
- Name: ${name}
- Brand: ${brand ?? 'Unknown'}
- Model: ${modelNumber ?? 'Unknown'}
- Category: ${category}
${price ? `- User paid: $${price}` : ''}
${targetPrice ? `- Target price: $${targetPrice}` : ''}

Return ONLY valid JSON (no markdown):
{
  "foundPriceRange": "$89–109",
  "foundPriceLow": 89.0,
  "foundPriceHigh": 109.0,
  "retailers": ["REI", "Amazon", "Backcountry"],
  "disclaimer": "Prices based on Claude's training data — may be outdated."
}`
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Inline Claude JSON parsing | `parseClaudeJSON` + Zod in `parse-claude.ts` | Phase 6 stabilization | Add new schema to parse-claude.ts, not inline |
| Flat field mapping risk | Explicit field mapping in PUT routes | Phase 13 hardening | Must add `targetPrice` explicitly to route.ts data object |
| Modal tab system | `extraContent` prop pattern with tab buttons in GearClient | Phase 30 | Deals tab uses same `extraContent` injection point |

## Environment Availability

Step 2.6: SKIPPED — this phase is code/config changes only with no new external dependencies. All required services (Anthropic API, SQLite, Next.js) are already present and in use.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (with jsdom environment) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/gear-price-check-route.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| HA-01 | targetPrice persisted via PUT | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 |
| HA-02 | POST /api/gear/[id]/price-check calls Claude, upserts result | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 |
| HA-03 | GET returns stored price check, 404 if none | unit | `npx vitest run tests/gear-price-check-route.test.ts` | ❌ Wave 0 |
| HA-04 | isAtOrBelowTarget computed correctly (null guard) | unit | `npx vitest run tests/gear-price-check-schema.test.ts` | ❌ Wave 0 |
| HA-05 | GearPriceCheckResultSchema validates Claude output | unit | `npx vitest run tests/gear-price-check-schema.test.ts` | ❌ Wave 0 |

### Sampling Rate

- **Per task commit:** `npx vitest run tests/gear-price-check-route.test.ts tests/gear-price-check-schema.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run build` passes before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `tests/gear-price-check-route.test.ts` — covers HA-01, HA-02, HA-03 (GET 200, GET 404, POST 404 on missing gear, POST calls Claude and upserts)
- [ ] `tests/gear-price-check-schema.test.ts` — covers HA-04, HA-05 (Zod schema validates valid output, rejects missing fields, isAtOrBelowTarget null guard)

## Open Questions

1. **targetPrice field visibility in GearForm**
   - What we know: Claude's discretion. The form always has `isWishlist` state.
   - What's unclear: Whether to show the field conditionally (only for wishlist) or always.
   - Recommendation: Show `targetPrice` field only when `isWishlist` is checked — hide/show dynamically based on the existing wishlist checkbox state. This matches the semantics (only wishlist items have deal monitoring) and reduces form clutter for owned gear.

2. **Deals tab for wishlist items with no targetPrice set**
   - What we know: Tab is visible for all wishlist items (D-01). targetPrice is optional.
   - What's unclear: Should "Check Price" still work with no target price set?
   - Recommendation: Yes — allow price check regardless. Show "No target price set" note next to the result, but don't disable the Check Price button. The deal badge simply won't appear (isAtOrBelowTarget will be false). This allows price discovery before setting a target.

3. **Deal badge data on gear list**
   - What we know: Wishlist cards need a green "Deal" indicator (D-03).
   - What's unclear: The most efficient way to surface this — include `priceCheck` in `findMany` or fetch separately.
   - Recommendation: Add a separate `initialDealIds: Set<string>` (set of gearItemIds with active deals) passed from `app/gear/page.tsx` via a second query — mirrors the `initialUpgrades` pattern. Avoids inflating the main `findMany` with an include.

## Sources

### Primary (HIGH confidence)

- `prisma/schema.prisma` — GearResearch model (exact structural template for GearPriceCheck)
- `lib/claude.ts` — generateGearResearch (exact function template for generateGearPriceCheck)
- `lib/parse-claude.ts` — GearResearchResultSchema (exact Zod pattern for GearPriceCheckResultSchema)
- `app/api/gear/[id]/research/route.ts` — GET/POST route (exact template for price-check route)
- `components/GearResearchTab.tsx` — full tab component (direct template for GearDealsTab)
- `components/GearClient.tsx` — tab system, activeTab state, extraContent pattern, Upgrade Opportunities collapsible
- `app/gear/page.tsx` — server component data fetching + upgrades pattern
- `app/page.tsx` — dashboard Promise.all fetch pattern
- `components/DashboardClient.tsx` — dashboard card layout
- `components/GearForm.tsx` — form field patterns, safeParseFloat usage
- `app/api/gear/[id]/route.ts` — PUT explicit field mapping pattern
- `tests/gear-research-route.test.ts` — exact test template for price-check route tests

### Secondary (MEDIUM confidence)

None needed — all patterns are directly readable from existing project source files.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already in use
- Architecture: HIGH — every pattern has a direct working reference in Phase 30 code
- Pitfalls: HIGH — derived from reading the actual source files and identifying integration points that require explicit updates

**Research date:** 2026-04-04
**Valid until:** 2026-07-04 (90 days — stable library versions, no fast-moving dependencies)
