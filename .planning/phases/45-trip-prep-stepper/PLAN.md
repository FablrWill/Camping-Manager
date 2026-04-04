# S18: TripPrepStepper — Plan

## Goal

Add a 5-step trip prep progress indicator to the dashboard active trip widget and to the top of the trip prep page.

## Files Created

- `components/TripPrepStepper.tsx` — 5-step horizontal stepper (Weather / Permits / Packing / Fuel / Departure), each step's completion derived from trip data props

## Files Modified

- `components/DashboardClient.tsx` — embed TripPrepStepper in active trip card widget
- `components/TripPrepClient.tsx` — embed TripPrepStepper at top of full prep page

## Key Decisions

- Steps: Weather (has location coords?) → Permits (permitUrl/permitNotes set?) → Packing (packingListResult non-empty?) → Fuel (location set?) → Departure (checklist has checked items?)
- All derived from existing trip data — no new schema fields
- Steps are informational only (no blocking)
- Depends on S16 for DashboardClient baseline

## Verification

- `npm run build` passes
- No TypeScript errors
- No schema changes
