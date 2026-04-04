# S23: Fire Ban + Pre-Trip Alerts — Plan

## Goal

Add a pre-trip safety alert card to trip prep, powered by the existing agent job infrastructure.

## Files Created

- `components/PreTripAlertCard.tsx` — shows alert level badge (normal/elevated/high) + season-specific tips
- `lib/agents/pre-trip-alert.ts` — agent logic: reads trip location + date, determines alert level and tips
- `app/api/agent/jobs/trigger/pre-trip/route.ts` — POST: triggers a pre-trip-alert agent job for a trip

## Files Modified

- `app/api/agent/jobs/route.ts` — add support for pre-trip-alert job type
- `components/TripPrepClient.tsx` — render PreTripAlertCard at top of trip prep (above weather)
- `scripts/agent-runner.ts` — handle pre-trip-alert job type in the Mac mini runner

## Key Decisions

- Alert is non-blocking (informational only) — never prevents departure
- Reuses AgentJob model from Phase 36 (no new model, no schema changes)
- No external fire ban API — heuristic based on season + NC/Southeast region patterns
- Agent job async: triggers on prep open → result appears on next load

## Verification

- `npm run build` passes
- No TypeScript errors
- No schema changes
