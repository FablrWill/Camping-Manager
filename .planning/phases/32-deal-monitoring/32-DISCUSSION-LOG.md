# Phase 32: Deal Monitoring - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 32-deal-monitoring
**Areas discussed:** Price check UX, Deal surfacing on dashboard, Claude price check behavior

---

## Price Check UX

| Option | Description | Selected |
|--------|-------------|----------|
| New 'Deals' tab in gear modal | Third tab alongside Documents + Research. Keeps price-check results separate from upgrade research. Only visible for wishlist items. | ✓ |
| Inside the existing Research tab | Add a price check section to the Research tab. Simpler but mixes two different purposes. | |
| Inline on the wishlist card | Check Price button directly on the gear card in the wishlist view. | |

**User's choice:** New 'Deals' tab in gear modal
**Notes:** Keeps deal monitoring separate from gear upgrade research (Phase 30).

---

| Option | Description | Selected |
|--------|-------------|----------|
| Target price badge + 'deal' indicator if below target | Each wishlist card shows the target price. Green 'Deal' badge if price check found a deal. | ✓ |
| Only show price data inside the modal | No deal info on the card — clean list, drill in to see pricing. | |
| Show current price + target on the card | Both current found price and target displayed on each card. | |

**User's choice:** Target price badge + 'deal' indicator if below target
**Notes:** At-a-glance deal status on wishlist cards, details in modal.

---

## Deal Surfacing on Dashboard

| Option | Description | Selected |
|--------|-------------|----------|
| Any found price at or below the target price | Simple rule: found price ≤ target. No percentage thresholds. | ✓ |
| Price is 10%+ below target | Only flag when meaningfully cheaper. Fewer false positives but more complex. | |
| Any price found (always show) | Show all price check results on dashboard regardless of target. | |

**User's choice:** Any found price at or below the target price
**Notes:** Simple binary — at or below target = deal.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Card with list of items at-or-below target | Collapsible section like Upgrade Opportunities on gear page. Item name, target price, found price. | ✓ |
| A badge count on the Gear nav link | Number badge on navigation only. | |
| Separate /deals page | Full dedicated page for price tracking. | |

**User's choice:** Card with list of items at-or-below target
**Notes:** Consistent with the Upgrade Opportunities pattern established in Phase 30.

---

## Claude Price Check Behavior

| Option | Description | Selected |
|--------|-------------|----------|
| Best-guess price range from training data | Claude gives its best estimate: e.g., "$89–109 at REI, Amazon, and major outdoor retailers." Fast, free, honest about staleness. | ✓ |
| Specific retailer URLs to check | Claude returns 'check this URL' links. More actionable but Claude can't verify URLs are valid. | |
| Skip Claude — manual price entry only | User enters the current price themselves. No AI price check. | |

**User's choice:** Best-guess price range from training data
**Notes:** No live scraping. Price disclaimer shown in UI.

---

| Option | Description | Selected |
|--------|-------------|----------|
| 30 days | Prices change more often than gear research. Monthly refresh threshold for deal monitoring. | ✓ |
| 90 days (same as gear research) | Consistent with the research staleness threshold. | |
| No auto-staleness — user re-checks manually | No stale warning. User decides when to refresh. | |

**User's choice:** 30 days
**Notes:** Shorter than the 90-day gear research threshold because price data goes stale faster.

---

## Claude's Discretion

- Target price entry location in the UI (planner defaults to GearForm optional field)
- Exact Claude prompt design for price checking
- Loading state UX during price check
- Whether Deals tab shows for all wishlist items or only after first check

## Deferred Ideas

- Price history tracking — overwrite only, no history
- Push notifications for price drops — future phase
- Real-time price scraping — out of scope
- Price tracking for owned gear — wishlist only
