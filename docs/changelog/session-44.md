# Session 44 — S23 Fire Ban + Pre-Trip Alerts

**Date:** 2026-04-04
**Branch:** claude/infallible-margulis (worktree)

## Summary

S23: Pre-trip safety alerts in trip prep — PreTripAlertCard, pre-trip-alert agent job type, heuristic fire ban awareness based on season/region.

## Changes

### New Files
- `components/PreTripAlertCard.tsx` — alert level badge (normal/elevated/high) + season-specific tips
- `lib/agents/pre-trip-alert.ts` — agent logic: heuristic alert level from trip date + NC/SE region
- `app/api/agent/jobs/trigger/pre-trip/route.ts` — POST: triggers pre-trip-alert job for a trip

### Modified Files
- `app/api/agent/jobs/route.ts` — support pre-trip-alert job type
- `components/TripPrepClient.tsx` — render PreTripAlertCard at top of trip prep
- `scripts/agent-runner.ts` — handle pre-trip-alert job type

## Schema Changes

None. Reuses AgentJob model from Phase 36.

## Key Notes

- Alert is informational only — never blocks departure
- No external fire ban API — heuristic based on season

## Commits

- `6854a62` feat: pre-trip alert card and agent job type
- `05ac958` feat: pre-trip alert trigger endpoint and runner support
