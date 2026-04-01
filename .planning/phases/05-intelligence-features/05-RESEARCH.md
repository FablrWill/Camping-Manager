# Phase 5: Intelligence Features - Research

**Researched:** 2026-03-31
**Domain:** Anthropic tool-use patterns, browser audio recording, OpenAI Whisper API, Next.js FormData handling, React SSE streaming with rich UI components
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**D-01:** Chat-native recommendations only. No standalone Recommendations screen. Recommendation tool lives in `lib/agent/tools/` following the modular registry pattern.

**D-02:** Results render as rich location cards inside the chat thread — below the agent's text response. Reuse `Card` component from `components/ui/`. Card shows: spot name, distance from Asheville, description, rating (if saved), Save button.

**D-03:** Dual-source: Will's saved `Location` records first, then knowledge base RAG hybrid search. Saved locations have priority.

**D-04:** Ranking blends RAG relevance (RRF score) + Will's personal ratings. Saved with ratings rank first. Unrated saved spots rank above knowledge base results. Knowledge base results ranked by RRF score.

**D-05:** Recommendation tool must understand and apply all four constraint types: distance from Asheville, date/season, amenity preferences (water, dispersed vs developed, hookups, pet-friendly), vehicle constraints (road type, clearance for Santa Fe Hybrid crossover — not a lifted 4x4).

**D-06:** Tapping Save creates a new `Location` record pre-populated from recommendation data, then navigates to the Location edit form for Will to confirm and add GPS/photos. "Confirm before committing" for new data writes.

### Claude's Discretion

