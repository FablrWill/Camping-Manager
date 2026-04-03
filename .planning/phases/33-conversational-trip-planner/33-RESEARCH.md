# Phase 33: Conversational Trip Planner - Research

**Researched:** 2026-04-03
**Domain:** Multi-turn Claude chat agent with tool use, full-screen sheet modal, trip creation flow
**Confidence:** HIGH

## Summary

This phase replaces the static "Plan Trip" form in `TripsClient.tsx` with a full-screen chat sheet powered by a dedicated `/api/trip-planner` route. The infrastructure is almost entirely already built — Phase 4 delivered streaming chat, conversation persistence, SSE parsing, and a modular tool registry. Phase 33 is primarily: (1) a new API route with a focused system prompt and trip-specific tool set, (2) a sheet/modal wrapper component that mounts `ChatClient`, (3) a summary card rendered inside the chat using the existing JSON-block pattern from `ChatBubble`, and (4) a web-search tool that doesn't yet exist in the tool registry.

The most novel technical work is the **summary card confirm flow** and the **web search tool**. Everything else is wiring existing pieces together. The summary card follows the identical extraction pattern used by `confirm_delete` and `recommendations` cards — Claude emits a JSON block, `ChatBubble` extracts it and renders a custom UI element with a tappable button. The web search tool will call an external search API (Brave Search is configured in `.planning/config.json` but set to `false` — the project uses `WebSearch` tool fallback; the trip-planner tool can use a free Tavily or Serper endpoint, or wrap the Anthropic `web_search` beta tool).

The post-creation navigation to `/trips/[id]/prep` requires `useRouter` from Next.js in the sheet component — the `message_complete` event from the SSE stream already carries `conversationId`, and the new route can add a `tripId` field to the `message_complete` payload when creation fires.

**Primary recommendation:** Build the sheet as a new `TripPlannerSheet.tsx` component, keep `ChatClient` unchanged, extend `ChatBubble` with a `trip_summary` action type, and create a standalone `/api/trip-planner` route that mirrors `/api/chat` exactly except for system prompt and tool set.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** "Add Trip" button opens a full-screen chat sheet (modal/drawer) on the trips page — stays in context, no navigation away.
- **D-02:** "Add manually" escape hatch is a small text link in the sheet header — always visible, lets the user bail to the old form at any point.
- **D-03:** The agent opens with a question — e.g., "Where are you thinking of going?" — gets the conversation moving immediately without waiting for the user to type first.
- **D-04:** Agent presents a summary card + confirm button in the chat when it has enough info — the card shows collected fields (name, dates, destination, etc.) with a "Create Trip" button. User reviews and taps to confirm before the trip is written to the DB.
- **D-05:** After creation, the sheet navigates to the new trip's prep page (`/trips/[id]/prep`) — gets the user straight into planning.
- **D-06:** Claude's discretion on what constitutes "enough info" before presenting the summary card — infer required fields from the Trip model schema and use conversational context to decide when to offer the card.
- **D-07:** Dedicated trip-planner system prompt — separate from the full camping agent at `/api/chat`. Focused on creating trips, less likely to wander. Reuses the existing `ChatClient.tsx` streaming UI.
- **D-08:** New `/api/trip-planner` route — dedicated API route with the trip-creation system prompt and trip-creation-specific tool set. Clean separation from `/api/chat`.
- **D-09:** The agent has access to four tools: gear inventory (what Will owns), weather (forecast for destination/dates), existing locations (search saved spots to link a destination), web search for campsites (search for campsite info, availability, road conditions for unknown destinations).
- **D-10:** Trip-creation conversations are saved to the DB (Conversation + Message models, same as Phase 4 chat history) — user can revisit and see how the trip was created.

