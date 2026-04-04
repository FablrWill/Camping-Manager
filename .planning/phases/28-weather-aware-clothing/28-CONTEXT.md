# Phase 28: Weather-Aware Clothing - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Enhance the packing list generation in `lib/claude.ts` to produce weather-driven clothing suggestions — rain gear for rain, cold layers for low temps, UV protection for high UV index. This is primarily prompt engineering: pre-compute clothing directives from the forecast and inject them into the packing prompt. No new pages, no schema migrations, no new gear categories. The `clothing` category already exists from Phase 23.

</domain>

<decisions>
## Implementation Decisions

### Clothing Subcategories
- **D-01:** Subcategories are prompt-side only — no schema changes. Claude organizes clothing suggestions into three sub-sections within the packing output: **Rain Gear**, **Layers**, **Sun Protection**. All items remain stored under the existing `clothing` category in the DB.
- **D-02:** Sub-sections are condition-driven: only include sub-sections relevant to the trip's weather. A summer desert trip gets only Sun Protection; a cold rainy trip gets Rain Gear + Layers. Claude omits sub-sections that aren't applicable.

### Threshold Approach
- **D-03:** Pre-compute clothing directives in code and inject them into the packing prompt as specific guidance. Code analyzes the forecast before calling Claude and builds a `CLOTHING GUIDANCE` block with actionable directives. Claude uses these as instructions, not suggestions.
- **D-04:** Thresholds:
  - **Rain gear:** `precipProbability >= 40%` on any trip day
  - **Cold layers:** `lowF <= 50°F` on any trip night
  - **UV protection:** `uvIndexMax >= 6` on any trip day
- **D-05:** UV index (`uvIndexMax`) is currently missing from the weather section string passed to Claude. Add it to `buildWeatherSection()` as part of this phase — e.g., `UV ${d.uvIndexMax}`.

### Owned Clothing Spotlight
- **D-06:** When a condition threshold is met and Will owns clothing items in that sub-category, explicitly cross-reference them in the clothing directive. Example: if `precipProbability >= 40%` and there are items in the `clothing` category in inventory, inject: "Rain gear in inventory: [item name id:xxx]. Prioritize these items in the Rain Gear section." Claude should reference the gear by ID.
- **D-07:** This cross-reference is condition-triggered — only clothing items are spotlighted, not all gear. Main gear section still passes full inventory grouped by category as before.

### Claude's Discretion
- Exact wording of each directive line in the CLOTHING GUIDANCE block
- How to handle edge cases where no clothing items exist in inventory for a triggered condition (suggest generic items as usual)
- Whether to merge the CLOTHING GUIDANCE block with the existing instruction #4 or present it as a separate named section

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Files to Modify
- `lib/claude.ts` — Primary target. `buildWeatherSection()` (line ~145) needs UV index added. `generatePackingList()` needs a new `buildClothingGuidance()` helper and injection into the packing prompt. Instruction #4 (generic weather/clothing line) should be replaced or extended.
- `lib/weather.ts` — `DayForecast` interface (line ~7). `uvIndexMax: number` is available but not included in the weather string passed to Claude. No changes needed to weather.ts itself — just consume the field in claude.ts.
- `lib/gear-categories.ts` — `clothing` category definition. Phase 28 should import/reference this to filter gear inventory for the owned clothing spotlight.

### Prior Phase Context
- `.planning/phases/23-gear-category-expansion/23-CONTEXT.md` — D-01: `clothing` is one of 15 categories in the Living group. `lib/gear-categories.ts` is the single source of truth. Phase 28 builds on this.
- `.planning/phases/06-stabilization/06-CONTEXT.md` — D-01/D-02: AI output persistence pattern. Packing list persists on generate, loads on mount, explicit regenerate button. Phase 28 does not change this flow.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `buildWeatherSection()` in `lib/claude.ts` (line ~145): already formats forecast days as a string. Needs `uvIndexMax` added to the per-day line.
- `DayForecast` in `lib/weather.ts` (line ~7): has `highF`, `lowF`, `precipProbability`, `uvIndexMax`, `windMaxMph` — all needed fields are already available.
- Gear is already grouped by category in `generatePackingList()` (the `gearByCategory` block) — clothing items are already present in the prompt. D-06 spotlight adds explicit cross-referencing on top of this.

### Established Patterns
- New helper function pattern: `buildFeedbackSection()` and `buildWeatherSection()` show how to extract prompt-building logic into named helpers. `buildClothingGuidance()` should follow the same pattern.
- Instruction numbering: packing prompt uses numbered instructions (1–8). New clothing instruction either replaces #4 or is inserted as a new numbered item.

### Integration Points
- `generatePackingList()` in `lib/claude.ts` is the only call site to update. Called from `app/api/packing-list/route.ts`.
- No UI changes required — the packing list output format is unchanged (same JSON schema). Claude just populates the `clothing` category with better-organized, condition-aware items.

</code_context>

<specifics>
## Specific Ideas

- The pre-computed clothing directive block should be named `CLOTHING GUIDANCE` in the prompt for clarity — similar to how `WEATHER FORECAST` and `GEAR HISTORY` are labeled.
- When all three conditions are absent (no rain, warm nights, low UV), the `CLOTHING GUIDANCE` block can be omitted entirely or reduced to: "No extreme conditions — pack comfortable layers for variable temps."

</specifics>

<deferred>
## Deferred Ideas

- Adding a `subcategory` field to the GearItem DB model (e.g., tagging rain jacket as `rain`, fleece as `insulation`) — deferred to a future gear enhancement phase if needed.
- Wind-aware clothing guidance (`windMaxMph >= 20` → suggest windbreaker) — not in success criteria, easy to add later.

</deferred>

---

*Phase: 28-weather-aware-clothing*
*Context gathered: 2026-04-03*
