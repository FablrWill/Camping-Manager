# Phase 5: Intelligence Features - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-03-31
**Phase:** 05-intelligence-features
**Areas discussed:** Recommendations architecture

---

## Recommendations Architecture

### Entry Point

| Option | Description | Selected |
|--------|-------------|----------|
| Chat-native only | Ask in chat, tool returns rich cards in thread | ✓ |
| Standalone Recommend screen | Dedicated page with form inputs, separate from chat | |
| Chat + smart form button | Chat primary + shortcut button pre-fills prompt | |

**User's choice:** Chat-native only
**Notes:** No standalone screen. Natural language in chat is the entry point.

---

### Result Format

| Option | Description | Selected |
|--------|-------------|----------|
| Rich location cards | Structured cards in chat thread — name, distance, description, rating, Save button | ✓ |
| Plain text with save link | Agent lists spots in text with inline save link | |
| You decide | Claude picks based on Card component and mobile rendering | |

**User's choice:** Rich location cards (reusing existing Card component)

---

### Sources

| Option | Description | Selected |
|--------|-------------|----------|
| Saved locations + knowledge base | Will's saved spots first, RAG fills gaps | ✓ |
| Knowledge base only | RAG corpus only, ignores saved spots | |
| Saved locations only | Only from existing saved spots, nothing new | |

**User's choice:** Saved locations + knowledge base

---

### Save Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Creates Location, opens edit form | New Location record pre-populated, navigate to edit form for GPS/photos/notes | ✓ |
| Saves silently, confirms in chat | Saves immediately in background, agent confirms in thread | |
| You decide | Claude picks based on existing location save patterns | |

**User's choice:** Creates new Location, opens prefilled edit form

---

### Constraint Filters

| Option | Description | Selected |
|--------|-------------|----------|
| Distance from Asheville | Filter by drive time or miles | ✓ |
| Date / season | Match weather forecasts and seasonal closures | ✓ |
| Amenity preferences | Water access, dispersed vs developed, hookups, pet-friendly | ✓ |
| Vehicle constraints | Road type, clearance (Santa Fe Hybrid context) | ✓ |

**User's choice:** All four constraint types

---

### Ranking

| Option | Description | Selected |
|--------|-------------|----------|
| RAG relevance + personal ratings | Blends retrieval score with Will's ratings on saved spots | ✓ |
| Claude decides | Agent uses judgment, no explicit scoring | |
| RAG relevance only | Pure knowledge base match score | |

**User's choice:** RAG relevance + personal ratings (blended)

---

## Claude's Discretion

Areas not discussed — left to Claude:
- Voice transcription approach (Web Speech API vs audio recording + Whisper)
- Voice debrief entry point and UI placement
- Extracted insight schema design
- Insights review UX (auto-apply vs manual confirmation)

## Deferred Ideas

None raised during discussion.
