# Phase 14: Production Deployment - Research

**Researched:** 2026-04-02
**Domain:** Node.js production deployment — PM2, Next.js standalone, SQLite, macOS launchd, iMessage notifications
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** All persistent data lives in `/data/outland/` — database, photos, and backups in one place
- **D-02:** Daily SQLite backups kept forever (no auto-pruning). Backups stored in `/data/outland/backups/`
- **D-03:** iMessage alert to Will's phone if the daily backup cron fails
- **D-04:** One-command deploy from MacBook via SSH (`ssh mac-mini 'cd ~/outland && ./deploy.sh'` or similar)
- **D-05:** If a deploy fails (build error), the old version stays running — no downtime on failed deploy
- **D-06:** Deploy script auto-runs `prisma migrate deploy` after pulling code (schema changes apply automatically)
- **D-07:** PM2 auto-restarts the app on crash + sends iMessage notification to Will
- **D-08:** `/api/health` endpoint returns OK/ERROR with uptime and last backup timestamp — bookmarkable from phone
- **D-09:** Photos move from `/public/photos/` to `/data/outland/photos/` (persistent, survives redeploys)
- **D-10:** Daily backup covers database only (not photos) — photos are large and already on persistent disk

### Claude's Discretion

- Code location on Mac mini (Claude picks sensible default)
- PM2 ecosystem config details (fork mode, log rotation settings, restart limits)
- Cron schedule for daily backups (time of day, retention format)
- Service worker cache version bump mechanism on deploy
- iMessage notification implementation details (AppleScript, shortcut, or osascript)
- Health endpoint response format and what metrics to include

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| DEPLOY-01 | `output: 'standalone'` configured in next.config.ts | Next.js standalone mode: add one line to next.config.ts; requires manual copy of public/ and .next/static/ post-build |
| DEPLOY-02 | Persistent data directory (`/data/outland/` for DB + photos) | Directory creation with `mkdir -p`; photos API routes hardcode `process.cwd()/public/photos` — needs env var approach |
| DEPLOY-03 | `DATABASE_URL` uses absolute path in production env | Prisma reads `env("DATABASE_URL")` — production .env sets `file:/data/outland/db.sqlite` (absolute path) |
| DEPLOY-04 | PM2 ecosystem config with fork mode, log rotation | `ecosystem.config.js` with `exec_mode: "fork"` (required for SQLite), `error_file`, `out_file` log paths |
| DEPLOY-05 | `pm2 startup` persists across Mac mini reboots | `pm2 startup` generates launchd plist on macOS; `pm2 save` freezes process list |
| DEPLOY-06 | Deploy script (git pull → npm install → build → pm2 restart) | Build-then-swap pattern for zero-downtime on success, no-op on failure |
| DEPLOY-07 | SQLite backup cron (daily `.backup` to timestamped file) | `sqlite3 /data/outland/db.sqlite ".backup '/data/outland/backups/db-YYYYMMDD.sqlite'"` via cron; iMessage on failure |
| DEPLOY-08 | Service worker cache version bumps on deploy | `sed` replace `outland-shell-v1` → `outland-shell-v{timestamp}` in public/sw.js before build |
</phase_requirements>

---

## Summary

This phase deploys Outland OS as a persistent production service on Will's Mac mini. The core technical work breaks into five areas: (1) configuring Next.js standalone build output, (2) migrating photos to a persistent path outside the git working tree, (3) setting up PM2 for process management and boot persistence, (4) scripting a safe one-command deploy with build-then-swap, and (5) automating SQLite backups with iMessage failure alerts.

The biggest implementation complexity is photo path migration. Three API routes (`upload/route.ts`, `import/photos/route.ts`, `[id]/route.ts`) all hardcode `process.cwd()/public/photos`. All three need to be updated to use a shared `PHOTOS_DIR` utility that resolves to `/data/outland/photos` in production and `process.cwd()/public/photos` in development. A `PHOTOS_DIR` environment variable (or the existing `NODE_ENV` check) is the right approach. The `imagePath` values stored in the database as `/photos/filename.jpg` will also need a serving strategy — since the photos now live outside `public/`, Next.js standalone will not serve them automatically. A symlink from `.next/standalone/public/photos` → `/data/outland/photos` is the standard pattern.

PM2 on macOS uses launchd (not systemd), and the `pm2 startup` command on macOS generates and installs a `.plist` file. This is fully supported. The SQLite `.backup` command (not `cp`) is the correct transactionally-safe backup method. iMessage notifications from the command line use `osascript` with AppleScript's `tell application "Messages"` — this requires the Messages app to be configured with Will's Apple ID on the Mac mini.

