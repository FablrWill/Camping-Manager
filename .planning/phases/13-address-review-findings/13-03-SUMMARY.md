---
phase: 13-address-review-findings
plan: "03"
subsystem: validation
tags: [input-validation, api-hardening, security, forms]
dependency_graph:
  requires: []
  provides: [lib/validate.ts]
  affects:
    - app/api/gear/[id]/route.ts
    - app/api/gear/route.ts
    - app/api/power-budget/route.ts
    - app/api/settings/route.ts
    - app/api/trips/[id]/route.ts
    - app/api/trips/route.ts
    - app/api/vehicle/[id]/route.ts
    - components/GearForm.tsx
    - components/LocationForm.tsx
    - components/VehicleClient.tsx
tech_stack:
  added: []
  patterns: [safe-parse-utilities, null-return-over-NaN]
key_files:
  created:
    - lib/validate.ts
  modified:
    - app/api/gear/[id]/route.ts
    - app/api/gear/route.ts
    - app/api/power-budget/route.ts
    - app/api/settings/route.ts
    - app/api/trips/[id]/route.ts
    - app/api/trips/route.ts
    - app/api/vehicle/[id]/route.ts
    - components/GearForm.tsx
    - components/LocationForm.tsx
    - components/VehicleClient.tsx
decisions:
  - "safeParseFloat/safeParseInt return null not NaN — correct for Prisma nullable fields"
  - "isValidDate validates before Date construction — prevents Invalid Date reaching DB"
  - "isValidEmail uses /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/ — standard RFC-like pattern, sufficient for personal tool"
  - "vehicle/[id] PUT now explicitly maps fields — removes unsafe pass-through of raw request body to Prisma"
metrics:
  duration_seconds: 225
  completed_date: "2026-04-02"
  tasks_completed: 2
  files_changed: 11
---

# Phase 13 Plan 03: Input Validation Hardening Summary

**One-liner:** Shared validation utility (safeParseFloat, safeParseInt, isValidDate, isValidEmail) adopted across all API routes and form components to prevent NaN, Invalid Date, and weak email values from reaching the database.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Create validation utility + fix API route input validation | 8f3d073 | lib/validate.ts, 7 API routes |
| 2 | Fix form component parseFloat/parseInt validation | 26a7db7 | GearForm.tsx, LocationForm.tsx, VehicleClient.tsx |

## What Was Built

**`lib/validate.ts`** — four exports:
- `safeParseFloat(value)` — returns `number | null`, never NaN
- `safeParseInt(value)` — returns `number | null`, never NaN
- `isValidDate(value)` — returns `Date | null`, never Invalid Date
- `isValidEmail(value)` — returns `boolean` using `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`

**API route changes:**
- `app/api/gear/[id]/route.ts` and `app/api/gear/route.ts` — replaced `parseFloat(body.weight)`, `parseFloat(body.price)`, `parseFloat(body.wattage)`, `parseFloat(body.hoursPerDay)` with `safeParseFloat()`
- `app/api/power-budget/route.ts` — validates `currentBatteryPct` with `safeParseFloat`, returns 400 if non-numeric string submitted
- `app/api/settings/route.ts` — replaced weak `includes('@') && includes('.')` check with `isValidEmail()`
- `app/api/trips/[id]/route.ts` and `app/api/trips/route.ts` — replaced `new Date(data.startDate/endDate)` with `isValidDate()`, returning 400 on invalid date strings
- `app/api/vehicle/[id]/route.ts` — replaced unsafe pass-through of raw request body with explicit field mapping using `safeParseInt`/`safeParseFloat`

**Component changes:**
- `components/GearForm.tsx` — numeric form fields parsed with `safeParseFloat` before sending to API
- `components/LocationForm.tsx` — `visitedAt` parsed with `isValidDate` before ISO conversion
- `components/VehicleClient.tsx` — vehicle edit form and mod add form use safe parse utilities

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing validation] vehicle/[id] PUT passed raw body to Prisma**
- **Found during:** Task 1 — reading `app/api/vehicle/[id]/route.ts`
- **Issue:** The existing PUT handler passed `data` (raw parsed JSON) directly to `prisma.vehicle.update({ data })` with no field allowlisting or type coercion
- **Fix:** Replaced with explicit field mapping, applying `safeParseInt`/`safeParseFloat` for all numeric fields
- **Files modified:** `app/api/vehicle/[id]/route.ts`
- **Commit:** 8f3d073

**2. [Rule 2 - Missing validation] VehicleClient handleAddMod used bare parseFloat and new Date()**
- **Found during:** Task 2 — reading `components/VehicleClient.tsx` line 185-186
- **Issue:** `parseFloat(form.get('cost'))` and `new Date(installedAt)` were in the mod-add form handler but not listed in plan scope
- **Fix:** Replaced with `safeParseFloat()` and `isValidDate()` while in the file
- **Files modified:** `components/VehicleClient.tsx`
- **Commit:** 26a7db7

**3. [Rule 1 - Stale plan] TripsClient.tsx had no parseInt/parseFloat to replace**
- **Found during:** Task 2 — plan referenced "lines 125-129" and `parseInt(editYear)` but no such code existed
- **Fix:** Skipped TripsClient changes (code already sends date strings directly to API which validates server-side)
- **Impact:** Acceptance criteria still met — no bare `parseInt(edit`/`parseFloat(edit` in any of the 4 files

## Known Stubs

None.

## Self-Check

- [ ] lib/validate.ts created
- [ ] 7 API routes modified
- [ ] 3 component files modified
- [ ] Task 1 commit: 8f3d073
- [ ] Task 2 commit: 26a7db7
