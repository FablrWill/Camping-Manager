# Session 32 — Gear Product Research (Phase 30)

**Date:** 2026-04-04
**Session ID:** S14
**Phase:** 30

## What Changed

### New: researchResult + researchedAt fields on GearItem
- Added `researchResult` (JSON string) and `researchedAt` (DateTime) to GearItem in Prisma schema
- Stores structured research data: alternatives array, summary, recommendation

### New: researchGearItem() in lib/claude.ts
- Claude prompt finds 3 best alternatives for any gear item
- Returns structured JSON: alternatives with name/brand/price/weight/pros/cons, summary text, and keep/consider_upgrade/upgrade recommendation
- Uses Zod schema validation via `GearResearchResultSchema` in parse-claude.ts

### New: POST /api/gear/[id]/research
- Triggers Claude research for a gear item
- Stores result + timestamp on the GearItem record
- Returns updated item

### New: GearResearchCard component
- Shows "Research alternatives" button when no research exists
- Displays alternatives table with pros/cons, recommendation badge, summary
- Stale indicator (>90 days) with "Re-research" button
- Loading state with spinner during research

### Updated: GearClient
- Research card integrated into gear edit modal (above Documents tab)
- `handleResearch()` function calls the API and updates local state
- GearItem interface updated with researchResult + researchedAt fields

### Updated: app/gear/page.tsx
- Serializes researchedAt Date to ISO string for client component

## Files Changed
- `prisma/schema.prisma` — added researchResult, researchedAt to GearItem
- `lib/parse-claude.ts` — added GearResearchResultSchema + GearResearchResult type
- `lib/claude.ts` — added researchGearItem() function
- `app/api/gear/[id]/research/route.ts` — new (POST)
- `components/GearResearchCard.tsx` — new
- `components/GearClient.tsx` — integrated research card + handler
- `app/gear/page.tsx` — serialize researchedAt

## Build
- `npm run build` passes clean
