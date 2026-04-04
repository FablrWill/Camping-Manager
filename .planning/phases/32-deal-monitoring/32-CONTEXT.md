# Phase 32: Deal Monitoring - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Add deal-monitoring capability to wishlist gear items: set a target price per item, trigger an on-demand Claude price check, show current-vs-target in a new "Deals" tab in the gear detail modal, surface active deals on the dashboard. Price checking uses Claude's training knowledge (best-guess price range) — no live scraping.

</domain>

<decisions>
## Implementation Decisions

### Price Check UX
- **D-01:** New "Deals" tab in the gear detail modal — third tab alongside Documents + Research (from Phase 30). Only visible for wishlist items.
- **D-02:** "Check Price" button lives inside the Deals tab, not on the gear card or Research tab.
- **D-03:** Wishlist gear cards in the list show a target price badge + a green "Deal" indicator when a price check found a price at or below target. No deal info requires opening the modal to see details.
- **D-04:** Price check results live in the Deals tab: shows found price range, target price, deal status, last checked date, and a "Re-check" button.

### Target Price Entry
- **Claude's Discretion** — user did not specify where to enter target price. Planner should add it to the gear edit form (GearForm) as an optional field on wishlist items, consistent with existing form patterns.

### Deal Detection
- **D-05:** A "deal" is triggered when the found price is at or below the target price. No percentage threshold — simple rule: `foundPrice <= targetPrice`.
- **D-06:** Dashboard surfaces a collapsible "Deals (N)" card listing all wishlist items with an active deal. Each entry shows: item name, target price, found price range. Pattern mirrors the "Upgrade Opportunities" section from Phase 30 on the gear page. Collapses/hides when no deals exist.

### Claude Price Check Behavior
- **D-07:** Claude returns a best-guess price range from training data — e.g., "$89–109 at REI, Amazon, and major outdoor retailers." No live scraping, no URL generation.
- **D-08:** Price check results include a staleness disclaimer in the UI: Claude's prices may be outdated.
- **D-09:** Staleness threshold = 30 days (shorter than the 90-day gear research threshold). After 30 days, show stale warning and "Re-check" prompt.
- **D-10:** Claude inputs: `name`, `brand`, `modelNumber`, `category`, `price` (user's purchase price if set), `targetPrice`. Claude uses these to anchor its price estimate.

### Storage Model
- **D-11:** New `GearPriceCheck` Prisma model — one row per GearItem (overwrite on re-check), similar to `GearResearch` from Phase 30. Fields: `gearItemId`, `foundPriceRange` (string, e.g., "$89–109"), `foundPriceLow` (Float, for deal comparison), `checkedAt`, `isAtOrBelowTarget` (Boolean, computed at check time and stored).
- **D-12:** `targetPrice` is added as a new optional Float field on `GearItem` (alongside existing `price` field).

### Claude's Discretion
- Exact Claude prompt design for price checking
- How to handle items with no brand/name (graceful degradation)
- Loading state UX during price check (spinner, progress message)
- Whether to add a `GearPriceCheck` tab visibility toggle or always show Deals tab for all wishlist items
- GearPriceCheck model field names (beyond what's specified above)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema & Patterns
- `prisma/schema.prisma` — GearItem model (price, isWishlist fields), GearResearch model (pattern to follow for GearPriceCheck)
- `lib/claude.ts` — Claude API integration pattern; price check calls must follow this pattern
- `lib/parse-claude.ts` — Zod schema validation for Claude outputs; add GearPriceCheckResultSchema here

### UI Patterns
- `components/GearClient.tsx` — Gear list, wishlist toggle, detail modal, tab system (Documents + Research tabs); Deals tab is added here
- `components/GearResearchTab.tsx` — Research tab pattern; Deals tab follows the same structure
- `components/GearDocumentsTab.tsx` — Tab UI pattern (secondary reference)
- `app/page.tsx` + `components/DashboardClient.tsx` — Dashboard structure where "Deals" card is added

### API Patterns
- `app/api/gear/[id]/research/route.ts` — Route pattern to follow for new `/api/gear/[id]/price-check` endpoint
- `app/api/gear/[id]/route.ts` — PATCH pattern for updating `targetPrice` on GearItem

### Phase 30 Context
- `.planning/phases/30-gear-product-research/30-CONTEXT.md` — Upgrade Opportunities surfacing pattern (dashboard collapsible section) mirrors what Deal Monitoring needs on the dashboard

No external specs — requirements fully captured in ROADMAP.md success criteria and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `components/GearResearchTab.tsx` — Deals tab follows the same structure: stale warning, action button, results card
- `lib/claude.ts` — Established Claude API call pattern; price check reuses same client
- `lib/parse-claude.ts` — Zod validation for Claude outputs; add price check schema alongside research schema
- `components/ui/` — Design system (Card, Badge, Button) for Deals tab UI
- Wishlist toggle in GearClient — `showWishlist` state already controls which items are shown; Deals tab visibility keyed on `isWishlist`

### Established Patterns
- One-to-one model per GearItem (same as GearResearch)
- Claude API calls are server-side (API routes only)
- Overwrite on re-run — no history kept
- Tab-based UI in gear detail modal (Documents, Research already exist)
- Collapsible section for surfacing insights (Upgrade Opportunities pattern from Phase 30)
- State-based error messages in components (no alert())

### Integration Points
- `GearItem` ← `GearPriceCheck` (one-to-one via `gearItemId`)
- `GearItem.targetPrice` (new field, Float?) — added to schema + GearForm
- `GearClient.tsx`: Add Deals tab for wishlist items + deal badge on wishlist cards + dashboard data fetch
- `app/page.tsx`: Fetch active deals (items with `isAtOrBelowTarget = true`) for dashboard card
- `DashboardClient.tsx` or dashboard page: Add collapsible "Deals (N)" card

</code_context>

<specifics>
## Specific Ideas

- The "Deals" tab should only be visible when viewing a wishlist item — not shown for owned gear.
- Dashboard deal card mirrors the Upgrade Opportunities section: collapsible, shows N count, each entry has item name + target price + found price range.
- Price check disclaimer must be visible in the Deals tab: "Prices based on Claude's training data — may be outdated."
- The `isAtOrBelowTarget` boolean is stored at check time using `foundPriceLow <= targetPrice` comparison. This allows simple dashboard query without re-parsing price strings.

</specifics>

<deferred>
## Deferred Ideas

- Price history tracking (multiple price check records over time) — out of scope, one-row overwrite only
- Push notifications or email alerts for price drops — future phase
- Real-time price scraping via external API — out of scope, Claude training-data only
- Price tracking for owned gear (not just wishlist) — out of scope for Phase 32

</deferred>

---

*Phase: 32-deal-monitoring*
*Context gathered: 2026-04-04*