### Claude's Discretion
- Exact opening question text for the agent greeting
- Minimum fields required before showing the summary card (infer from Trip model: name + startDate are required; everything else optional)
- Summary card visual design (reuse existing TripCard component or a simpler inline version)
- Sheet animation style (slide-up, fade, etc.) — consistent with existing modal patterns in the app
- How the agent handles ambiguous or conflicting info from the user during collection

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| TRIP-CHAT-01 | Replace "Plan Trip" button with full-screen chat sheet | `TripsClient.tsx` line ~258: `setShowForm(!showForm)` → replace with `setShowSheet(true)` |
| TRIP-CHAT-02 | "Add manually" escape hatch in sheet header | Text link toggles back to `showForm` state; sheet closes, static form opens |
| TRIP-CHAT-03 | Agent opens with greeting question | Inject initial assistant message into `ChatClient` `initialMessages` prop |
| TRIP-CHAT-04 | `/api/trip-planner` route with trip-focused system prompt | Mirrors `/api/chat` structure exactly; different `TRIP_PLANNER_SYSTEM_PROMPT` and tool subset |
| TRIP-CHAT-05 | Four-tool set: gear, weather, locations, web search | `list_gear`, `get_weather`, `list_locations` already exist; `web_search_campsites` is new |
| TRIP-CHAT-06 | Summary card rendered in chat with "Create Trip" confirm button | Extend `ChatBubble` with `trip_summary` action extraction pattern — same as `confirm_delete` |
| TRIP-CHAT-07 | Trip created via existing `/api/trips` POST after user confirms | Agent calls `create_trip` tool (already exists) only after user taps confirm button in summary card |
| TRIP-CHAT-08 | Post-creation redirect to `/trips/[id]/prep` | `message_complete` SSE event gains `tripId` field; sheet `onTripCreated(id)` callback triggers `router.push` |
| TRIP-CHAT-09 | Conversation saved to DB | Identical to Phase 4 pattern — `Conversation` + `Message` models already support this |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | Claude streaming + tool runner | Already in use in `/api/chat` |
| `next/navigation` | 16.2.1 (installed) | `useRouter` for post-creation redirect | App Router standard; used in other sheet components |
| Prisma | 6.19.2 (installed) | `Conversation` + `Message` persistence | Same schema models as Phase 4 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Tailwind CSS | 4 (installed) | Sheet/modal animation + layout | All UI work |
| `react` | 19.2.4 (installed) | Sheet state management | `useState` for `showSheet` in `TripsClient` |

### Web Search Tool Options
| Option | Availability | Notes |
|--------|-------------|-------|
| Anthropic `web_search` beta tool | Available in `@anthropic-ai/sdk` ≥ 0.x | Cleanest integration — no external API key; uses Anthropic's search capability server-side |
| Tavily API | Free tier (1000 req/mo) | Requires `TAVILY_API_KEY`; campsite-focused queries work well |
| Brave Search API | Free tier (2000 req/mo) | `brave_search: false` in config suggests key may not be configured |

**Recommendation:** Use the Anthropic native `web_search` tool (beta) since the project already has an Anthropic key and no additional credentials are needed. This is the simplest path.

**Installation:** No new packages required. All dependencies are already installed.

## Architecture Patterns

### Recommended File Structure for This Phase
```
components/
├── TripPlannerSheet.tsx      # Full-screen sheet wrapper; mounts ChatClient inside
app/api/
├── trip-planner/
│   └── route.ts              # New dedicated route — mirrors /api/chat
lib/agent/
├── trip-planner-system-prompt.ts   # Focused system prompt for trip creation
├── tools/
│   └── webSearchCampsites.ts       # New web search tool
```

### Pattern 1: Full-Screen Sheet Modal
**What:** A fixed-position overlay that covers the full screen, slides up from the bottom (consistent with existing app modals), and contains `ChatClient` as its body.
**When to use:** D-01 — stays in context on the trips page, no navigation.
**Example:**
```typescript
// TripPlannerSheet.tsx — consistent with existing modal pattern
'use client'
import { useRouter } from 'next/navigation'
import ChatClient from './ChatClient'

interface TripPlannerSheetProps {
  open: boolean
  onClose: () => void
  onAddManually: () => void
}

export default function TripPlannerSheet({ open, onClose, onAddManually }: TripPlannerSheetProps) {
  const router = useRouter()

  if (!open) return null

  const handleTripCreated = (tripId: string): void => {
    onClose()
    router.push(`/trips/${tripId}/prep`)
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-stone-950">
      {/* Header with escape hatch */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Plan a Trip</h2>
        <div className="flex items-center gap-3">
          <button onClick={onAddManually} className="text-sm text-stone-500 dark:text-stone-400">
            Add manually
          </button>
          <button onClick={onClose} className="text-stone-500">✕</button>
        </div>
      </div>
      {/* Chat body */}
      <div className="flex-1 overflow-hidden">
        <ChatClient
          apiEndpoint="/api/trip-planner"
          initialMessages={[{
            id: 'greeting',
            role: 'assistant',
            content: "Where are you thinking of going?"
          }]}
          onTripCreated={handleTripCreated}
        />
      </div>
    </div>
  )
}
```