- **Transcription approach:** Web Speech API reliability on iOS Safari is confirmed unreliable (see research findings). Use MediaRecorder API to capture audio locally, then send to Whisper API server-side. Do not use Web Speech API.
- **Entry point:** Voice debrief UI — decided via UI spec: mic icon on trip card footer row, opens VoiceRecordModal. No dedicated tab.
- **Extraction schema:** Claude defines the structured fields (what worked, what didn't, gear feedback, spot ratings). See schema in Code Examples.
- **Insights review UX:** InsightsReviewSheet with per-insight checkboxes. Append to gear notes (never overwrite). For location ratings: show current vs new with a single checkbox "Replace [X] with [Y]?" before applying.

### Deferred Ideas (OUT OF SCOPE)

None — discussion stayed within phase scope.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| REC-01 | User can ask "find me a camping spot" with constraints (distance from Asheville, dates, amenities, weather preferences) | D-05: recommendation tool input schema; hybridSearch + prisma Location query with filters; vehicle context from DB |
| REC-02 | Recommendations draw from saved locations + knowledge base + weather forecasts | D-03, D-04: dual-source ranking; hybridSearch for RAG; prisma.location.findMany for saved spots; getWeather tool for forecast integration |
| REC-03 | User can save a recommended spot to their locations from the recommendation result | D-06: POST to /api/locations from card Save button; navigate to edit form; existing location CRUD API unchanged |
| VOICE-01 | User can record a voice memo from the app | MediaRecorder API (browser); mic icon on trip card; VoiceRecordModal UI spec |
| VOICE-02 | Voice recording is transcribed to text automatically | OpenAI Whisper API via new /api/voice/transcribe route; FormData upload; server-side only |
| VOICE-03 | Transcription processed by Claude to extract structured insights | Claude message call in /api/voice/extract with defined schema; not streaming; returns JSON |
| VOICE-04 | Extracted insights can update gear notes, location ratings, or trip notes automatically | Apply via prisma PATCH on GearItem.notes (append), Location.rating (replace with confirm), Trip.notes (append); new /api/voice/apply route |
| VOICE-05 | Voice input reuses patterns/code from Fablr.ai where applicable | No Fablr.ai code available in this repo; apply the same principles: MediaRecorder + format detection + server-side Whisper |
</phase_requirements>

---

## Summary

Phase 5 adds two distinct intelligence features on top of Phase 4's chat foundation: AI trip recommendations delivered as rich cards inside the chat thread, and voice trip debrief with automatic transcription and structured insight extraction.

**Recommendations** extend the Phase 4 AGENT_TOOLS registry with a single new tool: `recommend_camping_spots`. The tool queries Will's saved `Location` records with Prisma, then hybridSearch from the RAG layer, blends the results with a priority ranking (personal rated spots > unrated saved spots > knowledge base), and returns a structured JSON payload. The chat streaming route already handles JSON-in-text via the `deleteConfirm` pattern — recommendations follow the same technique: the tool returns a structured JSON block that `ChatBubble.tsx` detects and renders as `RecommendationCard` components below the text response. No changes to the SSE streaming infrastructure are needed.

**Voice debrief** uses the browser's `MediaRecorder` API to record audio locally (iOS Safari uses AAC/MP4; Chrome uses WebM/Opus — format detection is required). The audio Blob is uploaded via FormData to a new Next.js API route (`/api/voice/transcribe`) which forwards it to the OpenAI Whisper API. A second API route (`/api/voice/extract`) sends the transcription text to Claude with a schema-directed system prompt and returns structured JSON insights. A third route (`/api/voice/apply`) applies selected insights via Prisma updates. The Web Speech API is confirmed unreliable on iOS Safari and must not be used.

**Primary recommendation:** Build the recommendation tool as a pure extension of the existing tool registry — no new infrastructure required. For voice, add the `openai` package for Whisper API access and build three thin API routes. All UI is built hand-rolled following the approved UI spec.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@anthropic-ai/sdk` | 0.81.0 (current; project has 0.80.0) | Recommendation tool calling, insight extraction | Already in project; Phase 4 foundation |
| `openai` | 6.33.0 | Whisper API audio transcription | OpenAI is the only provider for Whisper; no equivalent in Anthropic SDK |
| Next.js API Routes | 16.2.1 | Voice API endpoints (transcribe, extract, apply) | Project standard; already used for all API routes |
| `MediaRecorder` (Web API) | native | Capture audio in browser | No library needed; native browser API since Safari iOS 14.3 |
| Prisma | 6.19.2 | Read Location records for recommendations; apply insight writes | Already in project |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `hybridSearch` (lib/rag/search.ts) | internal | RAG retrieval for knowledge base recommendations | REC-02: knowledge base portion of dual-source search |
| `buildRagContext` (lib/rag/context.ts) | internal | Format RAG hits as context string | When formatting knowledge base results for Claude to summarize |
| React `useState` + `useRef` + `useCallback` | React 19 | Voice recording state machine, timer, blob accumulation | Standard project pattern |
| Lucide React | 1.7.0 | Mic, Square, Spinner icons for voice UI | Project standard icon library |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OpenAI Whisper API | Web Speech API | Web Speech API is unreliable on iOS Safari — confirmed broken in multiple ways (always-false isFinal, never-ending recognition, slow). Whisper is more accurate and works offline-first (record locally, then send) |
| OpenAI Whisper API | Deepgram / AssemblyAI | Whisper is the de-facto standard; no reason to add another billing relationship for a personal tool |
| Inline JSON in tool response | New SSE event type | Inline JSON (existing deleteConfirm pattern) reuses proven infrastructure with zero changes to chat route |

**Installation (new dependencies only):**
```bash
npm install openai
```

**Version verification (run before writing):**
```bash
npm view openai version   # 6.33.0 as of 2026-03-31
npm view @anthropic-ai/sdk version   # 0.81.0 — project is on 0.80.0, acceptable
```

---

## Architecture Patterns

### Recommended Project Structure

New files for Phase 5:

```
lib/agent/tools/
├── recommend.ts           # recommendCampingSpotsTool + executeRecommendCampingSpots
lib/voice/
├── transcribe.ts          # uploadAudioToWhisper(blob) → string
├── extract.ts             # extractInsights(transcription, tripId) → InsightPayload
├── types.ts               # InsightPayload, InsightItem, VoiceDebriefSession interfaces
app/api/voice/
├── transcribe/route.ts    # POST — receives audio FormData, returns { transcription }
├── extract/route.ts       # POST — receives transcription text, returns InsightPayload
├── apply/route.ts         # POST — receives selected insights, applies prisma updates
components/
├── RecommendationCard.tsx # Rich card for chat thread recommendation results
├── VoiceDebriefButton.tsx # Mic button on trip card footer
├── VoiceRecordModal.tsx   # Recording UI: idle → recording → processing
├── InsightsReviewSheet.tsx # Review extracted insights, apply/discard
```

### Pattern 1: Recommendation Tool — Inline JSON in Chat Response

**What:** The `recommend_camping_spots` tool returns a JSON block embedded in its tool result string. `ChatBubble.tsx` detects and renders it as `RecommendationCard` components, identical to how `deleteConfirm` JSON is currently handled.

**When to use:** When tool results need rich UI (cards, buttons) that cannot be expressed in plain text. Avoids changes to the SSE streaming infrastructure.

**Example:**
```typescript
// lib/agent/tools/recommend.ts
// Tool returns this string — ChatBubble.tsx extracts and renders it
const result = {
  action: 'recommendation_results',
  spots: [
    {
      id: 'clxyz123',             // Location.id if saved, or null for KB-only results
      name: 'Black Balsam Knob Dispersed',
      distanceMiles: 62,
      description: 'High-elevation dispersed sites, stunning views, no fee.',
      rating: 5,                  // null if not saved
      source: 'saved',            // 'saved' | 'knowledge_base'
      campType: 'dispersed',
      latitude: 35.3234,
      longitude: -82.8765,
    },
    // ... up to 5 spots
  ],
}
return `Here are some spots that match:\n\n\`\`\`json\n${JSON.stringify(result, null, 2)}\n\`\`\``
```

```typescript
// components/ChatBubble.tsx — add alongside extractDeleteConfirm
function extractRecommendations(content: string): RecommendationPayload | null {
  const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/m)
  if (!jsonMatch) return null
  try {
    const parsed = JSON.parse(jsonMatch[1])
    if (parsed.action === 'recommendation_results' && Array.isArray(parsed.spots)) {
      return parsed as RecommendationPayload
    }
  } catch { /* skip */ }
  return null
}
```

### Pattern 2: Dual-Source Recommendation Ranking

**What:** The recommendation tool queries saved `Location` records from Prisma first, runs `hybridSearch` on the knowledge base, then merges and ranks results with personal ratings taking priority.

**When to use:** REC-01 through REC-03 — every recommendation request.

**Example:**
```typescript
// lib/agent/tools/recommend.ts — ranking logic
function rankResults(
  savedLocations: PrismaLocation[],
  kbResults: SearchResult[],
  topN: number = 5
): RankedSpot[] {
  // Tier 1: saved locations with rating >= 4
  const highRated = savedLocations
    .filter(l => (l.rating ?? 0) >= 4)
    .map(l => ({ ...l, source: 'saved' as const, rankScore: 1.0 + (l.rating ?? 0) / 5 }))

  // Tier 2: saved locations with no rating or rating < 4
  const savedUnrated = savedLocations
    .filter(l => (l.rating ?? 0) < 4)
    .map(l => ({ ...l, source: 'saved' as const, rankScore: 0.8 }))

  // Tier 3: knowledge base results ranked by RRF score
  const kbSpots = kbResults.map((r, idx) => ({
    id: null,
    name: r.title,
    description: r.content.slice(0, 200),
    source: 'knowledge_base' as const,
    rankScore: r.score,
    rating: null,
    latitude: null,
    longitude: null,
  }))

  return [...highRated, ...savedUnrated, ...kbSpots].slice(0, topN)
}
```

### Pattern 3: MediaRecorder with Format Detection (iOS Safari compatibility)

**What:** Safari records as AAC/MP4; Chrome records as WebM/Opus. Use `MediaRecorder.isTypeSupported()` to detect the best available format and pass the MIME type through to the server so Whisper receives a valid file extension.

**When to use:** VOICE-01 — all voice recording in the browser.

**Example:**
```typescript
// In VoiceRecordModal.tsx — format detection before starting recording
function getSupportedMimeType(): string {
  const types = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
  ]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return ''  // browser will choose; may not be Whisper-compatible
}

