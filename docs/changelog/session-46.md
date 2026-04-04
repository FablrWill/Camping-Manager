# Session 46 — S27 Gear Maintenance Reminders

**Date:** 2026-04-04
**Branch:** claude/infallible-margulis (worktree)

## Summary

S27: Gear maintenance tracker — GearMaintenanceLog model, maintenance log API, GearMaintenancePanel component, Maintenance tab in gear detail with overdue badge, overdue banner on Gear page.

## Changes

### New Files
- `components/GearMaintenancePanel.tsx` — next due date, interval picker (3/6/12/24mo), Log Maintenance form, history list
- `app/api/gear/[id]/maintenance/route.ts` — GET log + interval, POST new event, PATCH update interval

### Modified Files
- `prisma/schema.prisma` — lastMaintenanceAt, maintenanceIntervalDays on GearItem; GearMaintenanceLog model
- `components/GearClient.tsx` — 'maintenance' tab with red dot badge if overdue
- `app/gear/page.tsx` — overdueMaintenanceCount server-side, "N items due" banner

## Schema Changes

- `lastMaintenanceAt DateTime?` on GearItem (denormalized for overdue query)
- `maintenanceIntervalDays Int?` on GearItem
- `GearMaintenanceLog` model: id, gearItemId (FK cascade), performedAt, notes?

## Commits

- `1ce33d0` feat: GearMaintenanceLog model and schema fields
- `1af19a3` feat: gear maintenance API, panel, and overdue detection
