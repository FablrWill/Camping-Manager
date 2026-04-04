# Phase 36: Agent Jobs Infrastructure — Research

**Completed:** 2026-04-04

## Architecture Decision: No Redis, No Cron

This is a personal tool with low job volume (< 10/day). Options considered:

| Option | Complexity | Fit |
|--------|------------|-----|
| Redis + Bull | High (new service) | Overkill |
| Cron service (Inngest, Trigger.dev) | Medium (external dependency) | Not needed |
| SQLite polling table | Low (already have SQLite) | ✓ Perfect |

**Decision:** SQLite `AgentJob` table + Mac mini runner script that polls via GET /api/agent/jobs?status=pending every 30 seconds. No external dependencies.

## Mac mini Runner Pattern

The Mac mini runs the Next.js app via PM2 and also runs the agent runner script as a separate PM2 process. The runner:
1. Polls GET /api/agent/jobs?status=pending
2. Processes each pending job (calls Claude, etc.)
3. POSTs result to POST /api/agent/results
4. App receives result via webhook-like POST

## SQLite Concurrency

SQLite handles concurrent reads safely. The one writer scenario (Mac mini runner POSTing results while Next.js handles user requests) is within SQLite's single-writer model — no issues at this volume.

## Security

LAN-only behind Tailscale. No auth on agent endpoints — acceptable for a personal local tool. Documented in CONTEXT.md.

## Job Types

- `gear_enrichment` — triggered on gear save when item lacks brand/notes; Mac mini calls Claude to fill in details
- Future: `pre_trip_alert` (S23), maintenance reminders (S27 follow-on)