**Primary recommendation:** Use a `PHOTOS_DIR` env var to point photo writes to `/data/outland/photos`, symlink that directory into the standalone build's `public/photos`, and serve photos at the same `/photos/filename.jpg` URLs the database already stores.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| PM2 | latest (5.x) | Process manager, auto-restart, log rotation, boot persistence | Industry standard for Node.js production; supports fork mode required by SQLite |
| Next.js standalone | 16.2.1 (existing) | Self-contained build with bundled server.js | Official Next.js self-hosting pattern; no separate web server needed |
| Prisma migrate deploy | 6.19.2 (existing) | Apply pending migrations in production without prompts | Official Prisma production migration workflow; `migrate dev` must not be used in production |
| sqlite3 CLI | system (macOS ships with it) | Transactionally safe `.backup` command for SQLite | Only safe backup method for in-use SQLite databases |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| launchd (macOS) | system | Boot persistence for PM2 | Automatically used by `pm2 startup` on macOS |
| osascript | system | Send iMessage from shell scripts | For crash alerts and backup failure notifications |
| cron (macOS crontab) | system | Schedule daily backups | Simplest scheduler available without dependencies |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| crontab | launchd plist directly | launchd is more macOS-native and survives sleep, but crontab is simpler and sufficient for a 2am backup |
| osascript iMessage | Pushover/email | osascript requires no API keys and uses existing Messages account; only works if Messages is configured on Mac mini |
| symlink for photos | Nginx static serve | No Nginx (per REQUIREMENTS.md out-of-scope); symlink is simpler |
| symlink for photos | Custom Next.js API serve route | Symlink is zero-code; API route adds latency and complexity |

**Installation (on Mac mini):**
```bash
npm install -g pm2
```

---

## Architecture Patterns

### Recommended Directory Layout (Mac mini)

```
~/outland/                    # git working tree — code only, no persistent data
  .next/standalone/           # build output (regenerated on each deploy)
  .next/standalone/public/
    photos -> /data/outland/photos   # symlink, not a copy
  deploy.sh                   # deploy script (committed to git)
  ecosystem.config.js         # PM2 config (committed to git)
  .env                        # production env (NOT in git — created once manually)

/data/outland/                # persistent data — survives redeploys
  db.sqlite                   # production SQLite database
  photos/                     # uploaded photos (persistent)
  backups/                    # timestamped SQLite backup files
    db-20260402.sqlite
    db-20260403.sqlite

~/Library/LaunchAgents/       # PM2 launchd plist (generated by pm2 startup)
```

### Pattern 1: Next.js Standalone Build with Static Assets

**What:** `output: 'standalone'` creates `.next/standalone/server.js` — a self-contained server. It does NOT copy `public/` or `.next/static/` automatically.

**When to use:** Always for production self-hosting without a CDN.

**How to wire up:**
```bash
# After npm run build:
cp -r public .next/standalone/public      # copies sw.js, icons, etc.
cp -r .next/static .next/standalone/.next/static   # copies CSS/JS chunks
# Then create symlink for photos (NOT cp — photos must stay in /data/outland)
ln -sfn /data/outland/photos .next/standalone/public/photos
```

**server.js launch:**
```bash
# Source: Next.js docs and ecosystem (MEDIUM confidence — verified via WebSearch)
PORT=3000 HOSTNAME=0.0.0.0 node .next/standalone/server.js
```

Note: `HOSTNAME=0.0.0.0` is required for Tailscale access. Some Next.js 15/16 versions have HOSTNAME env var bugs where the standalone server ignores it. The deploy script should verify the server is actually listening on 0.0.0.0 after start, or patch server.js post-build if needed.

### Pattern 2: PM2 Ecosystem Config (Fork Mode — Required for SQLite)

**What:** SQLite requires a single writer process. Cluster mode spawns multiple processes that would race on the database. Use `exec_mode: 'fork'` exclusively.

**ecosystem.config.js:**
```javascript
// Source: PM2 official docs (HIGH confidence)
module.exports = {
  apps: [
    {
      name: 'outland',
      script: '.next/standalone/server.js',
      cwd: '/Users/will/outland',
      exec_mode: 'fork',         // REQUIRED — SQLite cannot use cluster mode
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
        DATABASE_URL: 'file:/data/outland/db.sqlite',
        PHOTOS_DIR: '/data/outland/photos',
        // Other secrets loaded from .env file
      },
      error_file: '/data/outland/logs/pm2-error.log',
      out_file: '/data/outland/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      min_uptime: '10s',         // must be up 10s to count as successful start
      restart_delay: 4000,       // 4s between restart attempts
      autorestart: true,
    }
  ]
}
```

