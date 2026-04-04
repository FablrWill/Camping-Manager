# Phase 28: Weather-Aware Clothing - Research

**Researched:** 2026-04-03
**Domain:** Prompt engineering — packing list generation in `lib/claude.ts`
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Subcategories are prompt-side only — no schema changes. Claude organizes clothing suggestions into three sub-sections within the packing output: **Rain Gear**, **Layers**, **Sun Protection**. All items remain stored under the existing `clothing` category in the DB.
- **D-02:** Sub-sections are condition-driven: only include sub-sections relevant to the trip's weather. A summer desert trip gets only Sun Protection; a cold rainy trip gets Rain Gear + Layers. Claude omits sub-sections that aren't applicable.
- **D-03:** Pre-compute clothing directives in code and inject them into the packing prompt as specific guidance. Code analyzes the forecast before calling Claude and builds a `CLOTHING GUIDANCE` block with actionable directives. Claude uses these as instructions, not suggestions.
- **D-04:** Thresholds:
  - **Rain gear:** `precipProbability >= 40%` on any trip day
  - **Cold layers:** `lowF <= 50°F` on any trip night
  - **UV protection:** `uvIndexMax >= 6` on any trip day
- **D-05:** UV index (`uvIndexMax`) is currently missing from the weather section string passed to Claude. Add it to `buildWeatherSection()` as part of this phase — e.g., `UV ${d.uvIndexMax}`.
- **D-06:** When a condition threshold is met and Will owns clothing items in that sub-category, explicitly cross-reference them in the clothing directive. Example: if `precipProbability >= 40%` and there are items in the `clothing` category in inventory, inject: "Rain gear in inventory: [item name id:xxx]. Prioritize these items in the Rain Gear section." Claude should reference the gear by ID.
- **D-07:** This cross-reference is condition-triggered — only clothing items are spotlighted, not all gear. Main gear section still passes full inventory grouped by category as before.

### Claude's Discretion

- Exact wording of each directive line in the CLOTHING GUIDANCE block
- How to handle edge cases where no clothing items exist in inventory for a triggered condition (suggest generic items as usual)
- Whether to merge the CLOTHING GUIDANCE block with the existing instruction #4 or present it as a separate named section

### Deferred Ideas (OUT OF SCOPE)

- Adding a `subcategory` field to the GearItem DB model (e.g., tagging rain jacket as `rain`, fleece as `insulation`) — deferred to a future gear enhancement phase if needed.
- Wind-aware clothing guidance (`windMaxMph >= 20` → suggest windbreaker) — not in success criteria, easy to add later.
</user_constraints>

---

## Summary

Phase 28 is a focused prompt-engineering phase with a small, well-bounded scope: enhance `lib/claude.ts` to produce weather-driven clothing suggestions in the packing list. The approach is pre-computation — analyze the forecast data in TypeScript before calling Claude, build a structured `CLOTHING GUIDANCE` block, and inject it into the prompt. No new pages, no schema migrations, no new categories.

All needed data is already flowing through the system. The `WeatherDay` interface (in `lib/weather.ts`) already has `uvIndexMax`, `precipProbability`, and `lowF`. The gap is that `buildWeatherSection()` does not include `uvIndexMax` in the string it sends to Claude, and there is no pre-computation logic that converts weather fields into clothing directives. Clothing items from gear inventory are already passed through the main `gearSection` block; the spotlight cross-reference in D-06 requires filtering for `category === 'clothing'` before building the guidance block.

The test pattern is established (Vitest, `tests/` directory, mock the Anthropic SDK at module level). The existing `packing-feedback.test.ts` test file — which tests `buildFeedbackSection()` — is the direct model for the new `buildClothingGuidance()` tests. Both are pure functions with no external dependencies.

