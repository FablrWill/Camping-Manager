# Phase 28: Weather-Aware Clothing - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 28-weather-aware-clothing
**Areas discussed:** Clothing subcategories, Threshold approach, Owned clothing spotlight

---

## Clothing Subcategories

| Option | Description | Selected |
|--------|-------------|----------|
| Prompt-only grouping | Tell Claude to organize clothing into sub-sections in packing output. No schema changes. | ✓ |
| New gear DB subcategory field | Add 'subcategory' field to GearItem for rain/insulation/sun tags. Schema migration required. | |
| Prompt grouping + subcategory filter | Both: schema tag + prompt output grouping. | |

**User's choice:** Prompt-only grouping — no schema changes.

**Follow-up — Sub-section names:**

| Option | Description | Selected |
|--------|-------------|----------|
| Rain / Layers / Sun | Three weather-driven buckets matching success criteria. | ✓ |
| Base / Mid / Shell + Sun | Technical layering system — more granular. | |
| You decide | Let Claude pick sub-sections based on conditions. | |

**User's choice:** Rain / Layers / Sun — condition-driven, only include relevant sub-sections per trip.

---

## Threshold Approach

| Option | Description | Selected |
|--------|-------------|----------|
| Pre-computed guidance injected | Code pre-analyzes forecast and injects specific directives into prompt. Consistent, testable. | ✓ |
| Richer weather data, Claude interprets | Add UV index to weather section, let Claude determine clothing. Less code, more LLM judgment. | |
| Both: inject guidance + include UV | Fix UV data gap AND inject pre-computed directives. | |

**User's choice:** Pre-computed guidance injected. (Note: UV index gap will also be fixed as part of this work — it's an implicit requirement of the threshold approach.)

**Follow-up — Thresholds:**

| Option | Description | Selected |
|--------|-------------|----------|
| Standard camping thresholds | Rain ≥ 40%, Cold ≤ 50°F, UV ≥ 6 | ✓ |
| Stricter thresholds | Rain ≥ 60%, Cold ≤ 40°F, UV ≥ 8 | |
| Custom | User-specified numbers | |

**User's choice:** Standard thresholds — rain ≥ 40%, cold ≤ 50°F nights, UV ≥ 6.

---

## Owned Clothing Spotlight

| Option | Description | Selected |
|--------|-------------|----------|
| Highlight when conditions match | Cross-reference owned clothing items in the directive when threshold is met | ✓ |
| Already covered — no change | Gear is already in prompt by category; new directive handles it | |
| Pre-filter clothing-only block | Separate CLOTHING INVENTORY section in prompt | |

**User's choice:** Highlight when conditions match — condition-triggered cross-reference of owned clothing items in the CLOTHING GUIDANCE block.

---

## Claude's Discretion

- Exact wording of directive lines in CLOTHING GUIDANCE block
- Edge case handling when no clothing items in inventory match a triggered condition
- Whether to merge with existing instruction #4 or present as separate named block

## Deferred Ideas

- Gear DB subcategory field (rain/insulation/sun tags on GearItem) — possible future phase
- Wind-aware clothing guidance (windbreaker when windMaxMph ≥ 20) — not in success criteria
