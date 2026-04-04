# Phase 41: Camp Kit Presets / Loadout Templates — Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Upgrade the existing kit preset system from a basic gear-picker utility into a complete loadout workflow: add save-from-packing-list template creation, explicit multi-kit stacking with applied kit tracking, and an optional Claude review step that flags trip-specific gaps on top of a preset base. Does NOT move the picker to trip creation — packing list section only.

</domain>

<decisions>
## Implementation Decisions

### D-01: Preset Creation Flow
- **Both paths supported**: manual gear-item selection (already exists in `KitPresetsPanel.tsx`) AND saving a Claude-generated packing list as a template.
- "Save as Kit" button appears after a packing list is generated, capturing gear-linked items from the result as a new `KitPreset`.
- Manual creation remains available from the Gear page via `KitPresetsPanel`.

### D-02: Picker Placement
- **Packing list section only** — no change to trip creation form.
- The kit picker stays in `PackingList.tsx` (trip prep page). Improve its discoverability (currently buried behind a toggle button); surface it more prominently as a first-class option alongside "Generate with Claude."

### D-03: Multi-Kit Stacking
- **Explicit multi-select** — the picker shows all kits as checkboxes, not a single radio select.
- Applied kits are tracked visually: show a list of "Applied: Weekend Warrior, Dog Trip" with a remove (✕) button per kit.
- Removing an applied kit removes the items it contributed (where those items weren't already packed by another kit or manually).
- Dedup logic already exists in `/api/kits/[id]/apply` — the remove logic is the inverse.

### D-04: Claude Integration
- **Presets bypass Claude by default** — applying a kit gives instant packing items with no AI latency.
- After applying one or more presets, an **"Ask Claude to review"** button appears.
- Claude's review prompt includes the applied kit items as context and flags trip-specific gaps (weather, elevation, dog, location type) that the preset doesn't cover.
- This is a separate, optional second step — not merged into the "Generate" flow.

### Claude's Discretion
- Visual treatment of the "Ask Claude to review" button (amber secondary style or ghost variant)
- Exact wording of Claude's review response (gap-focused, not a full regeneration)
- Whether the applied-kits list shows item counts or just names
- Schema for tracking which preset contributed which packing item (if needed for remove logic — may just clear all kit-sourced items and re-apply remaining kits)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Kit Infrastructure
- `prisma/schema.prisma` — `KitPreset` model (id, name, description, gearIds JSON array)
- `app/api/kits/route.ts` — GET (list) and POST (create) kit presets
- `app/api/kits/[id]/route.ts` — GET, PUT, DELETE single kit
- `app/api/kits/[id]/apply/route.ts` — POST: creates PackingItems from kit gearIds, deduped

### Existing UI
- `components/KitPresetsPanel.tsx` — slide-up modal with full gear picker; opens from Gear page
- `components/PackingList.tsx` — has `showKitPicker` state + kit picker dropdown (currently single-apply)

### Packing List Context
- `components/PackingList.tsx` — full packing list component; kit picker lives here
- `app/api/packing-list/route.ts` — GET saves result; POST generates with Claude
- `lib/claude.ts` — `generatePackingList()` function and `PackingListResult` type

### Prior Phase Decisions
- `prisma/schema.prisma` — `PackingItem` model (tripId, gearId, packed) used by apply route
- Phase 17 feedback data stored on `PackingItem` (feedback scores) — don't break this

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `KitPresetsPanel.tsx`: Full create/edit/delete UI — reuse the gear picker component or pattern for the multi-select kit picker
- `/api/kits/[id]/apply`: Dedup logic already correct — extend for remove (inverse) operation
- `PackingList.tsx` `showKitPicker` state: Already wired; replace single-apply dropdown with multi-select panel

### Established Patterns
- Modal/sheet pattern: slide-up with `fixed inset-0 bg-black/50` backdrop, amber header, stone body
- Amber `accent-amber-600` checkboxes for multi-select (matches gear picker in KitPresetsPanel)
- Success messages: `text-emerald-600` inline below the action

### Integration Points
- `PackingList.tsx`: Replace `showKitPicker` dropdown with a proper multi-select panel; add "Ask Claude to review" button that appears after kits are applied
- `PackingList.tsx` "Generate with Claude" section: Add "Save as Kit" button after `packingList` is set
- `/api/kits` (POST): No schema change needed — `gearIds` JSON array already handles any number of items
- New API needed: `DELETE /api/kits/[id]/unapply` (or `POST /api/kits/[id]/unapply`) to remove kit items from trip

</code_context>

<specifics>
## Specific Ideas

- Kit stacking examples Will has in mind: "Weekend Warrior + Dog Trip" as the primary use case
- The "Ask Claude to review" output should be gap-focused, not a full list regeneration — Claude should say what's MISSING from the kit for this specific trip, not redo the whole packing list
- Applied kits tracker should show below the kit picker: "Applied: Weekend Warrior ✕, Dog Trip ✕"

</specifics>

<deferred>
## Deferred Ideas

- Moving the kit picker to trip creation form — explicitly decided against (D-02); reconsider in a future polish phase if the trip creation form gets a full redesign
- "Preset seeds Claude's prompt" integration mode (Option 3 from discussion) — interesting but more complex; keep as a future enhancement to Phase 41 or a separate v5.0 item
- Buddy trip mode / split-kit-between-vehicles — separate phase concept

</deferred>

---

*Phase: 41-camp-kit-presets*
*Context gathered: 2026-04-04*
