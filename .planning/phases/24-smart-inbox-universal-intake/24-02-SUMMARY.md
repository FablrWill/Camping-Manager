---
phase: 24-smart-inbox-universal-intake
plan: 02
subsystem: intake-api
tags: [intake, inbox, api-routes, accept, reject]
dependency_graph:
  requires: [24-01]
  provides: [intake-post-endpoint, inbox-crud, accept-route, reject-route]
  affects: [app/api/intake/, app/api/inbox/]
tech_stack:
  added: [app/api/intake/route.ts, app/api/inbox/]
  patterns: [formdata-upload, prisma-inboxitem, next-route-handlers]
key_files:
  created:
    - app/api/intake/route.ts
    - app/api/inbox/route.ts
    - app/api/inbox/[id]/route.ts
    - app/api/inbox/[id]/accept/route.ts
    - app/api/inbox/[id]/reject/route.ts
  modified: []
decisions:
  - "[Phase 24]: Accept route for gear type only marks InboxItem status='accepted' — entity creation handled client-side via GearForm -> /api/gear"
  - "[Phase 24]: Accept route includes null guard before JSON.parse(item.suggestion) — returns 422 if suggestion is null"
  - "[Phase 24]: Intake POST endpoint accepts FormData with text, url, or file fields — delegates to triage router"
metrics:
  duration_seconds: 0
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 5
  files_modified: 0
  note: "Work executed as part of plan 24-01 pass — all API routes built in single executor run"
---

# Phase 24 Plan 02: Intake API Routes Summary

**One-liner:** All API routes for intake POST and inbox CRUD (list, get, delete, accept, reject) — built as part of plan 24-01 executor run.

## What Was Built

**POST /api/intake** — accepts FormData with `text`, `url`, or `file` field; calls `triageInput()` from `lib/intake/triage.ts`; stores resulting `InboxItem` in DB; returns the created item.

**GET /api/inbox** — returns items filtered by status (default: pending), ordered by `createdAt` desc, limit 50.

**GET /api/inbox/[id]** — fetch single item by id.

**DELETE /api/inbox/[id]** — hard delete of inbox item.

**POST /api/inbox/[id]/accept** — null-guards `item.suggestion`, parses SuggestionSchema, marks InboxItem `status='accepted'`, returns suggestion for client-side pre-fill navigation. Gear branch does NOT call `prisma.gearItem.create` (client handles entity creation via GearForm → POST /api/gear).

**POST /api/inbox/[id]/reject** — marks InboxItem `status='rejected'`.

## Deviations from Plan

None — implemented exactly as planned. Work was completed in the plan 24-01 executor pass.

## Known Stubs

- Accept route for `knowledge` and `tip` triageTypes marks as accepted but does not pipe to RAG ingest pipeline (noted in 24-01 SUMMARY).

## Self-Check: PASSED

- All 5 API route files exist on disk
- Routes follow project pattern: try-catch + console.error + NextResponse.json
- No alert() usage — state-based errors throughout
