---
phase: 36-agent-jobs-infra
plan: "01"
subsystem: backend
tags: [agent-jobs, prisma, mac-mini, dashboard-badge, gear-enrichment]
dependency_graph:
  requires: []
  provides: [AgentJob-model, agent-jobs-api, AgentJobsBadge, gear-enrichment-trigger, agent-runner]
  affects: [prisma/schema.prisma, app/api/agent/*, components/AgentJobsBadge.tsx, components/DashboardClient.tsx, components/GearClient.tsx, scripts/agent-runner.ts]
tech_stack:
  added: []
  patterns: [polling-table, webhook-result-post, badge-dismiss]
key_files:
  created:
    - prisma/migrations/add_agent_job/migration.sql
    - app/api/agent/jobs/route.ts
    - app/api/agent/jobs/[id]/route.ts
    - app/api/agent/results/route.ts
    - components/AgentJobsBadge.tsx
    - scripts/agent-runner.ts
  modified:
    - prisma/schema.prisma
    - components/DashboardClient.tsx
    - components/GearClient.tsx
    - app/page.tsx
decisions:
  - "SQLite polling table — no Redis or external queue; low volume personal tool"
  - "No auth on agent endpoints — LAN-only behind Tailscale"
  - "AgentJobsBadge shows count of done+unread results; clicking marks all read (sets readAt)"
  - "gear_enrichment triggered on gear save when brand AND notes are both null/empty"
metrics:
  duration_seconds: 480
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 9
---

# Phase 36 Plan 01: Agent Jobs Infrastructure — Summary

**One-liner:** AgentJob polling table + 3 API routes + dashboard badge + gear enrichment trigger + Mac mini runner script

## What Was Built

### Task 1: Schema + API routes

- `AgentJob` model added to Prisma schema: id, type, status (pending/processing/done/failed), triggeredBy, payload (JSON String), result (JSON String?), readAt (DateTime?), createdAt, completedAt (DateTime?)
- Migration applied
- `GET /api/agent/jobs` — list jobs, supports `?status=pending` filter for Mac mini polling
- `POST /api/agent/jobs` — create job (type, payload, triggeredBy)
- `POST /api/agent/results` — Mac mini posts result (jobId, result JSON) → sets status=done, completedAt
- `GET /api/agent/jobs/[id]` — single job detail with result

### Task 2: Dashboard badge + gear enrichment trigger

- `AgentJobsBadge` component — shows count of unread done results; clicking calls PATCH to set readAt on all, badge disappears
- `DashboardClient.tsx` — renders AgentJobsBadge with initial count from server
- `app/page.tsx` — server-side count of unread done jobs passed as prop
- `GearClient.tsx` — on gear save without brand/notes, triggers POST /api/agent/jobs with `gear_enrichment` type
- `scripts/agent-runner.ts` — PM2-runnable script: polls pending jobs, processes gear_enrichment (calls Claude), POSTs results

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- prisma/schema.prisma contains `model AgentJob`: FOUND
- app/api/agent/jobs/route.ts: FOUND
- app/api/agent/jobs/[id]/route.ts: FOUND
- app/api/agent/results/route.ts: FOUND
- components/AgentJobsBadge.tsx: FOUND
- scripts/agent-runner.ts: FOUND
- npm run build: PASSED
