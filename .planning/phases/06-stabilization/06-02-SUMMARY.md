---
phase: 06-stabilization
plan: 02
subsystem: ui/crud
tags: [crud, design-system, forms, trips, vehicle, photos, locations]
dependency_graph:
  requires:
    - 06-01 (design system tokens, Button/Input/Modal/ConfirmDialog components)
  provides:
    - Trip edit/delete UI (PUT/DELETE /api/trips/[id])
    - Vehicle edit UI (PUT /api/vehicle/[id])
    - Mod delete UI (DELETE /api/vehicle/[id]/mods/[modId])
    - Photo delete UI in SpotMap popup (DELETE /api/photos/[id])
    - Photo DELETE API with filesystem cleanup
    - Mod DELETE API with P2025 404 handling
    - Fully migrated forms in TripsClient, VehicleClient, LocationForm
  affects:
    - components/TripsClient.tsx
    - components/VehicleClient.tsx
    - components/SpotMap.tsx
    - components/LocationForm.tsx
    - app/api/photos/[id]/route.ts (new)
    - app/api/vehicle/[id]/mods/[modId]/route.ts (new)
tech_stack:
  added: []
  patterns:
    - DOM event delegation for Leaflet popup delete button (data-photo-delete attribute)
    - ConfirmDialog pattern for all destructive actions
    - Modal-based edit forms with pre-populated state
    - Design system primitives replace all raw form HTML
key_files:
  created:
    - app/api/photos/[id]/route.ts
    - app/api/vehicle/[id]/mods/[modId]/route.ts
  modified:
    - components/TripsClient.tsx
    - components/VehicleClient.tsx
    - components/SpotMap.tsx
    - components/LocationForm.tsx
decisions:
  - "DOM event delegation on Leaflet map container for photo delete — Leaflet popups are raw HTML, not React, so React state must be triggered via dataset attribute + click delegation"
  - "window.location.reload() after photo delete — SpotMap receives photos as a prop from server; simplest correct approach is reload rather than threading an onPhotoDeleted callback through 3 component layers"
  - "LocationForm bottom-sheet pattern preserved — form is not wrapped in Modal because it renders as a fixed bottom sheet inside the map page layout; wrapping in Modal would break positioning"
metrics:
  duration: "~11 min"
  completed: "2026-04-01"
  tasks: 4
  files: 6
---

# Phase 6 Plan 02: CRUD Completion + Design System Migration Summary

Complete missing CRUD operations (trip edit/delete, vehicle edit, mod delete, photo delete) and migrate all remaining forms to design system primitives. Satisfies STAB-03 through STAB-06 and ROADMAP Success Criterion 4.

## What Was Built

**2 new API routes:**
- `app/api/photos/[id]/route.ts` — DELETE with `fs.unlink` filesystem cleanup (best-effort, non-fatal), Prisma delete, 404 check
- `app/api/vehicle/[id]/mods/[modId]/route.ts` — DELETE with P2025 404 handling

**TripsClient (full rewrite):**
- Trip edit modal pre-populated from trip data, PUT to `/api/trips/[id]`
- Trip delete with ConfirmDialog confirmation, DELETE to `/api/trips/[id]`
- All raw `<input>`, `<select>`, `<textarea>`, `<button>` replaced with design system primitives
- Pencil/Trash2 icon buttons on each trip card, click stops propagation to card toggle

**VehicleClient (full rewrite):**
- Vehicle edit modal with all spec fields, PUT to `/api/vehicle/[id]`
- Mod delete ConfirmDialog, DELETE to `/api/vehicle/[id]/mods/[modId]`
- Add-mod form moved into Modal
- All raw form elements replaced with Button, Input, Textarea, Modal, ConfirmDialog

**SpotMap:**
- Delete button added to photo popup HTML via `data-photo-delete` attribute
- DOM event delegation useEffect on map container listens for clicks on `[data-photo-delete]`
- ConfirmDialog rendered outside Leaflet DOM, DELETE to `/api/photos/[id]`
- Reloads page after delete (simplest correct approach given props-based data flow)

**LocationForm (full rewrite):**
- All raw form elements replaced with Button, Input, Select, Textarea
- `window.confirm()` replaced with ConfirmDialog state pattern
- Dark mode classes added throughout
- All existing functionality preserved (validation, callbacks, GPS auto-population)

## Commits

| Hash | Description |
|------|-------------|
| fdffdf5 | feat(06-02): add photo DELETE and mod DELETE API routes |
| 3c2a9aa | feat(06-02): trip edit/delete UI + TripsClient design system migration |
| bf86445 | feat(06-02): vehicle edit + mod delete UI + photo delete in SpotMap |
| f4adfb3 | feat(06-02): migrate LocationForm to design system primitives |

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one noted simplification:

**[Plan decision] window.location.reload() for photo delete in SpotMap**
- Plan spec noted this was acceptable ("Simple approach — photo markers rebuild from server data")
- Implemented as specified. No threading of callbacks needed.

## Known Stubs

None — all features are fully wired to live API endpoints.

## Self-Check: PASSED

All 6 files found on disk. All 4 task commits verified in git log.
