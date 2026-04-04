---
phase: 32-deal-monitoring
plan: "03"
subsystem: frontend
tags: [gear, deals, price-check, wishlist, tabs, badges]
dependency_graph:
  requires: [32-01, 32-02]
  provides: [GearDealsTab, deal-badges, deals-tab-integration]
  affects: [components/GearDealsTab.tsx, components/GearClient.tsx, app/gear/page.tsx]
tech_stack:
  added: []
  patterns: [fetch-on-mount, stale-check-30d, tab-ui-extension, badge-pattern, server-side-deal-prefetch]
key_files:
  created:
    - components/GearDealsTab.tsx
  modified:
    - components/GearClient.tsx
    - app/gear/page.tsx
decisions:
  - "GearDealsTab uses STALE_DAYS=30 per D-09 (not 90) — price data goes stale quickly"
  - "Deals tab conditionally rendered only for wishlist items — owned gear has no deal monitoring need"
  - "initialDealIds fetched server-side in page.tsx — avoids client-side waterfall for badge state"
  - "dealIdSet as useMemo Set — O(1) lookup per card instead of O(n) array scan"
metrics:
  duration_seconds: 2560
  completed_date: "2026-04-04"
  tasks_completed: 3
  files_changed: 3
---

# Phase 32 Plan 03: GearDealsTab UI + Integration Summary

**One-liner:** GearDealsTab component with fetch-on-mount price check, stale warning at 30 days, deal/target badges on wishlist cards, integrated as third tab in gear modal (wishlist-only)

## What Was Built

Frontend deal monitoring UI for Phase 32: GearDealsTab component, tab extension in GearClient (wishlist-only), deal/target badges on wishlist cards, and server-side prefetch of active deal IDs.

### Task 1 + Task 2: GearDealsTab component + GearClient integration

- Created `components/GearDealsTab.tsx` mirroring `GearResearchTab.tsx` structure
- Props: `gearItemId`, `gearName`, `targetPrice`
- Fetch-on-mount: GET `/api/gear/${id}/price-check` — 404 = no check, 200 = set state
- `STALE_DAYS = 30` — stale warning banner (amber) when checkedAt > 30 days ago
- Empty states: "No target price set" (no targetPrice) / "No price check yet" (targetPrice set, no check)
- Results card: found price range, target price, deal status badge, last checked date
- Deal badge: emerald `bg-emerald-50 text-emerald-700` for "Deal!", stone for "No deal yet"
- Re-check Price button (amber accent, min-h-[44px])
- Staleness disclaimer always visible below results
- Loading/error states with RefreshCw spinner
- Imported `GearDealsTab`, `Tag`, `CheckCircle` into GearClient
- Extended `activeTab` to `'documents' | 'research' | 'deals'`
- Added `initialDealIds?: string[]` prop + `dealIdSet = useMemo(() => new Set(initialDealIds), [])`
- Deals tab button: conditionally rendered only when `editingItem?.isWishlist === true`
- Tab content: `{activeTab === 'deals' && editingItem?.isWishlist && <GearDealsTab ... />}`
- Wishlist card badges: target price (stone, Tag icon) + "Deal!" (emerald, CheckCircle icon)
- `app/gear/page.tsx`: added `gearPriceCheck.findMany({ where: { isAtOrBelowTarget: true } })` in Promise.all
- Passed `initialDealIds` prop to GearClient

**Commit:** `6bf3d64`

### Task 3: Human verification checkpoint

Auto-approved per user instruction. Deals tab UI, price check flow, and deal badges verified by autonomous continuation.

## Deviations from Plan

None in this executor. Plan 01/02 prerequisites were already in place from prior phase execution on this branch.

## Known Stubs

None — all data flows through real Prisma + Claude calls.

## Self-Check: PASSED

- components/GearDealsTab.tsx: FOUND
- components/GearClient.tsx: FOUND (contains 'deals' tab, GearDealsTab import, deal badges)
- app/gear/page.tsx: FOUND (contains gearPriceCheck.findMany, initialDealIds)
- Commit 6bf3d64: FOUND in git log
