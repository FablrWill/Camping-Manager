# S16: UX Quick Wins — Plan

## Goal

Polish the gear filter bar, fix the dashboard trip count stat, move the theme toggle to Settings, and fix the dark mode background on the Spots stats footer.

## Files Created

- `components/ui/FilterChip.tsx` — new reusable filter chip component for category filters

## Files Modified

- `components/GearClient.tsx` — migrate filter bar to use FilterChip component
- `components/TopHeader.tsx` — remove theme toggle (moved to Settings)
- `components/DashboardClient.tsx` — add live trip count to stats grid
- `app/page.tsx` — pass tripCount from server-side Prisma query
- `app/spots/spots-client.tsx` — fix dark mode bg on stats footer
- `components/ui/index.ts` — add FilterChip export

## Key Decisions

- FilterChip created as a standalone reusable UI primitive
- Theme toggle centralized in Settings to reduce header clutter
- Trip count fix uses same server-side query pattern as gear count

## Verification

- `npm run build` passes
- No TypeScript errors
- No schema changes
