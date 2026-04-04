# Session 43 — S21 Gear ROI Tracker

**Date:** 2026-04-04
**Branch:** claude/infallible-margulis (worktree)

## Summary

S21: Gear ROI tracker — GearROITab component with cost-per-trip calculation and ROI grade, new ROI tab in gear detail modal.

## Changes

### New Files
- `components/GearROITab.tsx` — ROI tab: cost-per-trip, ROI grade (A/B/C/D), trips used, purchased date
- `app/api/gear/[id]/roi/route.ts` — GET: counts PackingItem appearances, computes cost-per-trip and grade

### Modified Files
- `components/GearClient.tsx` — add 'roi' to detailTab union, ROI tab button in gear detail modal

## Schema Changes

None. Trip count derived from existing PackingItem table.

## Key Notes

- ROI grade: A (< $5/trip), B ($5-15), C ($15-30), D (> $30)
- Shows "Set a purchase price to see ROI" when purchasePrice is null

## Commits

- `4af4385` feat: GearROITab with cost-per-trip and ROI grade
- `a17e61c` feat: ROI tab in gear detail modal
