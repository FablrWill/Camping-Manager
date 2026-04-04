# S26: Gear Lending Tracker — Plan

## Goal

Track gear loans (who borrowed what) with a new Loans tab in gear detail and an active-loans banner on the Gear page.

## Files Created

- `components/GearLoanPanel.tsx` — active loans list, past loans (collapsible), inline Add Loan form, Mark Returned button
- `app/api/gear/[id]/loans/route.ts` — GET list loans, POST create new loan
- `app/api/gear/[id]/loans/[loanId]/route.ts` — PATCH mark returned, DELETE remove loan
- `prisma/migrations/20260404235900_s26_gear_loan/migration.sql` — creates GearLoan table

## Files Modified

- `prisma/schema.prisma` — new GearLoan model (borrowerName, lentAt, returnedAt?, notes?), @@index[gearItemId, returnedAt], loans relation on GearItem
- `components/GearClient.tsx` — add 'loans' to detailTab union, add Loans tab button with active count badge
- `app/gear/page.tsx` — query activeLoanCount, pass to GearClient for banner display

## Key Decisions

- Cascade delete on GearItem (loan history deleted with item)
- @@index[gearItemId, returnedAt] for efficient active loans query
- Banner shows "N item(s) currently on loan" when activeLoanCount > 0
- Badge on Loans tab button when active loans > 0 for that specific item

## Verification

- `npm run build` passes
- No TypeScript errors
