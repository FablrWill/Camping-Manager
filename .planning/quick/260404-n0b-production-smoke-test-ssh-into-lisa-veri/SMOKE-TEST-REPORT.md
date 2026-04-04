# Production Smoke Test Report

**Date:** 2026-04-04
**Tester:** Claude Code (automated)
**Commit:** 58a3590
**Session:** 260404-n0b

---

## 1. Deployment State

| Field | Value |
|-------|-------|
| Host | lisa (Mac mini, production) |
| PM2 Process | outland |
| PM2 Status | online |
| PM2 PID | 70812 |
| PM2 Uptime | ~3 min (after smoke-test restart) |
| PM2 Restarts | 201 (historical, many from dev iterations) |
| Memory | 211 MB |
| Production commit (before pull) | d970b96 |
| Production commit (after pull) | 58a3590 (latest main) |
| Commits behind main before pull | 654 |
| Build | SUCCESS (TypeScript passed, Turbopack) |
| Migrations applied | All 43 — 3 required --applied workarounds (columns/tables existed from prior manual migrations) |

**Migration workarounds applied:**
- `20260404150001_add_gear_research_fields` — marked applied; `researchResult` column already existed
- `20260404239900_add_agent_job_kit_preset` — marked applied; `AgentJob` and `KitPreset` tables already existed
- `20260404260001_add_trip_emergency_contacts` — marked applied; `emergencyContactName` column already existed

**Manual column fix:**
- `MealPlan.prepGuide` was missing (migration `20260404000000_add_meal_feedback` was listed twice with `applied_steps_count: 0`). Column applied manually via `ALTER TABLE MealPlan ADD COLUMN "prepGuide" TEXT`. Migration record updated to `applied_steps_count: 1`.

---

## 2. DB Backup

| File | Size | Time |
|------|------|------|
| `db-pre-smoketest-20260404.sqlite` | 425,984 bytes | 2026-04-04 16:37 |
| Prior backup `db-20260404.sqlite` | 425,984 bytes | 2026-04-04 02:00 |
| Prior backup `db-20260403.sqlite` | 294,912 bytes | 2026-04-03 02:00 |

Backup confirmed at `~/outland-data/backups/db-pre-smoketest-20260404.sqlite` before any changes.

---

## 3. Feature Verification

### 3a. Core CRUD Endpoints

| # | Endpoint | HTTP | Result | Notes |
|---|----------|------|--------|-------|
| 1 | GET /api/health | 200 | PASS | `{"status":"ok","uptime":20,"lastBackup":"..."}` |
| 2 | GET /api/gear | 200 | PASS | Returns `[]` — no gear seeded in production yet |
| 3 | GET /api/trips | 200 | PASS | Returns 1 trip (id: `cmnibz0js0001q8c30ie7sxzu`, name: "test") |
| 4 | GET /api/locations | 200 | PASS | Returns `[]` — no locations yet |
| 5 | GET /api/photos | 200 | PASS | Returns `[]` — no photos yet |
| 6 | GET /api/vehicle | 200 | PASS | Returns `[]` — no vehicle added yet |
| 7 | GET /api/trails | 200 | PASS | Returns `[]` — no GPX trails imported yet |
| 8 | GET /api/kits | 200 | PASS | Returns `[]` — no kit presets yet |

### 3b. Feature Endpoints

| # | Endpoint | HTTP | Result | Notes |
|---|----------|------|--------|-------|
| 9 | GET /api/departure-checklist | 400 | PASS | Correctly requires `tripId` param |
| 10 | GET /api/departure-checklist?tripId={id} | 200 | PASS | Returns `{"result":null}` — no checklist generated yet |
| 11 | GET /api/settings | 200 | PASS | Returns settings object with null emergency contacts |
| 12 | GET /api/knowledge/stats | 200 | PASS | `{"chunkCount":0,"lastRefreshed":null,"sourceCount":3}` |
| 13 | GET /api/medications | 200 | PASS | Returns `[]` |
| 14 | GET /api/inbox | 200 | PASS | Returns `[]` |
| 15 | GET /api/agent/jobs | 200 | PASS | Returns `[]` — no jobs queued |
| 16 | GET /api/agent/memory | 200 | PASS | Returns `{"memories":[]}` |
| 17 | GET /api/timeline | 200 | PASS | Returns empty timeline with correct structure |
| 18 | GET /api/locations/signal-summary | 200 | PASS | Returns `{}` — no locations yet |
| 19 | GET /api/vehicle-checklist | 400 | PASS | Correctly requires `tripId` param |
| 20 | GET /api/vehicle-checklist?tripId={id} | 200 | PASS | Returns `{"result":null,"generatedAt":null}` |

