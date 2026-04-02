# Phase 9: Learning Loop - Research

**Researched:** 2026-04-01
**Domain:** Post-trip review UI, usage tracking, Claude-generated trip summaries, voice debrief integration
**Confidence:** HIGH

## Summary

Phase 9 is entirely greenfield UI and API work on top of a schema that already exists. The `PackingItem.usageStatus` field is already in the database with the correct values (`"used"`, `"didn't need"`, `"forgot but needed"`, null). The `TripFeedback` model is append-only and ready for summaries and voice records. The Phase 5 voice pipeline (transcribe → extract → apply) is live and working. No schema migration is needed.

The implementation splits into three feature areas. First, usage tracking: a post-trip review section inside each expanded TripCard (past trips only) that renders each PackingItem as a row with three-option radio-style buttons. Batch PATCH API saves all statuses in one call. Completion is detected client-side when all items have a non-null status — this triggers the summary generation flow. Second, the Claude-generated debrief summary: a new API route that reads packing items with their usage status and the trip's location, then calls Claude (Haiku for cost efficiency) to produce a 3-bullet structured output. The result is stored in `TripFeedback.summary`. Third, the voice debrief: the existing `VoiceRecordModal` → `InsightsReviewSheet` flow is already wired into `TripsClient` via `VoiceDebriefButton`. Phase 9 should store the voice result in `TripFeedback` (with `voiceTranscript` and `insights` fields) in addition to applying it — the `apply` route currently writes-through but does not persist to `TripFeedback`.

**Primary recommendation:** Build in three sequential plans — (1) usage tracking API + UI, (2) post-trip summary generation, (3) voice debrief persistence. No new schema migration needed.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Post-trip review section on the existing trip detail page (no new routes)
- **D-02:** Use existing `PackingItem.usageStatus` field with values: `"used"`, `"didn't need"`, `"forgot but needed"`, null
- **D-03:** Auto-generate summary when all packed items have a usage status set
- **D-04:** Modal with checkboxes showing extracted changes, user selects which to apply (voice debrief review)
- **D-05:** Reuse existing Phase 5 voice APIs (transcribe, extract, apply) at `app/api/voice/`
- **D-06:** Use existing `TripFeedback` model (append-only, multiple per trip) for storing summaries and voice debriefs

### Claude's Discretion

- Plan decomposition (number of plans, wave structure)
- Component file organization
- API route structure for usage tracking and summary generation
- Whether to batch usage status updates or save individually
- Auto-generate threshold (all items vs percentage)

### Deferred Ideas (OUT OF SCOPE)

- Feedback-driven packing improvement (needs 3+ trips of history data)
- Rich text debrief editor
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LEARN-01 | User can mark packed items as "used" or "didn't need" after a trip | `PackingItem.usageStatus` field exists, needs PATCH API + UI in TripCard |
| LEARN-02 | User can view a Claude-generated post-trip summary (what to drop, what was missing, location rating) after completing gear usage tracking | New API route + `TripFeedback.summary` storage; auto-trigger when all items have status |
| LEARN-03 | User can record a voice debrief that automatically updates gear notes and location ratings | Voice pipeline fully built; need to add `TripFeedback` persistence to `apply` route and surface in past trip section |
</phase_requirements>

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Used |
|---------|---------|---------|----------|
| `@anthropic-ai/sdk` | 0.80.0 | Post-trip summary generation | Already in project for all Claude calls |
| `prisma` / `@prisma/client` | 6.19.2 | Database reads/writes | Project ORM for SQLite |
| `zod` | (installed in Phase 6) | Claude response validation | `parseClaudeJSON` utility wraps all Claude calls |
| `next.js` | 16.2.1 | API routes + React components | Project framework |

No new npm installs required for this phase.

### API Route Pattern (already established)

All API routes follow:
```typescript
export async function PATCH/POST(request: NextRequest) {
  try {
    const body = await request.json()
    // validate
    // prisma operation
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to X:', error)
    return NextResponse.json({ error: 'Failed to X' }, { status: 500 })
  }
}
```

## Architecture Patterns

### Recommended Project Structure for Phase 9

```
app/api/
  packing-list/
    items/route.ts          ← EXISTS: add usageStatus PATCH here (or new endpoint)
  trips/[id]/
    feedback/route.ts       ← NEW: GET saved summaries, POST trigger summary generation
components/
  PostTripReview.tsx        ← NEW: usage tracking + summary display for past trips
  TripCard.tsx              ← MODIFY: render PostTripReview for past trips (isPast=true)
lib/
  claude.ts                 ← MODIFY: add generateTripSummary() function
lib/parse-claude.ts         ← MODIFY: add TripSummaryResultSchema
app/api/voice/
  apply/route.ts            ← MODIFY: add TripFeedback persistence (voiceTranscript + insights)
```

