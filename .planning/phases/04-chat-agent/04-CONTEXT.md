# Phase 4: Chat Agent - Context

**Gathered:** 2026-03-31
**Status:** Ready for planning

<domain>
## Phase Boundary

Messenger-style AI chat agent with full read-write access to gear, trips, locations, weather, and the NC camping knowledge base. Users can have natural conversations with a camping-expert assistant that proactively helps with trip planning, gear decisions, and campsite knowledge. Includes persistent conversation history, agent memory for user preferences, and streaming responses.

**Pre-requisite bug fixes:** Fix packing item upsert (TASKS.md medium bug) and add trip update/delete routes before building the agent — clean APIs are the foundation.

</domain>

<decisions>
## Implementation Decisions

### Chat UI & Navigation
- **D-01:** Full `/chat` page as a dedicated tab in the bottom nav bar, PLUS a context-aware shortcut button accessible from other pages (trips, gear, spots). The shortcut passes current page context (e.g. "User is viewing Trip: Pisgah Weekend") so the agent knows what the user is working on.
- **D-02:** Skeleton bubble loading state — a gray placeholder bubble that fills in as text streams. Shown while the agent is thinking before streaming begins.

### Claude's Discretion (Chat UI)
- Input area design (simple text+send vs suggested prompt chips) — Claude picks what fits best
- Response format (plain text bubbles vs rich cards for data) — Claude decides based on existing Card/Badge/StatCard components
- Empty state personality vs minimal — Claude picks
- Shortcut button placement (FAB vs header icon) — Claude picks based on existing layout patterns
- Threading model (single continuous thread vs multi-thread by context) — Claude picks

### Agent Architecture
- **D-03:** Full read-write agent — can query AND mutate data across all domains (gear, trips, locations, packing, weather, knowledge base). Not read-only.
- **D-04:** Confirm before destructive actions only — agent acts freely for creates/updates but asks before deleting anything. No confirmation needed for reads or additions.
- **D-05:** Multi-tool calling per turn — agent can chain multiple tool calls in a single response (e.g. weather + gear + knowledge base for a trip question). Uses Claude's iterative tool calling.
- **D-06:** Proactive suggestions — agent goes beyond answering the literal question. Flags missing gear, weather warnings, knowledge base tips relevant to the user's situation.
- **D-07:** Modular tool registry — each tool is a separate file in `lib/agent/tools/`. Matches Phase 2's PREP_SECTIONS extensible registry pattern. Easy to add Phase 5 recommendation and voice tools later.
- **D-08:** Camping expert persona — system prompt gives the agent a knowledgeable-friend identity. Casual, helpful, knows NC camping inside and out. Not stiff, not overly enthusiastic. Like texting a buddy who's camped everywhere.
- **D-09:** Use Anthropic Agent SDK for the tool-calling loop. Handles multi-turn tool use, streaming, and conversation management with less boilerplate than raw Messages API.

### Bug Fixes (Pre-requisite)
- **D-10:** Fix packing item checkbox to use `upsert` instead of `update` (`api/packing-list/items/route.ts:16`). Will 404 if PackingItem rows don't exist yet.
- **D-11:** Add `app/api/trips/[id]/route.ts` with PUT and DELETE handlers. Currently no per-trip update/delete route exists.

### Conversation Memory
- **D-12:** Persistent chat history in SQLite — conversations and messages saved via Prisma models (Conversation + Message). History survives page refresh and app reopening.
- **D-13:** Agent memory system — agent extracts and stores key user preferences and facts (camping style, dietary needs, gear preferences) in a persistent store. Builds a user profile over time across conversations.
- **D-14:** Smart context windowing — send last N messages + agent memory + tool results to Claude, not full history. Keeps API costs manageable as conversations grow.

### Claude's Discretion (Memory)
- Memory acknowledgment UX (explicit "I'll remember that" vs silent storage) — Claude picks
- Chat history browsing UI (chat list vs most-recent-only) — Claude picks based on complexity vs value
- Agent memory storage format and extraction logic
- Context window size (how many messages in the sliding window)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### RAG & Knowledge Base (Phase 3 foundation)
- `lib/rag/search.ts` — hybridSearch function (FTS5 + vec0/RRF). This is the primary retrieval tool for the chat agent.
- `lib/rag/context.ts` — buildRagContext function. Formats search results for Claude prompt injection.
- `lib/rag/types.ts` — SearchResult, RankedResult, ChunkMetadata types used across the RAG layer.
- `lib/rag/embed.ts` — Voyage embedding function. Needed if agent memory uses embeddings.
- `app/api/knowledge/search/route.ts` — Existing knowledge search API (POST). Agent tool can call hybridSearch directly instead of going through HTTP.

