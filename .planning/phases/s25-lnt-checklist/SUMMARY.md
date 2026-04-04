# S25: LNT Pack-Out Checklist — Summary

**Completed:** 2026-04-04
**Session:** S25 (V2 queue)

## What Was Shipped

- **LNTChecklistCard** (`components/LNTChecklistCard.tsx`) — loading/loaded/error/empty states, amber progress bar, "Camp left clean ✓" green completion state
- **generateLNTChecklist()** — claude-haiku-4-5 function generating 6-10 location-specific LNT items
- **GET/POST /api/trips/[id]/lnt** — fetch stored checklist or trigger generation
- **PATCH /api/trips/[id]/lnt/check** — toggle individual item checked state
- **Schema migration** — lntChecklistResult + lntChecklistGeneratedAt on Trip
- **7th prep section** — lnt added to PREP_SECTIONS in lib/prep-sections.ts

## Schema Changes

- `lntChecklistResult String?` on Trip — JSON blob of LNT items with checked state
- `lntChecklistGeneratedAt DateTime?` on Trip — when checklist was generated

## Key Notes

- claude-haiku-4-5 used (not Sonnet) — deterministic, cheap, fast for short lists
- JSON blob pattern (same as packingListResult) — no separate LNTItem model
- Progress bar motivates completion before departure

## Follow-On

- Future: make "all LNT checked" a configurable departure gate
- Future: share LNT completion as part of shareable trip report (S28)
