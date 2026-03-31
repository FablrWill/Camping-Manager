# Phase 4: Chat Agent - Research

**Researched:** 2026-03-31
**Domain:** Anthropic SDK tool-use agentic loop, Next.js SSE streaming, SQLite conversation persistence
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Full `/chat` page as a dedicated tab in the bottom nav bar, PLUS a context-aware shortcut button (FAB) accessible from Trips, Gear, and Spots pages. Shortcut passes current page context (e.g., "User is viewing Trip: Pisgah Weekend") to the agent.
- **D-02:** Skeleton bubble loading state — gray placeholder bubble shown while the agent is thinking before streaming begins.
- **D-03:** Full read-write agent — can query AND mutate data across all domains (gear, trips, locations, packing, weather, knowledge base). Not read-only.
- **D-04:** Confirm before destructive actions only — agent acts freely for creates/updates, asks before deleting. No confirmation needed for reads or additions.
- **D-05:** Multi-tool calling per turn — agent can chain multiple tool calls in a single response. Uses Claude's iterative tool calling.
- **D-06:** Proactive suggestions — agent goes beyond the literal question. Flags missing gear, weather warnings, knowledge base tips.
- **D-07:** Modular tool registry — each tool is a separate file in `lib/agent/tools/`. Matches Phase 2's PREP_SECTIONS extensible registry pattern.
- **D-08:** Camping expert persona — system prompt gives the agent a casual, knowledgeable-friend identity. Knows NC camping. Not stiff. Like texting a buddy.
- **D-09:** Use Anthropic `BetaToolRunner` for the tool-calling loop. Handles multi-turn tool use, streaming, and conversation management with less boilerplate than raw Messages API.
- **D-10:** Fix packing item checkbox to use `upsert` (`api/packing-list/items/route.ts:16`). Pre-requisite bug fix.
- **D-11:** Add `app/api/trips/[id]/route.ts` with PUT and DELETE handlers. Pre-requisite (route currently missing).
- **D-12:** Persistent chat history in SQLite — Conversation + Message Prisma models.
- **D-13:** Agent memory system — extracts and stores user preferences/facts across conversations.
- **D-14:** Smart context windowing — send last N messages + agent memory + tool results to Claude, not full history.

### Claude's Discretion
- Input area design (simple text+send vs suggested prompt chips)
- Response format (plain text bubbles vs rich cards)
- Empty state personality vs minimal
- Shortcut button placement (FAB vs header icon) — UI-SPEC resolves this: FAB at `fixed bottom-24 right-4 z-40`
- Threading model (single continuous thread vs multi-thread) — Claude picks
- Memory acknowledgment UX (explicit "I'll remember that" vs silent storage)
- Chat history browsing UI (chat list vs most-recent-only)
- Agent memory storage format and extraction logic
- Context window size (sliding window N)

### Deferred Ideas (OUT OF SCOPE)
- None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| CHAT-01 | User can interact with a messenger-style chat agent with access to knowledge base, gear inventory, trip data, and saved locations | `BetaToolRunner` with modular tool registry; Conversation + Message models for persistence |
| CHAT-02 | Chat agent can answer "what do I need for a cold-weather trip?" using RAG context + user's gear | `hybridSearch()` + `buildRagContext()` from Phase 3 called as agent tool; Prisma gear query as separate tool |
| CHAT-03 | Chat uses streaming responses (SSE) for responsive feel on mobile | `BetaToolRunner` with `stream: true` + Next.js App Router `ReadableStream` + `text/event-stream` response headers |
| CHAT-04 | Chat agent uses tool-use pattern — can query gear, trips, locations, weather, and knowledge base as tools | `BetaRunnableTool` interface: each tool = `{name, description, input_schema, run, parse}`. Iteration cap via loop count check. |
</phase_requirements>

---

## Summary

