# Session 49 — 2026-04-04

## Phase 41: Camp Kit Presets

### What shipped

- **`lib/kit-utils.ts`** — Pure logic module: `extractGearIdsFromPackingList`, `computeGearIdsToRemove`, `buildReviewPrompt`. 9 unit tests, all passing.
- **`app/api/kits/[id]/unapply/route.ts`** — Safe kit removal endpoint. Only deletes packing items with `usageStatus: null` — preserves items with trip feedback (Pitfall 5).
- **`app/api/kits/review/route.ts`** — Claude Sonnet gap-analysis endpoint. Resolves gearIds to human-readable names before calling Claude (no raw IDs in prompt). 500 max_tokens — lightweight, not a full regeneration.
- **`components/KitStackPanel.tsx`** — Slide-up multi-select kit picker. Checkbox list with amber accent, item counts, "Will apply:" preview, "Apply Kits" CTA, "No kit presets yet" empty state.
- **`components/PackingList.tsx`** — Multiple updates:
  - "Save as kit preset" link below generated lists → inline name input + Save button
  - "Use Kit Presets" button in both empty and generated states (replaces hidden "Apply Kit" toggle)
  - Applied-kit chip tracker ("Applied: Weekend Warrior ×") with per-kit remove buttons
  - "Ask Claude to review" amber ghost button — appears only after kits applied, shows gap bullets in amber container
  - Review state clears when kits are added or removed

### Human UAT pending

Three flows need live browser testing:
1. Apply kit preset → verify packing items created + chips appear
2. Remove one of two overlapping kits → shared items stay, exclusive items removed
3. Ask Claude to review → 3-6 gap-focused bullets, no raw IDs
