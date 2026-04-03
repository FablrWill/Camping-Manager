---
phase: 25-gear-docs-manual-finder
plan: 02
subsystem: gear-documents-api
tags: [api, crud, claude, pdf-download, gear-documents]
dependency_graph:
  requires: [25-01]
  provides: [gear-document-crud-api, find-gear-manual, pdf-download-pipeline]
  affects: [lib/claude.ts, app/api/gear]
tech_stack:
  added: []
  patterns: [nextjs-route-handlers, claude-api-integration, content-type-validation, getDocsDir-pattern]
key_files:
  created:
    - app/api/gear/[id]/documents/route.ts
    - app/api/gear/[id]/documents/[docId]/route.ts
    - app/api/gear/[id]/documents/find/route.ts
    - app/api/gear/[id]/documents/[docId]/download/route.ts
  modified:
    - lib/claude.ts
decisions:
  - "findGearManual does not auto-save — returns results for UI confirmation (prevents saving bad AI predictions silently)"
  - "PDF download returns 422 for non-PDF content-type — prevents saving HTML error pages as PDFs"
  - "DELETE route uses getDocsDir() + basename() for file cleanup — matches established paths.ts pattern"
metrics:
  duration_minutes: 8
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_changed: 5
---

# Phase 25 Plan 02: Gear Document API Routes Summary

**One-liner:** All gear document CRUD, Claude-powered manual finder (no auto-save), and PDF download with content-type validation via 4 new API route files.

## What Was Built

Full backend API layer for gear documents:

- **GET /api/gear/:id/documents** — list all documents for a gear item, ordered by creation date desc
- **POST /api/gear/:id/documents** — create a document with url, title, type (defaults to support_link)
- **PATCH /api/gear/:id/documents/:docId** — update document title
- **DELETE /api/gear/:id/documents/:docId** — delete document + local PDF file if downloaded
- **POST /api/gear/:id/documents/find** — Claude-powered manual finder (returns predictions, does NOT auto-save)
- **POST /api/gear/:id/documents/:docId/download** — fetch remote PDF, validate content-type, save locally via getDocsDir()

Also added `findGearManual` export to `lib/claude.ts` with GearDocumentResultSchema import from `lib/parse-claude`.

## Commits

| Hash | Description |
|------|-------------|
| 37570eb | feat(25-02): document CRUD routes + findGearManual in claude.ts |
| 44e4d37 | feat(25-02): PDF download endpoint with content-type validation |

## Verification

- `npx vitest run tests/gear-documents.test.ts` — 4 tests passed
- All 4 route files exist under app/api/gear/[id]/documents/
- lib/claude.ts exports findGearManual
- All routes have try-catch with console.error + JSON error response
- PDF download uses getDocsDir() from lib/paths (not inline process.cwd)
- PDF download validates content-type before saving (422 for non-PDF)
- Find endpoint does NOT contain prisma.gearDocument.create (no auto-save)

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- [x] app/api/gear/[id]/documents/route.ts exists
- [x] app/api/gear/[id]/documents/[docId]/route.ts exists
- [x] app/api/gear/[id]/documents/find/route.ts exists
- [x] app/api/gear/[id]/documents/[docId]/download/route.ts exists
- [x] lib/claude.ts exports findGearManual (commit 37570eb)
- [x] All 4 tests pass
