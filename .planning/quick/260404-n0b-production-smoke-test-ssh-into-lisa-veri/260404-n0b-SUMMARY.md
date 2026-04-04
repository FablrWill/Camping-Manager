---
phase: quick
plan: 260404-n0b
subsystem: production-ops
tags: [smoke-test, production, deployment, lisa, v5.0]
dependency_graph:
  requires: []
  provides: [SMOKE-TEST-REPORT, production-baseline]
  affects: [S40-hardening, S58-security]
tech_stack:
  added: []
  patterns: [ssh-ops, prisma-migrate-deploy, pm2-ops]
key_files:
  created:
    - .planning/quick/260404-n0b-production-smoke-test-ssh-into-lisa-veri/SMOKE-TEST-REPORT.md
  modified: []
decisions:
  - "MealPlan.prepGuide applied via ALTER TABLE directly (not via Prisma) — migration record was duplicated with 0 steps applied"
  - "Three --applied workarounds for migrations where data existed from prior manual operations"
  - "Smoke test is observe-and-document; chat fix deferred to user action (PM2 env)"
metrics:
  duration: 15 min
  completed: 2026-04-04
  tasks_completed: 2
  files_created: 1
---

# Quick Task 260404-n0b: Production Smoke Test Summary

## One-Liner

Full production deploy to latest main (654 commits), schema migration, build, and 26-endpoint smoke test revealing ANTHROPIC_API_KEY env collision as the critical blocker for all AI features.

## What Was Done

### Task 1: Deployment Verification and Sync

- SSHed into lisa (production Mac mini)
- Confirmed PM2 `outland` was running but 654 commits behind main
- Backed up DB to `~/outland-data/backups/db-pre-smoketest-20260404.sqlite`
- Pulled latest main — `d970b96` → `58a3590`
- Applied all 43 migrations via `prisma migrate deploy` with 3 `--applied` workarounds for columns/tables that pre-existed from manual development
- Fixed `MealPlan.prepGuide` missing column (migration recorded with 0 applied steps — applied manually)
- Regenerated Prisma client (`prisma generate` required — new models not in old client)
- Built production app — TypeScript passed, Turbopack compiled in 24.6s
- Restarted PM2 — `outland` confirmed online at 211MB

### Task 2: Feature Endpoint Verification

Tested 26 endpoints across all feature categories:

**PASS (24/26):**
- All 8 core CRUD endpoints (gear, trips, locations, photos, vehicle, trails, kits, health)
- All 12 feature endpoints (settings, knowledge/stats, medications, inbox, agent/jobs, agent/memory, timeline, signal-summary, departure-checklist, vehicle-checklist)
- All 4 trip-specific endpoints (single trip, prep, meal-plan, intelligence)

**FAIL (2/26):**
- `POST /api/chat` — ANTHROPIC_API_KEY empty in PM2 environment
- `GET /api/camping-profile` — route returns 404

## Issues Found (for S40 follow-up)

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| 1 | ANTHROPIC_API_KEY empty in PM2 env (Claude Desktop collision) | CRITICAL | Open |
| 2 | outland-agent not running | HIGH | Open |
| 3 | Knowledge base: 0 chunks ingested | HIGH | Open |
| 4 | MealPlan.prepGuide column missing | HIGH | Fixed this session |
| 5 | Migration drift — 3 --applied workarounds needed | MEDIUM | Open |
| 6 | /api/camping-profile route not found | MEDIUM | Open |
| 7 | 201 PM2 restarts (dev noise) | LOW | Open |

## Pre-Field Checklist

- [ ] Fix ANTHROPIC_API_KEY in PM2 env (delete + restart without Claude Desktop env)
- [ ] Start outland-agent process
- [ ] Trigger knowledge base refresh
- [ ] Add gear inventory and vehicle profile
- [ ] End-to-end trip flow test (packing list + meal plan)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed MealPlan.prepGuide missing column**
- **Found during:** Task 1 (migration deploy) / first confirmed in Task 2 endpoint test
- **Issue:** Migration `20260404000000_add_meal_feedback` was recorded twice in `_prisma_migrations` with `applied_steps_count: 0`. The `prepGuide` TEXT column was never added to production despite being in the schema.
- **Fix:** Applied `ALTER TABLE MealPlan ADD COLUMN "prepGuide" TEXT` via better-sqlite3 node script; updated both duplicate migration records to `applied_steps_count: 1`
- **Files modified:** Production DB only (no code changes)
- **Effect:** `/api/trips/{id}/meal-plan` now returns 200 instead of 500

**2. [Rule 3 - Blocking] Applied 3 migration --applied workarounds**
- **Found during:** Task 1 (prisma migrate deploy)
- **Issue:** Three migrations tried to create columns/tables that already existed in production DB from prior manual operations during development
- **Fix:** `prisma migrate resolve --applied <migration-name>` for each, then re-ran deploy
- **No data was altered**

## Self-Check

Verified:
- SMOKE-TEST-REPORT.md: 273 lines, 32 PASS/FAIL/SKIP occurrences
- Report includes deployment state, migration history, all endpoints, background services, and issues list
- No destructive commands run: no `db:reset`, no `migrate dev`, no `db push`
