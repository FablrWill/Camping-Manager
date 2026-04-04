# Session 34 — Medication Tracker + Auto-Calculated Packing Quantities

**Date:** 2026-04-04
**Branch:** claude/tender-newton → merged to main

## What Was Built

### Medication Tracker

A persistent, global medication list that auto-calculates trip quantities and injects them into every packing list.

**New model:** `Medication` — stores name, dosesPerDay, unitsPerDose, unit (pill/tablet/ml/etc.), and an `isForDog` flag. Persists across all trips — enter once, auto-included everywhere.

**Calculation:** `dosesPerDay × nights × unitsPerDose` — deterministic, no Claude tokens needed.
Example: 2 pills/day × 3-night trip = 6 pills, shown as `"6 pills (2x/day × 3 nights)"` inline.

**Injection:** Medications are injected post-generation into the packing list:
- Your meds → prepended to the `health` category (creates it if Claude didn't)
- Dog meds → prepended to the `dog` category

**UI:** `MedicationManager` component renders above the packing list in the Packing prep section. Add/edit/delete meds with: name, doses/day, amount/dose, unit, dog toggle.

## Files Changed

| File | Change |
|------|--------|
| `prisma/schema.prisma` | Added `Medication` model |
| `prisma/migrations/20260404000000_add_medications/migration.sql` | Migration SQL |
| `app/api/medications/route.ts` | GET all, POST create |
| `app/api/medications/[id]/route.ts` | PUT update, DELETE |
| `components/MedicationManager.tsx` | New UI component (add/edit/delete meds, dog toggle) |
| `app/api/packing-list/route.ts` | Fetch meds + inject into result after Claude generation |
| `components/TripPrepClient.tsx` | Mount `MedicationManager` above `PackingList` in packing section |