Phase 4 builds the conversational heart of Outland OS: a messenger-style AI agent that has full read-write access to the user's gear, trips, locations, weather data, and the Phase 3 RAG knowledge base. The architecture rests on three pillars: Claude's `BetaToolRunner` for the agentic loop (handles iterative tool calling automatically), SSE streaming via Next.js App Router `ReadableStream` for responsive mobile UX, and SQLite Prisma models for persistent conversation history and agent memory.

The Anthropic SDK v0.80.0 (installed) already includes `BetaToolRunner` in `lib/tools/`. This is the right abstraction — it handles the multi-turn tool use loop (Claude calls a tool → app executes it → results go back to Claude → repeat until end_turn) without manual loop management. The `BetaRunnableTool` interface makes each tool a self-contained module: definition + execution function in one object. This maps directly to D-07's `lib/agent/tools/` registry pattern.

The critical complexity in this phase is the streaming + tool-use combination. Claude cannot stream text and execute tools simultaneously — during tool calls the stream pauses, tools execute, and then Claude streams the final response. The chat API route must handle this multi-phase flow and forward the right SSE events to the client (tool-activity notifications, then token-by-token text). The two pre-requisite bug fixes (D-10 upsert fix, D-11 trips PUT/DELETE) must land before agent tools can safely mutate trip data.

**Primary recommendation:** Build the chat API route around `client.beta.messages.toolRunner({ stream: true })` piped into a Next.js `ReadableStream` with custom SSE event types: `tool_activity`, `text_delta`, and `message_complete`. Keep the tool registry as plain `BetaRunnableTool` objects exported from `lib/agent/tools/` and imported into a single registry array.

---

## Project Constraints (from CLAUDE.md)

| Directive | Impact on Phase 4 |
|-----------|------------------|
| TypeScript throughout | All tools, agent, API routes in `.ts` |
| `'use client'` on interactive components | `ChatClient.tsx` needs directive; `app/chat/page.tsx` is server component |
| All API routes: try-catch + JSON error response | Chat API route must wrap errors — streaming errors need special handling (send error event before closing) |
| No `alert()` — use inline state-based errors | Chat stream errors rendered as inline error messages in chat thread |
| Hooks: correct minimal dependency arrays | `useCallback` for send handler; avoid stale closures over streaming state |
| `@/*` path alias for imports | Use `@/lib/agent/...`, `@/lib/rag/...` etc. |
| Commit messages: imperative mood | Agent SDK noted, keep standard |
| TASKS.md is the single source of truth | Update every session |

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.80.0 (installed) | Claude API + `BetaToolRunner` for agentic loop | Already installed; `BetaToolRunner` provides automatic multi-turn tool loop with streaming |
| `prisma` | 6.19.2 (installed) | Conversation + Message + AgentMemory models | Existing ORM — schema extension, no new dependency |
| `next` (App Router) | 16.2.1 (installed) | SSE streaming via `Response` + `ReadableStream` | App Router route handlers natively support streaming; no extra library needed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `zod` | check pkg.json | Input schema parsing for tool arguments | `BetaRunnableTool.parse` — validate tool inputs before execution |
| `better-sqlite3` | installed (rag dep) | vec0 queries in RAG search tool | Already used by Phase 3 — no new dependency |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `BetaToolRunner` | Raw `messages.create` loop | Manual loop requires tracking stop_reason, building tool_result messages, re-sending. More boilerplate, same capability. |
| Custom SSE ReadableStream | Vercel AI SDK `StreamingTextResponse` | Vercel AI SDK adds a dependency and abstracts too much. Custom SSE gives full control over event types (tool_activity vs text_delta) needed for the UI. |
| Inline tool definitions | Separate `lib/agent/tools/` files | Inline is simpler for 2 tools; at 8+ tools the registry becomes unmanageable. D-07 locks the registry pattern. |

**Installation:** No new packages required. All core dependencies are installed.

**Version verification (npm registry, 2026-03-31):**
- `@anthropic-ai/sdk` latest: 0.81.0. Installed: 0.80.0 (satisfies `^0.80.0`). `BetaToolRunner` confirmed present in installed version.
- Recommend upgrading to 0.81.0 in Wave 0 to get latest bug fixes.

