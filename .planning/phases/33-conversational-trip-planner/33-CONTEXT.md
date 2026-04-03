# Phase 33: Conversational Trip Planner - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Replace the static "Create Trip" form with a multi-turn Claude agent chat that asks dynamic questions, calls gear/weather/web tools, and creates the trip when ready. The chat appears as a full-screen sheet on the trips page — it is the primary creation path. The existing Trip model form stays for post-creation edits. An "Add manually" escape hatch is preserved.

</domain>

<decisions>
## Implementation Decisions

### Entry Point & Container
- **D-01:** "Add Trip" button opens a **full-screen chat sheet** (modal/drawer) on the trips page — stays in context, no navigation away.
- **D-02:** "Add manually" escape hatch is a **small text link in the sheet header** — always visible, lets the user bail to the old form at any point.
- **D-03:** The agent **opens with a question** — e.g., "Where are you thinking of going?" — gets the conversation moving immediately without waiting for the user to type first.

### Trip Creation Trigger
- **D-04:** Agent presents a **summary card + confirm button** in the chat when it has enough info — the card shows collected fields (name, dates, destination, etc.) with a "Create Trip" button. User reviews and taps to confirm before the trip is written to the DB.
- **D-05:** After creation, the sheet **navigates to the new trip's prep page** (`/trips/[id]/prep`) — gets the user straight into planning.
- **D-06:** **Claude's discretion** on what constitutes "enough info" before presenting the summary card — infer required fields from the Trip model schema and use conversational context to decide when to offer the card.

### Creation Scope & Persona
- **D-07:** **Dedicated trip-planner system prompt** — separate from the full camping agent at `/api/chat`. Focused on creating trips, less likely to wander. Reuses the existing `ChatClient.tsx` streaming UI.
- **D-08:** New **`/api/trip-planner` route** — dedicated API route with the trip-creation system prompt and trip-creation-specific tool set. Clean separation from `/api/chat`.
- **D-09:** The agent has access to four tools: **gear inventory** (what Will owns), **weather** (forecast for destination/dates), **existing locations** (search saved spots to link a destination), **web search for campsites** (search for campsite info, availability, road conditions for unknown destinations).
- **D-10:** Trip-creation conversations are **saved to the DB** (Conversation + Message models, same as Phase 4 chat history) — user can revisit and see how the trip was created.

### Claude's Discretion
- Exact opening question text for the agent greeting
- Minimum fields required before showing the summary card (infer from Trip model: name + startDate are required; everything else optional)
- Summary card visual design (reuse existing TripCard component or a simpler inline version)
- Sheet animation style (slide-up, fade, etc.) — consistent with existing modal patterns in the app
- How the agent handles ambiguous or conflicting info from the user during collection

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Chat Infrastructure (Phase 4)
- `components/ChatClient.tsx` — Streaming chat UI with skeleton bubbles, tool activity indicator, conversationId, pageContext. This is the reusable UI shell for the trip-planner sheet.
- `components/ChatBubble.tsx` — Individual message bubble (user + assistant)
- `components/ChatInput.tsx` — Text input + send button
- `components/SkeletonBubble.tsx` — Loading state while agent is thinking
- `components/ToolActivityIndicator.tsx` — Shows active tool call name
- `app/api/chat/route.ts` — Existing full camping agent route — reference for streaming pattern, tool-calling loop, and conversation persistence. The new `/api/trip-planner` route mirrors this architecture.

### Trip Data Model
- `prisma/schema.prisma` — Trip model fields (name required, startDate required, endDate required, locationId optional, vehicleId optional, notes optional, bringingDog boolean, fallbackFor/fallbackOrder for alternatives chain). The summary card must collect at minimum: name + startDate + endDate.
- `app/api/trips/route.ts` — Trip create endpoint (POST). The trip-planner agent calls this to create the trip after user confirms the summary card.

### Existing Trip UI
- `components/TripsClient.tsx` — Current trips page with "Add Trip" button (line ~257) and static form. This is where the sheet trigger replaces `setShowForm(!showForm)`.

### Tool Implementations (for agent tool set)
- `lib/agent/tools/` — Existing tool registry from Phase 4. New trip-planner tools (gear lookup, weather, location search, web search) should follow the same module pattern.

### Conversation Persistence (Phase 4 pattern)
- `.planning/phases/04-chat-agent/04-CONTEXT.md` — D-12/D-13/D-14: Conversation + Message Prisma models, sliding window context, agent memory. Trip-creation conversations follow the same persistence pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ChatClient.tsx` — Drop-in streaming chat UI; accepts `initialMessages`, `conversationId`, `pageContext` props. The trip-planner sheet mounts this inside a modal/sheet wrapper.
- `SkeletonBubble.tsx` + `ToolActivityIndicator.tsx` — Loading/tool states already solved.
- `TripCard.tsx` — May be reusable for the summary card, or the agent can render inline trip fields in the chat.

### Established Patterns
- Sheet/modal pattern: existing modals in the app use state (`showForm`, `setShowForm`) — the trip-planner sheet follows the same toggle pattern in `TripsClient.tsx`.
- Streaming: `/api/chat` route uses SSE streaming with `TextDecoder`-based chunked parsing in `ChatClient.tsx` — identical pattern for `/api/trip-planner`.
- Tool registry: `lib/agent/tools/` has modular per-tool files. New trip-planner tools follow the same export pattern.

### Integration Points
- `TripsClient.tsx`: Replace the "Add Trip" button handler to open the chat sheet instead of the static form.
- `app/api/trip-planner/route.ts`: New route, mirrors `/api/chat` structure with different system prompt and tool set.
- `app/api/trips/route.ts` (POST): Called by the trip-planner agent when the user confirms the summary card.

</code_context>

<specifics>
## Specific Ideas

- Agent opens with a short, casual question — consistent with the "camping expert buddy" persona from Phase 4.
- The summary card confirm flow is the critical interaction: the agent renders the card as a special chat bubble (not just text) with a tappable "Create Trip" button.
- Web search tool for campsites is a new capability not in the existing chat agent — this is the key differentiator for conversational trip creation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 33-conversational-trip-planner*
*Context gathered: 2026-04-03*
