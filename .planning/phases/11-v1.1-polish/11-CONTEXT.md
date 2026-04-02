# Phase 11: v1.1 Polish - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Fix three specific tech debt items identified by the v1.1 milestone audit:
1. VoiceDebriefButton renders for all trips — add `isPast` guard
2. usage-tracking.test.ts gearId validation test is circular — rewrite properly
3. REQUIREMENTS.md, ROADMAP.md, STATE.md, and PROJECT.md have stale/inconsistent markers

</domain>

<decisions>
## Implementation Decisions

### VoiceDebriefButton Guard
- **D-01:** Wrap VoiceDebriefButton rendering in TripCard.tsx with `{isPast && ...}` — follows same pattern as PostTripReview (line 216). `isPast` already computed at line 70.

### Test Fix
- **D-02:** Rewrite the circular gearId validation test as a real API integration test. Hit `PATCH /api/trips/[id]/usage` with a body missing `gearId`, assert 400 response. This tests actual route validation, not test fixtures.
- **D-03:** Keep the existing `it.todo` stubs as-is — they mark where future comprehensive API tests belong but are out of scope for this phase.

### Documentation Cleanup
- **D-04:** Full consistency pass across REQUIREMENTS.md, ROADMAP.md, STATE.md, and PROJECT.md — not just the 3 audit-flagged items. Fix every stale marker, outdated status, and incorrect completion date.
- **D-05:** Update PROJECT.md with final v1.1 state to set up clean handoff for future milestones.

### Claude's Discretion
- Test DB setup approach for the API integration test (in-memory SQLite, test fixtures, etc.)
- Order of operations for doc updates (which file first)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Source Code
- `components/VoiceDebriefButton.tsx` — Component to guard with isPast
- `components/TripCard.tsx` — Where VoiceDebriefButton is rendered (line 174-180), isPast computed (line 70)
- `tests/usage-tracking.test.ts` — Circular test to rewrite
- `app/api/trips/[id]/usage/route.ts` — API endpoint the test should actually hit

### Planning Docs
- `.planning/v1.1-MILESTONE-AUDIT.md` — Source of all three tech debt items
- `.planning/REQUIREMENTS.md` — Needs consistency pass
- `.planning/ROADMAP.md` — Needs consistency pass
- `.planning/STATE.md` — Needs consistency pass
- `.planning/PROJECT.md` — Needs v1.1 final state update

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `isPast` variable already computed in TripCard.tsx line 70: `const isPast = trip.endDate < now`
- PostTripReview guard pattern at TripCard.tsx line 216: `{isPast && isSelected && ...}` — same pattern for VoiceDebriefButton but without `isSelected`

### Established Patterns
- Vitest for testing (`import { describe, it, expect } from 'vitest'`)
- API routes use try-catch with `NextResponse.json({ error: '...' }, { status: N })` pattern

### Integration Points
- VoiceDebriefButton fix is isolated to TripCard.tsx render logic
- Test fix requires understanding the PATCH route validation in `app/api/trips/[id]/usage/route.ts`

</code_context>

<specifics>
## Specific Ideas

- After Phase 11 execution: run a cross-AI review (Gemini) of the full project as a whole

</specifics>

<deferred>
## Deferred Ideas

- Full project review with Gemini after v1.1 Polish is complete — Will wants external AI perspective on the project as a whole
- Comprehensive API test suite for all usage-tracking endpoints (the it.todo stubs) — belongs in a dedicated testing phase

</deferred>

---

*Phase: 11-v1.1-polish*
*Context gathered: 2026-04-02*
