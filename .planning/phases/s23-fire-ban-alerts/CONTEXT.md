# S23: Fire Ban + Pre-Trip Alerts — Context

**Session:** S23
**Date:** 2026-04-04
**Status:** Done

## Background

Fire bans and burn restrictions are a real safety concern for camping in NC and the Southeast, especially in dry fall/spring conditions. Will wanted pre-trip safety awareness in the trip prep flow — not a blocking gate, but a heads-up card that sets expectations.

## What This Addressed

- Trip prep had weather, packing, fuel, and departure sections — no safety/alert section
- No way to surface fire ban awareness before a trip
- Agent job infrastructure from Phase 36 (S13) was ready to power this

## Design Decision

- **PreTripAlertCard** — informational card at top of trip prep showing alert level and tips
- **pre-trip-alert agent job** — uses the existing AgentJob infrastructure (Phase 36) to trigger asynchronously
- **Alert level** — heuristic based on season/region/trip dates (no external API for fire ban data in v1)
- Alert is **non-blocking** — informational only, not a departure gate

## Key Decisions

- Reuses AgentJob model from Phase 36 (no new model)
- No external fire ban API (USFS fire ban API doesn't have a reliable free endpoint) — heuristic-based
- Agent job pattern: triggers on trip prep page open → result appears on next refresh
- Alert content: season-aware tips (spring = high pollen/fire risk; summer = heat; fall = drought/fire risk; winter = ice)