Note: PM2 does not natively send iMessage on crash. The crash notification must be implemented as a PM2 event script or a separate watcher process (see Pitfalls section).

### Pattern 3: PM2 Boot Persistence on macOS

**What:** `pm2 startup` generates a launchd plist and installs it. `pm2 save` captures the current process list.

```bash
# Source: PM2 official docs (HIGH confidence)
# Run once on Mac mini (not in deploy script):
pm2 startup               # outputs a sudo command — run it
pm2 save                  # saves current process list to ~/.pm2/dump.pm2

# After any pm2 start/restart, re-save:
pm2 save
```

**Important:** `pm2 startup` on macOS uses launchd, not systemd. The generated plist lives at `~/Library/LaunchAgents/`. This is correct behavior — do not attempt to use systemd commands.

### Pattern 4: Safe Deploy Script (Build-Then-Swap)

**What:** Build in a temp directory, then swap on success. Old version keeps running on build failure.

```bash
#!/usr/bin/env bash
# deploy.sh — committed to git, runs on Mac mini via ssh
set -euo pipefail

APP_DIR=~/outland
DATA_DIR=/data/outland

cd "$APP_DIR"

echo "[deploy] Pulling latest code..."
git pull --ff-only

echo "[deploy] Installing dependencies..."
npm ci --omit=dev

echo "[deploy] Bumping service worker cache version..."
DEPLOY_TS=$(date +%Y%m%d%H%M%S)
sed -i '' "s/outland-shell-v[0-9]*/outland-shell-v${DEPLOY_TS}/g" public/sw.js
sed -i '' "s/tile-cache-v[0-9]*/tile-cache-v${DEPLOY_TS}/g" public/sw.js

echo "[deploy] Running database migrations..."
DATABASE_URL="file:${DATA_DIR}/db.sqlite" npx prisma migrate deploy

echo "[deploy] Building..."
# Build fails here -> script exits (set -e), pm2 keeps running old build
npm run build

echo "[deploy] Wiring static assets..."
cp -r public .next/standalone/public
cp -r .next/static .next/standalone/.next/static
ln -sfn "$DATA_DIR/photos" .next/standalone/public/photos

echo "[deploy] Restarting service..."
pm2 restart outland --env production
pm2 save

echo "[deploy] Done. App restarted."
```

**Key safeguard:** `set -euo pipefail` exits immediately if `npm run build` fails, so `pm2 restart` is never reached. The running process stays on the previous build.

### Pattern 5: SQLite Backup via Cron

**What:** Use `sqlite3 .backup` (not `cp`) — it acquires a shared read lock and produces a consistent snapshot.

**backup.sh:**
```bash
#!/usr/bin/env bash
# /usr/local/bin/outland-backup.sh — called by cron
set -euo pipefail

DB=/data/outland/db.sqlite
BACKUP_DIR=/data/outland/backups
TIMESTAMP=$(date +%Y%m%d)
BACKUP_FILE="$BACKUP_DIR/db-${TIMESTAMP}.sqlite"

mkdir -p "$BACKUP_DIR"

if sqlite3 "$DB" ".backup '$BACKUP_FILE'"; then
  echo "Backup succeeded: $BACKUP_FILE"
else
  # Send iMessage alert to Will
  osascript -e "tell application \"Messages\" to send \"Outland backup FAILED on $(date)\" to buddy \"+1XXXXXXXXXX\""
  exit 1
fi
```

**Crontab entry (2 AM daily):**
```
0 2 * * * /usr/local/bin/outland-backup.sh >> /data/outland/logs/backup.log 2>&1
```

### Pattern 6: iMessage Notifications via osascript

**What:** `osascript` executes AppleScript from the shell. Messages app must be open and logged in with Will's Apple ID.

```bash
# Source: AppleScript + osascript (HIGH confidence — system capability)
osascript -e "tell application \"Messages\" to send \"$MESSAGE\" to buddy \"$PHONE_NUMBER\""
```

**For PM2 crash alerts** — PM2 does not have a native `on_crash` script hook. Options (in order of simplicity):

