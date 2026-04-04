# S25: LNT Pack-Out Checklist — Plan

## Goal

Add a Leave No Trace checklist as the 7th trip prep section — AI-generated, location-specific, with persistent checkboxes and progress bar.

## Files Created

- `components/LNTChecklistCard.tsx` — states: no-checklist / loading / loaded / error; amber progress bar → green "Camp left clean ✓" on completion
- `app/api/trips/[id]/lnt/route.ts` — GET stored checklist blob, POST generate + persist via Claude Haiku
- `app/api/trips/[id]/lnt/check/route.ts` — PATCH toggle individual item checked state
- `prisma/migrations/20260404132705_s25_lnt_checklist/migration.sql` — adds lntChecklistResult + lntChecklistGeneratedAt to Trip

## Files Modified

- `prisma/schema.prisma` — add `lntChecklistResult String?` and `lntChecklistGeneratedAt DateTime?` to Trip model
- `lib/claude.ts` — add `generateLNTChecklist()` using claude-haiku-4-5
- `lib/parse-claude.ts` — add LNTChecklistResultSchema + LNTChecklistResult type
- `lib/prep-sections.ts` — add 'lnt' as 7th entry in PREP_SECTIONS
- `components/TripPrepClient.tsx` — render LNTChecklistCard in the lnt section

## Key Decisions

- claude-haiku-4-5 (not Sonnet) — deterministic short list, cheap, fast
- JSON blob storage (lntChecklistResult) — same pattern as packingListResult
- Progress bar: amber while items unchecked, green when all checked

## Verification

- `npm run build` passes
- No TypeScript errors
