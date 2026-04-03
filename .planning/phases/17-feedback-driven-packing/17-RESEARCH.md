# Phase 17: Feedback-Driven Packing - Research

**Researched:** 2026-04-02
**Domain:** Prompt engineering + Prisma data aggregation (TypeScript/Next.js)
**Confidence:** HIGH

## Summary

Phase 17 is a pure TypeScript feature with no new dependencies and no schema changes. The work is entirely contained in two existing files: `lib/claude.ts` (add a `feedbackContext` parameter to `generatePackingList()`) and `app/api/packing-list/route.ts` (query and aggregate gear history before calling Claude).

The key data challenge: the S02 spec describes querying `TripFeedback.gearFeedback` but that field does not exist. The actual gear usage data is stored on `PackingItem.usageStatus` — one record per gear item per trip. The correct approach is to query `PackingItem` records from recent completed trips (those that have non-null `usageStatus`), not the `TripFeedback` table. `TripFeedback` stores free-text summaries and voice insights; `PackingItem.usageStatus` stores the structured per-item signal ("used" / "didn't need" / "forgot but needed").

**Primary recommendation:** Query `PackingItem` records from last 3-5 trips (ordered by `Trip.endDate` DESC, filtered to items with non-null `usageStatus`), aggregate per `gearId`, and inject a gear history section into the `generatePackingList()` prompt. When no history exists, the function call is identical to current behavior.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PACK-01 | `generatePackingList()` in `lib/claude.ts` accepts feedback context parameter | Add optional `feedbackContext?: GearFeedbackContext` param; inject into prompt string |
| PACK-02 | `/api/packing-list` queries last 3-5 `TripFeedback` records and aggregates per-item status | Must query `PackingItem` (not `TripFeedback`) — see Data Reality section |
| PACK-03 | Graceful degradation — no trip history produces identical output to current behavior | Achieved by making `feedbackContext` optional with `undefined` = no-op |
| PACK-04 | Claude prompt includes gear feedback summary; output contains feedback-informed notes when history exists | Prompt injection pattern; Claude naturally uses context when present |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no JS in lib/ or api/ files
- All API routes must have try-catch error handling with `console.error` + JSON error response
- No `alert()` in components — use state-based inline errors
- All React hooks must have correct, minimal dependency arrays
- Immutable patterns — create new objects, never mutate
- Functions < 50 lines; files < 800 lines
- Commit messages: imperative mood, concise
- TASKS.md is the single source of truth — update every session
- Changelog: one file per session in `docs/changelog/`, named `session-NN.md`
- `docs/CHANGELOG.md` is index-only — add one row, never edit other session files
- When a feature in TASKS.md/FEATURE-PHASES.md is built, mark it Done immediately
- GSD workflow enforcement: use `/gsd:execute-phase` for planned phase work

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | ORM for gear + trip queries | Already in use; type-safe queries |
| Anthropic SDK | 0.80.0 | Claude API calls | Already in use in `lib/claude.ts` |
| Zod | (via parse-claude.ts) | Response validation | Project standard via `parseClaudeJSON` |

### No New Dependencies
This phase requires zero new packages. All logic is additive changes to existing files.

**Installation:** None required.

## Architecture Patterns

### Data Reality (CRITICAL — corrects S02 spec)

The S02 spec says: "Query `TripFeedback` records — parse `gearFeedback` JSON with `gearItemId` + `status`."

This does not match the actual schema. The `TripFeedback` model has:
- `summary` — JSON blob of `TripSummaryResult` (`whatToDrop`, `whatWasMissing`, `locationRating`, `summary`)
- `insights` — JSON blob from voice debrief (`gearUpdates` with `gearId` + text, no usageStatus)
- No `gearFeedback` field. No `gearItemId` field. No `status` field with used/didn't_need/forgot.

The structured per-item usage data lives on `PackingItem.usageStatus`:
- Model: `PackingItem` — fields: `tripId`, `gearId`, `usageStatus` ("used" | "didn't need" | "forgot but needed" | null)
- One `PackingItem` per gear item per trip
- `usageStatus` is set by the post-trip debrief flow (Phase 9)

**Correct query:** Join `Trip` → `PackingItem` → `GearItem`, filter to trips with non-null usageStatus, ordered by `Trip.endDate DESC`, limit to last 3-5 trips.