// Recording setup
const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
const mimeType = getSupportedMimeType()
const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
const chunks: Blob[] = []
recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data) }
recorder.onstop = () => {
  const blob = new Blob(chunks, { type: mimeType || recorder.mimeType })
  onAudioCaptured(blob, mimeType || recorder.mimeType)
}
```

### Pattern 4: Audio Upload to Whisper via Next.js API Route

**What:** Client sends audio Blob as FormData to `/api/voice/transcribe`. Server reads it with `request.formData()`, creates an OpenAI `File` object, and calls `openai.audio.transcriptions.create()`.

**When to use:** VOICE-02 — every transcription request.

**Example:**
```typescript
// app/api/voice/transcribe/route.ts
import OpenAI from 'openai'
export async function POST(req: NextRequest): Promise<Response> {
  try {
    const formData = await req.formData()
    const audioBlob = formData.get('audio') as Blob | null
    const mimeType = formData.get('mimeType') as string | null

    if (!audioBlob) {
      return Response.json({ error: 'audio is required' }, { status: 400 })
    }

    // Determine file extension from MIME type for Whisper
    const ext = mimeType?.includes('mp4') ? 'mp4'
              : mimeType?.includes('ogg') ? 'ogg'
              : 'webm'  // default

    const file = new File([audioBlob], `recording.${ext}`, {
      type: mimeType ?? 'audio/webm',
    })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    const result = await openai.audio.transcriptions.create({
      file,
      model: 'whisper-1',  // or 'gpt-4o-transcribe' for higher accuracy
    })

    return Response.json({ transcription: result.text })
  } catch (error) {
    console.error('Transcription error:', error)
    return Response.json({ error: 'Transcription failed' }, { status: 500 })
  }
}
```

### Pattern 5: Claude Insight Extraction Schema

**What:** Send transcription text to Claude with a strict JSON-output system prompt. Claude extracts structured insights from the free-form debrief text.

**When to use:** VOICE-03 — every extraction request.

**Example:**
```typescript
// lib/voice/extract.ts
const EXTRACTION_SYSTEM_PROMPT = `
You are extracting structured insights from a camping trip debrief.
Return ONLY valid JSON matching this schema — no prose, no markdown:
{
  "whatWorked": [{ "text": string }],
  "whatDidnt": [{ "text": string }],
  "gearFeedback": [{
    "text": string,
    "gearName": string | null   // name of gear item if identifiable
  }],
  "spotRating": {
    "locationName": string | null,
    "rating": number | null   // 1-5, null if not mentioned
  }
}
`

