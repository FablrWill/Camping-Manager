# S26: Gear Lending Tracker — Summary

**Completed:** 2026-04-04
**Session:** S26 (V2 queue)

## What Was Shipped

- **GearLoan model** — borrowerName, lentAt, returnedAt (nullable = active loan), notes; cascade delete with GearItem; @@index[gearItemId, returnedAt]
- **Migration** — `20260404235900_s26_gear_loan` applied
- **GET + POST /api/gear/[id]/loans** — list loans, create new loan
- **PATCH + DELETE /api/gear/[id]/loans/[loanId]** — mark returned, delete loan record
- **GearLoanPanel** (`components/GearLoanPanel.tsx`) — active loans list, past loans (collapsible), inline add form, Mark Returned button
- **Loans tab in GearClient** — 'loans' tab with active count badge
- **Active loans banner** on Gear page — "N item(s) currently on loan" when activeLoanCount > 0

## Schema Changes

- `GearLoan` model: id, gearItemId (FK cascade), borrowerName, lentAt, returnedAt?, notes?
- `@@index([gearItemId, returnedAt])` — efficient active loans query
- `loans GearLoan[]` relation on GearItem

## Key Notes

- Active loan = returnedAt IS NULL
- Badge on Loans tab when item has active loans
- Banner on Gear page when any loans are active (server-side count)

## Follow-On

- Deferred: push notification when loan is overdue (future agent job)
