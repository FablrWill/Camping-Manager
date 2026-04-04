---
phase: 42
plan: 01
subsystem: trips
tags: [expense-tracking, touch-usability, api]
dependency_graph:
  requires: []
  provides: [expense-api-aggregate, touch-friendly-expense-buttons]
  affects: [components/TripExpenses.tsx, app/api/trips/route.ts]
tech_stack:
  added: []
  patterns: [prisma-include-select, client-side-aggregate]
key_files:
  modified:
    - components/TripExpenses.tsx
    - app/api/trips/route.ts
decisions:
  - "Expense buttons always-visible: removed opacity-0/group-hover pattern so buttons work on touch devices without hover"
  - "Trip list includes expenses select for amount only: lightweight (single float field) enables client-side total sum for cost badge"
metrics:
  duration: 2min
  completed_date: "2026-04-04"
  tasks_completed: 3
  files_modified: 2
requirements:
  - EXP-01
  - EXP-02
  - EXP-03
  - EXP-04
---

# Phase 42 Plan 01: Trip Cost Tracking — Audit, Touch Fix, and Expense Aggregate Summary

Verified all four EXP requirements satisfied by prior-session infrastructure, fixed hover-only expense action buttons for mobile/touch usability, and added expense amounts to the trip list API to unblock Plan 42-02's cost badge.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| T1 | Audit existing expense infrastructure (EXP-01 through EXP-04) | audit-only | none |
| T2 | Make TripExpenses edit/delete buttons always visible | d56e4d1 | components/TripExpenses.tsx |
| T3 | Add expense total aggregate to trip list API | bee80e3 | app/api/trips/route.ts |

## Requirement Coverage Audit (Task 1)

**EXP-01 (TripExpense model):** CONFIRMED. `prisma/schema.prisma` lines 597-610 — model has `id String @id @default(cuid())`, `tripId String`, `category String`, `description String`, `amount Float`, `paidAt DateTime?`, `notes String?`, `createdAt DateTime @default(now())`, Trip relation with `onDelete: Cascade`, and `@@index([tripId])`. Amount stored as Float (dollars), accepted per CONTEXT.md decision.

**EXP-02 (GET endpoint):** CONFIRMED. `app/api/trips/[id]/expenses/route.ts` GET handler returns `{ expenses, total, byCategory }`. Expenses ordered by `paidAt: 'desc'`. Total and byCategory computed server-side from the expense array before returning.

**EXP-03 (POST + DELETE endpoints):** CONFIRMED. POST handler validates category + description + amount (required), amount must be non-negative number; creates expense and returns 201. DELETE handler in `app/api/trips/[id]/expenses/[expenseId]/route.ts` deletes by expenseId and returns 204 (null body).

**EXP-04 (TripExpenses component):** CONFIRMED. `components/TripExpenses.tsx` has: expense list with emoji + category + description + formatted amount per row, inline add/edit form (category select, amount input, description, date, notes, save/cancel), category subtotals as grouped badges via `byCategory` state, total displayed in header via `total` state. Component is `TripExpenses` (not `TripExpensePanel`) — functionally equivalent per plan.

## Changes Made

### Task 2: Touch-Friendly Expense Buttons

`components/TripExpenses.tsx` line 377 — removed `opacity-0 group-hover:opacity-100 transition-opacity` from the button container so edit/delete buttons are permanently visible. Also increased button padding from `p-1` to `p-1.5` for larger touch targets.

**Before:**
```
className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
```
**After:**
```
className="flex items-center gap-0.5 shrink-0"
```

### Task 3: Expense Aggregate in Trip List API

`app/api/trips/route.ts` GET handler — added `expenses: { select: { amount: true } }` to the `findMany` include block. Each trip in the response now carries `expenses: Array<{ amount: number }>`. Client-side total: `trip.expenses.reduce((sum, e) => sum + e.amount, 0)`. This enables Plan 42-02's cost badge without a dedicated aggregate endpoint.

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- `npm run build` passes cleanly
- `grep -c "opacity-0" components/TripExpenses.tsx` returns 0 (no hover-only opacity)
- `grep -n "expenses" app/api/trips/route.ts` shows the include at line 25

## Known Stubs

None — all implemented functionality is wired to real data.

## Self-Check: PASSED

- `components/TripExpenses.tsx` — modified, exists
- `app/api/trips/route.ts` — modified, exists
- Commit `d56e4d1` — confirmed in git log
- Commit `bee80e3` — confirmed in git log