### Recommended Project Structure (no changes)
```
lib/
  claude.ts        — add GearFeedbackContext interface + optional param to generatePackingList()
app/api/
  packing-list/
    route.ts       — add feedback aggregation query before generatePackingList() call
tests/
  packing-feedback.test.ts  — new test file for PACK-01 through PACK-04
```

### Pattern 1: Optional Context Parameter

`generatePackingList()` currently accepts a flat params object. Add one optional field:

```typescript
// lib/claude.ts — extend existing params interface
export interface GearFeedbackSummary {
  gearName: string
  usedCount: number
  didntNeedCount: number
  forgotCount: number
  totalTrips: number
}

// Add to params object in generatePackingList():
feedbackContext?: GearFeedbackSummary[]
```

When `feedbackContext` is `undefined` or empty, the prompt section is omitted entirely — current behavior preserved.

### Pattern 2: Prompt Injection Section

```typescript
// Source: project pattern from buildWeatherSection() in lib/claude.ts
function buildFeedbackSection(feedback?: GearFeedbackSummary[]): string {
  if (!feedback || feedback.length === 0) return ''
  const lines = feedback.map((f) => {
    const parts: string[] = []
    if (f.didntNeedCount >= 2) parts.push(`marked "didn't need" on ${f.didntNeedCount}/${f.totalTrips} trips`)
    if (f.forgotCount >= 1) parts.push(`forgotten but needed on ${f.forgotCount}/${f.totalTrips} trips`)
    if (f.usedCount > 0 && parts.length === 0) parts.push(`used on ${f.usedCount}/${f.totalTrips} trips`)
    return `- ${f.gearName}: ${parts.join(', ')}`
  })
  return `GEAR HISTORY FROM PAST TRIPS:\n${lines.join('\n')}`
}
```

Inject after the gear inventory section in the prompt, before INSTRUCTIONS.

### Pattern 3: Aggregation in API Route

```typescript
// app/api/packing-list/route.ts — add before generatePackingList() call

// Find last 3-5 trips with completed gear reviews
const recentTrips = await prisma.trip.findMany({
  where: {
    packingItems: {
      some: { usageStatus: { not: null } },
    },
    id: { not: tripId }, // exclude current trip
  },
  orderBy: { endDate: 'desc' },
  take: 5,
  select: {
    id: true,
    packingItems: {
      where: { usageStatus: { not: null } },
      select: {
        gearId: true,
        usageStatus: true,
        gear: { select: { name: true } },
      },
    },
  },
})

// Aggregate per gear item
const gearTotals: Record<string, GearFeedbackSummary> = {}
for (const trip of recentTrips) {
  for (const item of trip.packingItems) {
    if (!gearTotals[item.gearId]) {
      gearTotals[item.gearId] = {
        gearName: item.gear.name,
        usedCount: 0,
        didntNeedCount: 0,
        forgotCount: 0,
        totalTrips: 0,
      }
    }
    const g = gearTotals[item.gearId]
    g.totalTrips++
    if (item.usageStatus === 'used') g.usedCount++
    else if (item.usageStatus === "didn't need") g.didntNeedCount++
    else if (item.usageStatus === 'forgot but needed') g.forgotCount++
  }
}

const feedbackContext = Object.values(gearTotals).filter(
  (g) => g.didntNeedCount >= 2 || g.forgotCount >= 1
)
```

Filter to only items with signal worth surfacing (2+ "didn't need" OR 1+ "forgot") — avoids noisy history.

### Anti-Patterns to Avoid

- **Querying TripFeedback for gear usage:** The `TripFeedback` table does not store per-item structured usage. Use `PackingItem.usageStatus` instead.
- **Mutating the params object:** Follow project immutability pattern — build `feedbackContext` as a new array, pass as new object spread.
- **Throwing when no history:** Graceful degradation is PACK-03. `feedbackContext = []` or `undefined` must silently produce no change in prompt.
- **console.log for debugging:** CLAUDE.md and TypeScript rules forbid `console.log` in production code. Use `console.error` for errors only. The spec says "visible in server logs" — use `console.error` only if something fails, or log with a descriptive prefix if needed (e.g., `console.error` is the only sanctioned logger).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON parsing of Claude response | Custom parser | `parseClaudeJSON` + Zod schema | Already handles markdown fences, type safety |
| Trip query with relations | Raw SQL | Prisma `findMany` with `include`/`select` | Type-safe, handles relations |

