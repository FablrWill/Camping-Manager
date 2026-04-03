# Phase 14: Production Deployment - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-02
**Phase:** 14-production-deployment
**Areas discussed:** Data location & backups, Deploy workflow, Monitoring & recovery, Photo storage

---

## Data Location & Backups

| Option | Description | Selected |
|--------|-------------|----------|
| 7 days | Keeps a week of daily snapshots. Enough to recover from most mistakes without filling disk. | |
| 30 days | A month of history. Uses more disk but gives you a longer safety net. | |
| Keep all forever | Never auto-delete. You'd clean up manually when disk gets full. | ✓ |

**User's choice:** Keep all forever
**Notes:** No auto-pruning. Will handles cleanup manually if disk fills up.

| Option | Description | Selected |
|--------|-------------|----------|
| Just check the app | If the app works, the DB is fine. No extra notifications. | |
| iMessage alert if backup fails | Get a text on your phone if the daily backup didn't run. | ✓ |
| You decide | Let Claude pick the simplest reliable approach. | |

**User's choice:** iMessage alert if backup fails
**Notes:** iMessage preferred over email for backup failure alerts.

---

## Deploy Workflow

| Option | Description | Selected |
|--------|-------------|----------|
| SSH one-liner from MacBook | Run one command from your laptop: it SSHs into the Mac mini, pulls code, builds, and restarts. | ✓ |
| Run deploy script on the Mac mini itself | SSH into Mac mini first, then run a script there. Two steps. | |
| Auto-deploy on git push | Mac mini watches the repo and auto-deploys when you push to main. | |

**User's choice:** SSH one-liner from MacBook
**Notes:** Simple, explicit, one command.

| Option | Description | Selected |
|--------|-------------|----------|
| Keep the old version running | If the new build fails, the current working version stays live. | ✓ |
| Stop everything and alert me | App goes down until you fix it. | |

**User's choice:** Keep the old version running
**Notes:** No downtime on failed deploy.

| Option | Description | Selected |
|--------|-------------|----------|
| ~/outland (home directory) | Easy to find, standard for personal projects. | |
| /opt/outland (system location) | More production-like path. | |
| You decide | Let Claude pick a sensible default. | ✓ |

**User's choice:** You decide (Claude's discretion)
**Notes:** Claude picks code location on Mac mini.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, auto-migrate | Deploy script runs prisma migrate deploy after pulling code. | ✓ |
| No, I'll run migrations manually | Deploy only builds and restarts. | |

**User's choice:** Yes, auto-migrate
**Notes:** Schema changes apply automatically on deploy.

---

## Monitoring & Recovery

| Option | Description | Selected |
|--------|-------------|----------|
| iMessage notification | PM2 detects the crash and sends you a text. | ✓ |
| Just auto-restart silently | PM2 restarts the app. You only notice if it keeps crashing. | |
| Email notification | Send crash details to your email. | |

**User's choice:** iMessage notification
**Notes:** iMessage preferred notification channel for crash alerts.

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, /api/health endpoint | Returns OK/ERROR with uptime and last backup time. Bookmarkable. | ✓ |
| No, the app itself is the health check | If the dashboard loads, everything is fine. | |

**User's choice:** Yes, /api/health endpoint
**Notes:** Will wants to bookmark this on his phone for a quick status glance.

---

## Photo Storage

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, move to /data/outland/photos/ | Photos live next to the DB in persistent storage. Survive redeploys. | ✓ |
| Keep in /public/photos/ inside the repo | Simpler, no path changes needed. But photos lost on fresh clone. | |

**User's choice:** Yes, move to /data/outland/photos/
**Notes:** Persistent storage, survives code redeploys.

| Option | Description | Selected |
|--------|-------------|----------|
| Database only | Photos are large and already on disk. DB backup is tiny and fast. | ✓ |
| Both database and photos | Full backup of everything. Uses more disk. | |
| You decide | Let Claude pick the right balance. | |

**User's choice:** Database only
**Notes:** Photos already on persistent disk, don't need daily duplication.

---

## Claude's Discretion

- Code location on Mac mini (Will deferred to Claude)
- PM2 ecosystem config details (fork mode, log rotation, restart limits)
- Cron schedule for daily backups
- Service worker cache version bump mechanism
- iMessage notification implementation (AppleScript vs Shortcuts)
- Health endpoint response format and metrics

## Deferred Ideas

None — discussion stayed within phase scope
