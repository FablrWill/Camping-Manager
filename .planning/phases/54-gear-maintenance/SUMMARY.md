# S27: Gear Maintenance Reminders — Summary

**Completed:** 2026-04-04
**Session:** S27 (V2 queue)

## What Was Shipped

- **GearMaintenanceLog model** — id, gearItemId (FK cascade), performedAt, notes?
- **Migration** applied — GearMaintenanceLog table + lastMaintenanceAt + maintenanceIntervalDays on GearItem
- **GET/POST/PATCH /api/gear/[id]/maintenance** — fetch log + interval, create event, update interval
- **GearMaintenancePanel** (`components/GearMaintenancePanel.tsx`) — next due date, interval picker, log form, history list
- **Maintenance tab in GearClient** — 'maintenance' tab with red dot badge when overdue
- **Overdue banner** on Gear page — "N items due for maintenance" when overdueMaintenanceCount > 0

## Schema Changes

- `lastMaintenanceAt DateTime?` on GearItem — denormalized for efficient overdue query
- `maintenanceIntervalDays Int?` on GearItem — set by user; null = no reminders
- `GearMaintenanceLog` model: id, gearItemId (FK cascade), performedAt, notes?

## Key Notes

- Overdue = interval set AND (lastMaintenanceAt + interval) < today
- Red dot badge on Maintenance tab when specific item is overdue
- Server-side banner count for performance

## Follow-On

- Deferred: Mac mini agent job to send overdue maintenance alerts (future AgentJob)
