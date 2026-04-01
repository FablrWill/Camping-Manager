# Phase 6: Stabilization - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 06-stabilization
**Areas discussed:** AI output persistence, Design system migration, Schema foundations, Error resilience

---

## AI Output Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| On generation | Save immediately when Claude returns a valid response | ✓ |
| On explicit save | Show results first, user taps Save to persist | |
| You decide | Claude picks based on existing patterns | |

**User's choice:** On generation (Recommended)
**Notes:** Simpler, no extra save step, no risk of losing results on navigation.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Show saved result with regenerate option | Display persisted list with Regenerate button | ✓ |
| Always regenerate fresh | Hit Claude API every time | |
| You decide | Claude picks the right UX | |

**User's choice:** Show saved result with regenerate option
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Replace | One packing list per trip, regenerate overwrites | ✓ |
| Keep history | Store each generation with timestamp | |
| You decide | Claude picks based on complexity vs value | |

**User's choice:** Replace (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, same pattern | Meal plans persist like packing lists | ✓ |
| Different approach for meals | Different needs may warrant different model | |

**User's choice:** Yes, same pattern (Recommended)
**Notes:** Consistent behavior across all AI outputs.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Reset on regenerate | New list = clean slate | ✓ |
| Preserve where possible | Match items by gearId, carry forward check state | |
| You decide | Claude picks pragmatic approach | |

**User's choice:** Reset on regenerate (Recommended)
**Notes:** None

---

## Design System Migration

| Option | Description | Selected |
|--------|-------------|----------|
| All at once in this phase | One sweep, done. No visual drift. | ✓ |
| Incremental per-page | Migrate one page at a time | |
| You decide | Claude picks migration strategy | |

**User's choice:** All at once in this phase (Recommended)
**Notes:** Phase 6 is stabilization — the right time.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Adopt existing only | Use Button, Input, Card, Modal etc. as-is | ✓ |
| Add new primitives as needed | Build Select, Textarea, Toggle etc. | |
| You decide | Claude assesses what's needed | |

**User's choice:** Adopt existing only (Recommended)
**Notes:** Keep scope tight.

---

## Schema Foundations

| Option | Description | Selected |
|--------|-------------|----------|
| Three states: used / didn't need / forgot | Maps to LEARN-01 | ✓ |
| Two states: used / not used | Simpler but loses forgot signal | |
| You decide | Claude designs usage tracking | |

**User's choice:** Three states (Recommended)
**Notes:** "Forgot but needed" is the most valuable learning signal.

---

| Option | Description | Selected |
|--------|-------------|----------|
| One record per trip with structured JSON | Append-only, one row per trip | ✓ |
| Multiple records per trip | One per debrief session | |
| You decide | Claude designs the model | |

**User's choice:** One record per trip (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Yes, add MealPlan model | Same migration as other schema changes | ✓ |
| Store meal plans as JSON on Trip | Add mealPlanData column to Trip | |
| You decide | Claude picks storage approach | |

**User's choice:** Yes, add MealPlan model (Recommended)
**Notes:** Parallels packing list persistence.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Add cachedAt timestamp | Minimal addition now, huge payoff for Phase 8 | ✓ |
| Handle offline entirely in Phase 8 | Keep Phase 6 focused | |
| You decide | Claude assesses what's worth adding now | |

**User's choice:** Add cachedAt timestamp (Recommended)
**Notes:** User specifically requested offline-aware schema design.

---

## Error Resilience

| Option | Description | Selected |
|--------|-------------|----------|
| Inline error + retry button | Friendly error where result would appear | ✓ |
| Toast notification + auto-retry | Brief toast, automatic retry | |
| You decide | Claude designs error UX | |

**User's choice:** Inline error + retry button (Recommended)
**Notes:** None

---

| Option | Description | Selected |
|--------|-------------|----------|
| Validate structure, coerce types | Check required fields, coerce types, pragmatic | ✓ |
| Strict schema match | Exact fields, exact types, no extras | |
| You decide | Claude designs validation approach | |

**User's choice:** Validate structure, coerce types (Recommended)
**Notes:** None

---

## Claude's Discretion

- Migration order for form pages
- MealPlan model field names and JSON structure
- Exact Zod schemas for AI responses
- PackingItem usage field type (enum vs string)
- TripFeedback JSON insights schema structure
- Which models get cachedAt field
- Loading state UX during AI regeneration

## Deferred Ideas

- **Home Assistant integration** — User wants real-time camp data from HA (power, cell signal, phone location, temps). v2.0+ feature, blocked on hardware. Noted for TripFeedback schema extensibility.
