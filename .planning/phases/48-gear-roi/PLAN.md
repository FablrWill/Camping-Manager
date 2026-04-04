# S21: Gear ROI Tracker — Plan

## Goal

Surface cost-per-trip ROI data for gear items in a new ROI tab in the gear detail modal.

## Files Created

- `components/GearROITab.tsx` — ROI tab: shows cost-per-trip, total trips used, purchased date, ROI grade (A/B/C/D)
- `app/api/gear/[id]/roi/route.ts` — GET endpoint: counts PackingItem appearances for the item, computes cost-per-trip and ROI grade

## Files Modified

- `components/GearClient.tsx` — add 'roi' to detailTab union type, add ROI tab button in gear detail modal

## Key Decisions

- Trip count = PackingItem count for this gear item (not a stored field — pure DB query)
- Cost per trip = purchasePrice / tripCount (computed on demand)
- ROI grade: A (< $5/trip), B ($5-15), C ($15-30), D (> $30)
- No schema changes

## Verification

- `npm run build` passes
- No TypeScript errors