export async function extractInsights(transcription: string): Promise<InsightPayload> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const response = await client.messages.create({
    model: 'claude-haiku-4-20250514',  // haiku is fast + cheap for structured extraction
    max_tokens: 1024,
    system: EXTRACTION_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: transcription }],
  })
  // Use parseClaudeJSON pattern (established in Phase 1) if available
  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  return JSON.parse(text) as InsightPayload
}
```

### Pattern 6: Insight Apply — Append vs Replace

**What:** Gear notes are appended (never overwritten). Location ratings are replaced only after user confirms with a "Replace [X] with [Y]?" inline checkbox.

**When to use:** VOICE-04 — every apply operation.

**Example:**
```typescript
// app/api/voice/apply/route.ts — gear note append pattern
await prisma.gearItem.update({
  where: { id: gearId },
  data: {
    notes: existingNotes
      ? `${existingNotes}\n\n[Trip debrief ${new Date().toLocaleDateString()}]: ${insightText}`
      : `[Trip debrief ${new Date().toLocaleDateString()}]: ${insightText}`,
  },
})

// Location rating replace — only when user confirmed in InsightsReviewSheet
await prisma.location.update({
  where: { id: locationId },
  data: { rating: newRating },
})

// Trip notes append
await prisma.trip.update({
  where: { id: tripId },
  data: {
    notes: existingNotes ? `${existingNotes}\n\n${debriefSummary}` : debriefSummary,
  },
})
```

### Anti-Patterns to Avoid

- **Using Web Speech API:** Confirmed broken on iOS Safari — interim results duplicate, isFinal is always false, recognition never ends reliably. Do not use.
- **Streaming the Whisper response:** Whisper API does not support streaming transcription — use `transcriptions.create()`, not a streaming variant.
- **New SSE event type for recommendation cards:** Changes the chat route and client SSE parser. The existing inline JSON + ChatBubble detection pattern is simpler and already proven.
- **Auto-applying insights without review:** The InsightsReviewSheet is required before any writes. Never apply to DB from the extract route itself.
- **Overwriting gear notes:** Always append. Notes field is a log, not a single value.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio transcription | Custom ML model or browser speech API | OpenAI Whisper API (via `openai` npm package) | State of the art accuracy; handles accents, noise, and camping vocabulary; iOS Safari Web Speech API is broken |
| Audio format compatibility | Custom audio re-encoding pipeline | `MediaRecorder.isTypeSupported()` + send MIME type to server; Whisper accepts mp4, webm, ogg, wav, m4a | Whisper handles format detection server-side if extension is correct; no ffmpeg needed |
| RRF ranking | Custom scoring algorithm | Reuse existing `mergeRRF` logic in `lib/rag/search.ts` | Already implemented and tested in Phase 3; recommendation tool can call `hybridSearch` directly |
| Distance calculation | Haversine formula from scratch | Inline haversine or pass lat/lng to Claude for estimation | For a personal tool with a handful of spots, a simple formula in the tool is fine; or let Claude estimate drive time from knowledge |

**Key insight:** The hardest parts of this phase (RAG retrieval, streaming chat, tool dispatch, Prisma writes) are already built. Phase 5 is assembly, not infrastructure.

---

## Common Pitfalls

### Pitfall 1: iOS Safari MediaRecorder Audio Format Mismatch
**What goes wrong:** Client records audio as AAC/MP4 (Safari) but server creates a File object with `.webm` extension. Whisper rejects or misidentifies the format.
**Why it happens:** Chrome defaults to WebM/Opus; Safari defaults to AAC/MP4. Code written/tested on Chrome may fail silently on iOS.
**How to avoid:** Always pass the `mimeType` (from `MediaRecorder.mimeType` after start) alongside the audio Blob. Server derives file extension from MIME type before creating the OpenAI `File` object.
**Warning signs:** Whisper returns empty transcription or a "unsupported format" error on iOS devices.

### Pitfall 2: Recommendation Tool Response Too Large for Context Window
**What goes wrong:** `hybridSearch` returns 10 large knowledge base chunks plus all saved locations. Combined with conversation history, the tool result exceeds the model's context budget.
**Why it happens:** `buildRagContext` can return up to 2000 tokens of text. With multiple recommendation results plus conversation history, context fills fast.
**How to avoid:** Cap `hybridSearch` at `topK=5` for recommendation queries (not 10). Return only compact spot summaries (name, description capped at 150 chars, coordinates, rating) in the tool result JSON — not full RAG chunks. Let Claude synthesize the description from the summary.
**Warning signs:** `max_tokens` errors from the API; responses that cut off mid-sentence.

### Pitfall 3: Recommendation Cards Not Rendering for Streaming Messages
**What goes wrong:** Recommendation JSON is detected only in fully-completed messages. The `streamingText` bubble shows raw JSON until `message_complete`.
**Why it happens:** `ChatBubble.tsx` processes `content` synchronously. If `extractRecommendations()` runs on streaming text, the partial JSON will fail to parse.
**How to avoid:** Only attempt to extract and render recommendation cards from fully-committed messages (in the `messages` array), not from `streamingText`. The streaming bubble shows raw text while streaming; on `message_complete` the committed bubble renders the cards.
**Warning signs:** JSON fragment visible to user during streaming; cards flash in after streaming completes.

### Pitfall 4: Microphone Permission Denial with No Recovery
**What goes wrong:** `getUserMedia()` throws a `NotAllowedError` but the modal freezes in a broken state with no user guidance.
**Why it happens:** First-time permission prompt can be denied; previously denied sites are auto-denied.
**How to avoid:** Wrap `getUserMedia()` in try-catch. On `NotAllowedError`, set a specific error state that renders the "Microphone access is required" copy from the UI spec. Cancel/close button must remain enabled.
**Warning signs:** Modal gets stuck in recording state with no way out.

### Pitfall 5: OPENAI_API_KEY Not in .env
**What goes wrong:** Whisper API calls fail with "No API key provided" — but this shows up as a 500 error in the UI with no diagnostic.
**Why it happens:** The project currently only uses `ANTHROPIC_API_KEY`. Adding Whisper requires a separate OpenAI key and `.env` entry.
**How to avoid:** Wave 0 task must add `OPENAI_API_KEY` to `.env.example` and document requirement. The `/api/voice/transcribe` route should check for the key at startup and return a 503 with a clear message if absent.
**Warning signs:** 500 error on first transcription attempt; `console.error` shows "OpenAI API key not found".

### Pitfall 6: Vehicle Constraint Context Not Available to Recommendation Tool
**What goes wrong:** Recommendation tool filters by road type/clearance but doesn't know Will's vehicle specs — Santa Fe Hybrid is a crossover, not a 4x4.
**Why it happens:** Vehicle data is in the `Vehicle` + `VehicleMod` Prisma tables but the recommendation tool doesn't query them.
**How to avoid:** The recommendation tool's `executeRecommendCampingSpots` function should do a single `prisma.vehicle.findFirst()` at the start of execution to get ground clearance and drivetrain, then include that context in the RAG query and in constraints filtering.
**Warning signs:** Tool recommends high-clearance 4x4 trails for a crossover.

---

## Code Examples

Verified patterns from the existing codebase and official documentation:

### Existing Tool Registry Pattern (Source: lib/agent/tools/searchKnowledge.ts)
```typescript
// lib/agent/tools/recommend.ts follows this exact shape
export const recommendCampingSpotsTool: Tool = {
  name: 'recommend_camping_spots',
  description: 'Find camping spots matching distance, date, amenity, and vehicle constraints.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'Natural language description of what Will is looking for' },
      maxDistanceMiles: { type: 'number', description: 'Maximum drive distance from Asheville NC' },
      dateRange: { type: 'string', description: 'Dates or season (e.g., "this weekend", "June", "2026-07-04 to 2026-07-06")' },
      amenities: { type: 'array', items: { type: 'string' }, description: 'e.g. ["water_access", "dispersed", "pet_friendly"]' },
      topN: { type: 'number', description: 'Max spots to return (default 5)' },
    },
    required: ['query'],
  },
}

