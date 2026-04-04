# Session 33 — Mac Mini Agent Runner + GearForm Stash Recovery

**Date:** 2026-04-04
**Session ID:** S15
**Phase:** 36 (continued)

## What Changed

### New: scripts/agent-runner.ts
- Standalone Node.js worker that polls the AgentJob queue for pending jobs
- Claims jobs (PATCH status=running), processes with Claude API, posts results back
- Currently supports `gear_enrichment` job type — more can be added by registering in the `processors` map
- Configurable via env vars: `AGENT_BASE_URL`, `AGENT_POLL_INTERVAL`, `ANTHROPIC_API_KEY`
- Processes jobs sequentially to avoid hammering Claude API
- Graceful error handling: transient failures don't crash the process, failed jobs get marked

### Updated: PATCH /api/agent/jobs/[id]
- Extended to accept optional `status` field in request body
- Supports status transitions: pending, running, done, failed
- Backward compatible: empty body still marks job as read (existing AgentJobsBadge behavior preserved)

### Updated: ecosystem.config.js
- Added `outland-agent` PM2 process alongside the main `outland` app
- Uses tsx interpreter to run the TypeScript runner script
- Separate log files in `/Users/lisa/outland-data/logs/`

### Updated: scripts/deploy.sh
- Deploy now starts/restarts the agent runner alongside the main app

### Fixed: GearForm stash merge conflict
- Applied stashed AI gear identification UI (Session 29 work)
- Resolved conflicts with Phase 23 tech gear fields (modelNumber, connectivity)
- Removed duplicate resizeImageToBase64 function

## Files Changed
- `scripts/agent-runner.ts` — new (Mac mini background worker)
- `app/api/agent/jobs/[id]/route.ts` — extended PATCH with status support
- `ecosystem.config.js` — added outland-agent process
- `scripts/deploy.sh` — restarts agent runner on deploy
- `components/GearForm.tsx` — stash conflict resolved (already on main)

## Build
- `npm run build` passes clean