**Note:** `ChatClient` currently hardcodes `/api/chat` in its `fetch` call (line ~82). It needs an `apiEndpoint` prop to support the `/api/trip-planner` route. This is a minimal, backward-compatible change — default `apiEndpoint = '/api/chat'`.

### Pattern 2: Summary Card via JSON Block Extraction (existing pattern)
**What:** Claude emits a JSON block with `"action": "trip_summary"` in its response. `ChatBubble` extracts and renders it as a confirm card — same mechanism as `confirm_delete` and `recommendations`.
**When to use:** D-04 — agent presents card when it has enough info.

**Agent instruction in system prompt:**
```
When you have collected at minimum a trip name + start date + end date, present a summary card by including this JSON block in your response:
```json
{
  "action": "trip_summary",
  "name": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "locationId": "...",
  "notes": "...",
  "bringingDog": false
}
```
The user will see a card with a "Create Trip" button. Do NOT call the create_trip tool yourself — wait for the user to confirm.
```

**ChatBubble extension:**
```typescript
// New extraction function in ChatBubble.tsx
interface TripSummaryPayload {
  action: 'trip_summary'
  name: string
  startDate: string
  endDate: string
  locationId?: string
  notes?: string
  bringingDog?: boolean
}

function extractTripSummary(content: string): TripSummaryPayload | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```|({[\s\S]*?"action"\s*:\s*"trip_summary"[\s\S]*?})/m)
  // ... same extraction logic as extractDeleteConfirm
}
```

**ChatBubble new prop:**
```typescript
interface ChatBubbleProps {
  // ...existing
  onCreateTrip?: (payload: TripSummaryPayload) => void
}
```

### Pattern 3: Dedicated Trip Planner API Route
**What:** `/api/trip-planner/route.ts` is a near-copy of `/api/chat/route.ts` with: (a) `TRIP_PLANNER_SYSTEM_PROMPT` instead of `CAMPING_EXPERT_SYSTEM_PROMPT`, (b) restricted tool set (4 tools), (c) `message_complete` event gains optional `tripId` field when `create_trip` was called.
**When to use:** D-08 — clean separation.

**Key difference from `/api/chat`:** Track whether `create_trip` was called during the session. After the runner finishes, if a trip was created, extract the trip ID from the tool result and include it in `message_complete`:
```typescript
send('message_complete', {
  conversationId: activeConversationId,
  tripId: createdTripId ?? null,  // null if no trip was created this turn
})
```

**`ChatClient` receives `onTripCreated` callback** and fires it when `message_complete` contains a non-null `tripId`.

### Anti-Patterns to Avoid
- **Don't modify the existing `/api/chat` route:** Keep full agent and trip planner completely separate. Merging them creates a messy system prompt and bloated tool set.
- **Don't use navigation to open the chat:** Sheet stays on trips page (D-01). Using `router.push` to open the chat breaks the "no navigation" constraint.
- **Don't render the summary card as a separate page/route:** It's a chat bubble. Keeping it in-conversation is the UX contract.
- **Don't have the agent call `create_trip` without user confirmation:** D-04 explicitly requires summary card → user confirm → creation. The system prompt must instruct Claude NOT to auto-create.
- **Don't add `apiEndpoint` with a default of anything other than `/api/chat`:** Backward compatibility — existing `ChatClient` usage on the `/chat` page must not break.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE streaming chat UI | New streaming component | Mount existing `ChatClient` with `apiEndpoint` prop | ChatClient already handles skeleton, tool activity, error states, SSE parsing |
| Conversation persistence | New DB layer | Reuse `Conversation` + `Message` models from Phase 4 | Already migrated, tested, working |
| Weather fetching | Custom weather call | `list_locations` + `get_weather` tools already exist | Exact same tools used in main chat agent |
| Gear inventory query | New gear endpoint | `list_gear` tool already exists | Full category filtering, wishlist support |
| JSON card extraction | Custom parser | Extend existing `ChatBubble` extraction pattern | `confirm_delete` and `recommendations` prove the pattern — 3rd instance is validation |

**Key insight:** The hard parts of this phase (streaming, tool runner, conversation persistence, card UI) are already built and proven. The phase is primarily composition + one new system prompt + one new tool.

## Common Pitfalls

### Pitfall 1: ChatClient hardcodes `/api/chat`
**What goes wrong:** `TripPlannerSheet` mounts `ChatClient` but requests go to the wrong route.
**Why it happens:** `ChatClient` line ~82 has `fetch('/api/chat', ...)` hardcoded.
**How to avoid:** Add `apiEndpoint?: string` prop to `ChatClient` with default `'/api/chat'`. One-line change, fully backward compatible.
**Warning signs:** Network tab shows `/api/chat` calls from the trip planner sheet.

### Pitfall 2: Initial greeting is a static message but gets confused with DB-persisted messages
**What goes wrong:** The greeting (`"Where are you thinking of going?"`) shows as a fake message with id `'greeting'` but the DB conversation starts empty. On reload, the greeting is gone.
**Why it happens:** `initialMessages` prop injects a fake assistant message that was never persisted.
**How to avoid:** Accept this is the right tradeoff for a new conversation — the greeting is a UI affordance, not a persisted message. Alternatively, create the `Conversation` record on sheet open and persist the greeting as the first `Message`. The simpler approach (fake initial message) is fine since trip-creation conversations are single-session.
**Warning signs:** Reloading the conversation history shows an empty start.

### Pitfall 3: Agent auto-creates trip before user confirms
**What goes wrong:** Claude calls `create_trip` tool directly without showing the summary card.
**Why it happens:** The main agent's system prompt says "For creates and updates, just do it and confirm what you did." This cannot carry over.
**How to avoid:** The trip-planner system prompt MUST explicitly say: "Never call create_trip directly. Always present a trip_summary JSON block and wait for the user to tap the Create Trip button." Remove `create_trip` from the trip-planner tool set entirely if possible — instead, the summary card confirm triggers a direct `POST /api/trips` from the client, bypassing the agent.
**Warning signs:** Trips appear in the DB before user sees the summary card.

**Recommended approach (simpler, safer):** Do NOT include `create_trip` in the trip-planner tool set. When user taps "Create Trip" in the summary card, the `TripPlannerSheet` calls `POST /api/trips` directly from the client with the payload from the summary card JSON. Agent cannot accidentally create trips. This decouples creation from the agent loop entirely.

### Pitfall 4: `message_complete` tripId approach requires tool result parsing
**What goes wrong:** To know if a trip was created this turn, the route needs to track tool call results — `create_trip` tool result contains the trip ID. The `BetaToolRunner` abstracts away individual tool results.
**Why it happens:** The runner fires tools internally; the route doesn't easily intercept individual tool results.
**How to avoid:** If using the "agent calls create_trip" approach, maintain a `let createdTripId: string | null = null` variable in the stream closure and capture it in the `executeAgentTool` dispatcher by wrapping `create_trip` execution. Alternatively, use the recommended approach above (client-side trip creation) which sidesteps this entirely.

### Pitfall 5: Web search tool increases latency noticeably
**What goes wrong:** Campsite searches via web are slow (1-3s). The chat skeleton/tool activity indicator mitigates this, but the tool must have a timeout.
**Why it happens:** External HTTP calls in tool execution.
**How to avoid:** Set a 5-second `AbortController` timeout on the fetch inside `webSearchCampsites.ts`. Return a graceful fallback string on timeout.
**Warning signs:** Chat appears frozen for 5+ seconds when searching for campsite info.

## Code Examples

### Extending ChatClient with apiEndpoint prop
```typescript
// components/ChatClient.tsx — minimal change
interface ChatClientProps {
  initialMessages?: Array<{ id: string; role: string; content: string }>
  conversationId?: string | null
  pageContext?: string
  apiEndpoint?: string                      // NEW — default '/api/chat'
  onTripCreated?: (tripId: string) => void  // NEW — callback for post-creation nav
}

