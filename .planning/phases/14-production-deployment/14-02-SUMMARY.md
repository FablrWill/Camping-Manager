# Phase 14 Plan 02 — Execution Summary

**Date:** 2026-04-02
**Plan:** 14-02-PLAN.md — PM2 config, deploy script, backup, watchdog

## Files Created

### `ecosystem.config.js` (git root)
PM2 process definition for Outland OS. Key constraints enforced:
- `exec_mode: 'fork'` — SQLite cannot run in cluster mode
- `cwd: path.resolve(__dirname)` — required for launchd boot persistence so PM2 finds .env and the standalone build regardless of working directory at boot
- `HOSTNAME: '0.0.0.0'` — required for Tailscale access (not just loopback)
- Logs to `/data/outland/logs/`, 10 max restarts, 4s restart delay

### `deploy.sh` (git root, executable)
One-command deploy: `ssh mac-mini 'cd ~/outland && ./deploy.sh'`
Steps in order:
1. `git pull --ff-only` — fails fast if branch has diverged
2. `npm ci --omit=dev` — reproducible install
3. Create `/data/outland/{photos,backups,logs}` directories
4. Bump service worker cache names with deploy timestamp (forces clients to re-fetch shell on next visit)
5. `prisma migrate deploy` — applies any pending migrations against production DB
6. `npm run build` — standalone output
7. Wire `public/` and `.next/static/` into standalone build
8. Symlink `$DATA_DIR/photos` into standalone public — photos survive rebuilds
9. Patch `server.js` localhost binding (known Next.js standalone bug)
10. `pm2 restart outland || pm2 start` + `pm2 save`

`set -euo pipefail` throughout — build failure leaves PM2 running the previous version.

### `scripts/outland-backup.sh` (executable)
Daily SQLite backup via `sqlite3 .backup` (hot backup, safe while app is running).
- Cron: `0 2 * * *` — runs at 2am
- Output: `/data/outland/backups/db-YYYYMMDD.sqlite`
- On failure: sends iMessage via osascript to `NOTIFY_NUMBER`
- `NOTIFY_NUMBER` loaded from env or from `~/outland/.env` automatically

### `scripts/outland-watchdog.sh` (executable)
Polls PM2 restart counter every 5 minutes via cron (`*/5 * * * *`).
- Reads `pm2 jlist` JSON, sums `restart_time` for the `outland` process
- Compares against saved count in `/data/outland/logs/last_restart_count`
- Sends iMessage alert if count increased
- Uses python3 to parse PM2 JSON (available on macOS without extra installs)

## .env.example
`NOTIFY_NUMBER` was already present in `.env.example` (added in an earlier plan). No change needed.

## Verification
All 14 checks passed:
- ecosystem: fork mode, cwd present
- deploy.sh: executable, set -euo pipefail, prisma migrate deploy, ln -sfn symlink, valid bash
- backup: executable, sqlite3 .backup, osascript iMessage, valid bash
- watchdog: executable, pm2 jlist, valid bash