**Primary recommendation:** Add `buildClothingGuidance()` as a pure helper function in `lib/claude.ts`, following the same pattern as `buildFeedbackSection()`. Add UV to `buildWeatherSection()`. Inject both into `generatePackingList()`. Cover with unit tests in `tests/clothing-guidance.test.ts`.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| TypeScript | 5.x | All lib logic | Project standard — all `lib/` is TypeScript |
| Vitest | 3.2.4 | Unit testing | Already the project test runner (`npm test`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@anthropic-ai/sdk` | 0.80.0 | Claude API call | Already used in `generatePackingList()` — no changes needed |

No new packages required. This phase is a pure code change inside existing modules.

---

## Architecture Patterns

### Recommended Project Structure

No new files in `app/` or `components/`. The two files to modify:
```
lib/
├── claude.ts          — Add buildClothingGuidance(), update buildWeatherSection(), wire into generatePackingList()
tests/
├── clothing-guidance.test.ts  — New test file covering buildClothingGuidance()
```

### Pattern 1: Named Section Builder (established pattern)

**What:** A pure function that takes typed data and returns a labeled string block to inject into a Claude prompt.

**When to use:** Any time structured data needs to be converted to prompt text. This is exactly how `buildFeedbackSection()` and `buildWeatherSection()` work.

**Example from existing code (`lib/claude.ts` line ~100):**
```typescript
export function buildFeedbackSection(feedback?: GearFeedbackSummary[]): string {
  if (!feedback || feedback.length === 0) return ''
  const lines = feedback.map((f) => { ... })
  return `GEAR HISTORY FROM PAST TRIPS:\n${lines.join('\n')}`
}
```

The new `buildClothingGuidance()` should follow the same signature shape:
- Accept typed weather + clothing inventory data
- Return a string (empty string when no conditions triggered)
- Be a pure function with no side effects (testable in isolation)

### Pattern 2: Condition-Triggered Directive Building

**What:** Analyze weather days array to check thresholds, build directive lines only for conditions that fire.

**Logic structure:**
```typescript
// Check each threshold independently
const needsRainGear = weather.days.some(d => d.precipProbability >= 40)
const needsLayers = weather.days.some(d => d.lowF <= 50)
const needsUVProtection = weather.days.some(d => d.uvIndexMax >= 6)

// Build conditional directive lines
const directives: string[] = []
if (needsRainGear) { directives.push(rainDirective) }
if (needsLayers)   { directives.push(layersDirective) }
if (needsUVProtection) { directives.push(uvDirective) }

// If nothing triggered, return empty or fallback
if (directives.length === 0) return ''  // or minimal fallback

return `CLOTHING GUIDANCE:\n${directives.join('\n')}`
```

### Pattern 3: Inventory Cross-Reference (D-06)

**What:** Filter clothing items from the gear inventory, format them for the directive line.

**Key insight from the code:** The `gearInventory` parameter to `generatePackingList()` already contains items with `{ id, name, brand, category }`. Items are formatted with `[id:xxx]` throughout the gear section. The spotlight should use the same `[id:xxx]` convention so Claude can cross-reference correctly.

```typescript
const clothingItems = gearInventory.filter(g => g.category === 'clothing')
// Used inside buildClothingGuidance() to produce spotlight lines like:
// "Rain gear in inventory: Rain Jacket (Columbia) [id:abc123], Packable Poncho [id:def456]. Prioritize these."
```

### Pattern 4: UV Index in Weather Section

**What:** Add `UV ${d.uvIndexMax}` to the per-day line in `buildWeatherSection()`.

**Current line (line ~151 in `lib/claude.ts`):**
```typescript
`${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph`
```

**After change:**
```typescript
`${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph, UV ${d.uvIndexMax}`
```

The `WeatherDay` interface in `lib/claude.ts` (line ~35-44) already has `uvIndexMax: number` — the field is defined but not used in this string.

### Pattern 5: Injection Point in generatePackingList()

**What:** Call `buildClothingGuidance()` alongside the existing section builders and inject the result into the prompt.

**Injection location:** After `feedbackSection` and `dogSection` construction. The CLOTHING GUIDANCE block should appear in the prompt near the weather forecast section — they are conceptually coupled.

**Instruction #4 update:** The current prompt instruction #4 reads:
> "Adjust for weather: if rain is forecast, include rain gear. If cold, prioritize warm layers. If hot/high UV, include sun protection."

This should be updated or replaced to reference the CLOTHING GUIDANCE block when it's present, so Claude treats the directives as authoritative instructions rather than general guidance.

### Anti-Patterns to Avoid

- **Don't add UV to `lib/weather.ts`:** `uvIndexMax` is already in `DayForecast`. The CONTEXT.md is explicit: no changes needed to `weather.ts`. Only consume the field in `claude.ts`.
- **Don't change the JSON output schema:** The packing list JSON structure is unchanged. Claude just populates the `clothing` category with better-organized items. No schema migration, no Zod schema changes.
- **Don't spotlight non-clothing items:** D-07 is explicit — only `category === 'clothing'` items get the cross-reference treatment. All other categories continue to flow through the existing `gearSection` as before.
- **Don't hardcode the threshold values as magic numbers:** Define named constants (`RAIN_THRESHOLD_PERCENT`, `COLD_THRESHOLD_F`, `UV_THRESHOLD_INDEX`) so they are readable and easy to adjust.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Weather data | Custom weather fetching | `fetchWeather()` in `lib/weather.ts` | Already integrated, already returns typed `DayForecast[]` with all needed fields |
| Gear filtering | Custom DB query | Filter `gearInventory` parameter in-memory | The API route already fetches all owned non-broken gear and passes it to `generatePackingList()` |
| Prompt string building | Template engine | Simple TypeScript string construction | `buildFeedbackSection()` and `buildWeatherSection()` show the established pattern |

---

## Common Pitfalls

### Pitfall 1: Weather Undefined When No Location or Trip Too Far Out
**What goes wrong:** `generatePackingList()` receives `weather: undefined` when the trip has no GPS coordinates or is more than 16 days out (enforced in `app/api/packing-list/route.ts`). If `buildClothingGuidance()` doesn't guard for undefined weather, it throws.

**Why it happens:** The API route already has this guard — weather is only fetched when `trip.location?.latitude && trip.location?.longitude` and `daysOut <= 16`. But `generatePackingList()` is called with `weather` as an optional parameter.

**How to avoid:** `buildClothingGuidance()` must accept `weather` as optional and return `''` (or a no-conditions-triggered fallback) when weather is undefined. Check: `if (!weather || weather.days.length === 0) return ''`.

**Warning signs:** TypeScript will catch non-optional access at compile time if the parameter is typed correctly.

### Pitfall 2: Clothing Items Filter Returns Empty — No Cross-Reference
**What goes wrong:** The condition threshold fires (e.g., rain expected) but Will has no clothing items in inventory. The directive must still work — Claude should suggest generic rain gear items rather than referencing inventory IDs that don't exist.

**Why it happens:** New users or users who haven't added clothing gear yet.

**How to avoid:** Branch inside each directive: if `clothingItems` relevant to the condition exist, add the spotlight line; if not, omit the spotlight line and let Claude suggest generic items. This is explicitly in Claude's Discretion per CONTEXT.md.

### Pitfall 3: Instruction #4 Conflicts with CLOTHING GUIDANCE Block
**What goes wrong:** Instruction #4 says "if rain is forecast, include rain gear" — Claude may treat this as the primary guidance and deprioritize the more specific CLOTHING GUIDANCE block.

**Why it happens:** Competing instructions in a prompt reduce Claude's precision.

**How to avoid:** Either replace instruction #4 entirely with a reference to the CLOTHING GUIDANCE block, or update it to say "See CLOTHING GUIDANCE block above for specific directives — follow those exactly." The CONTEXT.md notes this is Claude's Discretion, but the safest approach is to make #4 defer to the block.

### Pitfall 4: Build Failure from WeatherDay Interface Mismatch
**What goes wrong:** The `WeatherDay` interface defined locally in `lib/claude.ts` (line ~35-44) already has `uvIndexMax: number`. If the existing type doesn't have it but the code tries to access it, TypeScript compile fails.

**Why it happens:** Wouldn't happen — it's already there. But confirm the local `WeatherDay` interface in `claude.ts` matches. The `DayForecast` interface in `weather.ts` is the authoritative definition; `claude.ts` has a local copy called `WeatherDay` with the same fields.

**Verification:** Lines 35-44 of `lib/claude.ts` confirm `uvIndexMax: number` is already present in the local `WeatherDay` interface. No type changes needed.

---

## Code Examples

### Confirmed: WeatherDay interface already has uvIndexMax (`lib/claude.ts` lines 35-44)
```typescript
interface WeatherDay {
  date: string
  dayLabel: string
  highF: number
  lowF: number
  precipProbability: number
  weatherLabel: string
  windMaxMph: number
  uvIndexMax: number   // already present — just not used in buildWeatherSection() yet
}
```

### Confirmed: buildWeatherSection() current per-day line (`lib/claude.ts` line ~151)
```typescript
`${d.dayLabel} ${d.date}: ${d.weatherLabel}, High ${d.highF}°F / Low ${d.lowF}°F, ${d.precipProbability}% rain, Wind ${d.windMaxMph} mph`
// UV ${d.uvIndexMax} needs to be appended here
```

### Confirmed: buildFeedbackSection() as the template pattern (`lib/claude.ts` line ~100)
```typescript
export function buildFeedbackSection(feedback?: GearFeedbackSummary[]): string {
  if (!feedback || feedback.length === 0) return ''
  const lines = feedback.map((f) => { ... })
  return `GEAR HISTORY FROM PAST TRIPS:\n${lines.join('\n')}`
}
```

### Confirmed: gearInventory item shape (`lib/claude.ts` line ~197-203)
```typescript
// Items already formatted with [id:xxx] in gearSection
`  - ${i.name}${i.brand ? ` (${i.brand})` : ''}... [id:${i.id}]`
// buildClothingGuidance() should use the same [id:xxx] format for inventory spotlight
```

### Confirmed: packing-feedback.test.ts as test template (uses Vitest, mocks Anthropic SDK)
```typescript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: { create: vi.fn() },
  })),
}))