1. **pm2-slack / custom module** — Not ideal (requires external service)
2. **Separate watcher script** — A small Node.js script that subscribes to PM2 bus events and calls osascript on restart events. Run as a second PM2 process.
3. **Watch pm2 logs via a cron check** — Poll `pm2 jlist` every minute for `restart_time > threshold` and send alert. Simple, no extra dependencies.

**Recommendation (Claude's discretion):** Use a lightweight bash cron check every 5 minutes that compares PM2 restart count against a saved baseline. Zero additional dependencies, runs as cron.

```bash
#!/usr/bin/env bash
# /usr/local/bin/outland-watchdog.sh — runs every 5 min via cron
RESTARTS=$(pm2 jlist 2>/dev/null | python3 -c "import sys,json; procs=json.load(sys.stdin); print(sum(p['pm2_env'].get('restart_time',0) for p in procs if p['name']=='outland'))")
SAVED_FILE=/data/outland/logs/last_restart_count

PREV=$(cat "$SAVED_FILE" 2>/dev/null || echo "0")
echo "$RESTARTS" > "$SAVED_FILE"

if [ "$RESTARTS" -gt "$PREV" ]; then
  osascript -e "tell application \"Messages\" to send \"Outland crashed and was restarted by PM2 (restart #${RESTARTS})\" to buddy \"+1XXXXXXXXXX\""
fi
```

### Pattern 7: Health Endpoint

**What:** `/api/health` returns JSON with status, uptime, and last backup timestamp.

```typescript
// app/api/health/route.ts — new file following existing pattern
import { NextResponse } from 'next/server';
import { stat } from 'fs/promises';
import path from 'path';

export async function GET() {
  try {
    const uptime = process.uptime();
    const backupDir = process.env.DATA_DIR
      ? path.join(process.env.DATA_DIR, 'backups')
      : '/data/outland/backups';

    let lastBackup: string | null = null;
    try {
      const { readdirSync, statSync } = await import('fs');
      const files = readdirSync(backupDir)
        .filter(f => f.endsWith('.sqlite'))
        .sort()
        .reverse();
      if (files.length > 0) {
        const mtime = statSync(path.join(backupDir, files[0])).mtime;
        lastBackup = mtime.toISOString();
      }
    } catch {
      // backup dir may not exist yet
    }

    return NextResponse.json({
      status: 'ok',
      uptime: Math.round(uptime),
      lastBackup,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ status: 'error' }, { status: 500 });
  }
}
```

### Pattern 8: PHOTOS_DIR Environment Variable

**What:** Replace hardcoded `process.cwd()/public/photos` in 3 API routes with a shared utility.

```typescript
// lib/paths.ts — new utility
import path from 'path';

export function getPhotosDir(): string {
  if (process.env.PHOTOS_DIR) {
    return process.env.PHOTOS_DIR;
  }
  return path.join(process.cwd(), 'public', 'photos');
}
```

**Three files to update:**
- `app/api/photos/upload/route.ts` — `photosDir = join(process.cwd(), 'public', 'photos')`
- `app/api/import/photos/route.ts` — `photosDir = join(process.cwd(), 'public', 'photos')`
- `app/api/photos/[id]/route.ts` — `filePath = path.join(process.cwd(), 'public', photo.imagePath)`

The `imagePath` stored in the database is `/photos/filename.jpg`. The delete route constructs the full filesystem path as `process.cwd()/public` + `/photos/filename.jpg`. In production, this becomes `process.cwd()/public/photos/filename.jpg`, but photos now live at `/data/outland/photos/filename.jpg`. The fix: resolve the path using `getPhotosDir()` + the filename portion only.

### Anti-Patterns to Avoid

- **`exec_mode: 'cluster'`** with SQLite: Multiple processes racing on a single SQLite file causes database locks and corruption. SQLite is single-writer by design.
- **`cp` for SQLite backups:** `cp` is not transactionally safe — it can copy a database mid-write and produce a corrupt backup file. Use `sqlite3 .backup` exclusively.
- **`prisma migrate dev` in production:** It prompts interactively and may reset the database. Use `prisma migrate deploy` only.
- **`npm run build` in-place without swap:** Building in the running application directory can leave the app in a broken state if the build fails mid-process. The deploy script must build before swapping.
- **Putting photos in the git working tree's `public/photos/`:** This directory is overwritten (or deleted) on redeploy when static assets are copied. Photos must be on a path outside the build directory.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Process auto-restart on crash | Custom Node.js daemon or shell respawn loop | PM2 | Handles PID tracking, exponential backoff, crash logging, max restarts |
| Boot persistence | launchd plist written by hand | `pm2 startup` + `pm2 save` | Generates correct plist for current user context; manual plists commonly miss PATH vars |
| SQLite live backup | `cp` or `rsync` | `sqlite3 .backup` | Only safe method for in-use database; avoids torn reads |
| Static asset serving | Custom Express/file server | Symlink + Next.js standalone server.js | server.js already handles static files from `public/` after manual copy |

**Key insight:** The Mac mini setup is a single-process, single-user app. The simplest tooling that works is always right here. PM2 + cron + osascript covers every requirement without introducing external services or complex pipelines.

---

## Runtime State Inventory

> This phase IS a deployment/migration phase — runtime state must be explicitly audited.

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | SQLite database at `prisma/dev.db` (relative path, dev machine) | Create new production DB at `/data/outland/db.sqlite`; run `prisma migrate deploy` to create schema; optionally seed. Dev DB stays on MacBook — Mac mini starts fresh or with exported data. |
| Live service config | None — no running PM2 or production service exists yet | Initial setup only; no migration needed |
| OS-registered state | No existing launchd plists for Outland | `pm2 startup` + `pm2 save` will create them |
| Secrets/env vars | `.env` on MacBook with ANTHROPIC_API_KEY, OPENAI_API_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, VOYAGE_API_KEY | Create `/Users/will/outland/.env` on Mac mini manually (not in git); all 5 secrets must be present |
| Build artifacts | None — no prior production build exists | Fresh build on first deploy |
| Photo files | `public/photos/*.jpg` on MacBook dev machine | If Will wants existing photos in production: `rsync public/photos/ mac-mini:/data/outland/photos/` one-time. Ongoing uploads go directly to `/data/outland/photos/`. |
| Photo DB records | `imagePath` stored as `/photos/filename.jpg` in SQLite | Path format stays the same — only the filesystem location changes. No DB migration needed for existing records. |

**One-time Mac mini setup (not in deploy.sh — done manually once):**
```bash
# On Mac mini, before first deploy:
sudo mkdir -p /data/outland/{photos,backups,logs}
sudo chown -R $(whoami) /data/outland
mkdir ~/outland
git clone <repo> ~/outland
cp .env ~/outland/.env          # from MacBook, via scp or 1Password
npm install -g pm2
pm2 startup                     # run the sudo command it outputs
```

---

## Common Pitfalls

### Pitfall 1: `HOSTNAME` env var ignored by standalone server.js

**What goes wrong:** The app starts but only listens on `127.0.0.1`, making it inaccessible from Tailscale (which connects to the Mac mini's IP, not localhost).

**Why it happens:** Next.js standalone `server.js` has a known bug in some versions where `HOSTNAME=0.0.0.0` is set in the environment but the server still binds to `localhost`. Reported in GitHub issues against Next.js 14/15/16.

**How to avoid:** After build, check if `server.js` contains `hostname: process.env.HOSTNAME` or `hostname: 'localhost'`. If hardcoded, patch it in deploy.sh:
```bash
sed -i '' "s/hostname: 'localhost'/hostname: process.env.HOSTNAME || '0.0.0.0'/" .next/standalone/server.js
```

**Warning signs:** `pm2 logs outland` shows the server started but `curl http://[tailscale-ip]:3000` returns "connection refused".

### Pitfall 2: Photos symlink not created after each build

**What goes wrong:** `npm run build` wipes `.next/` (including `.next/standalone/public/`). The symlink is destroyed on every build.

**Why it happens:** Next.js clears the `.next/` directory at the start of each build.

**How to avoid:** The `ln -sfn` symlink creation must be in `deploy.sh` after the build step, every time. The `-sf` flags ensure it overwrites any stale symlink.

**Warning signs:** Photo upload succeeds (file written to `/data/outland/photos/`) but photos show as broken images in the app (server can't find them at `/photos/filename.jpg`).

### Pitfall 3: PM2 process list not saved after restart

**What goes wrong:** After a Mac mini reboot, PM2 starts but the `outland` process is not running.

**Why it happens:** `pm2 startup` installs launchd to start PM2 itself, but PM2 only knows which processes to start from the saved dump (`~/.pm2/dump.pm2`). If `pm2 save` was not run after the process was started, PM2 has nothing to restore.

**How to avoid:** `deploy.sh` includes `pm2 save` after `pm2 restart`. Also run `pm2 save` after the initial first-time `pm2 start`.

**Warning signs:** After reboot, `pm2 list` shows no processes, even though PM2 itself is running.

### Pitfall 4: iMessage notification fails silently

**What goes wrong:** `osascript` exits 0 but the message is never delivered.

**Why it happens:** Messages.app on Mac mini must be signed into Will's Apple ID and have the recipient (Will's phone number or Apple ID) already in contacts. If Messages is not running or not signed in, `tell application "Messages"` may launch the app but fail to send.

**How to avoid:** Test manually on the Mac mini before relying on it: `osascript -e 'tell application "Messages" to send "test" to buddy "+1XXXXXXXXXX"'`. Use Will's actual phone number string or Apple ID email — whichever appears in Messages contacts.

**Warning signs:** Backup cron runs without error but Will never receives messages. Add `|| echo "iMessage send failed"` to the osascript call and check cron logs.

### Pitfall 5: `prisma migrate deploy` fails because DATABASE_URL path doesn't exist

**What goes wrong:** Deploy script runs `prisma migrate deploy` but the database directory `/data/outland/` doesn't exist, causing Prisma to error out.

**Why it happens:** The first deploy on a fresh Mac mini runs before `/data/outland/` is created.

**How to avoid:** The one-time setup instructions (run manually) must create the directory before the first deploy. The deploy script can also defensively `mkdir -p /data/outland` at the top.

**Warning signs:** `Error: Can't reach database server at file:/data/outland/db.sqlite` during deploy.

### Pitfall 6: Service worker version not bumped — stale PWA

**What goes wrong:** After a code deploy, Will's phone still runs the old cached app shell. New routes or features don't appear.

**Why it happens:** The service worker install event only fires when `CACHE_NAME` changes. If the version string stays `outland-shell-v1`, the browser keeps the old cached shell indefinitely.

**How to avoid:** `deploy.sh` uses `sed` to replace the version string in `public/sw.js` with a timestamp before building. This must run before `npm run build` so the new version is compiled into the standalone output.

**Warning signs:** After deploy, hard-refreshing the PWA on Will's phone still shows old behavior. Check `Application > Service Workers` in Chrome devtools to see which cache version is active.

---

## Code Examples

### Complete ecosystem.config.js

```javascript
// ecosystem.config.js — committed to git root
// Source: PM2 official docs + project constraints (HIGH confidence)
module.exports = {
  apps: [
    {
      name: 'outland',
      script: '.next/standalone/server.js',
      cwd: '/Users/will/outland',
      exec_mode: 'fork',
      instances: 1,
      env_production: {
        NODE_ENV: 'production',
        PORT: '3000',
        HOSTNAME: '0.0.0.0',
      },
      error_file: '/data/outland/logs/pm2-error.log',
      out_file: '/data/outland/logs/pm2-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 4000,
      autorestart: true,
    }
  ]
}
```

Note: `DATABASE_URL`, `ANTHROPIC_API_KEY`, and other secrets come from the `.env` file in the app directory, not from `env_production` (which would be visible in the committed `ecosystem.config.js`). PM2 auto-loads `.env` from `cwd` when starting.

### Service worker version bump

```bash
# In deploy.sh, before npm run build:
# Source: sw.js inspection + sed pattern (HIGH confidence)
DEPLOY_TS=$(date +%Y%m%d%H%M%S)
sed -i '' "s/outland-shell-v[0-9]*/outland-shell-v${DEPLOY_TS}/g" public/sw.js
sed -i '' "s/tile-cache-v[0-9]*/tile-cache-v${DEPLOY_TS}/g" public/sw.js
```

`sed -i ''` is the macOS syntax (GNU `sed -i` differs). This runs in-place on the repo file, then the build bakes the new version into the output.

### Prisma production start command

```bash
# production DATABASE_URL uses absolute path
DATABASE_URL="file:/data/outland/db.sqlite" npx prisma migrate deploy
```

The `file:` prefix with an absolute path (starting with `/`) is the Prisma SQLite production pattern. The dev `.env` uses `file:./dev.db` (relative — do not use this in production).

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `next start` (requires node_modules on server) | `output: 'standalone'` + `server.js` | Next.js 12+ | Smaller deployment footprint; no `node_modules` needed on production server |
| `pm2 ecosystem.config.js` with `exec_mode: 'cluster'` | `exec_mode: 'fork'` for SQLite apps | Always — SQLite constraint | Cluster mode causes write locks; fork mode is the only valid choice |
| `cp db.sqlite db.sqlite.bak` | `sqlite3 db ".backup 'db.bak'"` | SQLite best practice | `cp` on a live database can produce corrupt backups |
| `prisma migrate dev` in production | `prisma migrate deploy` | Prisma 3+ recommendation | `migrate dev` is interactive and can prompt for destructive resets |

**Deprecated/outdated:**
- `next.config.js` with `target: 'server'` (old standalone config): removed in Next.js 13, replaced by `output: 'standalone'`
- PM2 `pm2-logrotate` module: useful for high-traffic apps; not needed here since logs are low-volume

---

## Open Questions

1. **Mac mini username for paths**
   - What we know: The `cwd` in `ecosystem.config.js` and directory paths need the actual macOS username (e.g., `/Users/will/outland` vs `/Users/willsink/outland`)
   - What's unclear: We don't know the exact macOS username on Will's Mac mini
   - Recommendation: Use `$HOME/outland` in deploy.sh and ecosystem.config.js to be username-agnostic; or confirm username before planning

2. **Will's phone number for iMessage notifications**
   - What we know: osascript requires the phone number or Apple ID email that appears in Will's Messages contacts on the Mac mini
   - What's unclear: Whether to use phone number (+1XXXXXXXXXX) or Apple ID email
   - Recommendation: Plan uses `NOTIFY_NUMBER` as a placeholder; fill in during Mac mini setup

3. **Existing photo migration**
   - What we know: Dev machine has photos in `public/photos/`; Mac mini starts fresh
   - What's unclear: Does Will want to migrate existing dev photos to production, or start fresh?
   - Recommendation: Include an optional rsync step in setup docs; default is start fresh

4. **`/data/outland/` permissions on Mac mini**
   - What we know: `/data/` at the filesystem root requires sudo to create
   - What's unclear: Whether Will prefers `sudo mkdir /data` or using a user-home path like `~/outland-data/`
   - Recommendation: D-01 locked `/data/outland/` — include `sudo mkdir -p /data/outland` in one-time setup steps; chown to Will's user immediately after

---

## Environment Availability

| Dependency | Required By | Available (on Mac mini) | Version | Fallback |
|------------|------------|--------------------------|---------|----------|
| Node.js 20 LTS | Next.js server, PM2 | Expected (per PROJECT.md) | 20.x | — |
| npm | Dependency install | Expected (bundled with Node) | — | — |
| PM2 | Process management | Not yet installed | — | Install via `npm install -g pm2` |
| sqlite3 CLI | Backup script | macOS system SQLite | 3.51.0 (verified on MacBook) | — |
| git | Code pull in deploy.sh | Expected (standard dev tool) | — | — |
| osascript | iMessage notifications | macOS system tool | system | Disable alerts, use email instead |
| Messages.app + Apple ID | iMessage delivery | Must be configured manually | — | Fall back to cron log inspection |
| cron (crontab) | Backup scheduling | macOS system (launchd cron) | system | — |

**Missing dependencies with no fallback (must be installed before first deploy):**
- PM2: `npm install -g pm2` on Mac mini
- `/data/outland/` directory: `sudo mkdir -p /data/outland && sudo chown $(whoami) /data/outland`

**Missing dependencies with fallback:**
- Messages.app Apple ID sign-in: If not configured, backup failure alerts fall back to cron log files at `/data/outland/logs/backup.log`

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| DEPLOY-01 | `output: 'standalone'` in next.config.ts | smoke | `npm run build` (verifies config accepted) | ✅ (build script) |
| DEPLOY-02 | `/data/outland/` directory exists and is writable | manual | Manual: `ls -la /data/outland/` on Mac mini | N/A — OS setup |
| DEPLOY-03 | Prisma uses absolute DATABASE_URL in production | smoke | `DATABASE_URL="file:/data/outland/db.sqlite" npx prisma validate` | N/A — env config |
| DEPLOY-04 | PM2 starts app in fork mode with log rotation | manual | `pm2 show outland` on Mac mini | N/A — runtime check |
| DEPLOY-05 | App survives Mac mini reboot | manual | Reboot and check `pm2 list` | N/A — hardware |
| DEPLOY-06 | Deploy script completes end-to-end | smoke | `bash deploy.sh` (first deploy on Mac mini) | ❌ Wave 0 |
| DEPLOY-07 | SQLite backup creates timestamped file | smoke | `bash /usr/local/bin/outland-backup.sh && ls /data/outland/backups/` | ❌ Wave 0 |
| DEPLOY-08 | Service worker cache version is unique per deploy | unit | `npm test -- tests/deploy/sw-version.test.ts` | ❌ Wave 0 |

Most DEPLOY requirements are infrastructure setup verified manually on the Mac mini, not automatable with Vitest. The exception is DEPLOY-08 (SW version bump), which can be unit-tested by confirming the version string in `public/sw.js` changes after the sed command runs.

### Sampling Rate

- **Per task commit:** `npm test` (existing test suite must stay green)
- **Per wave merge:** `npm run build` (standalone build must succeed)
- **Phase gate:** Manual verification on Mac mini — app serves pages at `http://localhost:3000`, photos display, health endpoint responds

### Wave 0 Gaps

- [ ] `deploy.sh` — shell script committed to git root (covers DEPLOY-06)
- [ ] `/usr/local/bin/outland-backup.sh` — backup script created during Mac mini setup (covers DEPLOY-07)
- [ ] `ecosystem.config.js` — PM2 config committed to git root (covers DEPLOY-04)
- [ ] `app/api/health/route.ts` — new route following existing pattern (covers D-08)
- [ ] `lib/paths.ts` — PHOTOS_DIR utility (covers DEPLOY-02/D-09)
- [ ] `tests/deploy/sw-version.test.ts` — optional unit test for DEPLOY-08 (low priority)

---

## Sources

### Primary (HIGH confidence)

- PM2 official docs (pm2.keymetrics.io/docs/usage/application-declaration/) — ecosystem config format, fork vs cluster, restart behavior
- PM2 startup docs (pm2.keymetrics.io/docs/usage/startup/) — macOS launchd workflow, `pm2 startup` + `pm2 save`
- osascript AppleScript (system capability, macOS) — `tell application "Messages" to send`
- Code inspection — `app/api/photos/upload/route.ts`, `app/api/import/photos/route.ts`, `app/api/photos/[id]/route.ts` (all hardcode `process.cwd()/public/photos`)
- `public/sw.js` — cache name strings `outland-shell-v1`, `tile-cache-v1`

### Secondary (MEDIUM confidence)

- WebSearch: Next.js standalone output static file serving — confirms manual copy of `public/` and `.next/static/` required; symlink pattern for persistent user-uploaded files
- WebSearch: PM2 HOSTNAME env var issue with Next.js standalone — known bug in some versions; `sed` patch workaround documented
- WebSearch: Prisma `migrate deploy` vs `migrate dev` — official Prisma docs confirm `deploy` for production

### Tertiary (LOW confidence)

- PM2 crash notification via watchdog cron — community pattern; no official PM2 hook for shell commands on crash event (PM2 Plus has built-in alerts but requires paid plan)

---

## Project Constraints (from CLAUDE.md)

| Directive | Category |
|-----------|----------|
| TypeScript throughout | All new files must be `.ts`/`.tsx` |
| All API routes must have try-catch with `console.error` + JSON error response | Health endpoint must follow this pattern |
| No `alert()` in components — use state-based inline error messages | Not applicable (no new UI components in this phase) |
| All React hooks must have correct, minimal dependency arrays | Not applicable (no new hooks) |
| Commit messages: imperative mood, concise | All commits |
| `TASKS.md` is the single source of truth — update every session | Planner must include TASKS.md update task |
| Changelog: one file per session in `docs/changelog/` | Planner must include changelog task |
| `STATUS.md` must match latest session number | Planner must include STATUS.md update task |
| Functions small (<50 lines), files focused (<800 lines) | health/route.ts and lib/paths.ts must stay small |
| No hardcoded values — use constants or config | PHOTOS_DIR must be env-var driven, not hardcoded in route files |
| No Docker | Locked — PM2 is the process manager |
| No Nginx / reverse proxy | Locked — standalone server.js serves everything |
| No cluster mode (PM2) | Locked — SQLite requires single process |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — PM2, Next.js standalone, and Prisma migrate deploy are all well-documented official tools
- Architecture: HIGH — patterns derived from official docs and direct code inspection
- Photo migration: HIGH — three specific files identified with exact line locations; path format in DB records verified
- PM2 crash iMessage: MEDIUM — official PM2 has no native hook; watchdog cron is a community pattern that works but is not PM2-native
- HOSTNAME env var issue: MEDIUM — GitHub issues confirm this is real in some Next.js versions; sed patch is a workaround documented by community

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (30 days — PM2 and Next.js stable; no fast-moving parts)