export default function ChatClient({
  initialMessages = [],
  conversationId: initialConversationId = null,
  pageContext,
  apiEndpoint = '/api/chat',    // backward compatible
  onTripCreated,
}: ChatClientProps) {
  // ...existing state...

  // In sendMessage, replace fetch('/api/chat', ...) with:
  response = await fetch(apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, userMessage: text.trim(), pageContext }),
  })

  // In message_complete handler:
  case 'message_complete':
    // ...existing handling...
    if (payload.tripId && onTripCreated) {
      onTripCreated(payload.tripId)
    }
    break
}
```

### Trip Planner System Prompt (key constraints)
```typescript
// lib/agent/trip-planner-system-prompt.ts
export const TRIP_PLANNER_SYSTEM_PROMPT = `You are a trip planning assistant for Outland OS.
Your only job is to gather info and help create a camping trip.

TOOLS AVAILABLE:
- list_gear: check what gear Will owns (relevant for destination type)
- get_weather: forecast for coordinates (use when destination has coords)
- list_locations: search Will's saved spots by type/rating
- web_search_campsites: search for campsite info, availability, road conditions

FLOW:
1. Ask short, casual questions to collect: trip name, destination, start date, end date
2. Use tools proactively — check weather and saved spots when destination is mentioned
3. When you have name + startDate + endDate (minimum required), present a trip_summary card
4. NEVER call create_trip yourself. NEVER create the trip. Present the summary card and wait.
5. The user will tap a button to confirm. You'll be notified once the trip is created.

SUMMARY CARD FORMAT — include this exact JSON block in your response when ready:
\`\`\`json
{
  "action": "trip_summary",
  "name": "...",
  "startDate": "YYYY-MM-DD",
  "endDate": "YYYY-MM-DD",
  "locationId": null,
  "notes": "...",
  "bringingDog": false
}
\`\`\`

PERSONA: Casual camping buddy. Short questions. Don't ask for everything at once — conversational pace.
User is Will — solo camper, Asheville NC, Santa Fe Hybrid.`
```

### Web Search Campsites Tool
```typescript
// lib/agent/tools/webSearchCampsites.ts
import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const webSearchCampsitesTool: Tool = {
  name: 'web_search_campsites',
  description: 'Search the web for campsite info, availability, road conditions, or permit requirements for a destination.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query — e.g. "Pisgah National Forest dispersed camping road conditions 2026"',
      },
    },
    required: ['query'],
  },
}