---

## Architecture Patterns

### Recommended Project Structure

```
lib/
└── agent/
    ├── tools/
    │   ├── index.ts         # registry: exports AGENT_TOOLS array
    │   ├── searchKnowledge.ts
    │   ├── listGear.ts
    │   ├── createGear.ts
    │   ├── updateGear.ts
    │   ├── listTrips.ts
    │   ├── getWeather.ts
    │   ├── listLocations.ts
    │   └── togglePackingItem.ts
    ├── system-prompt.ts     # CAMPING_EXPERT_SYSTEM_PROMPT constant
    └── memory.ts            # extractMemory(), getMemoryContext()

app/
└── api/
    └── chat/
        └── route.ts         # POST — streaming chat endpoint

app/
└── chat/
    ├── page.tsx             # Server component — loads history
    └── loading.tsx          # Optional: route-level skeleton

components/
├── ChatClient.tsx           # Main stateful shell ('use client')
├── ChatBubble.tsx
├── ChatInput.tsx
├── ToolActivityIndicator.tsx
├── SkeletonBubble.tsx
└── ChatContextButton.tsx

prisma/
└── schema.prisma            # + Conversation, Message, AgentMemory models
```

### Pattern 1: BetaRunnableTool Registry

**What:** Each agent tool is a `BetaRunnableTool` object — a standard `BetaTool` definition augmented with `run()` and `parse()` functions. All tools exported from `lib/agent/tools/index.ts`.

**When to use:** Any capability the agent needs to query or mutate app data.

```typescript
// Source: node_modules/@anthropic-ai/sdk/lib/tools/BetaRunnableTool.d.ts
import { BetaRunnableTool } from '@anthropic-ai/sdk/resources/beta'

// lib/agent/tools/listGear.ts
export const listGearTool: BetaRunnableTool<{ category?: string }> = {
  name: 'list_gear',
  description: 'List the user\'s gear inventory. Optionally filter by category (shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc). Returns name, brand, condition, weight, and notes for each item.',
  input_schema: {
    type: 'object' as const,
    properties: {
      category: {
        type: 'string',
        description: 'Optional category filter',
      },
    },
    required: [],
  },
  parse: (input: unknown) => input as { category?: string },
  run: async ({ category }) => {
    const where = category ? { category } : {}
    const items = await prisma.gearItem.findMany({ where, orderBy: { name: 'asc' } })
    return JSON.stringify(items)
  },
}

// lib/agent/tools/index.ts
import { listGearTool } from './listGear'
import { searchKnowledgeTool } from './searchKnowledge'
// ... other tools

export const AGENT_TOOLS: BetaRunnableTool[] = [
  listGearTool,
  searchKnowledgeTool,
  // ... ordered by expected frequency of use
]
```

### Pattern 2: Streaming Chat API Route

**What:** Next.js App Router `POST` route that runs `BetaToolRunner` with streaming and forwards events as SSE.

**When to use:** This is the only chat API route. All chat goes through here.