**Key insight:** The feedback aggregation is straightforward map/reduce over Prisma results — no library needed.

## Common Pitfalls

### Pitfall 1: Wrong data source
**What goes wrong:** Querying `TripFeedback` for per-item gear status — that table has free-text summaries, not structured `usageStatus` values.
**Why it happens:** S02 spec says "parse `gearFeedback` JSON" but the field doesn't exist in the schema.
**How to avoid:** Query `PackingItem` with `usageStatus: { not: null }` joined through recent trips.
**Warning signs:** TypeScript error — `TripFeedback` has no `gearFeedback` property.

### Pitfall 2: Including the current trip in feedback history
**What goes wrong:** Current trip has no usageStatus yet (in-progress), but if included it would show zeros and skew aggregation.
**Why it happens:** Query doesn't filter out the tripId being packed for.
**How to avoid:** Add `id: { not: tripId }` to the trip query where clause.
**Warning signs:** Feedback context shows items with 0 counts, or aggregation of 0 trips.

### Pitfall 3: Prompt injection making Claude ignore feedback
**What goes wrong:** Feedback section placed after INSTRUCTIONS — Claude may not see it as context to act on.
**Why it happens:** Prompt ordering matters for LLM attention.
**How to avoid:** Place `GEAR HISTORY FROM PAST TRIPS` section between gear inventory and INSTRUCTIONS, so it informs the instructions that follow.
**Warning signs:** Packing list output never mentions feedback even with rich history.

### Pitfall 4: Noisy history with every item
**What goes wrong:** Injecting feedback for all items (even those used every time) bloats the prompt with signal-free noise.
**Why it happens:** Aggregating all items without filtering for signal.
**How to avoid:** Only include items where `didntNeedCount >= 2 || forgotCount >= 1` — actionable signal only.
**Warning signs:** Prompt includes 30+ lines of gear history; Claude adds notes on obviously-used items.

### Pitfall 5: TypeScript strict mode issues with nullable gearId
**What goes wrong:** `PackingItem.gearId` is `String` (non-nullable per schema) but joining through relations can produce inference issues.
**How to avoid:** The Prisma schema shows `gearId String` (required), so `item.gearId` is always a string — safe to use as map key without null check.

## Code Examples

### Existing pattern to follow: buildWeatherSection()
```typescript
// Source: lib/claude.ts line 97-107
function buildWeatherSection(weather?: { days: WeatherDay[]; alerts: WeatherAlert[] }): string {
  if (!weather) return 'WEATHER: Not available — plan for variable conditions.'
  return `WEATHER FORECAST:\n${weather.days.map(...).join('\n')}`
}
```
The feedback builder follows the same signature — optional input, returns empty string when absent.

### Existing pattern: prompt injection
```typescript
// Source: lib/claude.ts line 153 — weatherSection injected mid-prompt
const weatherSection = buildWeatherSection(weather)

const prompt = `...
${weatherSection}

GEAR INVENTORY...`
```
Add `feedbackSection` in the same style, between gear inventory and INSTRUCTIONS.