export async function executeRecommendCampingSpots(
  input: { query: string; maxDistanceMiles?: number; dateRange?: string; amenities?: string[]; topN?: number }
): Promise<string> {
  // 1. Get vehicle context
  // 2. Query saved locations with Prisma
  // 3. Run hybridSearch on knowledge base
  // 4. Rank and merge results
  // 5. Return inline JSON block
}
```

### Register in AGENT_TOOLS (Source: lib/agent/tools/index.ts pattern)
```typescript
import { recommendCampingSpotsTool, executeRecommendCampingSpots } from './recommend'

export const AGENT_TOOLS: Tool[] = [
  // ... existing tools ...
  recommendCampingSpotsTool,
]

// Add to executeAgentTool switch
case 'recommend_camping_spots':
  return executeRecommendCampingSpots(input as Parameters<typeof executeRecommendCampingSpots>[0])
```

### FormData Upload from Client (Source: Pattern from existing photo upload in project)
```typescript
// In VoiceRecordModal.tsx — after recording stops
const formData = new FormData()
formData.append('audio', audioBlob, `recording.${ext}`)
formData.append('mimeType', mimeType)

const res = await fetch('/api/voice/transcribe', { method: 'POST', body: formData })
const { transcription } = await res.json()
```

### Next.js Route FormData Reading (Source: Next.js official docs)
```typescript
// app/api/voice/transcribe/route.ts
const formData = await req.formData()
const audioBlob = formData.get('audio') as Blob | null
// Note: req.formData() — NOT req.json(). Content-Type is multipart/form-data.
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Web Speech API for voice input | MediaRecorder + server-side Whisper | ~2023 onward | Web Speech API is unpredictable on iOS; Whisper is accurate everywhere |
| `whisper-1` only | `gpt-4o-transcribe` / `gpt-4o-mini-transcribe` now available | 2025 | Higher accuracy option available; `whisper-1` still works fine |
| Embedding recommendations in a separate page | Inline rich cards in chat thread | Phase 5 decision D-01 | Keeps context; no navigation required; matches messaging metaphor |

