# Phase 41: Camp Kit Presets / Loadout Templates — Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-04
**Phase:** 41-camp-kit-presets
**Areas discussed:** Preset Creation Flow, Picker Placement, Multi-Kit Stacking, Claude Integration

---

## Preset Creation Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Manual selection only | Pick gear items via checkbox in KitPresetsPanel (already built) | |
| Save-from-packing-list only | "Save as Kit" button after Claude generates a list | |
| Both | Manual build + save-from-list | ✓ |

**User's choice:** Both paths supported
**Notes:** Will wants full flexibility — build kits manually from gear inventory AND save a Claude-generated list as a template after a real trip.

---

## Picker Placement

| Option | Description | Selected |
|--------|-------------|----------|
| Packing list only (current) | Kit picker in PackingList.tsx on trip prep page | ✓ |
| Trip creation form | Preset picker in trip creation modal | |
| Both | Trip creation + packing list section | |

**User's choice:** Packing list only
**Notes:** Keep picker in trip prep / packing list context. Just improve its discoverability — it's currently buried behind a toggle.

---

## Multi-Kit Stacking

| Option | Description | Selected |
|--------|-------------|----------|
| Single kit only | Radio-style picker, one preset per trip | |
| Stackable — explicit multi-select | Checkboxes, applied-kits tracker with remove buttons | ✓ |
| Stackable — lightweight | Don't close picker after apply, allow repeat | |

**User's choice:** Explicit multi-select with applied kits list
**Notes:** Primary use case is "Weekend Warrior + Dog Trip" — two complementary presets stacked together.

---

## Claude Integration

| Option | Description | Selected |
|--------|-------------|----------|
| Bypass Claude entirely | Applying a kit creates items instantly, no AI | |
| Claude augments on top of preset | Apply kit first → optional "Ask Claude to review" for gap analysis | ✓ |
| Preset seeds Claude's prompt | Kit items injected as context into standard Generate flow | |

**User's choice:** Preset bypasses Claude by default; optional "Ask Claude to review" for trip-specific gap analysis
**Notes:** Presets give instant results. Claude is opt-in for intelligence layer. Review should flag MISSING items for this trip, not regenerate the full list.

---

## Claude's Discretion

- Visual treatment of the "Ask Claude to review" button
- Exact wording/format of Claude's gap-analysis response
- Whether applied-kits list shows item counts or just names
- Schema approach for remove logic (track which kit contributed which item, vs re-apply remaining kits)

## Deferred Ideas

- Picker in trip creation form — explicitly against scope
- "Preset seeds Claude's prompt" hybrid mode — future enhancement
- Buddy trip / split-kit mode — separate phase
