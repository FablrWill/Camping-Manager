---
phase: 25-gear-docs-manual-finder
plan: "01"
subsystem: gear
tags: [schema, migration, prisma, gear-documents, testing]
dependency_graph:
  requires: []
  provides: [GearDocument-model, GearDocumentResultSchema, getDocsDir, Wave0-tests]
  affects: [prisma/schema.prisma, lib/parse-claude.ts, lib/paths.ts, app/api/gear, components/GearClient, components/GearForm]
tech_stack:
  added: []
  patterns: [Prisma-model, Zod-schema, vi.mock-test-stubs]
key_files:
  created:
    - prisma/migrations/20260403120000_add_gear_document/migration.sql
    - tests/gear-documents.test.ts
    - public/docs/.gitkeep
  modified:
    - prisma/schema.prisma
    - lib/paths.ts
    - lib/parse-claude.ts
    - app/api/gear/route.ts
    - app/api/gear/[id]/route.ts
    - components/GearClient.tsx
    - components/GearForm.tsx
    - .gitignore
decisions:
  - GearDocument model uses gearItemId FK with cascade delete — documents are owned by gear items
  - Existing manualUrl values migrated to GearDocument rows with type=support_link, title=Manual
  - Single migration handles table create + data migration + DROP COLUMN (SQLite 3.35+ supports DROP COLUMN)
  - Migration applied via prisma migrate deploy (non-interactive environment)
metrics:
  duration_minutes: 15
  completed_date: "2026-04-03"
  tasks_completed: 3
  files_modified: 8
---

# Phase 25 Plan 01: GearDocument Foundation Summary

**One-liner:** Prisma GearDocument model with CASCADE delete, manualUrl data migration to support_link rows, schema cleanup, Zod validation schema, and getDocsDir() helper.

## What Was Built

Foundation layer for the gear docs and manual finder feature:

- **GearDocument model** added to Prisma schema with all required fields: id, gearItemId, type, url, title, localPath, createdAt
- **Migration** creates GearDocument table, migrates existing manualUrl values to GearDocument rows (type=support_link), and drops manualUrl column
- **getDocsDir()** added to lib/paths.ts following the same pattern as getPhotosDir()
- **GearDocumentResultSchema** and GearDocumentResult type added to lib/parse-claude.ts for Claude find-manual response validation
- **manualUrl removed** from all production code: API routes, component interfaces, form data extraction, and UI input field
- **Wave 0 test file** with SC-1 through SC-4 stubs — all passing with vi.mock, no real DB or API calls
- **public/docs/** directory created and gitignored for future PDF downloads

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 0 | Wave 0 test stubs SC-1 through SC-4 | 0981025 | tests/gear-documents.test.ts |
| 1 | GearDocument model + migration + getDocsDir | f502d3f | schema.prisma, migration.sql, lib/paths.ts, .gitignore, public/docs/.gitkeep |
| 2 | Remove manualUrl + add GearDocumentResultSchema | 6d4ddd9 | app/api/gear/route.ts, app/api/gear/[id]/route.ts, components/GearClient.tsx, components/GearForm.tsx, lib/parse-claude.ts |

## Verification Results

- `npx prisma validate` passes
- `grep -rn "manualUrl" app/ components/ lib/` returns empty (no production code references)
- `grep "GearDocumentResultSchema" lib/parse-claude.ts` finds the export
- `grep "model GearDocument" prisma/schema.prisma` finds the model
- `grep "getDocsDir" lib/paths.ts` finds the export
- `npx vitest run tests/gear-documents.test.ts` — 4 tests, all passing

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Non-interactive environment for prisma migrate dev**
- **Found during:** Task 1
- **Issue:** `prisma migrate dev` requires interactive terminal; non-interactive env causes failure
- **Fix:** Created migration file manually and used `prisma migrate deploy` instead
- **Files modified:** prisma/migrations/20260403120000_add_gear_document/migration.sql
- **Commit:** f502d3f

**2. [Rule 3 - Blocking] public/docs/.gitkeep blocked by new .gitignore rule**
- **Found during:** Task 1 commit
- **Issue:** The new `public/docs/` .gitignore rule prevented staging .gitkeep
- **Fix:** Used `git add -f` to force-add the .gitkeep placeholder
- **Commit:** f502d3f

## Known Stubs

None — this plan creates schema infrastructure and test scaffolding only. No data fetching or UI display logic exists yet that could be stubbed.

## Self-Check: PASSED

- [x] tests/gear-documents.test.ts exists — FOUND
- [x] prisma/migrations/20260403120000_add_gear_document/migration.sql exists — FOUND
- [x] lib/paths.ts exports getDocsDir() — FOUND
- [x] lib/parse-claude.ts exports GearDocumentResultSchema — FOUND
- [x] prisma/schema.prisma contains model GearDocument — FOUND
- [x] Commits 0981025, f502d3f, 6d4ddd9 exist — FOUND
- [x] All 4 Wave 0 tests pass — CONFIRMED
