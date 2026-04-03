# Session 27 — 2026-04-02

## Phase 14: Production Deployment — Execution Complete

Executed all three plans for Phase 14, wiring up Outland OS for production deployment on the Mac mini.

### What was built

**Plan 01 — App-level changes:**
- `next.config.ts` — added `output: 'standalone'` for self-contained builds
- `lib/paths.ts` (new) — `getPhotosDir()` and `resolvePhotoPath()` toggle between `PHOTOS_DIR` env var (production) and `public/photos` (dev)
- `app/api/health/route.ts` (new) — `GET /api/health` returns `{status, uptime, lastBackup, timestamp}` — bookmarkable from phone
- `app/api/photos/upload/route.ts` — switched to `getPhotosDir()`
- `app/api/photos/[id]/route.ts` — switched to `resolvePhotoPath()`
- `app/api/import/photos/route.ts` — switched to `getPhotosDir()`
- `.env.example` — added production section: `PHOTOS_DIR`, `DATABASE_URL`, `DATA_DIR`, `NOTIFY_NUMBER`

**Plan 02 — Deploy infrastructure:**
- `ecosystem.config.js` — PM2 config: fork mode (SQLite constraint), `cwd` for launchd boot persistence, `HOSTNAME: '0.0.0.0'` for Tailscale
- `deploy.sh` — one-command deploy: pull → install → SW version bump → migrate → build → copy assets → symlink photos → PM2 restart; `set -euo pipefail` keeps old version running on build failure
- `scripts/outland-backup.sh` — daily `sqlite3 .backup` with iMessage alert on failure
- `scripts/outland-watchdog.sh` — 5-min cron detects PM2 restart count increase, sends iMessage alert

**Plan 03 — Setup guide + verification:**
- `docs/MAC-MINI-SETUP.md` — 10-step first-time setup guide with required photo migration, PM2 boot persistence, crontab setup, and troubleshooting
- `npm run build` — verified standalone build succeeds

### Known note
In the worktree environment, Next.js infers a workspace root and nests `server.js` deeper. In production at `~/outland` (no parent lockfiles), `server.js` lands at the standard `.next/standalone/server.js`. The PM2 config path is correct for production.

### Awaiting
Human checkpoint per plan 03 — Will needs to verify the build output and confirm pm2 startup and photo migration will be executed.
