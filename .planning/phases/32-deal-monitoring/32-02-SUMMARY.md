---
phase: 32-deal-monitoring
plan: "02"
subsystem: frontend
tags: [gear-form, wishlist, target-price, api-route]
dependency_graph:
  requires: [32-01]
  provides: [targetPrice-in-GearForm, targetPrice-in-PUT-route]
  affects: [components/GearForm.tsx, app/api/gear/[id]/route.ts]
tech_stack:
  added: []
  patterns: [conditional-render, safeParseFloat]
key_files:
  created: []
  modified:
    - components/GearForm.tsx
    - app/api/gear/[id]/route.ts
decisions:
  - "targetPrice input is shown only when isWishlist is true — wishlist-only per D-01 and UI-SPEC"
  - "safeParseFloat applied to targetPrice in PUT route — consistent with price field handling"
  - "form.get('targetPrice') || null — empty string cleared to null in DB"
metrics:
  duration_seconds: 180
  completed_date: "2026-04-04"
  tasks_completed: 1
  files_changed: 2
---

# Phase 32 Plan 02: Target Price Field — Summary

**One-liner:** targetPrice input added to GearForm (wishlist-only) and persisted through PUT /api/gear/[id] with safeParseFloat

## What Was Built

### Task 1: targetPrice in GearForm + PUT route

- Added `name="targetPrice"` number input to `components/GearForm.tsx` — visible only when `isWishlist` is true
- Input shows "Target price" label and "e.g. 89" placeholder
- `defaultValue={initialData?.targetPrice ?? ''}` — pre-fills on edit
- Form submission handler includes `targetPrice: form.get('targetPrice') || null`
- `app/api/gear/[id]/route.ts` PUT handler explicit field mapping now includes `targetPrice: safeParseFloat(body.targetPrice)`
- Build passes

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- components/GearForm.tsx contains `name="targetPrice"`: FOUND
- components/GearForm.tsx contains `Target price` label: FOUND
- components/GearForm.tsx contains `isWishlist` condition: FOUND
- app/api/gear/[id]/route.ts contains `targetPrice` in data mapping: FOUND
