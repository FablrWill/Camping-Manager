# Phase 9: Learning Loop - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning
**Source:** Quick discuss

## Locked Decisions

### D-01: Usage Tracking UI Location
**Decision:** Post-trip review section on the existing trip detail page
**Rationale:** Keeps gear usage tracking co-located with trip data, no new routes needed

### D-02: Usage Status Values
**Decision:** Use existing PackingItem.usageStatus field with values: "used", "didn't need", "forgot but needed", null
**Rationale:** Schema already has this field from Phase 6 stabilization

### D-03: Post-Trip Summary Trigger
**Decision:** Auto-generate when all packed items have a usage status set
**Rationale:** User prefers auto-generation for seamless flow

### D-04: Voice Debrief Review Flow
**Decision:** Modal with checkboxes showing extracted changes, user selects which to apply
**Rationale:** Gives user control over what gets written back without a full page navigation

### D-05: Voice APIs Reuse
**Decision:** Reuse existing Phase 5 voice APIs (transcribe, extract, apply) at app/api/voice/
**Rationale:** Infrastructure already built and tested

### D-06: TripFeedback Model Reuse
**Decision:** Use existing TripFeedback model (append-only, multiple per trip) for storing summaries and voice debriefs
**Rationale:** Schema already designed for this in Phase 6

## Claude's Discretion

- Plan decomposition (number of plans, wave structure)
- Component file organization
- API route structure for usage tracking and summary generation
- Whether to batch usage status updates or save individually
- Auto-generate threshold (all items vs percentage)

## Requirements Mapping

| Requirement | Decision References |
|-------------|-------------------|
| LEARN-01 | D-01, D-02 |
| LEARN-02 | D-03, D-06 |
| LEARN-03 | D-04, D-05, D-06 |

## Canonical References

- `prisma/schema.prisma` — PackingItem.usageStatus, TripFeedback model
- `app/api/voice/transcribe/route.ts` — Whisper transcription
- `app/api/voice/extract/route.ts` — Claude insight extraction
- `app/api/voice/apply/route.ts` — Apply insights to records
- `components/TripsClient.tsx` — Trip detail UI
- `lib/claude.ts` — Claude API utility
