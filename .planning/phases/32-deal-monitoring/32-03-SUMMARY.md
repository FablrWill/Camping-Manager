---
phase: 32-deal-monitoring
plan: "03"
subsystem: frontend
tags: [gear-deals, wishlist, deal-badge, price-check-ui]
dependency_graph:
  requires: [32-01, 32-02]
  provides: [GearDealsTab, deals-tab-in-GearClient, deal-badges]
  affects: [components/GearClient.tsx, components/GearDealsTab.tsx, app/gear/page.tsx]
tech_stack:
  added: []
  patterns: [tab-component, optimistic-badge, server-side-preload]
key_files:
  created:
    - components/GearDealsTab.tsx
  modified:
    - components/GearClient.tsx
    - app/gear/page.tsx
decisions:
  - "Deals tab is wishlist-only — does not appear for owned gear items per D-01"
  - "Stale warning shown when price check is > 30 days old"
  - "Deal badge (green) on wishlist card when isAtOrBelowTarget is true"
  - "Target price badge on wishlist card when targetPrice is set"
  - "Staleness disclaimer always visible below price check results"
metrics:
  duration_seconds: 420
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 3
---

# Phase 32 Plan 03: GearDealsTab + Deal Badges — Summary

**One-liner:** GearDealsTab with Check Price / Re-check UI + green deal badge and target price badge on wishlist gear cards

## What Was Built

### Task 1: GearDealsTab component

- `components/GearDealsTab.tsx` — states: unchecked / loading / loaded / error
- Shows: found price low, deal status, last checked date
- "Check Price" button triggers POST /api/gear/[id]/price-check
- "Re-check" button available after initial check
- Stale warning shown when last checked > 30 days ago
- "Prices sourced from Claude AI — verify before purchasing" disclaimer always visible

### Task 2: GearClient integration + deal badges

- 'deals' tab added to GearClient detailTab union — visible only when `item.isWishlist` is true
- Deal badge (green pill, "Deal") on wishlist gear cards when `isAtOrBelowTarget` is true
- Target price badge (amber) on wishlist cards when `targetPrice` is set
- `app/gear/page.tsx` queries `gearPriceCheck` to get `initialDealIds` — pre-populated for badge rendering

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- components/GearDealsTab.tsx: FOUND (> 80 lines)
- components/GearClient.tsx contains `'deals'`: FOUND
- app/gear/page.tsx contains `gearPriceCheck`: FOUND
