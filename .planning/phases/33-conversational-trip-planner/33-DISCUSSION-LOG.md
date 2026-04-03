# Phase 33: Conversational Trip Planner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 33-conversational-trip-planner
**Areas discussed:** Entry point & container, Trip creation trigger, Creation scope & persona

---

## Entry point & container

| Option | Description | Selected |
|--------|-------------|----------|
| Sheet/modal on trips page | Chat slides up as a bottom sheet or modal over the trips list | ✓ |
| Navigate to /chat with context | Reuses existing chat tab with trip-creation context passed in | |
| Dedicated /trips/new route | New full-screen page for conversational creation | |

**User's choice:** Sheet/modal on trips page
**Notes:** Full-screen sheet. "Add manually" escape hatch as a small text link in the header. Agent opens with a question (e.g., "Where are you thinking of going?") rather than waiting for user input.

---

## Trip creation trigger

| Option | Description | Selected |
|--------|-------------|----------|
| Summary card + confirm button | Agent renders a trip summary card with a "Create Trip" button | ✓ |
| Auto-creates, then shows result | Agent creates trip when confident, displays "Trip created!" | |
| User triggers with a phrase | User says "create it" or "looks good" to trigger creation | |

**User's choice:** Summary card + confirm button
**Notes:** After creation, sheet navigates to the new trip's prep page (`/trips/[id]/prep`). Minimum required info is Claude's discretion (inferred from Trip model schema).

---

## Creation scope & persona

| Option | Description | Selected |
|--------|-------------|----------|
| Dedicated trip-planner system prompt | Separate system prompt, focused on trip creation | ✓ |
| Full camping agent with context | Reuses /api/chat with trip-creation context passed in | |

**User's choice:** Dedicated trip-planner system prompt
**Notes:**
- New `/api/trip-planner` route (not extending /api/chat)
- Tools: gear inventory, weather, existing locations, web search for campsites (all four selected)
- Conversations saved to DB (same Conversation + Message persistence as Phase 4)

---

## Claude's Discretion

- Opening question text for agent greeting
- Minimum required fields before showing summary card
- Summary card visual design
- Sheet animation style
- Handling ambiguous/conflicting info during collection

## Deferred Ideas

None surfaced during discussion.
