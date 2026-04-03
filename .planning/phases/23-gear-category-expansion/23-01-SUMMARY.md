---
phase: 23-gear-category-expansion
plan: 01
subsystem: gear
tags: [categories, schema, seed, api]
dependency_graph:
  requires: []
  provides: [gear-categories-module, tech-gear-schema-fields]
  affects: [gear-api, seed-data]
tech_stack:
  added: []
  patterns: [shared-module, prisma-migration, explicit-field-mapping]
key_files:
  created:
    - lib/gear-categories.ts
    - prisma/migrations/20260403080000_add_tech_gear_fields/migration.sql
  modified:
    - prisma/schema.prisma
    - prisma/seed.ts
    - app/api/gear/route.ts
    - app/api/gear/[id]/route.ts
decisions:
  - "gear-categories.ts uses flatMap to derive CATEGORIES from CATEGORY_GROUPS — avoids duplication"
  - "Manual migration file created for add_tech_gear_fields — prisma migrate dev blocked by non-interactive environment"
  - "Worktree .env uses absolute path for DATABASE_URL — relative path resolved to wrong directory"
metrics:
  duration: ~18min
  completed: 2026-04-03
  tasks_completed: 2
  files_changed: 6
---

# Phase 23 Plan 01: Gear Category Foundation Summary

Shared gear categories module created, Prisma migration applied for 3 new tech fields, 9 seed items re-categorized, and API routes extended for new fields.

## Tasks Completed

| Task | Description | Commit | Files |
|------|-------------|--------|-------|
| 1 | Create gear-categories module + Prisma migration | b8e3a16 | lib/gear-categories.ts, prisma/schema.prisma, migration.sql |
| 2 | Re-categorize 9 seed items + extend API routes | a43f040 | prisma/seed.ts, app/api/gear/route.ts, app/api/gear/[id]/route.ts |

## What Was Built

### lib/gear-categories.ts

Single source of truth for all gear category definitions. Exports:
- `CategoryValue` — union of 15 string literals
- `Category` interface — `{ value, label, emoji }`
- `CategoryGroup` interface — `{ name, categories }`
- `CATEGORY_GROUPS` — 4 groups: Living, Utility, Tech/Power, Action with 15 categories total
- `CATEGORIES` — flat list derived via flatMap
- `CATEGORY_EMOJI` — O(1) lookup Record derived via Object.fromEntries
- `getCategoryEmoji(category)` — returns emoji with `'📦'` fallback
- `getCategoryLabel(category)` — returns label with category string fallback

### Schema Fields Added

Three optional fields added to `GearItem`:
- `modelNumber String?` — e.g. "ESP32-WROOM-32"
- `connectivity String?` — e.g. "WiFi, Bluetooth"
- `manualUrl String?` — URL to product manual

Migration: `20260403080000_add_tech_gear_fields`

### Seed Re-categorizations

9 items updated — new category set in BOTH `update` and `create` paths:
- fairy-lights, wall-sconces, flood-lights → `lighting`
- camp-table, helinox-chair-one → `furniture`
- fire-extinguisher, first-aid → `safety`
- garmin-inreach-mini2 → `navigation`
- water-pump → `hydration`

### API Routes

Both POST (`gear/route.ts`) and PUT (`gear/[id]/route.ts`) handlers now map `modelNumber`, `connectivity`, `manualUrl` from request body with `|| null` fallback.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Relative DATABASE_URL failed in worktree context**
- **Found during:** Task 1 (migration run)
- **Issue:** `DATABASE_URL="file:prisma/dev.db"` resolved incorrectly when npx Prisma ran outside the worktree directory, causing an empty 0-byte database file to be created
- **Fix:** Changed `.env` to use absolute path `file:/Users/willis/Camping Manager/.claude/worktrees/sweet-zhukovsky/prisma/dev.db`
- **Files modified:** `.env` (gitignored, not committed)

**2. [Rule 3 - Blocking] Missing Trip columns blocked seed run**
- **Found during:** Task 2 (db:seed)
- **Issue:** The `emergencyContactName`/`emergencyContactEmail` columns in the Trip table were commented out in the prior migration (pre-existing issue from Phase 7). Fresh worktree db was missing these columns.
- **Fix:** Added columns directly via `sqlite3` ALTER TABLE before running seed
- **Files modified:** None (direct SQL fix to dev.db)
- **Commit:** No commit — dev.db is gitignored

**3. [Rule 3 - Blocking] Prisma client stale after schema change**
- **Found during:** Task 2 verification (tsc --noEmit)
- **Issue:** TypeScript type errors for `modelNumber` because Prisma client hadn't been regenerated after the migration
- **Fix:** Ran `npx prisma generate` to update the client types
- **Files modified:** node_modules (not committed)

**4. [Rule 1 - Pre-existing] Manual migration file required**
- **Found during:** Task 1 (prisma migrate dev)
- **Issue:** `prisma migrate dev` blocked by non-interactive environment detection (FTS table warning triggered interactive confirmation requirement)
- **Fix:** Used `prisma migrate diff` to generate correct SQL, created migration file manually, applied via `prisma migrate deploy`
- **Files modified:** `prisma/migrations/20260403080000_add_tech_gear_fields/migration.sql`

## Pre-existing Issue (Out of Scope)

Logged to deferred-items: `lib/__tests__/bulk-import.test.ts` has a pre-existing Buffer/ArrayBuffer TypeScript incompatibility error unrelated to this plan's changes.

## Verification Results

- `lib/gear-categories.ts` exports all 5 required exports
- 15 categories across 4 groups confirmed
- Migration file exists at `prisma/migrations/20260403080000_add_tech_gear_fields/`
- `prisma/schema.prisma` contains `modelNumber String?`, `connectivity String?`, `manualUrl String?`
- Seed re-categorization verified in db: all 9 items have correct new categories
- `app/api/gear/route.ts` and `[id]/route.ts` both contain `modelNumber: body.modelNumber || null`
- `npx tsc --noEmit` passes (only pre-existing bulk-import.test.ts error remains, unrelated to this plan)

## Known Stubs

None — all exports are fully implemented and seed data is correctly applied.

## Self-Check: PASSED

- lib/gear-categories.ts: FOUND
- prisma/migrations/20260403080000_add_tech_gear_fields/migration.sql: FOUND
- Commits b8e3a16 and a43f040: FOUND
