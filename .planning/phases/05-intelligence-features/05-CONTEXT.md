# Phase 5: Intelligence Features - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Two distinct capabilities:

1. **AI Trip Recommendations** — Users ask "find me a camping spot" in the existing chat agent. A new recommendation tool returns rich location cards inline in the chat thread. Users can save a recommended spot directly from the card.

2. **Voice Trip Debrief** — Users record a voice memo after a trip. It's auto-transcribed and Claude extracts structured insights (what worked, what didn't, gear feedback, spot ratings). Insights are reviewed and can be applied to update gear notes, location ratings, and trip notes.

Both features are additive to Phase 4's chat foundation. Recommendations extend the tool registry; voice debrief is a new UI surface.

</domain>

<decisions>
## Implementation Decisions

### Recommendations — Entry Point & Architecture
- **D-01:** Chat-native only. No standalone Recommendations screen. Users ask "find me a spot near Brevard this weekend" in chat. The recommendation tool is added to `lib/agent/tools/` following the existing modular registry pattern (Phase 4 D-07).
- **D-02:** Results render as rich location cards inside the chat thread — below the agent's text response. Each card shows: spot name, distance from Asheville, brief description, rating (if saved), and a **Save** button. Must reuse the existing `Card` component from `components/ui/`.

### Recommendations — Sources & Ranking
- **D-03:** Dual-source search: Will's saved `Location` records first, then knowledge base (RAG hybrid search). Saved locations are given priority — Will trusts his own spots. RAG fills gaps with new spots from the knowledge corpus.
- **D-04:** Ranking blends RAG relevance score + Will's personal ratings on saved locations. Spots he's rated highly surface earlier. Unrated saved spots rank above knowledge base results. Knowledge base results ranked by RRF score.

### Recommendations — Constraint Filters
- **D-05:** The recommendation tool must understand and apply all four constraint types when present in the user's message:
  - **Distance from Asheville** — filter by drive time or miles
  - **Date / season** — match against weather forecasts and seasonal closures in the knowledge base
  - **Amenity preferences** — water access, dispersed vs developed, hookups, pet-friendly
  - **Vehicle constraints** — road type (paved vs dirt), clearance relevant to Santa Fe Hybrid

### Recommendations — Save Flow
- **D-06:** Tapping Save on a recommendation card creates a new `Location` record pre-populated with data from the recommendation (name, description, coordinates if known), then navigates to the Location edit form so Will can add GPS pin, photos, or personal notes before confirming. Follows the "confirm before committing" principle for new data writes.

### Voice Debrief — Claude's Discretion
The user did not discuss voice implementation. The following are left to Claude's judgment, with constraints noted from prior context:

- **Transcription approach:** STATE.md flags Web Speech API reliability on iOS Safari as unconfirmed. For field use (often offline or poor signal), prefer recording audio locally first then transcribing. Claude should evaluate Web Speech API vs audio recording + Whisper API before choosing. VOICE-05 says reuse patterns from Fablr.ai if applicable.
- **Entry point:** Where the voice debrief UI lives (trips page, dedicated tab, floating button). Claude picks based on existing layout patterns.
- **Extraction schema:** What structured fields Claude extracts from the transcription. Requirements specify: what worked, what didn't, gear feedback, spot ratings. Claude defines the schema.
- **Insights review UX:** How Will reviews and applies extracted insights to gear/locations/trips. Auto-apply vs manual confirmation per insight. Claude designs for clarity and safety (confirm before overwriting existing notes).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Chat Agent Foundation (Phase 4)
- `lib/agent/tools/index.ts` — AGENT_TOOLS registry. New recommendation and voice tools go here.
- `lib/agent/system-prompt.ts` — CAMPING_EXPERT_SYSTEM_PROMPT. Recommendation tool results should fit within the camping buddy persona.
- `app/api/chat/route.ts` — Streaming SSE chat endpoint with tool-calling loop. Recommendation results must serialize correctly for streaming.
- `app/chat/page.tsx` — Chat page. Rich location cards from recommendations render here inside the message thread.
- `components/ChatBubble.tsx` — How messages render. Recommendation cards will need a new message type or embedded component here.

### RAG & Knowledge Base (Phase 3)
- `lib/rag/search.ts` — hybridSearch function. Primary retrieval for recommendation tool.
- `lib/rag/context.ts` — buildRagContext. May be used to format knowledge base hits in recommendation results.

### Existing Location Data
- `app/api/locations/route.ts` + `app/api/locations/[id]/route.ts` — Location CRUD. Recommendation save creates a new location via POST.
- `prisma/schema.prisma` — Location model. Pre-populate new saved spots from recommendation data.

### UI Components
- `components/ui/` — Card, Badge, Button — reuse for recommendation result cards.
- `components/SpotMap.tsx` — May be relevant if recommendations show a mini-map pin.

### Requirements
- `.planning/REQUIREMENTS.md` — REC-01, REC-02, REC-03, VOICE-01 through VOICE-05
- `.planning/ROADMAP.md` §Phase 5 — Success criteria

### Architecture Patterns
- `.planning/phases/04-chat-agent/04-CONTEXT.md` §D-03, D-04, D-07 — Tool registry, read-write agent, confirm before destructive actions
- `.planning/codebase/ARCHITECTURE.md` — Overall system architecture
- `.planning/codebase/CONVENTIONS.md` — Naming, import organization, error handling patterns

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **AGENT_TOOLS registry** (`lib/agent/tools/index.ts`): Modular tool pattern — recommendation tool and voice tools slot in with `{tool}Tool` + `execute{Tool}` exports
- **hybridSearch** (`lib/rag/search.ts`): Ready for recommendation queries — takes a text query, returns RRF-ranked chunks
- **Location Prisma model**: Existing fields include name, lat/lng, notes, rating, campType — recommendation saves populate these
- **Card component** (`components/ui/`): Reuse for recommendation result cards — consistent with rest of app
- **ChatBubble + SkeletonBubble**: Message rendering pattern — recommendation cards embed here

### Established Patterns
- **Tool registry**: `{name}Tool` schema + `execute{Name}` handler, exported from named file, registered in `index.ts`
- **Streaming SSE chat route**: Tool results go through the same streaming loop — recommendation tool results must be JSON-serializable
- **API routes**: try-catch + JSON error response pattern
- **Confirm before destructive**: `deleteConfirmTool` pattern — voice insight overwrites to existing notes should use same confirmation flow

### Integration Points
- `lib/agent/tools/recommend.ts` — New recommendation tool file
- `lib/agent/tools/index.ts` — Register recommendation tool in AGENT_TOOLS
- `components/ChatBubble.tsx` or new `RecommendationCard.tsx` — Render rich cards for recommendation results
- `lib/voice/` — New voice module (transcription, extraction)
- `app/voice/` or `app/trips/[id]/debrief/` — Voice debrief UI entry point
- `prisma/schema.prisma` — Possible new model for voice debrief session / extracted insights

</code_context>

<specifics>
## Specific Ideas

- Recommendation results should feel like the camping buddy just texted you a list of spots with brief notes — not a formal search result page. Cards in chat reinforce this.
- Distance/drive time from Asheville (28801) is the natural anchor — all distance filtering is from Will's home base unless he specifies otherwise.
- Vehicle constraint context: Santa Fe Hybrid is a crossover, not a lifted 4x4. Road conditions matter — the tool should know this from the vehicle profile.
- VOICE-05: Check Fablr.ai codebase for existing voice recording + transcription patterns before building from scratch.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 05-intelligence-features*
*Context gathered: 2026-03-31*