```typescript
// Source: Anthropic SDK BetaToolRunner + Next.js App Router docs
// app/api/chat/route.ts
import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { AGENT_TOOLS } from '@/lib/agent/tools'
import { CAMPING_EXPERT_SYSTEM_PROMPT } from '@/lib/agent/system-prompt'
import { buildContextWindow } from '@/lib/agent/memory'

export const dynamic = 'force-dynamic'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
const MAX_TOOL_ITERATIONS = 8  // D-05 hard cap per message turn

export async function POST(req: NextRequest) {
  const encoder = new TextEncoder()

  try {
    const { conversationId, userMessage, pageContext } = await req.json()
    // Load sliding window from DB + agent memory
    const messages = await buildContextWindow(conversationId, pageContext)
    messages.push({ role: 'user', content: userMessage })

    const stream = new ReadableStream({
      async start(controller) {
        const send = (event: string, data: unknown) => {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          )
        }

        try {
          let toolIterations = 0

          const runner = client.beta.messages.toolRunner(
            {
              model: 'claude-sonnet-4-6',
              max_tokens: 2048,
              system: CAMPING_EXPERT_SYSTEM_PROMPT,
              tools: AGENT_TOOLS,
              messages,
              stream: true,
            }
          )

          for await (const turn of runner) {
            // turn is BetaMessageStream when stream: true
            turn.on('text', (delta: string) => {
              send('text_delta', { delta })
            })

            // When a tool_use block completes, emit tool activity
            turn.on('contentBlock', (block) => {
              if (block.type === 'tool_use') {
                send('tool_activity', { toolName: block.name })
                toolIterations++
                if (toolIterations >= MAX_TOOL_ITERATIONS) {
                  // runner will continue until end_turn naturally;
                  // we've just hit our soft warning threshold
                }
              }
            })

            await turn.finalMessage()
          }

          send('message_complete', {})
          controller.close()
        } catch (err) {
          send('stream_error', { message: 'Stream failed' })
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    })
  } catch (error) {
    console.error('Chat route error:', error)
    return Response.json({ error: 'Failed to start chat stream' }, { status: 500 })
  }
}
```

### Pattern 3: Prisma Schema — Conversation Models

**What:** Two new models for chat persistence + one for agent memory.

```prisma
// prisma/schema.prisma additions

model Conversation {
  id        String    @id @default(cuid())
  title     String?   // auto-generated from first message, null until set
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  messages  Message[]
}

model Message {
  id             String   @id @default(cuid())
  conversationId String
  role           String   // 'user' | 'assistant'
  content        String   // text content
  toolCallsJson  String?  // JSON array of tool_use blocks (for display/debugging)
  createdAt      DateTime @default(now())

  conversation Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)

  @@index([conversationId])
  @@index([createdAt])
}

model AgentMemory {
  id        String   @id @default(cuid())
  key       String   @unique  // e.g. "camping_style", "dietary_needs", "preferred_sites"
  value     String   // plain text or JSON
  updatedAt DateTime @updatedAt
}
```

### Pattern 4: Context Window + Memory Injection

**What:** `buildContextWindow()` assembles the messages array sent to Claude: last N messages from DB + agent memory block injected as a system-level context message.

```typescript
// lib/agent/memory.ts
import { prisma } from '@/lib/db'

const SLIDING_WINDOW_SIZE = 20  // last 20 messages (Claude's discretion)

export async function buildContextWindow(
  conversationId: string,
  pageContext?: string
): Promise<Anthropic.Beta.Messages.BetaMessageParam[]> {
  const recent = await prisma.message.findMany({
    where: { conversationId },
    orderBy: { createdAt: 'desc' },
    take: SLIDING_WINDOW_SIZE,
  })

  const memories = await prisma.agentMemory.findMany()
  const memoryBlock = memories.length > 0
    ? `\n\nWHAT I KNOW ABOUT YOU:\n${memories.map(m => `- ${m.key}: ${m.value}`).join('\n')}`
    : ''

  const contextBlock = pageContext ? `\nCURRENT CONTEXT: ${pageContext}` : ''

  const historyMessages = recent
    .reverse()
    .map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }))

  // Inject memory + page context as a leading user→assistant exchange
  if (memoryBlock || contextBlock) {
    return [
      {
        role: 'user',
        content: `[System context]${memoryBlock}${contextBlock}`,
      },
      {
        role: 'assistant',
        content: 'Got it.',
      },
      ...historyMessages,
    ]
  }

  return historyMessages
}
```

### Pattern 5: Client-Side Stream Reader

**What:** `ChatClient.tsx` reads the SSE stream using `fetch` + `ReadableStream` (not `EventSource`, because `EventSource` only supports GET).

