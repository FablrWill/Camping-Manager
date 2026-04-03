# Phase 14: Production Deployment - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Deploy Outland OS as a production service on Will's Mac mini with persistent data, auto-restart, backups, monitoring, and a one-command deploy workflow. The app must survive reboots, crashes, and code updates without losing data.

</domain>

<decisions>
## Implementation Decisions

### Data Location & Backups
- **D-01:** All persistent data lives in `/data/outland/` — database, photos, and backups in one place
- **D-02:** Daily SQLite backups kept forever (no auto-pruning). Backups stored in `/data/outland/backups/`
- **D-03:** iMessage alert to Will's phone if the daily backup cron fails

### Deploy Workflow
- **D-04:** One-command deploy from MacBook via SSH (`ssh mac-mini 'cd ~/outland && ./deploy.sh'` or similar)
- **D-05:** If a deploy fails (build error), the old version stays running — no downtime on failed deploy
- **D-06:** Deploy script auto-runs `prisma migrate deploy` after pulling code (schema changes apply automatically)

### Monitoring & Recovery
- **D-07:** PM2 auto-restarts the app on crash + sends iMessage notification to Will
- **D-08:** `/api/health` endpoint returns OK/ERROR with uptime and last backup timestamp — bookmarkable from phone

### Photo Storage
- **D-09:** Photos move from `/public/photos/` to `/data/outland/photos/` (persistent, survives redeploys)
- **D-10:** Daily backup covers database only (not photos) — photos are large and already on persistent disk

### Claude's Discretion
- Code location on Mac mini (Claude picks sensible default — Will said "you decide")
- PM2 ecosystem config details (fork mode, log rotation settings, restart limits)
- Cron schedule for daily backups (time of day, retention format)
- Service worker cache version bump mechanism on deploy
- iMessage notification implementation details (AppleScript, shortcut, or osascript)
- Health endpoint response format and what metrics to include

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build & Config
- `next.config.ts` — Current Next.js config (serverExternalPackages, sw.js headers). Needs `output: 'standalone'` added.
- `.env.example` — All env vars the app needs (DATABASE_URL, API keys, Gmail creds)
- `prisma/schema.prisma` — Database schema with `datasource db { url = env("DATABASE_URL") }` — production needs absolute path

### Service Worker
- `public/sw.js` — Cache names (`outland-shell-v1`, `tile-cache-v1`) and shell assets list. Cache version needs bumping on deploy.

### Requirements
- `.planning/REQUIREMENTS.md` — DEPLOY-01 through DEPLOY-08 acceptance criteria

### Project
- `.planning/PROJECT.md` — Production target: Mac mini, Node.js 20 LTS, PM2, Tailscale, no Docker
- `CLAUDE.md` — Project coding standards and conventions

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `next.config.ts` already has `serverExternalPackages` for native deps — just needs `output: 'standalone'` added
- `public/sw.js` has versioned cache names — deploy script can sed/replace the version string
- `.env.example` documents all required env vars — production `.env` can be derived from it

### Established Patterns
- Prisma uses `env("DATABASE_URL")` — production just needs the right env var value
- Photo upload routes write to a path derived from config — can be pointed to `/data/outland/photos/`
- All API routes have try-catch error handling — health endpoint follows same pattern

### Integration Points
- `prisma/schema.prisma` datasource URL — must point to absolute path in production
- Photo upload paths in API routes — need to resolve to `/data/outland/photos/`
- Service worker install event — reads SHELL_ASSETS array and cache name

</code_context>

<specifics>
## Specific Ideas

- Will wants to be able to bookmark `/api/health` on his phone for a quick status check
- iMessage is the preferred notification channel (not email, not push) for both crash alerts and backup failures
- The "keep old version running on failed deploy" approach means the deploy script needs to build first, then swap — not build in place

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 14-production-deployment*
*Context gathered: 2026-04-02*