export async function executeWebSearchCampsites(input: { query: string }): Promise<string> {
  // Implementation: call Anthropic web_search or Tavily
  // Use AbortController with 5s timeout
}
```

### TripsClient integration point
```typescript
// components/TripsClient.tsx — replace "Plan Trip" button handler
const [showPlannerSheet, setShowPlannerSheet] = useState(false)

// Replace:
onClick={() => setShowForm(!showForm)}
// With:
onClick={() => setShowPlannerSheet(true)}

// Add TripPlannerSheet to render output:
<TripPlannerSheet
  open={showPlannerSheet}
  onClose={() => setShowPlannerSheet(false)}
  onAddManually={() => { setShowPlannerSheet(false); setShowForm(true) }}
/>
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static form for trip creation | Multi-turn conversational agent | Phase 33 | Agent can fetch weather, check saved spots, and web-search campsites before creating |
| Agent auto-creates on behalf of user | Summary card confirm flow | Phase 33 | User reviews before write — no surprise trips in DB |

## Open Questions

1. **Web search implementation for `web_search_campsites`**
   - What we know: Project has no Brave Search key configured (`brave_search: false`). Anthropic SDK 0.80.0 is installed. Tavily is not installed.
   - What's unclear: Whether the Anthropic `web_search` beta tool is available in SDK 0.80.0 and whether it works inside `BetaToolRunner`. Need to verify the correct SDK API for embedding web search as a tool in the runner.
   - Recommendation: Check `@anthropic-ai/sdk` 0.80.0 release notes. If Anthropic native web search is not available as a `Tool` schema type in this version, use a direct Tavily API call (free tier, no npm package needed — just `fetch` to `api.tavily.com`). The tool executor calls the Tavily endpoint and returns scraped results as a string. Add `TAVILY_API_KEY` to `.env.example`.