### Existing pattern: API route try-catch
```typescript
// Source: app/api/packing-list/route.ts line 123-144
try {
  packingList = await generatePackingList({ ... })
} catch (error) {
  const message = error instanceof Error ? error.message : 'Failed to generate packing list'
  if (message.includes('schema mismatch') || message.includes('non-JSON')) {
    return NextResponse.json({ error: message }, { status: 422 })
  }
  throw error
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Static packing list (no personalization) | Static (Phase 17 adds learning) | Phase 17 (this phase) | Claude incorporates trip history |

**No deprecated patterns in scope for this phase.**

## Runtime State Inventory

This is not a rename/refactor phase. Omitted.

## Environment Availability

Step 2.6: SKIPPED — this phase is pure TypeScript code changes. No external dependencies beyond what the project already uses (Anthropic API, SQLite).

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Anthropic SDK | generatePackingList() | Already in project | 0.80.0 | — |
| Prisma | PackingItem queries | Already in project | 6.19.2 | — |
| ANTHROPIC_API_KEY | Claude API call | Already required by packing list | env var | 500 error (existing behavior) |

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- --run tests/packing-feedback.test.ts` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PACK-01 | `generatePackingList()` accepts optional `feedbackContext` param; prompt contains feedback section when provided | unit | `npm test -- --run tests/packing-feedback.test.ts` | ❌ Wave 0 |
| PACK-02 | `/api/packing-list` POST aggregates PackingItem usageStatus from last 3-5 trips | unit | `npm test -- --run tests/packing-feedback.test.ts` | ❌ Wave 0 |
| PACK-03 | When feedbackContext is undefined/empty, generatePackingList behaves identically to current | unit | `npm test -- --run tests/packing-feedback.test.ts` | ❌ Wave 0 |
| PACK-04 | Prompt string includes feedback section when history exists; graceful when empty | unit | `npm test -- --run tests/packing-feedback.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- --run tests/packing-feedback.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/packing-feedback.test.ts` — covers PACK-01 through PACK-04
  - Test: `buildFeedbackSection()` returns empty string when no feedback
  - Test: `buildFeedbackSection()` returns formatted lines when feedback present
  - Test: `generatePackingList()` prompt includes feedback section when context provided
  - Test: aggregation logic produces correct counts per gearId across multiple trips
  - Test: filter logic excludes items with only "used" status (no signal)

*(No framework install needed — Vitest already configured)*

## Open Questions

1. **PACK-02 says "TripFeedback records" but schema uses PackingItem**
   - What we know: `TripFeedback` has no per-item `gearFeedback` field matching the S02 spec description. `PackingItem.usageStatus` is the actual structured data.
   - What's unclear: Whether the requirement intended TripFeedback (as a proxy for "past trips with debriefs") or literally the PackingItem data.
   - Recommendation: Query `PackingItem` — it has the exact data the spec describes (`gearItemId` = `gearId`, `status` = `usageStatus`). The PACK-02 requirement text says "aggregates per-item status" which maps directly to `PackingItem.usageStatus`. Use this approach.

2. **Threshold for "low priority" flag**
   - What we know: S02 spec says "if item marked 'didn't need' 2+ times, flag as low priority"
   - What's unclear: Whether 1 "forgot" should trigger a flag immediately or require 2+
   - Recommendation: 1+ "forgot" = flag immediately (safety-critical for forgotten items), 2+ "didn't need" = low priority flag. Conservative approach is fine for a personal tool.

3. **Console logging for "visible in server logs" (PACK-04)**
   - What we know: CLAUDE.md and TypeScript rules say no `console.log` in production; only `console.error`
   - What's unclear: How to satisfy "visible in server logs" without violating the no-console.log rule
   - Recommendation: Use `console.error` with a descriptive non-error prefix like `console.error('[packing-list] Feedback context injected:', feedbackContext.length, 'items')` — or skip and note that the prompt itself (returned in the 422 error path if it fails) makes the feedback visible. Alternatively, a single `console.error`-level log with PACK context is acceptable in API routes per existing pattern.

## Sources

### Primary (HIGH confidence)
- Prisma schema at `prisma/schema.prisma` — confirmed field names, types, relationships for `PackingItem`, `TripFeedback`, `Trip`
- `lib/claude.ts` — confirmed current `generatePackingList()` signature and prompt structure
- `app/api/packing-list/route.ts` — confirmed current POST handler flow
- `app/api/trips/[id]/feedback/route.ts` — confirmed what `TripFeedback.summary` actually stores
- `app/api/voice/apply/route.ts` — confirmed what `TripFeedback.insights` actually stores
- `lib/voice/types.ts` — confirmed `InsightPayload.gearFeedback` shape (text + gearName, no usageStatus)
- `vitest.config.ts` — confirmed test framework and include paths
- `.planning/config.json` — confirmed nyquist_validation: true

### Secondary (MEDIUM confidence)
- `tests/trip-summary.test.ts` — confirmed test patterns (vi.mock, describe/it/expect) for new test file

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — zero new dependencies, existing libs confirmed in place
- Architecture: HIGH — schema inspected directly, no speculation
- Data source correction: HIGH — TripFeedback schema confirmed, PackingItem confirmed as correct source
- Pitfalls: HIGH — derived from direct code inspection
- Test patterns: HIGH — existing test files inspected

**Research date:** 2026-04-02
**Valid until:** Stable (schema-locked, no external dependencies)
