---
phase: 32-deal-monitoring
plan: "01"
subsystem: backend
tags: [prisma, zod, claude-api, price-check, deal-monitoring]
dependency_graph:
  requires: []
  provides: [GearPriceCheck-model, GearPriceCheckResultSchema, generateGearPriceCheck, price-check-api-route]
  affects: [prisma/schema.prisma, lib/parse-claude.ts, lib/claude.ts]
tech_stack:
  added: []
  patterns: [zod-coerce, prisma-upsert, claude-json-parse, null-guard-deal-detection]
key_files:
  created:
    - prisma/migrations/20260404060000_add_gear_price_check/migration.sql
    - lib/parse-claude.ts (GearPriceCheckResultSchema added)
    - app/api/gear/[id]/price-check/route.ts
    - tests/gear-price-check-schema.test.ts
    - tests/gear-price-check-route.test.ts
  modified:
    - prisma/schema.prisma
    - lib/claude.ts
decisions:
  - "GearPriceCheckResultSchema omits foundPriceHigh — not used for deal detection or UI display per D-11; Zod strips unknown keys by default"
  - "isAtOrBelowTarget uses null guard (item.targetPrice != null ? ... : false) — returns false when no target price set"
  - "Migration created manually and deployed via prisma migrate deploy — non-interactive agent environment"
  - "Tests use await import() not require() — consistent with gear-research-route.test.ts pattern; brackets in path work with ESM dynamic import"
metrics:
  duration_seconds: 274
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 7
---

# Phase 32 Plan 01: Deal Monitoring Backend Foundation Summary

**One-liner:** GearPriceCheck model + Zod schema + Claude price check function + GET/POST API route with null-guarded deal detection

## What Was Built

Backend foundation for Phase 32 deal monitoring: Prisma schema changes, Claude integration, Zod validation, and API route — all tested with 14 passing tests.

### Task 1: Schema migration + Zod schema + tests

- Added `targetPrice Float?` to `GearItem` model
- Added `GearPriceCheck` model with `@unique gearItemId`, `foundPriceLow Float`, `isAtOrBelowTarget Boolean`, and Cascade delete
- Created migration `20260404060000_add_gear_price_check` manually and deployed via `prisma migrate deploy`
- Added `GearPriceCheckResultSchema` to `lib/parse-claude.ts` with `z.coerce.number()` for `foundPriceLow`; `foundPriceHigh` intentionally omitted per D-11
- Added `GearPriceCheckResult` type
- All 8 schema tests pass (parse, validation, coercion, deal detection helper)

**Commit:** `1a1c636`

### Task 2: Claude function + API route + tests

- Added `generateGearPriceCheck` to `lib/claude.ts` following the exact `generateGearResearch` pattern
- Imports `GearPriceCheckResultSchema` and `GearPriceCheckResult` from `@/lib/parse-claude`
- Created `app/api/gear/[id]/price-check/route.ts` with GET + POST handlers
  - GET: returns stored price check or 404
  - POST: calls Claude, computes `isAtOrBelowTarget` with null guard, upserts via Prisma
- All 6 route tests pass

**Commit:** `74f1385`

## Deviations from Plan

**[Rule 1 - Bug] Tests used `await import()` instead of `require()`**
- Found during: Task 2
- Issue: `require('@/app/api/gear/[id]/price-check/route')` fails with MODULE_NOT_FOUND — the bracket syntax works with ESM `await import()` but not CommonJS `require()` in the vitest environment
- Fix: Used `await import()` consistent with the existing `gear-research-route.test.ts` pattern
- Files modified: `tests/gear-price-check-route.test.ts`
- Note: The Phase 33 decision about `require()` was for stub TDD RED phase (files don't exist yet); route file existed at test time

## Known Stubs

None — all data flows through real Prisma + Claude calls. Mock layer is test-only.

## Self-Check: PASSED

- prisma/migrations/20260404060000_add_gear_price_check/migration.sql: FOUND
- lib/parse-claude.ts (GearPriceCheckResultSchema): FOUND
- app/api/gear/[id]/price-check/route.ts: FOUND
- tests/gear-price-check-schema.test.ts: FOUND
- tests/gear-price-check-route.test.ts: FOUND
- Commit 1a1c636: FOUND
- Commit 74f1385: FOUND