```typescript
// components/ChatClient.tsx (excerpt)
const sendMessage = useCallback(async (text: string) => {
  setMessages(prev => [...prev, { role: 'user', content: text }])
  setStreaming(true)
  setSkeletonVisible(true)

  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ conversationId, userMessage: text, pageContext }),
  })

  const reader = res.body!
    .pipeThrough(new TextDecoderStream())
    .getReader()

  let assistantText = ''
  setSkeletonVisible(false)

  while (true) {
    const { value, done } = await reader.read()
    if (done) break

    for (const line of value.split('\n')) {
      if (line.startsWith('data: ')) {
        const payload = JSON.parse(line.slice(6))
        if (/* event type is text_delta */) {
          assistantText += payload.delta
          setStreamingText(assistantText)
        } else if (/* tool_activity */) {
          setToolActivity(TOOL_LABELS[payload.toolName] ?? 'Thinking...')
        } else if (/* message_complete */) {
          setMessages(prev => [...prev, { role: 'assistant', content: assistantText }])
          setStreamingText('')
          setToolActivity(null)
          setStreaming(false)
        }
      }
    }
  }
}, [conversationId, pageContext])
```

**Note:** The SSE event type must be parsed from the stream manually (look for `event: ` lines before `data: ` lines). The pattern above simplifies to only reading `data:` lines — the full implementation needs to track the current event type across lines.

### Anti-Patterns to Avoid

- **Calling API routes from agent tools:** Tools should call Prisma and lib functions directly, not make HTTP requests to `/api/gear`. HTTP adds latency and error surface. Tools run server-side — they have direct DB access.
- **Full conversation history in every request:** At 100+ messages, this hits context limits and costs money. Always use `SLIDING_WINDOW_SIZE`.
- **Using `EventSource` for SSE:** `EventSource` is GET-only. Chat messages are POST (body contains message content). Use `fetch` + `ReadableStream.getReader()` instead.
- **Streaming tool calls:** Claude cannot stream text and execute tools simultaneously. During tool use, text generation pauses. Don't try to stream tool inputs — wait for `contentBlock` completion.
- **Mutating inside the stream loop:** React state updates inside a `while (true)` reader loop cause re-render storms. Batch updates or use refs for intermediate streaming text.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Multi-turn tool-use loop | Manual while-loop managing tool_use/tool_result messages | `client.beta.messages.toolRunner()` | Handles stop_reason detection, message history construction, and error recovery automatically |
| SSE parsing on client | Custom event stream parser | `ReadableStream.pipeThrough(new TextDecoderStream())` | Web standard; handles chunked UTF-8 correctly |
| Tool input validation | Manual type checking in `run()` | `BetaRunnableTool.parse` + Zod | Parse is called before run — validation errors are caught cleanly |
| Conversation threading | Custom session ID scheme | Prisma `Conversation` model with `cuid()` | Prisma handles concurrency; cuid() is URL-safe and time-ordered |

**Key insight:** The `BetaToolRunner` eliminates the hardest part of agentic systems — correctly managing the alternating `user`/`assistant` message array as tool calls happen. Hand-rolling this loop is error-prone (wrong message ordering causes API 400 errors).

---

## Common Pitfalls

### Pitfall 1: Tool Iteration Runaway
**What goes wrong:** Agent makes 20+ tool calls in a single turn chasing a rabbit hole. API cost spikes.
**Why it happens:** The model is proactive (D-06) and may chain searches without bound.
**How to avoid:** Hard cap in the tool runner loop. Check `toolIterations >= MAX_TOOL_ITERATIONS` after each tool call; if hit, append a system-level tool result: `"Tool iteration limit reached. Summarize findings so far."` and let the loop continue to end_turn.
**Warning signs:** Responses that take > 30 seconds before any text appears.

