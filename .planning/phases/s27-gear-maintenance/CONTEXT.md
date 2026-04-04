# S27: Gear Maintenance Reminders — Context

**Session:** S27
**Date:** 2026-04-04
**Status:** Done

## Background

Some gear requires periodic maintenance: tent fly resealing, sleeping bag washing, chair lube, stove cleaning. Will was losing track of when he last did maintenance and which items were overdue.

## What This Addressed

- No way to track last maintenance date for gear items
- No reminders or overdue detection
- Gear page had no signal for items that needed attention

## Design Decision

- **GearMaintenanceLog model** — append-only log of maintenance events per gear item
- **Maintenance interval** — optional interval in days (90/180/365/730 = 3/6/12/24 months)
- **Overdue detection** — lastMaintenanceAt + maintenanceIntervalDays < today = overdue
- **Maintenance tab in gear detail** — log history, interval picker, Log Maintenance form
- **Red dot badge** on Maintenance tab when item is overdue
- **Overdue banner** on Gear page — "N items due for maintenance" when any are overdue

## Key Decisions

- GearMaintenanceLog model (not AgentJob) — queryable for overdue detection, visible history
- lastMaintenanceAt updated on GearItem when new log is added (denormalized for efficient overdue query)
- Cascade delete: log deleted when gear item deleted
- Overdue banner count is server-side for performance
- Future: Mac mini agent job to ping about overdue items (deferred to follow-on)