import { buildFeedbackSection } from '@/lib/claude'

describe('buildFeedbackSection', () => {
  it('returns empty string when undefined', () => {
    expect(buildFeedbackSection(undefined)).toEqual('')
  })
  // ...
})
```

---

## Environment Availability

Step 2.6: SKIPPED — This phase is purely code/config changes in `lib/claude.ts`. No external dependencies beyond what's already running (Anthropic API, Open-Meteo). Both are used in existing passing tests and the running dev server.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` (runs `vitest run`) |
| Full suite command | `npm test` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-01 | Claude prompt includes specific clothing guidance from weather | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ Wave 0 |
| SC-02 | Rain gear triggered when precipProbability >= 40% | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ Wave 0 |
| SC-03 | Cold layers triggered when lowF <= 50°F | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ Wave 0 |
| SC-04 | UV protection triggered when uvIndexMax >= 6 | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ Wave 0 |
| SC-05 | Owned clothing items cross-referenced when threshold met | unit | `npm test -- tests/clothing-guidance.test.ts` | ❌ Wave 0 |
| SC-06 | `npm run build` passes | build | `npm run build` | N/A — verified at end |

### Sampling Rate
- **Per task commit:** `npm test -- tests/clothing-guidance.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full `npm test` green + `npm run build` passes before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/clothing-guidance.test.ts` — covers SC-01 through SC-05