### Pitfall 2: BetaToolRunner Stream Event Structure
**What goes wrong:** Iterating `for await (const turn of runner)` with `stream: true` yields `BetaMessageStream` objects, not text strings. Treating each `turn` as a message breaks.
**Why it happens:** The type signature is `AsyncIterator<BetaMessageStream>` when `stream: true`. Each iteration is one full Claude turn (which may contain tool calls).
**How to avoid:** Attach `.on('text', ...)` and `.on('contentBlock', ...)` handlers to each `turn`, then `await turn.finalMessage()` before moving to the next iteration.
**Warning signs:** Empty responses, or TypeErrors about `.delta` being undefined.

### Pitfall 3: SSE with POST in Next.js
**What goes wrong:** `export const dynamic = 'force-dynamic'` is omitted, Next.js caches the route, streaming never reaches the client.
**Why it happens:** Next.js App Router aggressively caches route handlers by default.
**How to avoid:** Always add `export const dynamic = 'force-dynamic'` at the top of streaming route handlers.
**Warning signs:** First request works, second request returns stale data or hangs.

### Pitfall 4: TextDecoder and Multi-Line SSE Events
**What goes wrong:** SSE events are split across multiple `read()` chunks. Parsing `data:` naively on each chunk drops partial events.
**Why it happens:** TCP chunking doesn't align with SSE event boundaries.
**How to avoid:** Maintain a buffer string across `read()` calls. Process complete SSE events only when encountering `\n\n` (the SSE event delimiter).
**Warning signs:** JSON parse errors in the client, missing tool activity updates.

### Pitfall 5: Prisma in Streaming Closures
**What goes wrong:** Prisma client called inside a `ReadableStream.start()` callback hits connection pool issues or throws "PrismaClient is not initialized" in edge environments.
**Why it happens:** Streaming routes may be attempted in Edge Runtime by Next.js.
**How to avoid:** Ensure the chat route is NOT on Edge Runtime (no `export const runtime = 'edge'`). Keep it on Node.js runtime. Prisma requires Node.js.
**Warning signs:** `PrismaClientKnownRequestError` in streaming context, or "PrismaClient is unable to run in this browser environment" errors.

### Pitfall 6: Memory Injection Creating Invalid Message Array
**What goes wrong:** Injecting agent memory as a bare system context string results in a message array that starts with `role: user` followed immediately by another `role: user`, which the API rejects (400: invalid alternating roles).
**Why it happens:** The `messages` array must strictly alternate user/assistant. A "synthetic" context exchange must be a proper `user` then `assistant` pair.
**How to avoid:** Use the Pattern 4 structure: inject memory as a `user` message followed by a synthetic `assistant: 'Got it.'` response before the real history.
**Warning signs:** API 400 errors mentioning "alternating roles" or "invalid message sequence".

---

## Code Examples

### Tool Definition (searchKnowledge)

```typescript
// Source: lib/rag/search.ts + lib/rag/context.ts (Phase 3)
// lib/agent/tools/searchKnowledge.ts
import { BetaRunnableTool } from '@anthropic-ai/sdk/resources/beta'
import { hybridSearch } from '@/lib/rag/search'
import { buildRagContext } from '@/lib/rag/context'

export const searchKnowledgeTool: BetaRunnableTool<{ query: string; topK?: number }> = {
  name: 'search_knowledge_base',
  description: 'Search the NC camping knowledge base for information about spots, regulations, gear tips, seasonal conditions, permits, and local area knowledge. Use this for any camping-specific question.',
  input_schema: {
    type: 'object' as const,
    properties: {
      query: {
        type: 'string',
        description: 'Natural language search query',
      },
      topK: {
        type: 'number',
        description: 'Number of results to return (default: 5, max: 10)',
      },
    },
    required: ['query'],
  },
  parse: (input: unknown) => input as { query: string; topK?: number },
  run: async ({ query, topK = 5 }) => {
    const results = await hybridSearch(query, Math.min(topK, 10))
    return buildRagContext(results, 2000)
  },
}
```

### SSE Event Protocol

Custom events sent from `app/api/chat/route.ts`:

