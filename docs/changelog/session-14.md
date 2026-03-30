# Session 14 — Power Budget Calculator

**Date:** 2026-03-30
**Status:** Complete

## What Was Built

Full power budget calculator on upcoming trip cards. Two modes: planning (pre-trip forecast) and live (during the trip). Deterministic math — no Claude API, instant results.

## Changes

### Schema
- Added `wattage Float?`, `hoursPerDay Float?`, `hasBattery Boolean @default(false)` to `GearItem`
- Added `currentBatteryPct Float?`, `batteryUpdatedAt DateTime?` to `Trip`
- Migration: `20260330174951_add_power_fields`

### Seed
- Updated EcoFlow Delta 2: `hasBattery: false` (classified as main battery source)
- Updated EcoFlow 220W Solar: `wattage: 220`, `hasBattery: false`
- Updated Starlink Mini: `wattage: 30`, `hoursPerDay: 12`, `hasBattery: false`
- Updated Garmin inReach Mini 2: `wattage: 1`, `hoursPerDay: 24`, `hasBattery: true`

### New Files
- `lib/power.ts` — All calculation logic: device classification, wattage resolution (explicit → parsed → pattern lookup → category fallback), cloud factors from WMO codes, per-day battery trajectory, live status, verdict + tips, charge reminders
- `app/api/power-budget/route.ts` — POST endpoint. Fetches trip + gear + weather, persists live battery level to Trip, calls `calculatePowerBudget()`
- `components/PowerBudget.tsx` — Full UI component with planning and live modes
- `docs/plans/power-budget.md` — Implementation plan (planning + v2 with live mode)

### Edited Files
- `prisma/schema.prisma` — New fields on GearItem and Trip
- `prisma/seed.ts` — Updated gear items with power data
- `app/api/gear/route.ts` — POST handler accepts wattage, hoursPerDay, hasBattery
- `app/api/gear/[id]/route.ts` — PUT handler accepts wattage, hoursPerDay, hasBattery
- `components/GearForm.tsx` — Added Power draw (W), Hours/day fields, and "Has internal battery" checkbox
- `components/GearClient.tsx` — Updated GearItem interface with new fields
- `components/TripsClient.tsx` — Imported and rendered PowerBudget below PackingList

## Feature Details

**Planning mode** (pre-trip):
- 100% starting battery
- Weather-adjusted solar harvest per day (WMO code → cloud factor)
- Day-by-day battery trajectory with color-coded bars (green/amber/red)
- "Charge Before You Go" checklist — EcoFlow always first, then all `hasBattery=true` gear
- Power sources summary: Battery / Solar / Car (backup)
- Auto-generated tips (car charging, cloudy day warnings, surplus tips)

**Live mode** (during trip — auto-detected when `startDate <= today <= endDate`):
- "Update Status" button with battery slider (0–100%, saved to DB)
- Persists across app restarts via `Trip.currentBatteryPct`
- "Right Now" stats: current battery %, live solar output estimate, hours-to-empty
- Alert bar for critical/warning conditions
- Priority charge list (Charge Now / Charge Soon) based on current level
- Day-by-day with past days dimmed, today marked with "← Today"
- Remaining solar window calculated from sunset time

**Device lookup table** covers: Starlink (30W/12h), laptop (65W/10h), monitor (40W/10h), phone, tablet, camera, light, fan, heater, CPAP, inReach, speaker, fridge, HA server, smart plugs, battery banks. Falls back to category defaults.

**Gear form additions**: wattage (W) and hours/day number inputs + "Has internal battery" checkbox on all gear items.

## Future (documented in plan section 10)
- Photo-based battery scanning via Claude Vision
- HA auto-update when bridge is live (Phase 3)
- Car charging model, multiple solar panels, real peak sun hours from Open-Meteo