### Pattern 1: Usage Status as Three-Option Toggle Per Item

**What:** Each packing item in the post-trip review renders a row with the item name and three button choices. Selecting one sets `usageStatus` via a PATCH. The selected state is highlighted in amber (used), muted (didn't need), or red-tinted (forgot but needed). Null = unreviewed (grey, default).

**When to use:** For the LEARN-01 usage tracking UI.

**Key insight:** The existing `/api/packing-list/items` PATCH route only handles `packed` (boolean). A separate PATCH endpoint is cleaner for `usageStatus` because the two operations have different UX timing — `packed` is pre-trip, `usageStatus` is post-trip.

**Recommended new endpoint:** `PATCH /api/trips/[id]/usage` body: `{ items: [{ gearId, usageStatus }] }` — batch update all statuses at once.

**Alternative (save individually):** `PATCH /api/packing-list/items` with `{ tripId, gearId, usageStatus }` — simpler but creates N network calls (one per tap). For mobile UX, batch is better: user taps all items, then taps "Save" once, or auto-save on each tap with optimistic update.

**Decision for planner:** Recommend individual save with optimistic update (same pattern as `togglePacked` in `PackingList.tsx`) — no Save button needed, instant feedback. The batch endpoint can be used for a "Save All" final submission that also triggers the D-03 auto-generate check.

### Pattern 2: PostTripReview Component in TripCard

**What:** When `isPast` is true, render a new `PostTripReview` section inside TripCard's expanded content. It shows the list of packed items (fetched from `/api/packing-list?tripId=...` — already returns `packedState`) with their current `usageStatus` values, the three-option toggle per item, and the auto-generated summary once all statuses are set.

**Where it fits in TripCard.tsx:**
```tsx
{/* Post-trip review for past trips (Phase 9) */}
{isPast && (
  <div className="mt-3">
    <PostTripReview tripId={trip.id} />
  </div>
)}
```

Current TripCard renders packing/meal/power tools only for `!isPast`. The post-trip review replaces that with a review-focused section for past trips.

**Data fetch:** `PostTripReview` calls `GET /api/packing-list?tripId=...` on mount. This already returns `result` (the original packing list with gear names and categories) and `packedState` (gearId → packed boolean). Phase 9 extends this response to also include `usageStatus` per item — add `usageStatus: true` to the `packingItems` select in the packing-list GET route.

### Pattern 3: Auto-Generate Summary on Completion

**What:** When the user sets the last item's usageStatus, the component detects that all items now have a non-null status and calls `POST /api/trips/[id]/feedback` to generate the Claude summary. Show a loading state while generating.

**Implementation:**
```typescript
// In PostTripReview component — after each status update:
const allComplete = items.every(item => item.usageStatus !== null)
if (allComplete) {
  triggerSummaryGeneration()
}
```

The summary is stored in `TripFeedback.summary` (append-only — see D-06). On subsequent loads, fetch the most recent `TripFeedback` record via `GET /api/trips/[id]/feedback`.

### Pattern 4: Claude Summary Generation

**What:** New `generateTripSummary()` function in `lib/claude.ts` following the exact same pattern as `generateDepartureChecklist()` — take structured input, build prompt, call Claude, parse with `parseClaudeJSON`.

**Input:**
- Trip name + dates
- Location name + current rating (if any)
- PackingItems with usageStatus (item name + status)

**Output schema:**
```typescript
interface TripSummaryResult {
  whatToDrop: string[]      // items marked "didn't need" — remove from future lists
  whatWasMissing: string[]  // items marked "forgot but needed" — add to future lists
  locationRating: number | null  // 1-5, null if not enough data
  summary: string           // 1-2 sentence prose debrief
}
```

**Model choice:** `claude-haiku-4-20250514` — same as `extractInsights()`. Low complexity structured extraction, not worth Sonnet cost.

**Zod schema:** Add `TripSummaryResultSchema` to `lib/parse-claude.ts` following the existing pattern.

**Prompt approach:** Simple structured extraction prompt — provide the usage data as a table, ask for the JSON output. Keep prompt under 500 tokens.

### Pattern 5: Voice Debrief Persistence to TripFeedback

**What:** The existing `apply` route (`app/api/voice/apply/route.ts`) applies insights to gear notes and location rating but does NOT persist to `TripFeedback`. D-06 says summaries and voice debriefs both go to `TripFeedback`. Add a `TripFeedback.create()` call at the end of the apply route.

**Fields to store:**
- `tripId` — from request body
- `voiceTranscript` — pass through from `InsightsReviewSheet` (currently not sent to apply route)
- `insights` — JSON.stringify of the full `InsightPayload`
- `summary` — null (voice debriefs use `voiceTranscript` + `insights` fields; `summary` is for Claude-generated post-trip summaries)
- `status` — `"applied"` (since user confirmed selections)

**What changes:** The `apply` route body needs `voiceTranscript?: string` added. The `InsightsReviewSheet` needs to pass the raw transcription through to the apply payload. The transcription is already stored in `VoiceRecordModal.rawTranscription` state — but currently only shown in the `extract-error` state. The `runPipeline` function stores it in component state; it should pass it to `InsightsReviewSheet` as a prop.

### Anti-Patterns to Avoid

- **Mutating GearItem records from post-trip summary:** The STATE.md decision is explicit: "Learning loop must append to TripFeedback model — never mutate GearItem source records." The summary only goes to TripFeedback. Voice debrief gear note updates (appends) are still allowed via the apply route.
- **Calling Claude on every trip load:** Generate summary once, store in TripFeedback, load on mount. Guard with existence check.
- **Blocking the UI waiting for Claude:** Show loading state, don't block the entire TripCard.
- **Overwriting existing TripFeedback rows:** The model is append-only (`@@index([tripId])`, not `@unique`). Always `prisma.tripFeedback.create()`, never upsert.
- **Using `PackingItem.usageStatus` for custom items:** Custom items (fromInventory=false) don't have a gearId or a PackingItem row — they only live in `Trip.packingListResult` JSON. The usage tracking should only render items that have a PackingItem row (i.e., gear-linked items). Non-inventory items can be excluded or shown as display-only.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Audio recording + transcription | Custom MediaRecorder pipeline | `VoiceRecordModal` (already built) | Phase 5 built the entire state machine |
| Claude JSON response parsing | Try/catch + JSON.parse | `parseClaudeJSON` + Zod schema | Handles fences, validates schema, returns discriminated union |
| Insight extraction from transcript | New Claude prompt | `extractInsights()` in `lib/voice/extract.ts` | Haiku model, tested prompt, returns `InsightPayload` |
| Checkbox UI with select/deselect | Custom checkbox | `InsightsReviewSheet` pattern (Set<number> state) | Already built and styled consistently |
| Status button UI | Custom design | Follow Button + active state pattern from PackingList | Consistency with existing amber highlight pattern |

## Common Pitfalls

### Pitfall 1: PackingItem Fetch Returns No Items for Past Trips

**What goes wrong:** The packing list GET route returns `result` (JSON blob) and `packedState` but the `result` blob may be null if the packing list was never generated.

**Why it happens:** Old trips or trips where packing list wasn't generated have `Trip.packingListResult = null`.

**How to avoid:** Guard in `PostTripReview` — if `result` is null, show "No packing list was generated for this trip" empty state. Don't attempt to render usage tracking.

**Warning signs:** Empty item list with no error.

### Pitfall 2: usageStatus Not Included in Packing List GET Response

**What goes wrong:** The current `GET /api/packing-list?tripId=...` selects `{ gearId: true, packed: true }` from packingItems — `usageStatus` is not included.

**Why it happens:** Field added in Phase 6 schema but not yet exposed in the API response.

**How to avoid:** Add `usageStatus: true` to the packingItems select in the GET route. Map it into the response object. This is a one-line change.

### Pitfall 3: Voice Transcription Not Passed to TripFeedback

**What goes wrong:** `InsightsReviewSheet` receives `InsightPayload` (extracted insights) but NOT the raw transcription. The `apply` route currently has no `voiceTranscript` field.

**Why it happens:** The transcription is stored in `VoiceRecordModal`'s local state (`rawTranscription`) but only surfaced in the error state, not passed through to the review sheet.

**How to avoid:** Pass `transcription` from `VoiceRecordModal` to `InsightsReviewSheet` as a prop (add `transcription?: string`). Include it in the apply request body. Add `voiceTranscript?: string` to `ApplyInsightRequest` in `lib/voice/types.ts`. Store it in the `TripFeedback.create()` call in the apply route.

### Pitfall 4: Auto-Generation Triggers Multiple Times

**What goes wrong:** If the user changes a status after all items are complete, the auto-trigger fires again, generating a second TripFeedback row unnecessarily.

**Why it happens:** Completion detection runs on every status change.

**How to avoid:** Check for existing TripFeedback before generating. In the `POST /api/trips/[id]/feedback` route: `prisma.tripFeedback.findFirst({ where: { tripId, summary: { not: null } } })` — if found, return the existing summary instead of generating a new one. Let the UI handle the "regenerate" case explicitly with a button.

### Pitfall 5: TripCard Grows Too Large

**What goes wrong:** Adding PostTripReview inline in TripCard.tsx pushes that file past the 800-line limit.

**Why it happens:** TripCard already has PackingList, MealPlan, PowerBudget, WeatherCard — adding another section balloons it.

**How to avoid:** Keep `PostTripReview` as its own standalone component file. TripCard renders `<PostTripReview tripId={trip.id} />` with no additional props — the component fetches its own data.

### Pitfall 6: Custom (Non-Inventory) Items Don't Have PackingItem Rows

**What goes wrong:** The packing list JSON (`Trip.packingListResult`) includes items where `fromInventory: false` — these don't have a `PackingItem` row and therefore have no `usageStatus` to track.

**Why it happens:** Non-inventory items are stored only in the JSON blob, not in the relational table.

**How to avoid:** Only show usage tracking rows for items where `fromInventory: true && gearId` exists (i.e., items with a `PackingItem` DB row). Filter the `result.categories[*].items` array against the `packedState` map — if a gearId exists in `packedState`, it has a PackingItem row. Render non-inventory items as display-only (no usage buttons).

## Code Examples

### Extending Packing List GET to Include usageStatus

```typescript
// Source: existing app/api/packing-list/route.ts — extend this select
const trip = await prisma.trip.findUnique({
  where: { id: tripId },
  select: {
    packingListResult: true,
    packingListGeneratedAt: true,
    packingItems: {
      select: {
        gearId: true,
        packed: true,
        usageStatus: true,  // ADD THIS
      }
    },
  },
})

// Build usageStatus map alongside packedState
const usageState: Record<string, string | null> = {}
for (const item of trip.packingItems) {
  usageState[item.gearId] = item.usageStatus
}

return NextResponse.json({
  result: trip.packingListResult ? JSON.parse(trip.packingListResult) : null,
  generatedAt: trip.packingListGeneratedAt?.toISOString() ?? null,
  packedState,
  usageState,  // ADD THIS
})
```

### Batch Usage Status PATCH Endpoint

```typescript
// app/api/trips/[id]/usage/route.ts
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: tripId } = await params
    const { gearId, usageStatus } = await request.json()

    if (!gearId) {
      return NextResponse.json({ error: 'gearId is required' }, { status: 400 })
    }

    const item = await prisma.packingItem.update({
      where: { tripId_gearId: { tripId, gearId } },
      data: { usageStatus },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update usage status:', error)
    return NextResponse.json({ error: 'Failed to update usage status' }, { status: 500 })
  }
}
```

### TripSummaryResult Zod Schema (add to lib/parse-claude.ts)

```typescript
export const TripSummaryResultSchema = z.object({
  whatToDrop: z.array(z.string()).default([]),
  whatWasMissing: z.array(z.string()).default([]),
  locationRating: z.number().min(1).max(5).nullable(),
  summary: z.string(),
})

export type TripSummaryResult = z.infer<typeof TripSummaryResultSchema>
```

### generateTripSummary in lib/claude.ts (new function)

```typescript
// Source: follows same pattern as generateDepartureChecklist
export async function generateTripSummary(params: {
  tripName: string
  startDate: string
  endDate: string
  locationName?: string
  currentLocationRating?: number | null
  usageItems: Array<{ name: string; category: string; usageStatus: 'used' | "didn't need" | 'forgot but needed' }>
}): Promise<TripSummaryResult> {
  // model: claude-haiku-4-20250514 (same as extractInsights)
  // returns: { whatToDrop, whatWasMissing, locationRating, summary }
}
```

### TripFeedback Persistence in apply route

```typescript
// At end of POST /api/voice/apply handler, after applying all changes:
await prisma.tripFeedback.create({
  data: {
    tripId: body.tripId,
    voiceTranscript: body.voiceTranscript ?? null,
    insights: JSON.stringify(body.insights),
    status: 'applied',
  },
})
```

### Auto-Generate Check in PostTripReview Component

```typescript
// After each individual usageStatus update succeeds:
const updatedItems = items.map(item =>
  item.gearId === gearId ? { ...item, usageStatus } : item
)
setItems(updatedItems)

const allComplete = updatedItems.every(item => item.usageStatus !== null)
if (allComplete && !summaryExists) {
  generateSummary()
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Phase 5: voice insights write-through only | Phase 9: also persist to TripFeedback | Phase 9 | Trip history is queryable |
| PackingItem.usageStatus = null (unused) | Phase 9: actively set by user post-trip | Phase 9 | Enables summary generation |

## Open Questions

1. **Should usage tracking show on active (in-progress) trips?**
   - What we know: D-01 says "completed trip" context; TripCard `isPast` flag gates it
   - What's unclear: Should users mark items during the trip (active) or only after?
   - Recommendation: Post-trip only (isPast = true). Active trip = pre-trip tools. Keeps UX clean.

2. **What if a trip has PackingItems but the packing list JSON was deleted/regenerated?**
   - What we know: PackingItem rows persist even after packing list regeneration (upsert on regen). gearId is the join key.
   - What's unclear: Item names in the usage UI should come from GearItem, not the JSON blob — safer.
   - Recommendation: Fetch `packingItems` with `gear { name, category }` include in the usage endpoint, not from the JSON blob. This is more robust.

3. **What happens if there are zero packed items?**
   - What we know: A trip can exist without a packing list ever being generated.
   - Recommendation: Show "No items to review — generate a packing list before your next trip" empty state.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies beyond existing OPENAI_API_KEY and ANTHROPIC_API_KEY — both already required and checked in existing routes).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (installed Phase 8) |
| Config file | vitest.config.ts (created Phase 8) |
| Quick run command | `npx vitest run` |
| Full suite command | `npx vitest run --coverage` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LEARN-01 | PATCH usage status updates PackingItem.usageStatus | unit | `npx vitest run tests/usage-status.test.ts` | ❌ Wave 0 |
| LEARN-02 | generateTripSummary returns valid TripSummaryResult | unit | `npx vitest run tests/trip-summary.test.ts` | ❌ Wave 0 |
| LEARN-02 | Auto-generate triggers when all items have status | unit | `npx vitest run tests/post-trip-review.test.ts` | ❌ Wave 0 |
| LEARN-03 | apply route persists TripFeedback record | unit | `npx vitest run tests/voice-apply.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run`
- **Per wave merge:** `npx vitest run --coverage`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/usage-status.test.ts` — covers LEARN-01 PATCH endpoint
- [ ] `tests/trip-summary.test.ts` — covers LEARN-02 generateTripSummary function
- [ ] `tests/post-trip-review.test.ts` — covers LEARN-02 auto-generate trigger logic
- [ ] `tests/voice-apply.test.ts` — covers LEARN-03 TripFeedback persistence in apply route

## Sources

### Primary (HIGH confidence)

- Direct code inspection of existing files — all patterns and APIs verified from source
  - `prisma/schema.prisma` — PackingItem.usageStatus, TripFeedback model confirmed
  - `app/api/voice/transcribe/route.ts`, `extract/route.ts`, `apply/route.ts` — all inspected
  - `lib/voice/types.ts` — InsightPayload, ApplyInsightRequest interfaces confirmed
  - `lib/voice/extract.ts` — extractInsights() using Haiku confirmed
  - `lib/claude.ts` — all generator functions inspected for pattern reference
  - `lib/parse-claude.ts` — parseClaudeJSON + all Zod schemas inspected
  - `components/TripsClient.tsx` — VoiceRecordModal integration confirmed
  - `components/TripCard.tsx` — isPast flag, VoiceDebriefButton placement confirmed
  - `components/VoiceRecordModal.tsx` — state machine, runPipeline confirmed
  - `components/InsightsReviewSheet.tsx` — checkbox pattern, apply payload confirmed
  - `components/PackingList.tsx` — togglePacked optimistic update pattern confirmed
  - `app/api/packing-list/route.ts` — GET response structure confirmed (missing usageStatus)
  - `app/api/packing-list/items/route.ts` — existing PATCH for packed field confirmed
  - `components/ui/Modal.tsx` — Modal + ConfirmDialog API confirmed

### Secondary (MEDIUM confidence)

- PROJECT STATE decisions from `.planning/STATE.md` — "never mutate GearItem source records" confirmed

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing, no new libraries
- Architecture patterns: HIGH — verified against actual code
- Pitfalls: HIGH — all identified from direct code inspection, not speculation
- Claude prompt patterns: HIGH — verified from existing `generateDepartureChecklist` and `extractInsights` as templates

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable codebase, no external dependencies changing)