```
event: tool_activity
data: {"toolName":"search_knowledge_base"}

event: text_delta
data: {"delta":"Based on your gear,"}

event: text_delta
data: {"delta":" you'll want to bring your 0°F sleeping bag."}

event: message_complete
data: {}

event: stream_error
data: {"message":"Something went wrong. Try again."}
```

Client maps `toolName` to human-readable labels:
```typescript
const TOOL_LABELS: Record<string, string> = {
  search_knowledge_base: 'Searching knowledge base...',
  list_gear: 'Checking your gear...',
  get_weather: 'Looking up weather...',
  list_trips: 'Checking your trips...',
  list_locations: 'Looking up your spots...',
}
```

### System Prompt Structure

```typescript
// lib/agent/system-prompt.ts
export const CAMPING_EXPERT_SYSTEM_PROMPT = `You are a camping assistant for a personal outdoor app called Outland OS. You have access to the user's gear inventory, trips, saved spots, and a knowledge base of NC camping information.

Personality: You're like a knowledgeable camping buddy — casual, direct, helpful. You've camped everywhere in western NC and the Blue Ridge. You don't say "I'd be happy to help!" You just help. No stiff corporate tone.

Behavior rules:
- Answer the question directly, then flag anything else worth knowing (missing gear, weather risks, permit requirements).
- When the user asks about a trip or location, proactively pull weather + gear + knowledge base — don't wait to be asked.
- For destructive actions (deleting gear, deleting trips), describe what you're about to do and ask "Want me to go ahead?" before executing.
- For creates and updates, just do it and confirm what you did.
- Keep responses scannable: short paragraphs, bullets for lists.
- If you don't know something or a tool fails, say so honestly and offer alternatives.

