# S27: Gear Maintenance Reminders — Plan

## Goal

Track gear maintenance history and surface overdue items with a Maintenance tab in gear detail and a banner on the Gear page.

## Files Created

- `components/GearMaintenancePanel.tsx` — next due date display, interval picker (3/6/12/24mo), Log Maintenance inline form, scrollable log history
- `app/api/gear/[id]/maintenance/route.ts` — GET log + interval, POST new event (updates lastMaintenanceAt), PATCH update interval

## Files Modified

- `prisma/schema.prisma` — add `lastMaintenanceAt DateTime?` and `maintenanceIntervalDays Int?` to GearItem; new `GearMaintenanceLog` model
- `components/GearClient.tsx` — add 'maintenance' to detailTab union, Maintenance tab button with red dot badge if overdue
- `app/gear/page.tsx` — query overdueMaintenanceCount, show "N items due" banner at top of gear list

## Key Decisions

- GearMaintenanceLog: id, gearItemId (FK cascade), performedAt, notes?
- Overdue = lastMaintenanceAt + maintenanceIntervalDays < today AND interval is set
- lastMaintenanceAt is denormalized on GearItem (updated on POST) for efficient overdue query
- Server-side overdueMaintenanceCount for Gear page banner

## Verification

- `npm run build` passes
- No TypeScript errors
