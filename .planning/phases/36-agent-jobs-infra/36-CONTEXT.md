---
phase: 36-agent-jobs-infra
session: S13
status: planning
---

# Phase 36 — Mac Mini Agent Jobs Infrastructure

## Goal
Build the plumbing for background agent jobs: job queue table, REST API for creating/polling/completing jobs, dashboard badge for results, and one proof-of-concept job type (gear enrichment) to validate end-to-end.

## Source Spec
See `.planning/V2-SESSIONS.md` → S13 for the full spec.

## Key Decisions
- No auth on endpoints — LAN-only behind Tailscale
- No cron/scheduling — jobs are triggered manually or on gear save
- No Mac mini runner script — just the app-side infrastructure
- SQLite-friendly: polling via simple status filter queries