*(Existing test infrastructure covers everything else — no new framework install needed.)*

---

## State of the Art

| Old Approach | Current Approach | Notes |
|--------------|------------------|-------|
| Generic instruction #4 in prompt | Pre-computed CLOTHING GUIDANCE block | Phase 28 change — makes directives specific and condition-driven |
| UV omitted from weather string | UV index included per-day | Phase 28 change — D-05 |

**Deprecated/outdated:**
- Instruction #4 ("Adjust for weather: if rain is forecast...") — to be replaced or updated to defer to CLOTHING GUIDANCE block.

---

## Open Questions

1. **Should CLOTHING GUIDANCE appear before or after GEAR INVENTORY in the prompt?**
   - What we know: `buildWeatherSection()` and `buildFeedbackSection()` are injected before the INSTRUCTIONS block; gear section is also before instructions.
   - What's unclear: Whether Claude better follows clothing directives when they appear near the gear listing or near the weather block.
   - Recommendation: Place CLOTHING GUIDANCE immediately after WEATHER FORECAST and before GEAR INVENTORY — it conceptually bridges the two.

2. **What text when no conditions triggered?**
   - What we know: CONTEXT.md specifics say "CLOTHING GUIDANCE block can be omitted entirely or reduced to: 'No extreme conditions — pack comfortable layers for variable temps.'"
   - What's unclear: Whether omitting entirely vs. including the fallback line produces better packing list outputs.
   - Recommendation: Include a minimal fallback ("No extreme weather conditions — suggest comfortable, versatile layers for variable temps.") rather than omitting entirely. This keeps the block structurally consistent for Claude.

---

## Sources

### Primary (HIGH confidence)
- `lib/claude.ts` (read directly) — all existing helper functions, prompt structure, instruction numbering
- `lib/weather.ts` (read directly) — `DayForecast` interface, `uvIndexMax` availability confirmed
- `lib/gear-categories.ts` (read directly) — `clothing` category value confirmed as `'clothing'`
- `app/api/packing-list/route.ts` (read directly) — how `gearInventory` and `weather` are assembled and passed
- `tests/packing-feedback.test.ts` (read directly) — established test pattern with Vitest + Anthropic mock
- `vitest.config.ts` (read directly) — test environment, include paths, alias configuration
- `.planning/phases/28-weather-aware-clothing/28-CONTEXT.md` (read directly) — all locked decisions

### Secondary (MEDIUM confidence)
- `.planning/REQUIREMENTS.md` — project requirements context (no Phase 28 specific req IDs yet)
- `.planning/STATE.md` — project history and accumulated decisions

---

## Project Constraints (from CLAUDE.md)

Directives from `CLAUDE.md` that the planner must verify compliance with:

- **TypeScript throughout** — `buildClothingGuidance()` must be typed; no `any`
- **No alert() in components** — not applicable (no UI changes)
- **All API routes must have try-catch** — not applicable (no new routes)
- **All React hooks must have correct dependency arrays** — not applicable (no new hooks)
- **No premature abstractions** — `buildClothingGuidance()` is the only new abstraction; it's justified by the established helper pattern
- **Files focused (<800 lines)** — `lib/claude.ts` is currently 601 lines; adding ~40-60 lines stays well within limit
- **No mutation** — use immutable patterns when building the directives array (spread or push-to-new-array)
- **Commit messages: imperative mood, concise** — standard project practice
- **GSD workflow** — changes must go through GSD execute-phase, not direct edits

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all existing libraries, confirmed in code
- Architecture: HIGH — pattern is established and confirmed by reading existing helper functions
- Pitfalls: HIGH — all verified from reading actual source files, not from training data assumptions
- Test strategy: HIGH — Vitest is confirmed running, test pattern confirmed from existing test file

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable — no external APIs involved beyond what's already in use)
