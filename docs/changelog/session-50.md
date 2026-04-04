# Session 50 — Production Smoke Test + Deployment Fixes

**Date:** 2026-04-04
**Phase:** 59 — Production Smoke Test

## What Was Done

### 1. Full production deployment to HEAD
- Mac mini (`lisa`) was 654 commits behind main
- DB backed up to `~/outland-data/backups/db-pre-smoketest-20260404.sqlite`
- Applied all 43 pending migrations via `prisma migrate deploy` (3 `--applied` workarounds for pre-existing columns)
- Built production app (TypeScript clean, 24.6s Turbopack build)
- Restarted PM2

### 2. Fixed ANTHROPIC_API_KEY collision
- Root cause: `~/.env.lisaos` (a separate LisaOS project) is sourced by `.zprofile`, setting `ANTHROPIC_API_KEY` in the login shell environment
- When PM2 previously started, it inherited an empty/wrong key from the shell
- Fix: copied the valid key from `~/.env.lisaos` into `~/outland/.next/standalone/.env` (the file Next.js standalone actually reads at runtime — NOT `~/outland/.env`)
- Chat, packing lists, meal plans, and AI features are now working

### 3. Fixed DATABASE_URL collision
- Same `~/.env.lisaos` sets `DATABASE_URL=postgresql://lisaos_user@localhost/lisaos` for LisaOS's Postgres DB
- This bled into the PM2 process environment via `--update-env`, pointing Prisma at Postgres instead of SQLite
- Fix: added `DATABASE_URL: 'file:/Users/lisa/outland-data/db.sqlite'` explicitly to `ecosystem.config.js` `env_production`
- This value now wins regardless of shell environment

### 4. Fixed missing static assets
- Next.js standalone output requires manually copying `.next/static` and `public` into the standalone directory after each build
- The deploy script (`scripts/deploy.sh`) already does this correctly — the smoke test had bypassed it
- Copied manually to unblock, then subsequent rebuild used the correct path

### 5. Fixed static page caching (empty gear/trips/dashboard)
- Next.js was statically rendering all data pages at build time (when the DB was empty)
- Result: pages were served as frozen HTML with `initialItems: []` even after the DB was populated
- Fix: added `export const dynamic = 'force-dynamic'` to all 12 data pages
- Committed to main, pulled on lisa, rebuilt — all pages now show `ƒ (Dynamic)` in build output

### 6. Seeded production database
- `npm run db:seed` on lisa populated production with:
  - Vehicle: 2022 Santa Fe Hybrid + 3 mods
  - 33 gear items
  - 4 locations + 4 trips

## Smoke Test Results

**24/26 endpoints PASS** after fixes.

| Endpoint | Result |
|----------|--------|
| All 8 core CRUD endpoints | PASS |
| Chat (`/api/chat`) | PASS (after key fix) |
| Gear, trips, locations, vehicle | PASS |
| Departure checklist | PASS |
| Knowledge base stats | PASS |
| `/api/camping-profile` | FAIL — route not found (S40 bug) |

## Known Issues for S40

| # | Issue | Severity |
|---|-------|----------|
| 1 | `navigator.onLine` reports false on iOS with Tailscale (offline banner shown) | MEDIUM |
| 2 | `/api/camping-profile` returns 404 | MEDIUM |
| 3 | `outland-agent` in waiting/restart loop | HIGH |
| 4 | Knowledge base: 0 chunks ingested | HIGH |
| 5 | Migration drift — 3 `--applied` workarounds at deploy | MEDIUM |
| 6 | `ecosystem.config.js` DATABASE_URL now hardcoded (good fix, but document it) | LOW |

## App Status After This Session

- Accessible at `http://100.107.148.29:3000` via Tailscale (HTTP only — HTTPS is S40 work)
- AI chat working
- Gear (33 items), vehicle, trips visible
- Dashboard loads with stats
- Offline banner visible on iOS (cosmetic — app is functional)
