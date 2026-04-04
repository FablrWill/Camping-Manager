---
phase: 38-post-trip-auto-review
plan: 03
subsystem: trips-ui
tags: [trips, review, modal, ui]
dependency_graph:
  requires: [38-01, 38-02]
  provides: [review-button-ui, reviewed-badge, review-needed-count, review-modal-wiring]
  affects: [components/TripsClient.tsx, components/TripCard.tsx, app/trips/page.tsx, app/api/trips/route.ts]
tech_stack:
  added: []
  patterns: [immutable-state-update, iife-render-pattern]
key_files:
  created: []
  modified:
    - app/api/trips/route.ts
    - app/trips/page.tsx
    - components/TripCard.tsx
    - components/TripsClient.tsx
decisions:
  - Prisma relation name is `gear` (not `gearItem`); mapped to `{ gearId, name, category }` in TripsClient for TripReviewModal's PackedItem shape
  - handleEditSave and handleCreate patched to spread existing trip data before merging API response, preserving packingItems/mealPlan/reviewedAt not returned by PUT
  - IIFE pattern used in JSX to find the reviewing trip and build modal props inline, avoiding additional state
metrics:
  duration_minutes: 20
  completed: "2026-04-04T07:33:15Z"
  tasks_completed: 1
  files_modified: 4
---

# Phase 38 Plan 03: Wire TripReviewModal into Trips UI — Summary

TripReviewModal wired end-to-end: review button on unreviewed past trips, reviewed badge on completed trips, review-needed count in section header, and modal launched with correct trip data (packed items, meals, location).

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Thread reviewedAt through data pipeline + wire TripReviewModal | c55117c | app/api/trips/route.ts, app/trips/page.tsx, components/TripCard.tsx, components/TripsClient.tsx |

## What Was Built

**API (`app/api/trips/route.ts`):**
- GET now includes `packingItems` with nested `gear { name, category }` and `usageStatus`
- GET now includes `mealPlan` with nested `meals { id, name, slot, day }`
- `reviewedAt` returns automatically (it's on the Trip model already from Plan 38-01)

**Page (`app/trips/page.tsx`):**
- Added `packingItems` and `mealPlan` to the Prisma query
- Added `reviewedAt: t.reviewedAt?.toISOString() ?? null` to the serialization map

**TripCard (`components/TripCard.tsx`):**
- `TripData` extended with `reviewedAt`, `locationId`, `packingItems`, and `mealPlan`
- `TripCardProps` extended with `onReview: (tripId: string) => void`
- Added "Review trip" button (amber styling, ClipboardCheck icon) for past trips where `reviewedAt === null`
- Added "Reviewed" badge (green, CheckCircle2 icon) for past trips where `reviewedAt !== null`

**TripsClient (`components/TripsClient.tsx`):**
- `TripData` interface updated to match TripCard
- `reviewingTripId` state added
- `TripReviewModal` imported and rendered via IIFE when `reviewingTripId !== null`
- `packedItems` mapped from `trip.packingItems` (gear name/category via `item.gear`)
- `meals` mapped from `trip.mealPlan.meals` (with `Day N - slot` label format)
- `onComplete` handler updates trips state immutably: `setTrips(prev => prev.map(t => t.id === reviewingTripId ? { ...t, reviewedAt } : t))`
- Past trips section header shows review-needed count badge when any past trips have `reviewedAt === null`
- `onReview={setReviewingTripId}` passed to both upcoming and past TripCard instances

## Deviations from Plan

**1. [Rule 1 - Bug] handleEditSave merge fix**
- **Found during:** Task 1, updating TripData interface
- **Issue:** `handleEditSave` replaced the entire trip in state with the PUT response, which doesn't include `packingItems`, `mealPlan`, or `reviewedAt`. Would silently lose those fields on edit save.
- **Fix:** Changed `prev.map(t => t.id === updated.id ? updated : t)` to `prev.map(t => t.id === updated.id ? { ...t, ...updated } : t)` to preserve fields not returned by PUT.
- **Files modified:** components/TripsClient.tsx
- **Commit:** c55117c

**2. [Rule 1 - Bug] handleCreate default fields**
- **Found during:** Task 1
- **Issue:** Newly created trips inserted into state would lack `packingItems`, `mealPlan`, and `reviewedAt`, causing TripCard to crash on type access.
- **Fix:** Added `packingItems: saved.packingItems ?? []`, `mealPlan: saved.mealPlan ?? null`, `reviewedAt: saved.reviewedAt ?? null` to the spread in `handleCreate`.
- **Files modified:** components/TripsClient.tsx
- **Commit:** c55117c

**3. [Rule 1 - Bug] Prisma relation name**
- **Found during:** Task 1
- **Issue:** Plan's interface used `gearItem` but Prisma schema defines the relation as `gear` on PackingItem.
- **Fix:** Used `gear` in both the Prisma query and TripData interface; TripsClient maps `item.gear?.name` when building packedItems for the modal.
- **Files modified:** app/api/trips/route.ts, app/trips/page.tsx, components/TripCard.tsx, components/TripsClient.tsx
- **Commit:** c55117c

## UAT Items for User to Verify

The following checkpoint items were auto-approved per autonomous execution instructions. Will should verify when reviewing the work:

1. Open `/trips` on phone (or mobile viewport). Find a past trip. Confirm "Review trip" button is visible with amber styling.
2. Tap "Review trip" — confirm TripReviewModal opens with the correct trip name in the title.
3. Gear step: tap Used/Didn't Need/Forgot to Pack on a few items. Confirm selected state is visually distinct.
4. Tap Next → Meals step (if trip has a meal plan) OR jump directly to Spot+Notes.
5. Meals step: tap thumbs up/down on a meal; tap Next.
6. Spot+Notes step: tap a star rating; type a note; tap Submit Review.
7. Confirm success: modal closes, trip card now shows green "Reviewed" badge, "Review trip" button is gone.
8. Refresh page — confirm "Reviewed" badge still shows (reviewedAt persisted in DB).
9. Review-needed count badge in "Past Trips" header decrements after completing a review.
10. Tap "Review trip" on a second trip → tap "Skip" → confirm modal closes, no badge appears, no API call fired.
11. Trip with no meal plan: confirm Meals step is absent (Gear → Spot+Notes directly).
12. Trip with no location: confirm star rating section is absent in Spot+Notes; notes textarea still present.

## Self-Check

All files modified in commit c55117c. Build passed clean with no TypeScript errors.

## Self-Check: PASSED

- [x] `components/TripCard.tsx` modified — FOUND
- [x] `components/TripsClient.tsx` modified — FOUND
- [x] `app/trips/page.tsx` modified — FOUND
- [x] `app/api/trips/route.ts` modified — FOUND
- [x] Commit c55117c exists — FOUND
- [x] `npm run build` — PASSED (no TypeScript errors)
