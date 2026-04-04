# S19: Empty States + Skeleton Loaders — Plan

## Goal

Add loading skeletons and empty state messages to Gear, Trips, and Spots pages.

## Files Created

- `components/ui/Skeleton.tsx` — generic skeleton loader component with width/height/className props

## Files Modified

- `components/GearClient.tsx` — show skeleton while loading, show "No gear yet" empty state with add CTA
- `components/TripsClient.tsx` — show skeleton while loading, show "No trips yet" empty state with create CTA
- `app/spots/spots-client.tsx` — show "No spots pinned yet" empty state on map page
- `components/ui/index.ts` — add Skeleton to barrel export

## Key Decisions

- Skeleton is a generic primitive with configurable dimensions — not a card-specific shape
- Empty states include an action CTA to guide new users
- No schema changes

## Verification

- `npm run build` passes
- No TypeScript errors