### 3c. Trip-Specific Endpoints (using trip id: `cmnibz0js0001q8c30ie7sxzu`)

| # | Endpoint | HTTP | Result | Notes |
|---|----------|------|--------|-------|
| 21 | GET /api/trips/{id} | 200 | PASS | Returns full trip detail object |
| 22 | GET /api/trips/{id}/prep | 200 | PASS | Returns prep data with correct structure |
| 23 | GET /api/trips/{id}/meal-plan | 200 | PASS | Returns `{"mealPlan":null}` — after prepGuide column fix |
| 24 | GET /api/trips/intelligence | 200 | PASS | Returns `{"report":null}` — no intelligence data yet |

### 3d. AI-Powered Endpoints

| # | Endpoint | HTTP | Result | Notes |
|---|----------|------|--------|-------|
| 25 | POST /api/chat | 200 | FAIL | Stream returns error event — `ANTHROPIC_API_KEY` is empty in PM2 environment (Claude Desktop env var collision, see Issue #1) |

### 3e. Other Endpoints Checked

| # | Endpoint | HTTP | Result | Notes |
|---|----------|------|--------|-------|
| 26 | GET /api/gear/documents | 404 | PASS | Correctly requires gear item ID in path |
| 27 | GET /api/gear/price-check | 404 | PASS | Correctly requires gear item ID in path |
| 28 | GET /api/camping-profile | 404 | FAIL | Route not found — CampingProfile model exists in DB but route may not be wired yet |

---

## 4. Background Services

### PM2 Processes

| Process | Status | Notes |
|---------|--------|-------|
| outland (id: 0) | online | Main Next.js app — healthy |
| outland-agent | NOT RUNNING | Agent runner never started — see Issue #2 |

### Cron Jobs

| Schedule | Script | Purpose |
|----------|--------|---------|
| 0 2 * * * (2am daily) | `scripts/outland-backup.sh` | Nightly DB backup |
| */5 * * * * (every 5 min) | `scripts/outland-watchdog.sh` | PM2 health watchdog |

Both cron jobs are registered. Last backup: `db-20260404.sqlite` at 2:00 AM (ran successfully).

### AgentJob Table

```json
[]
```

No agent jobs have been created or run. Knowledge base chunk count is 0 (`sourceCount: 3` means source definitions exist but no chunks ingested).

---

## 5. Issues Found

### Issue 1 — CRITICAL: ANTHROPIC_API_KEY empty in PM2 environment

**Description:** All AI-powered features (chat, packing list generation, meal plan generation, departure checklist generation, kit review) fail with "Could not resolve authentication method". PM2 inherited `ANTHROPIC_API_KEY=""` from the Claude Desktop app environment when PM2 was first started. This empty value overrides the key in `.env`.

**Root cause:** Claude Desktop sets `ANTHROPIC_API_KEY=""` (empty) in its process environment. When PM2 was started from a terminal session where Claude Desktop was running, PM2 saved this empty value into its process store. `pm2 restart --update-env` does not fix this because the shell environment still has `ANTHROPIC_API_KEY=""`.

**Evidence:** `pm2 env 0 | grep ANTHROPIC_API_KEY` shows empty value. `.env` file has correct key. `node -e 'require("dotenv").config()...'` reads it correctly.

**Severity:** CRITICAL — all AI features are completely broken in production.

**Fix:** Unset `ANTHROPIC_API_KEY` from the PM2 saved environment, then restart:
```bash
ssh lisa 'export PATH="/opt/homebrew/bin:$PATH"
# Option A: Use pm2 delete + restart with clean env
pm2 delete outland
cd ~/outland
unset ANTHROPIC_API_KEY
pm2 start ecosystem.config.js --env production
pm2 save'
```

**Suggested session:** Fix immediately before any demo/field testing.

---

### Issue 2 — HIGH: outland-agent process not running

**Description:** The `outland-agent` background process (agent runner for gear deals, enrichment, knowledge base refresh) is not registered or running in PM2. The ecosystem.config.js defines it, but `pm2 list` shows only the main `outland` process.

**Root cause:** When PM2 was initially configured, only `outland` was started (not `pm2 start ecosystem.config.js --env production`). The agent runner was added later and never started on production.

**Severity:** HIGH — background AI enrichment, knowledge base refresh, and scheduled tasks are not running. The knowledge base has 0 chunks ingested.

**Fix:**
```bash
ssh lisa 'export PATH="/opt/homebrew/bin:$PATH"
cd ~/outland
pm2 start ecosystem.config.js --env production
pm2 save'
```
Note: Do NOT start the agent before fixing Issue 1 — it will fail immediately without the API key.

**Suggested session:** Fix after Issue 1. Part of S40 production hardening.

---

### Issue 3 — HIGH: Knowledge base not seeded (0 chunks)

**Description:** `/api/knowledge/stats` returns `{"chunkCount":0,"lastRefreshed":null,"sourceCount":3}`. The source definitions exist but no content has been ingested. Chat agent has no camping knowledge to draw from.

**Root cause:** Knowledge base ingest never ran on production. Likely blocked by Issue 1 (API key) and Issue 2 (agent not running).

**Severity:** HIGH — chat agent has no knowledge base; all responses will be generic Claude answers, not Outland-specific camping intelligence.

**Fix:** After fixing Issues 1 and 2, trigger knowledge base refresh:
```bash
ssh lisa 'curl -X POST http://localhost:3000/api/knowledge/refresh'
```

**Suggested session:** S40 production hardening — run after agent is started.

---

### Issue 4 — HIGH: MealPlan.prepGuide column was missing (fixed in this session)

**Description:** `GET /api/trips/{id}/meal-plan` returned 500 with "The column MealPlan.prepGuide does not exist". Migration `20260404000000_add_meal_feedback` was recorded twice in `_prisma_migrations` with `applied_steps_count: 0`.

**Root cause:** Phase 35 migration history conflict — FTS triggers blocked `prisma migrate deploy` and migration was applied manually on MacBook but not correctly tracked for production. The migration tracking showed two duplicate entries with 0 applied steps.

**Status:** FIXED in this session — `ALTER TABLE MealPlan ADD COLUMN "prepGuide" TEXT` applied directly, migration record corrected.

**Severity:** HIGH (was) — now resolved.

---

### Issue 5 — MEDIUM: Migration drift — 3 migrations required --applied workarounds

**Description:** When running `prisma migrate deploy`, three migrations failed with "duplicate column/table" errors because the data existed but was applied manually (outside of Prisma) in development. Required marking each as applied without re-running.

**Root cause:** Development sessions applied schema changes manually via `better-sqlite3` or direct SQL, creating drift between the migration files and what's tracked in `_prisma_migrations`.

**Severity:** MEDIUM — Production deployments require manual intervention; risky for future deploys.

**Fix:** Before each production deploy, verify migration state with:
```bash
ssh lisa 'cd ~/outland && DATABASE_URL="file:$HOME/outland-data/db.sqlite" npx prisma migrate status'
```
Long-term: establish a pre-deploy migration check in the deploy script.

**Suggested session:** S40 or S58 (security/hardening).

---

### Issue 6 — MEDIUM: /api/camping-profile route not found (404)

**Description:** GET /api/camping-profile returns a 404 HTML page. The `CampingProfile` model exists in the database schema and there are references to it in migrations, but no API route file was found.

**Severity:** MEDIUM — feature not accessible but no data loss risk.

**Fix:** Verify if a route file exists and if it was missed in the build, or if this feature is intentionally not yet exposed via API.

---

### Issue 7 — LOW: 199–201 PM2 restarts (historical noise)

**Description:** PM2 shows 201 restarts. This is historical from development iterations (each `npm run build` + deploy creates a restart). Not a current stability concern — the app has been stable since last night.

**Severity:** LOW — informational. Consider `pm2 reset outland` to clear the restart counter for clean production baseline.

---

## 6. Summary

| Category | Count |
|----------|-------|
| PASS | 24 |
| FAIL | 2 |
| SKIP | 0 |
| Total tested | 26 |

**PASS rate: 92%** (24/26)

### Overall Assessment: NOT READY for field use — fix Issues 1 and 2 first

The core app infrastructure is solid: the app builds cleanly, deploys correctly, runs stably, and all CRUD endpoints work. The database backup system is running. The fundamental data model is correct and intact.

However, **all AI features are completely non-functional** due to the empty `ANTHROPIC_API_KEY` in the PM2 environment (Issue 1). This is a blocking issue for the "camping second brain" value proposition — packing lists, meal plans, departure checklists, chat agent, and kit review all fail silently.

### Pre-field readiness checklist:

- [ ] Issue 1: Fix ANTHROPIC_API_KEY in PM2 environment (30 min)
- [ ] Issue 2: Start outland-agent process (5 min, after Issue 1)
- [ ] Issue 3: Seed knowledge base with camping content (1 hr, after Issue 2)
- [ ] Add real gear inventory (user task)
- [ ] Add vehicle profile (user task)
- [ ] Test full trip creation + packing list + meal plan flow (30 min)

**After those 5 items: production-ready for first field trip.**
