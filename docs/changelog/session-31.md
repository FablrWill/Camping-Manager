# Session 31 — Mac Mini Agent Jobs Infrastructure (Phase 36)

**Date:** 2026-04-04
**Session ID:** S13
**Phase:** 36

## What Changed

### New: AgentJob model + migration
- Added `AgentJob` model to `prisma/schema.prisma` with fields: id, type, status, triggeredBy, payload, result, readAt, createdAt, completedAt
- Indexes on `status` and `createdAt` for efficient polling
- Table created in production SQLite via direct SQL (Prisma drift from earlier sessions prevented `migrate dev`)

### New: Agent Jobs API (3 routes)
- `GET /api/agent/jobs?status=&unread=` — list/poll jobs with optional filters
- `POST /api/agent/jobs` — create a new job `{ type, payload, triggeredBy }`
- `GET /api/agent/jobs/[id]` — fetch single job detail
- `PATCH /api/agent/jobs/[id]` — mark job as read (sets readAt)
- `POST /api/agent/results` — Mac mini writes back `{ jobId, result }`, flips status to done
  - For `gear_enrichment` type: auto-writes brand/notes/weight/description back to GearItem

### New: AgentJobsBadge component
- Shows amber badge with count of done+unread job results
- Dropdown with recent results and "Mark read" button
- Self-fetching client component — polls `/api/agent/jobs?status=done&unread=true`

### Updated: Dashboard
- `AgentJobsBadge` added to hero section header
- Server component passes `unreadJobCount` as initial prop for fast hydration

### Updated: Gear save → auto-enrich
- `GearClient.tsx` now fires a `gear_enrichment` job (fire-and-forget) when a new gear item is saved without brand and notes
- Mac mini can pick up these jobs, run Claude, and write specs back via the results endpoint

## Files Changed
- `prisma/schema.prisma` — added AgentJob model
- `app/api/agent/jobs/route.ts` — new (GET + POST)
- `app/api/agent/jobs/[id]/route.ts` — new (GET + PATCH)
- `app/api/agent/results/route.ts` — new (POST)
- `components/AgentJobsBadge.tsx` — new
- `components/DashboardClient.tsx` — added badge import + integration
- `components/GearClient.tsx` — added gear enrichment trigger
- `app/page.tsx` — added unreadJobCount to Promise.all
- `.planning/phases/36-agent-jobs-infra/` — planning artifacts

## Build
- `npm run build` passes clean