**Deprecated/outdated:**
- Web Speech API `SpeechRecognition`: Functional on desktop Chrome but confirmed broken on iOS Safari in multiple ways. Do not use.
- `gpt-4-vision` for audio: Not applicable; Whisper API is the correct route for transcription.

---

## Open Questions

1. **Haversine distance calculation for filtering**
   - What we know: Saved `Location` records have `latitude` and `longitude` (nullable). Knowledge base chunks have location metadata of varying completeness.
   - What's unclear: How many saved locations have coordinates? Distance filtering may be limited for KB results where coordinates are absent.
   - Recommendation: Query saved locations and compute haversine in Node.js (trivial formula). For KB results, fall back to Claude's estimate from the chunk text (e.g., "62 miles from Asheville"). Do not fail if coordinates are missing — degrade gracefully.

2. **OPENAI_API_KEY requirement and cost**
   - What we know: Whisper API costs $0.006/min. A 5-minute trip debrief costs ~$0.03. Negligible for a personal tool.
   - What's unclear: Will needs to create an OpenAI account/key if he doesn't already have one.
   - Recommendation: Wave 0 task documents requirement with setup instructions in `.env.example`.

3. **Gear name matching for insight application**
   - What we know: Claude extracts `gearName` as a string (e.g., "rain fly"). Prisma has `GearItem.name` (exact string). Matching is fuzzy.
   - What's unclear: Should the extraction route return a matched `gearId` or just the name string, and let the UI do the matching?
   - Recommendation: Return the extracted `gearName` string from Claude. In `InsightsReviewSheet`, do a case-insensitive search against the gear list (fetched from API) to suggest a match. User can confirm or leave unlinked. This avoids brittle exact-match logic.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Runtime | Yes | v23.11.0 | — |
