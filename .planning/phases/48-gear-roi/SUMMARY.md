# S21: Gear ROI Tracker — Summary

**Completed:** 2026-04-04
**Session:** S21 (V2 queue)

## What Was Shipped

- **GearROITab** (`components/GearROITab.tsx`) — cost-per-trip display, ROI grade badge, total trips used, purchased date
- **GET /api/gear/[id]/roi** — counts PackingItem appearances, computes cost-per-trip and ROI grade on demand
- **ROI tab in GearClient** — 'roi' added to detailTab union, ROI tab button visible in gear detail modal

## Schema Changes

None. Trip count derived from existing PackingItem table.

## Key Notes

- Trip count = PackingItem appearances for the gear item (no new field needed)
- ROI grade: A (< $5/trip), B ($5–15/trip), C ($15–30/trip), D (> $30/trip)
- Shows "Set a purchase price to see ROI" when purchasePrice is null
- Can run in parallel with S20 (no file conflicts)

## Follow-On

- Future: sort gear list by ROI grade to surface worst ROI items first