### Existing Claude Integration
- `lib/claude.ts` — Current Anthropic SDK wrapper. Handles packing list and meal plan generation. Agent chat needs its own streaming + tool-use layer alongside this.

### Existing API Routes (agent tool targets)
- `app/api/gear/route.ts` + `app/api/gear/[id]/route.ts` — Gear CRUD
- `app/api/trips/route.ts` — Trip list/create (NOTE: no [id] route yet — D-11 adds this)
- `app/api/trips/[id]/prep/route.ts` — Trip prep status (Phase 2 D-05: designed for agent consumption)
- `app/api/locations/route.ts` + `app/api/locations/[id]/route.ts` — Location CRUD
- `app/api/weather/route.ts` — Weather lookup
- `app/api/packing-list/route.ts` — Packing list generation
- `app/api/packing-list/items/route.ts` — Packing item toggle (NOTE: has upsert bug — D-10 fixes this)
- `app/api/meal-plan/route.ts` — Meal plan generation
- `app/api/power-budget/route.ts` — Power budget calculation
- `app/api/vehicle/route.ts` + `app/api/vehicle/[id]/route.ts` — Vehicle data

### UI Components
- `components/ui/` — Button, Card, Badge, Chip, EmptyState, Input, Modal, PageHeader, StatCard. Chat UI should reuse these.
- `components/AppShell.tsx` — App layout with bottom nav. Chat page needs to be added as a tab.
- `components/BottomNav.tsx` — Bottom navigation bar. Needs a chat tab added.
- `components/TopHeader.tsx` — Page headers. Context-aware shortcut button may go here.

### Architecture & Patterns
- `.planning/phases/02-executive-trip-prep/02-CONTEXT.md` §D-05 — Prep API designed for agent consumption
- `.planning/phases/02-executive-trip-prep/02-CONTEXT.md` §D-06 — Registry pattern for extensibility
- `.planning/phases/03-knowledge-base/03-CONTEXT.md` §D-10, D-11 — RAG retrieval API design decisions
- `.planning/codebase/CONVENTIONS.md` — Naming patterns, import organization, error handling patterns
- `.planning/codebase/ARCHITECTURE.md` — Overall system architecture

### Requirements
- `.planning/REQUIREMENTS.md` — CHAT-01 through CHAT-04 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 4 — Success criteria and dependency info

### Known Bugs
- `TASKS.md` §Known Bugs / Gaps — GPT code review findings. D-10 and D-11 address the medium-severity items.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- **UI primitives:** Card, Badge, Button, Input, Modal, EmptyState, Chip, StatCard — chat bubbles and cards can compose from these
- **RAG retrieval:** `hybridSearch()` and `buildRagContext()` are ready to use as agent tools
- **Anthropic SDK:** Already installed (`@anthropic-ai/sdk` 0.80.0). claude.ts has the client instantiation pattern.
- **Design system:** CSS custom properties with dark mode support via ThemeProvider
- **Prisma ORM:** 10 existing models. Conversation + Message models will extend the schema.

### Established Patterns
- **API routes:** try-catch + JSON error response pattern across all 19 routes
- **Client components:** `'use client'` directive, useState/useCallback/useEffect hooks
- **Server pages:** Fetch data server-side via Prisma, pass as props to client components
- **Registry pattern:** Phase 2's PREP_SECTIONS config-driven extensibility — model for tool registry
- **Inline error state:** No alert() — use state-based error messages in components

### Integration Points
- **BottomNav.tsx:** Add chat tab (5th nav item)
- **AppShell.tsx:** Route to /chat page
- **TopHeader.tsx or FAB:** Context-aware chat shortcut button placement
- **lib/agent/:** New directory for agent logic — tools/, system prompt, memory
- **prisma/schema.prisma:** Add Conversation, Message, and AgentMemory models
- **app/api/chat/:** New streaming chat API route
- **app/chat/:** New chat page and client component

</code_context>

<specifics>
## Specific Ideas

- Agent persona is a "knowledgeable camping friend" — casual, not stiff, like texting a buddy who's camped everywhere in NC. System prompt should reflect this tone.
- Context-aware shortcut: when opening chat from the trips page, the agent should know which trip you're looking at. Same for gear, spots pages.
- Agent SDK (Anthropic) preferred over raw Messages API for the tool-calling loop — less boilerplate, handles multi-turn tool use.
- Tool visibility: agent should show what it's doing (checking gear, looking up weather) but the exact UX is Claude's discretion.
- Proactive behavior: if you ask "what about Pisgah this weekend?", the agent should pull weather + your gear + knowledge base unprompted, not just answer literally.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 04-chat-agent*
*Context gathered: 2026-03-31*