| `openai` npm package | VOICE-02 (Whisper) | No (not installed) | — | Must install: `npm install openai` |
| `OPENAI_API_KEY` env var | VOICE-02 (Whisper) | Unknown | — | Must create OpenAI account; no free tier for Whisper |
| `ANTHROPIC_API_KEY` env var | REC-01, VOICE-03 | Yes (existing) | — | — |
| `MediaRecorder` browser API | VOICE-01 | Yes (iOS 14.3+ Safari, all modern Chrome) | native | — |
| `getUserMedia` browser API | VOICE-01 | Yes (HTTPS required) | native | — |
| Prisma + SQLite (dev.db) | REC-01, VOICE-04 | Yes | 6.19.2 | — |

**Missing dependencies with no fallback:**
- `openai` npm package: must be installed before voice transcription can work (`npm install openai`)
- `OPENAI_API_KEY`: must be set in `.env` — Wave 0 task must document this requirement

**Missing dependencies with fallback:**
- None — all other required capabilities are present

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None installed |
| Config file | None — Wave 0 gap |
| Quick run command | N/A until framework installed |
| Full suite command | N/A until framework installed |

No test framework (`jest`, `vitest`, or similar) is installed in this project. The project has no `test` script in `package.json`. All previous phases have been validated manually.

Given the personal-tool context and ADHD-friendly dev environment preference, the pragmatic approach is: add lightweight smoke tests for the two critical pure functions (`rankResults` and the insight extraction schema validator), and rely on manual E2E testing for UI flows.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REC-01 | Recommendation tool returns ranked results with constraint filtering | unit (pure function) | N/A — Wave 0 gap | No |
| REC-02 | Dual-source results include saved locations + KB results | unit (mock Prisma + hybridSearch) | N/A — Wave 0 gap | No |
| REC-03 | Save button POSTs to /api/locations and returns correct data | manual | Manual browser test | N/A |
| VOICE-01 | MediaRecorder starts/stops, blob captured, MIME type detected | manual | Manual device test (iOS Safari required) | N/A |
| VOICE-02 | Transcription API route accepts FormData, returns transcription string | manual | `curl -F audio=@test.webm /api/voice/transcribe` | N/A |
| VOICE-03 | Insight extraction returns valid JSON matching schema | unit | N/A — Wave 0 gap | No |
| VOICE-04 | Apply route appends gear notes (never overwrites), replaces rating only after confirm | unit (Prisma mock) | N/A — Wave 0 gap | No |
| VOICE-05 | MediaRecorder + format detection pattern applies | manual | Manual iOS Safari test | N/A |

### Sampling Rate
- **Per task commit:** `npm run build` (TypeScript type-check + Next.js build — catches type errors and import failures)
- **Per wave merge:** `npm run build && npm run lint`
- **Phase gate:** Manual E2E test on mobile browser (iOS Safari) for voice, and chat recommendations before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `openai` package not installed — required for VOICE-02 before any voice code can run
- [ ] `OPENAI_API_KEY` not in `.env.example` — must be documented for setup
- [ ] No unit test framework — acceptable for this personal tool; use `npm run build` as the automated gate

