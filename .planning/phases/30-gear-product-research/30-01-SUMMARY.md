---
phase: 30-gear-product-research
plan: 01
subsystem: gear-research
tags: [prisma, zod, claude-api, api-routes, tdd]
dependency_graph:
  requires: []
  provides:
    - GearResearch Prisma model with migration
    - GearResearchResultSchema Zod schema
    - generateGearResearch Claude function
    - GET /api/gear/[id]/research endpoint
    - POST /api/gear/[id]/research endpoint
  affects:
    - prisma/schema.prisma
    - lib/parse-claude.ts
    - lib/claude.ts
tech_stack:
  added: []
  patterns:
    - TDD RED/GREEN for route test scaffolding
    - Manual migration creation pattern (consistent with Phase 29)
    - parseClaudeJSON validation pattern from lib/parse-claude.ts
key_files:
  created:
    - prisma/migrations/20260403234651_add_gear_research/migration.sql
    - lib/parse-claude.ts (GearResearchResultSchema, GearResearchResult, GearResearchAlternative)
    - app/api/gear/[id]/research/route.ts
    - tests/gear-research-schema.test.ts
    - tests/gear-research-route.test.ts
  modified:
    - prisma/schema.prisma (GearResearch model + GearItem back-reference)
    - lib/claude.ts (generateGearResearch function + import)
decisions:
  - GearResearch uses @unique on gearItemId — one per gear item, upserted on re-research (D-01/D-02)
  - verdict stored as top-level String column alongside JSON result blob — enables fast filtering without JSON parsing
  - Manual migration applied via prisma migrate deploy (non-interactive agent environment — consistent with Phase 29 pattern)
  - generateGearResearch uses claude-sonnet-4-20250514 with max_tokens: 2000 — larger than vehicle checklist because alternatives require more detail
metrics:
  duration: "~4 minutes"
  completed: "2026-04-04"
  tasks_completed: 2
  files_created: 5
  files_modified: 2
---

# Phase 30 Plan 01: Gear Product Research Backend Summary

**One-liner:** GearResearch Prisma model with upsert migration, Zod schema validating 3-verdict enum + max-3 alternatives, and `generateGearResearch()` Claude function with GET/POST endpoints at `/api/gear/[id]/research`.

## What Was Built

### Task 1: Schema, Zod types, and test scaffolds
- Added `GearResearch` model to `prisma/schema.prisma` with `gearItemId @unique`, `verdict String`, `result String` (JSON blob), `researchedAt DateTime`
- Added `research GearResearch?` back-reference to `GearItem` model
- Created migration `20260403234651_add_gear_research` and applied via `prisma migrate deploy`
- Added to `lib/parse-claude.ts`: `GearResearchResultSchema` (verdict enum, `.max(3)` alternatives), `GearResearchResult` type, `GearResearchAlternative` type
- Created `tests/gear-research-schema.test.ts` — 8 tests covering valid result, missing verdict, invalid verdict, >3 alternatives, 0 alternatives, all 3 verdict values, optional brand field
- Created `tests/gear-research-route.test.ts` — 4 route tests with `vi.mock('@/lib/db')` and `vi.mock('@/lib/claude')` scaffold (TDD RED — route didn't exist yet)

### Task 2: Claude research function and API route (TDD GREEN)
- Added `generateGearResearch()` to `lib/claude.ts` — builds gear description, prompts Claude for top 3 alternatives + verdict, validates output via `parseClaudeJSON(text, GearResearchResultSchema)`
- Updated import in `lib/claude.ts` to include `GearResearchResultSchema` and `GearResearchResult`
- Created `app/api/gear/[id]/research/route.ts` with:
  - `GET`: returns stored research or 404
  - `POST`: validates gear item exists, calls `generateGearResearch`, upserts `GearResearch` row, returns result with `id` and `researchedAt`

## Test Results

- `tests/gear-research-schema.test.ts`: 8/8 passing
- `tests/gear-research-route.test.ts`: 4/4 passing
- Full suite: 193/193 passing (0 regressions)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all endpoints are fully wired to Prisma and Claude.

## Self-Check: PASSED

- `prisma/schema.prisma` contains `model GearResearch {`: confirmed
- `prisma/schema.prisma` GearResearch contains `gearItemId   String   @unique`: confirmed
- `prisma/schema.prisma` GearItem contains `research     GearResearch?`: confirmed
- `lib/parse-claude.ts` exports `GearResearchResultSchema`, `GearResearchResult`, `GearResearchAlternative`: confirmed
- `app/api/gear/[id]/research/route.ts` exists with GET and POST: confirmed
- Migration directory `20260403234651_add_gear_research` exists: confirmed
- All tests pass: confirmed (193/193)
