---
phase: 41-camp-kit-presets
plan: 02
subsystem: ui
tags: [packing-list, kit-presets, react, multi-select, unapply]

# Dependency graph
requires:
  - phase: 41-01
    provides: lib/kit-utils.ts with computeGearIdsToRemove
  - phase: existing
    provides: /api/kits endpoints, PackingItem model with usageStatus
provides:
  - app/api/kits/[id]/unapply/route.ts: safe kit removal endpoint preserving usageStatus feedback
  - components/KitStackPanel.tsx: slide-up multi-select kit picker with checkbox list
  - components/PackingList.tsx: applied-kits chip tracker with per-kit remove buttons
affects: [41-03, components/PackingList.tsx, components/KitStackPanel.tsx]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "KitStackPanel: slide-up modal with checkbox multi-select, amber accent, empty state, Apply Kits CTA"
    - "Applied kits chip tracker: Set-based dedup on onApplied, computeGearIdsToRemove for safe remove"
    - "Unapply route: idempotent deleteMany with usageStatus: null guard (Pitfall 5 protection)"

key-files:
  created:
    - app/api/kits/[id]/unapply/route.ts
    - components/KitStackPanel.tsx
  modified:
    - components/PackingList.tsx

key-decisions:
  - "KitStackPanel closes on backdrop click (onClick check e.target === e.currentTarget) — consistent with KitPresetsPanel pattern"
  - "onApplied callback deduplicates kits by ID using Set — prevents double-applying same kit"
  - "handleRemoveKit guards with gearIdsToRemove.length > 0 check — skips API call if nothing exclusive to remove"
  - "Applied kits chips rendered in BOTH empty state and generated list header for consistent visibility"
  - "Old showKitPicker state + kits + applyingKit + kitMessage fully removed — KitStackPanel manages its own state"

# Metrics
duration: 8min
completed: 2026-04-04
---

# Phase 41 Plan 02: Camp Kit Presets — Multi-Kit Stacking Workflow Summary

**KitStackPanel multi-select slide-up, unapply route with usageStatus guard, and applied-kits chip tracker replacing the old single-apply dropdown**

## Performance

- **Duration:** ~8 min
- **Started:** 2026-04-04T19:46:15Z
- **Completed:** 2026-04-04T19:54:00Z
- **Tasks:** 2
- **Files modified:** 3 (2 created, 1 modified)

## Accomplishments
- Created `app/api/kits/[id]/unapply/route.ts` — POST endpoint that deletes PackingItems exclusive to a kit, protected by `usageStatus: null` guard (preserves trip feedback per Pitfall 5)
- Created `components/KitStackPanel.tsx` — slide-up multi-select panel with checkbox list, amber accent checkboxes, item counts, "Will apply:" preview text, "Apply Kits" CTA, and "No kit presets yet" empty state
- Rewrote `components/PackingList.tsx` — replaced old `showKitPicker` dropdown with `KitStackPanel`, added `appliedKits` state array, `handleRemoveKit` using `computeGearIdsToRemove` for safe shared-item removal, and applied-kits chip tracker in both empty state and generated list header

## Task Commits

1. **Task 1: Create unapply API route + KitStackPanel component** - `5817b80`
2. **Task 2: Wire KitStackPanel into PackingList + add applied-kits chip tracker** - `8c528bc`

## Files Created/Modified
- `app/api/kits/[id]/unapply/route.ts` — POST endpoint, idempotent, only removes items with null usageStatus
- `components/KitStackPanel.tsx` — Multi-select slide-up with sequential kit apply, onApplied callback
- `components/PackingList.tsx` — KitStackPanel wired, chip tracker added, old dropdown fully removed

## Decisions Made
- KitStackPanel backdrop click closes panel by checking `e.target === e.currentTarget` — no extra wrapper needed
- `onApplied` deduplicates by kit ID using `Set<string>` — safe to call apply multiple times
- `handleRemoveKit` skips the API call entirely when `gearIdsToRemove.length === 0` — avoids unnecessary network requests when all gear is shared with remaining kits
- Applied kits chips appear in both the empty-state card and the generated list header — user always sees which kits are active regardless of generation state

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered
- Agent worktree (`worktree-agent-a52785ac`) diverged from `claude/focused-mayer` which contained Plan 01 work. Resolved by merging `claude/focused-mayer` with manual STATE.md conflict resolution before executing Plan 02 tasks.

## User Setup Required
None — no external service configuration required.

## Next Phase Readiness
- `KitStackPanel` and `appliedKits` chip tracker are complete and wired
- `unapply` route is ready for Plan 03 (Claude AI review flow) if it needs to unapply kits
- `lib/kit-utils.ts::buildReviewPrompt` is already available for Plan 03 to call
- No blockers for Plan 03

## Known Stubs
None — all functionality is wired end-to-end.

---
*Phase: 41-camp-kit-presets*
*Completed: 2026-04-04*
