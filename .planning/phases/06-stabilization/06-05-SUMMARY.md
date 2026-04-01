---
phase: 06-stabilization
plan: 05
subsystem: trips-ui, spots-ui, packing-list, meal-plan
tags: [refactor, ux, component-extraction, state-management]
requires: [06-02, 06-03, 06-04]
provides: [TripCard-standalone, SpotMap-callback-delete, regenerate-confirm-dialogs]
affects: [components/TripCard.tsx, components/TripsClient.tsx, components/SpotMap.tsx, app/spots/spots-client.tsx, components/PackingList.tsx, components/MealPlan.tsx]
tech-stack:
  added: []
  patterns: [component-extraction, callback-prop-pattern, confirm-guard]
key-files:
  created:
    - components/TripCard.tsx
  modified:
    - components/TripsClient.tsx
    - components/SpotMap.tsx
    - app/spots/spots-client.tsx
    - components/PackingList.tsx
    - components/MealPlan.tsx
decisions:
  - TripCard extracted with onDebrief callback to avoid prop-drilling debriefTrip setter
  - weather/weatherLoading/weatherError passed as optional props so TripCard is self-contained
  - onPhotoDeleted is optional so SpotMap remains usable without callback (backward compat)
  - ConfirmDialog open/close guards both regenerate actions; first-time generation skips confirm
metrics:
  duration: ~8 min
  completed: "2026-04-01"
  tasks: 2
  files: 6
---

# Phase 06 Plan 05: Component Gap Closure (TripCard, SpotMap, Regenerate Guards) Summary

**One-liner:** Extracted TripCard to standalone file eliminating re-creation on parent renders, replaced window.location.reload() with onPhotoDeleted callback preserving map state, and added ConfirmDialog guards before both AI regenerate actions.

## What Was Built

### Task 1: Extract TripCard + Fix SpotMap photo delete

**TripCard extraction (`components/TripCard.tsx`):**
- Moved the nested `function TripCard` from inside TripsClient to its own `components/TripCard.tsx` file
- Defined `TripCardProps` interface: `trip`, `isSelected`, `onSelect`, `onEdit`, `onDelete`, `weather`, `weatherLoading`, `weatherError`, `onDebrief`
- TripCard is a stable component reference — React will not re-create it on TripsClient re-renders, preserving PackingList and MealPlan child state (checked items, etc.)
- Added `'use client'` directive and all required imports (Lucide, Link, WeatherCard, PackingList, MealPlan, PowerBudget, VoiceDebriefButton)
- TripsClient now imports TripCard and passes all required props including weather state

**SpotMap photo delete fix (`components/SpotMap.tsx`, `app/spots/spots-client.tsx`):**
- Added `onPhotoDeleted?: (photoId: string) => void` to `SpotMapProps` interface
- Replaced `window.location.reload()` in `handleDeletePhoto` with `onPhotoDeleted(photoId)` callback
- SpotsClient passes `onPhotoDeleted={(photoId) => setPhotos(prev => prev.filter(p => p.id !== photoId))}` to SpotMap
- Map zoom level, center, and tile state are preserved on photo delete

### Task 2: ConfirmDialog before regenerating

**PackingList (`components/PackingList.tsx`):**
- Added `ConfirmDialog` to import from `@/components/ui`
- Added `showRegenerateConfirm` state
- Regenerate button: `onClick={() => packingList ? setShowRegenerateConfirm(true) : handleGenerate()}`
- ConfirmDialog with title "Regenerate packing list?", warns about custom item loss

**MealPlan (`components/MealPlan.tsx`):**
- Same pattern: `ConfirmDialog` import, `showRegenerateConfirm` state
- Regenerate button: `onClick={() => mealPlan ? setShowRegenerateConfirm(true) : handleGenerate()}`
- ConfirmDialog with title "Regenerate meal plan?"

## Decisions Made

1. **TripCard onDebrief callback:** Rather than passing `setDebriefTrip` directly, named the prop `onDebrief` to match the handler pattern. Keeps the interface clean.
2. **Weather as optional props:** `weather`, `weatherLoading`, `weatherError` passed as optional props to TripCard. TripCard falls back to empty arrays when undefined — works for past trips that skip weather fetch.
3. **onPhotoDeleted is optional:** SpotMap gracefully handles no callback — just deletes without any update. Backward compatible.
4. **Confirm guards first-time generation:** The condition `packingList ?` / `mealPlan ?` means first-time generation always proceeds immediately. Only subsequent regenerations are guarded.

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all changes wire up actual behavior.

## Self-Check: PASSED

Files created:
- `components/TripCard.tsx` — FOUND
- `.planning/phases/06-stabilization/06-05-SUMMARY.md` — FOUND

Commits:
- `0e8b51e` — feat(06-05): extract TripCard to own file + fix SpotMap photo delete
- `9f14392` — feat(06-05): add ConfirmDialog before regenerating packing list and meal plan
