---
phase: quick
plan: 260404-joc
subsystem: agent-jobs
tags: [scheduler, recurring-jobs, intelligence, dashboard]
dependency_graph:
  requires: [scripts/agent-runner.ts, app/api/agent/jobs/route.ts, prisma/schema.prisma]
  provides: [scheduled recurring AgentJobs, 4 job handlers, IntelligenceCard dashboard widget]
  affects: [DashboardClient, app/page.tsx, scripts/agent-runner.ts]
tech_stack:
  added: [scripts/scheduler.ts, lib/agent/jobs/]
  patterns: [setInterval polling, cron-lite nextOccurrence helper, job template + execution job split]
key_files:
  created:
    - prisma/migrations/20260404240000_add_scheduled_recurring_to_agent_job/migration.sql
    - lib/agent/jobs/deal-check.ts
    - lib/agent/jobs/maintenance-due.ts
    - lib/agent/jobs/trip-weather-alert.ts
    - lib/agent/jobs/weekly-briefing.ts
    - scripts/scheduler.ts
    - components/IntelligenceCard.tsx
  modified:
    - prisma/schema.prisma
    - app/api/agent/jobs/route.ts
    - app/api/agent/jobs/[id]/route.ts
    - scripts/agent-runner.ts
    - components/DashboardClient.tsx
    - app/page.tsx
decisions:
  - "Migration applied manually via better-sqlite3 (FTS triggers block prisma migrate dev — same pattern as Phase 34)"
  - "Scheduler uses template job + execution job split: template holds scheduledFor/recurringCron, execution job has neither (picked up by agent-runner as normal pending job)"
  - "PATCH /api/agent/jobs/[id] extended to accept scheduledFor field for scheduler to advance template jobs"
  - "nextOccurrence() supports only daily (0 H * * *) and weekly (0 H * * D) cron patterns — all 4 seeds fit this"
  - "deal-check uses Claude Haiku (claude-haiku-4-5-20250514) for cost-efficient batch price estimation"
  - "maintenance-due and weekly-briefing use pure DB queries — no Claude call needed"
  - "IntelligenceCard renders null when briefing is null — zero render cost when no briefing exists"
metrics:
  duration: ~15 min
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 14
---

# Quick Task 260404-joc: Extend AgentJob with Scheduled Recurring Jobs

**One-liner:** AgentJob extended with scheduledFor/recurringCron fields, 4 job handlers (deal_check, maintenance_due, trip_weather_alert, weekly_briefing), PM2 scheduler script, and IntelligenceCard dashboard widget.

## What Was Built

### Schema Migration
Added `scheduledFor DateTime?` and `recurringCron String?` to the AgentJob model with a supporting index. Applied manually via better-sqlite3 to work around FTS triggers that block `prisma migrate dev`.

### 4 Job Handlers (`lib/agent/jobs/`)
- **deal-check.ts**: Queries gear items with `targetPrice` set, calls Claude Haiku in batches of 10 to estimate market prices, flags items within 10% of target. Exports typed `DealCheckPayload` / `DealCheckResult`.
- **maintenance-due.ts**: Pure date math — finds gear items with `maintenanceIntervalDays` set and checks if they're overdue. Items never maintained (lastMaintenanceAt = null) are flagged with daysOverdue = 0. No Claude call.
- **trip-weather-alert.ts**: Queries trips starting within 5 days that have a location. Calls `fetchWeather()` per trip and flags precipProbability > 60%, heat >= 100°F, cold <= 25°F, or wind gusts >= 40mph.
- **weekly-briefing.ts**: Pure aggregation — reads the most recent done job of each type, parses their result JSON, and assembles a single briefing object.

### Scheduler Script (`scripts/scheduler.ts`)
- Seeds 4 recurring job templates on startup (one per job type) if they don't already exist.
- Polls every 60 seconds: fetches jobs where `scheduledFor <= now`, creates a regular pending execution job (no scheduledFor) for agent-runner to pick up, and advances the template's `scheduledFor` to the next occurrence.
- Lightweight cron parser `nextOccurrence()` handles daily and weekly patterns.

### Agent-Runner Wiring
4 new processors registered in `scripts/agent-runner.ts` processors map.

### IntelligenceCard Component
Client component with collapsible Deals (emerald), Maintenance (amber), and Weather (sky) sections. Shows "All clear" message when all counts are zero. Renders `null` when no briefing data exists.

### Dashboard Integration
- `app/page.tsx` queries the latest `weekly_briefing` done job and parses its result.
- `DashboardClient.tsx` renders `<IntelligenceCard briefing={latestBriefing} />` between the trip prep stepper and the quick stats grid.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] PATCH /api/agent/jobs/[id] didn't support scheduledFor**
- **Found during:** Task 2 (writing scheduler)
- **Issue:** The scheduler needs to PATCH the template job's `scheduledFor` to advance it to the next occurrence. The existing PATCH handler only supported `status` and `readAt` updates.
- **Fix:** Added `scheduledFor` field support in the PATCH handler with ISO string validation.
- **Files modified:** `app/api/agent/jobs/[id]/route.ts`
- **Commit:** b64f358

**2. [Rule 3 - Blocking Issue] prisma migrate dev blocked by FTS triggers**
- **Found during:** Task 1 (migration step)
- **Issue:** FTS triggers in existing migrations cause `prisma migrate dev` to fail with "duplicate column name" on shadow DB. Same issue documented in STATE.md Phase 34 decisions.
- **Fix:** Created migration SQL manually, applied via better-sqlite3, registered in `_prisma_migrations` table.
- **Files modified:** `prisma/migrations/20260404240000_add_scheduled_recurring_to_agent_job/migration.sql`
- **Commit:** 624b5b8

## Known Stubs

None — all handlers are fully wired with real DB queries and job processing logic.

## Self-Check: PASSED
