---
phase: 34-meal-planning-core
plan: "03"
subsystem: meal-planning-ui
tags: [meal-planning, ui, react, nextjs]
dependency_graph:
  requires: ["34-02"]
  provides: ["MealPlanClient", "meal-plan-status-badge"]
  affects: ["components/TripPrepClient.tsx", "components/TripsClient.tsx", "components/TripCard.tsx"]
tech_stack:
  added: []
  patterns: ["per-meal regeneration via PATCH", "collapsible day sections", "immutable state update via map"]
key_files:
  created:
    - components/MealPlanClient.tsx
  modified:
    - components/TripPrepClient.tsx
    - components/TripsClient.tsx
    - components/TripCard.tsx
    - app/trips/page.tsx
decisions:
  - "Added meal plan status badge in TripsClient per-trip wrapper div (above Plan B button) for both upcoming and past trips"
  - "TripCard.tsx TripData interface updated alongside TripsClient.tsx to maintain type compatibility (duplicate interface pattern)"
  - "app/trips/page.tsx serializes mealPlanGeneratedAt DateTime to ISO string before passing to TripsClient"
metrics:
  duration: ~12 minutes
  completed_date: "2026-04-04"
  tasks: 2
  files: 5
---

# Phase 34 Plan 03: Meal Plan UI — MealPlanClient + Status Badges Summary

**One-liner:** MealPlanClient with day-by-day collapsible sections, per-meal PATCH regeneration, wired into TripPrepClient; TripsClient shows "Meal plan ready" / "No meal plan" status badges per trip.

## What Was Built

**MealPlanClient.tsx (423 lines):** New client component that fetches `GET /api/trips/:id/meal-plan` on mount, renders meals grouped by day in collapsible sections, provides "Generate Meal Plan" when no plan exists, "Regenerate All" with confirm dialog when plan exists, and per-meal regenerate via `PATCH /api/trips/:id/meal-plan/meals/:mealId`. Slot badge colors (breakfast=amber, lunch=green, dinner=purple, snack=orange), estimated time badge, ingredient list, cook instructions, prep notes all rendered per meal card.

**TripPrepClient.tsx:** Replaced old `MealPlan` import + `offlineData` prop usage with `MealPlanClient tripId={trip.id} tripName={trip.name}`.

**TripsClient.tsx:** Added `mealPlanGeneratedAt: string | null` to TripData interface; renders green "Meal plan ready" or stone "No meal plan" badge with UtensilsCrossed icon below each TripCard for both upcoming and past trips.

**TripCard.tsx + app/trips/page.tsx:** Updated TripCard's duplicate TripData interface to include `mealPlanGeneratedAt` (required for type compatibility since TripsClient passes full trip to TripCard's `onEdit` callback). Serialized DateTime field in the server page.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Create MealPlanClient component | 1ad70d1 |
| 2 | Wire into TripPrepClient + TripsClient status badge | 8199f35 |

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Type error: TripCard.tsx TripData interface missing mealPlanGeneratedAt**
- **Found during:** Task 2 (build TypeScript check)
- **Issue:** TripsClient.tsx uses TripCard's `onEdit` callback typed as `(trip: TripData) => void` — both components have their own `TripData` interface. Adding `mealPlanGeneratedAt` to TripsClient's interface without updating TripCard's caused a type incompatibility error.
- **Fix:** Added `mealPlanGeneratedAt: string | null` to TripCard.tsx's TripData interface as well.
- **Files modified:** components/TripCard.tsx
- **Commit:** 8199f35

**2. [Rule 1 - Bug] app/trips/page.tsx not serializing mealPlanGeneratedAt**
- **Found during:** Task 2 (build TypeScript check)
- **Issue:** Prisma returns `mealPlanGeneratedAt` as `Date | null` but TripsClient expects `string | null`. The page.tsx spread didn't serialize it.
- **Fix:** Added `mealPlanGeneratedAt: t.mealPlanGeneratedAt?.toISOString() ?? null` to the serialization map.
- **Files modified:** app/trips/page.tsx
- **Commit:** 8199f35

## Known Stubs

None — all API connections are live. MealPlanClient fetches from real `/api/trips/:id/meal-plan` endpoints built in Plan 02. Badge reads `mealPlanGeneratedAt` from live Prisma data.

## Self-Check: PASSED
