# Phase 29: Vehicle Pre-Trip Checklist - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 29-vehicle-pre-trip-checklist
**Areas discussed:** Terrain Detection, Checklist Generation, Placement in Trip Prep, State Persistence

---

## Terrain Detection

| Option | Description | Selected |
|--------|-------------|----------|
| Default to highway | Show standard highway checklist as fallback; off-road items appear when roadCondition signals it | |
| Show full list | Always show all items regardless of terrain — no inference needed | ✓ |
| Manual terrain selector | Dropdown/toggle: Highway / Dirt Road / Off-Road; user picks explicitly | |

**User's choice:** Show full list always
**Notes:** Simplicity preferred. No filtering, no terrain tags. Flat list regardless of whether location/roadCondition is set.

Second question — terrain tagging when roadCondition IS set:

| Option | Description | Selected |
|--------|-------------|----------|
| Flat list, no distinction | All items shown equally | ✓ |
| Tag terrain-relevant items | Small tag (e.g., '4WD') on relevant items | |
| You decide | Claude picks at implementation | |

**User's choice:** Flat list, no distinction

---

## Checklist Generation

| Option | Description | Selected |
|--------|-------------|----------|
| Static template | Hardcoded list; fast, works offline, no AI cost | |
| AI-generated (Claude) | Claude generates from vehicle type + trip context | ✓ |
| Static base + AI extras | Core items always shown, Claude adds extras | |

**User's choice:** AI-generated (Claude)

Context inputs question (multi-select):

| Option | Description | Selected |
|--------|-------------|----------|
| Vehicle specs | Year, make, model, drivetrain, ground clearance | ✓ |
| Trip context | Trip length, destination, roadCondition, clearanceNeeded | ✓ |
| Vehicle mods | Installed mods (lift kit, skid plates, etc.) | |
| Season / weather | Weather data for weather-specific checks | |

**User's choice:** Vehicle specs + Trip context only

---

## Placement in Trip Prep

| Option | Description | Selected |
|--------|-------------|----------|
| New section, after Departure | 6th PREP_SECTION; clean separation from existing sections | ✓ |
| New section, before Packing | Insert earlier: Weather → Vehicle Check → Packing → ... | |
| Inside Departure section | Fold into existing Departure Checklist | |

**User's choice:** New section after Departure

Inline specs question:

| Option | Description | Selected |
|--------|-------------|----------|
| Just the checklist items | Action-focused, no vehicle specs shown inline | ✓ |
| Show relevant specs | Drivetrain and ground clearance as context above list | |
| You decide | Claude picks based on available vehicle data | |

**User's choice:** Just checklist items (no inline specs)

---

## State Persistence

| Option | Description | Selected |
|--------|-------------|----------|
| JSON blob on Trip | vehicleChecklistResult + vehicleChecklistGeneratedAt on Trip model | ✓ |
| New DB model per item | VehicleCheckItem model with tripId, text, checked, checkedAt | |
| Session-only | React state only; resets on page reload | |

**User's choice:** JSON blob on Trip (consistent with packingListResult pattern)

Regeneration question:

| Option | Description | Selected |
|--------|-------------|----------|
| Generate once, persist with Regenerate | Same as Meal Plan / Packing List pattern | ✓ |
| Always regenerate | Fresh Claude call every open | |
| You decide | Claude picks caching approach | |

**User's choice:** Generate once, persist, with Regenerate button

---

## Claude's Discretion

- Exact checklist items, categories, and wording within the list
- How to handle a trip with no vehicle assigned
- Whether to include per-item notes field
- Offline behavior / caching in trip snapshot

## Deferred Ideas

- Vehicle mods in generation context — noted but out of scope for Phase 29
- Weather-aware checklist items — deferred
- Terrain tagging / filtered views — user chose flat list; enhancement path exists if list grows long