The user is Will — solo car camper in Asheville NC, drives a Santa Fe Hybrid, camps primarily in western NC and the Blue Ridge.`
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Manual tool-use loop (raw Messages API) | `BetaToolRunner` handles loop automatically | SDK 0.80+ | Eliminates ~50 lines of message-threading boilerplate |
| `EventSource` for streaming | `fetch` + `ReadableStream.getReader()` (POST SSE) | Always needed for POST | `EventSource` is GET-only; POST allows sending conversation context |
| Full conversation history | Sliding window (last N) + memory injection | Best practice for production agents | Prevents context overflow and runaway API costs |

**Deprecated/outdated:**
- `client.messages.create({ stream: true })` raw stream: Still works but requires manual SSE parsing. Use `messages.stream()` or `toolRunner()` instead for cleaner event handling.
- Injecting full Prisma records as tool results: Wasteful. Tools should summarize/format data before returning to Claude.

---

## Open Questions

1. **BetaToolRunner iteration cap mechanism**
   - What we know: `BetaToolRunner` runs until `stop_reason === 'end_turn'`. There's no built-in iteration limit.
   - What's unclear: The correct way to inject a "stop now" signal mid-loop without aborting the stream. The `contentBlock` handler fires after the tool call is already being processed.
   - Recommendation: Track iteration count; at cap, call `runner.pushMessages()` with a synthetic user message: `"You've used enough tools. Please give a final answer with what you have."` This triggers a natural end_turn on the next turn.

2. **AgentMemory extraction timing**
   - What we know: Memory should update after each conversation turn (D-13).
   - What's unclear: Whether to extract memory inline (before closing the stream) or as a background job. Inline adds latency to every response. Background risks missing updates if the server crashes.
   - Recommendation: Fire-and-forget async call after `message_complete` event is sent. Log failures but don't block the response.

3. **Context-aware shortcut URL parameter handling**
   - What we know: FAB navigates to `/chat?context=trip:{id}` (UI-SPEC confirmed).
   - What's unclear: Whether to start a new conversation or append to the existing one when context param is present.
   - Recommendation: Always start a new Conversation when a context param is present. Avoids contaminating unrelated history.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js runtime (not Edge) | Prisma, better-sqlite3 | Yes | 20+ | None — do not use Edge Runtime |
| `@anthropic-ai/sdk` BetaToolRunner | Agentic loop | Yes | 0.80.0 | None — required |
| `ANTHROPIC_API_KEY` env var | All Claude calls | Assumed (existing feature) | — | None |
| `DATABASE_URL` SQLite | Prisma conversation models | Yes | — | None |
| Prisma | Conversation persistence | Yes | 6.19.2 | — |
| `better-sqlite3` (vec0) | RAG search tool | Yes (Phase 3 dep) | — | — |

**Missing dependencies with no fallback:** None. All required dependencies are in place.

**Missing dependencies with fallback:** None.

**Pre-requisite fixes required before agent tools work safely:**
- `app/api/packing-list/items/route.ts` line 16: `update` → `upsert` (D-10)
- `app/api/trips/[id]/route.ts`: Create file with PUT and DELETE handlers (D-11)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, vitest.config, pytest.ini in repo) |
| Config file | Wave 0 gap — needs creation if automated tests are written |
| Quick run command | `npm run lint` (available now) |
| Full suite command | Wave 0 gap |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| CHAT-01 | Chat UI loads and accepts input | manual | — | ❌ Wave 0 |
| CHAT-02 | Agent answers gear question with RAG + inventory | manual (verify response quality) | — | ❌ Wave 0 |
| CHAT-03 | Streaming tokens appear token-by-token on mobile | manual (visual) | — | ❌ Wave 0 |
| CHAT-04 | Multiple tools called in single turn | manual + log inspection | — | ❌ Wave 0 |

**Note:** This phase is primarily integration-level behavior (streaming, AI responses). Automated unit tests are feasible for:
- Tool `run()` functions (mock Prisma, assert return shape)
- `buildContextWindow()` (mock DB, assert message array structure)
- `escapeFts5Query()` already tested in Phase 3

### Sampling Rate
- Per task commit: `npm run lint`
- Per wave merge: `npm run build` (catches TypeScript errors)
- Phase gate: Manual smoke test — open chat, send a message, verify streaming + tool activity

### Wave 0 Gaps
- [ ] No test runner installed — add `vitest` if automated tool unit tests are desired
- [ ] Pre-requisite bug fixes (D-10, D-11) must be Wave 0 tasks before any agent tool work

---

## Sources

### Primary (HIGH confidence)
- `node_modules/@anthropic-ai/sdk/lib/tools/BetaToolRunner.d.ts` — BetaToolRunner API, confirmed present in v0.80.0
- `node_modules/@anthropic-ai/sdk/lib/tools/BetaRunnableTool.d.ts` — BetaRunnableTool interface definition
- `node_modules/@anthropic-ai/sdk/resources/beta/messages/messages.d.ts` — `.toolRunner()` method signature
- `lib/rag/search.ts`, `lib/rag/context.ts`, `lib/rag/types.ts` — Phase 3 RAG API (direct source read)
- `lib/claude.ts` — existing Anthropic client pattern
- `prisma/schema.prisma` — existing models (direct source read)
- Upstash SSE blog — Next.js App Router SSE ReadableStream pattern (verified against Next.js docs)
- Anthropic platform docs — tool use overview, streaming messages (fetched 2026-03-31)

### Secondary (MEDIUM confidence)
- Anthropic docs (WebFetch redirect resolved) — tool use agentic loop structure, message format
- BetaToolRunner JsDoc in type definitions — async iterator behavior, `stream: true` type

### Tertiary (LOW confidence)
- WebSearch results for streaming tool use patterns — cross-verified with SDK type definitions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all dependencies present and inspected directly
- Architecture: HIGH — BetaToolRunner API confirmed in installed SDK; SSE pattern verified
- Pitfalls: HIGH for items derived from SDK types; MEDIUM for tool iteration cap mechanism (open question)

**Research date:** 2026-03-31
**Valid until:** 2026-04-30 (Anthropic SDK beta APIs evolve; re-verify BetaToolRunner API if upgrading past 0.81.x)