2. **Should `create_trip` be removed from the trip-planner tool set entirely?**
   - What we know: The summary card confirm flow requires client-side trip creation (user taps button → `fetch POST /api/trips`). Including `create_trip` in the tool set creates the risk of agent accidentally creating trips before confirmation.
   - What's unclear: Whether there's a legitimate reason for the agent to call `create_trip` during the conversation (e.g., if user says "go ahead and create it" in text without tapping the button).
   - Recommendation: Remove `create_trip` from trip-planner tool set. Force all creation through the confirm button. If user says "just create it" in text, agent says "tap the Create Trip button above to confirm."

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| `@anthropic-ai/sdk` | `/api/trip-planner` streaming | ✓ | 0.80.0 | — |
| `ANTHROPIC_API_KEY` | Trip planner API calls | ✓ (assumed, used by `/api/chat`) | — | — |
| Prisma SQLite | Conversation persistence | ✓ | 6.19.2 | — |
| Tavily API (optional) | `web_search_campsites` tool | ✗ (not configured) | — | Anthropic native web_search or manual `TAVILY_API_KEY` |
| `next/navigation` `useRouter` | Post-creation redirect | ✓ | 16.2.1 | — |

**Missing dependencies with no fallback:** None that block execution.

**Missing dependencies with fallback:**
- Tavily API key: Use Anthropic native web_search tool OR add `TAVILY_API_KEY` to `.env` — fallback is to skip web search for campsites and note it in the system prompt ("web search unavailable, suggest Recreation.gov manually").

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 + jsdom |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| TRIP-CHAT-04 | Trip planner route returns SSE stream | integration | `npm test -- --grep "trip-planner"` | ❌ Wave 0 |
| TRIP-CHAT-05 | `webSearchCampsites` tool returns string result | unit | `npm test -- --grep "webSearchCampsites"` | ❌ Wave 0 |
| TRIP-CHAT-06 | `extractTripSummary` parses JSON block correctly | unit | `npm test -- --grep "extractTripSummary"` | ❌ Wave 0 |
| TRIP-CHAT-08 | `message_complete` with tripId fires `onTripCreated` | unit | `npm test -- --grep "onTripCreated"` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `lib/__tests__/trip-planner-tools.test.ts` — covers `webSearchCampsites` tool (TRIP-CHAT-05)
- [ ] `lib/__tests__/chat-bubble-extraction.test.ts` — covers `extractTripSummary` parsing (TRIP-CHAT-06)
- [ ] `lib/__tests__/trip-planner-route.test.ts` — covers SSE route integration (TRIP-CHAT-04)

## Sources

### Primary (HIGH confidence)
- Direct file reads: `app/api/chat/route.ts`, `components/ChatClient.tsx`, `components/ChatBubble.tsx`, `lib/agent/tools/index.ts`, `lib/agent/system-prompt.ts`, `prisma/schema.prisma`, `components/TripsClient.tsx`
- Direct reads: `lib/agent/tools/listGear.ts`, `lib/agent/tools/createTrip.ts`, `lib/agent/tools/getWeather.ts`, `lib/agent/tools/listLocations.ts`
- Direct reads: `app/api/trips/route.ts`, `vitest.config.ts`, `.planning/config.json`
- All patterns documented here are verified against actual codebase

### Secondary (MEDIUM confidence)
- Anthropic SDK `BetaToolRunner` streaming pattern — verified via existing `/api/chat` implementation
- `next/navigation` `useRouter` in client components — standard Next.js 16 App Router pattern

### Tertiary (LOW confidence)
- Anthropic native `web_search` tool availability in SDK 0.80.0 — needs verification against SDK release notes; flagged as open question

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified as installed and working
- Architecture: HIGH — all patterns traced to existing working code in the codebase
- Pitfalls: HIGH — identified from direct code inspection of integration points
- Web search tool: LOW — specific SDK API surface not verified; flagged as open question

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack; 30-day window)