---

## Sources

### Primary (HIGH confidence)
- Codebase: `lib/agent/tools/searchKnowledge.ts` — confirmed tool registry pattern
- Codebase: `lib/agent/tools/index.ts` — confirmed AGENT_TOOLS array + executeAgentTool dispatcher
- Codebase: `app/api/chat/route.ts` — confirmed SSE streaming architecture; tool result flow
- Codebase: `components/ChatBubble.tsx` — confirmed inline JSON extraction pattern (deleteConfirm)
- Codebase: `lib/rag/search.ts` — confirmed `hybridSearch` signature and return type
- Codebase: `prisma/schema.prisma` — confirmed Location model fields, no VoiceDebrief model exists yet
- Codebase: `components/ui/` — confirmed Card, Button, Badge, Modal component APIs
- Codebase: `app/globals.css` — confirmed `animate-slide-up`, `animate-fade-in`, `.skeleton` classes exist

### Secondary (MEDIUM confidence)
- [MDN MediaRecorder API](https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder) — `isTypeSupported()`, `ondataavailable`, format support
- [iPhone Safari MediaRecorder implementation guide](https://www.buildwithmatija.com/blog/iphone-safari-mediarecorder-audio-recording-transcription) — format detection pattern for iOS/Chrome compatibility
- [OpenAI Audio API reference](https://platform.openai.com/docs/api-reference/audio/createSpeech) — Whisper model names, supported formats, `gpt-4o-transcribe` availability
- [Next.js route.js docs](https://nextjs.org/docs/app/api-reference/file-conventions/route) — `request.formData()` in App Router API routes

### Tertiary (LOW confidence, flagged for validation)
- Web Speech API iOS Safari limitations: Multiple independent sources agree on broken behavior. HIGH confidence the API should not be used.
- `gpt-4o-transcribe` vs `whisper-1`: WebSearch confirms availability but use `whisper-1` for now (proven, stable, lower cost) and upgrade if accuracy is insufficient.

---

## Project Constraints (from CLAUDE.md)

All actionable directives from CLAUDE.md that the planner must verify compliance with:

| Directive | Impact on Phase 5 |
|-----------|-------------------|
| TypeScript throughout | All new files: `recommend.ts`, `transcribe.ts`, `extract.ts`, voice API routes — must be `.ts`/`.tsx` |
| No `alert()` — state-based inline error messages | Voice modal errors (mic denied, transcription failed) must use React state, not alerts |
| All API routes must have try-catch with console.error + JSON error response | `/api/voice/transcribe`, `/api/voice/extract`, `/api/voice/apply` all require this |
| React hooks: correct minimal dependency arrays | VoiceRecordModal recording state machine uses `useCallback` + `useRef` — deps must be minimal |
| Components functional with hooks only | VoiceRecordModal, InsightsReviewSheet, RecommendationCard must be functional components |
| Single-user, no auth | No session/auth logic needed on voice API routes |
| Mobile-first | Voice record button minimum 64×64px; tap targets 44×44px minimum |
| Commit messages: imperative mood, concise | Planning constraint only |
| GSD workflow before file changes | Planning enforces this |
| `'use client'` on all interactive components | VoiceRecordModal, InsightsReviewSheet, RecommendationCard all need `'use client'` |
| No premature abstractions | Voice lib module is appropriate abstraction (3 API routes need it); not over-engineered |
| Naming: `{name}Tool` + `execute{Name}` for agent tools | `recommendCampingSpotsTool` + `executeRecommendCampingSpots` |
| Error handling: 400 for validation, 500 for server, 404 for not found | Apply to all three voice API routes |

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified against package.json; npm view confirmed versions; openai package absence confirmed
- Architecture: HIGH — patterns extracted directly from existing codebase code; no assumptions
- Voice transcription: HIGH — Web Speech API iOS issues verified across multiple independent sources; MediaRecorder + Whisper is the established alternative
- Recommendation ranking: HIGH — logic derived from locked decisions D-03/D-04; hybridSearch API verified
- Pitfalls: HIGH for iOS format mismatch (multiple sources), MEDIUM for context window size (estimate-based)

**Research date:** 2026-03-31
**Valid until:** 2026-05-01 (stable APIs; openai package version may shift)
