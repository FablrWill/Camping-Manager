---
phase: 30-gear-product-research
plan: "02"
subsystem: gear-ui
tags: [gear, research, ui, tabs, claude-ai]
dependency_graph:
  requires: ["30-01"]
  provides: ["GearResearchTab", "tab-switcher", "openResearchForItem"]
  affects: ["components/GearClient.tsx", "components/GearResearchTab.tsx"]
tech_stack:
  added: []
  patterns: ["client-component-with-fetch", "tab-switcher", "staleness-check"]
key_files:
  created:
    - components/GearResearchTab.tsx
  modified:
    - components/GearClient.tsx
decisions:
  - "GearResearchTab fetches on mount via GET; POST triggers research generation — matches Plan 01 API design"
  - "Tab state resets to 'documents' on modal open — avoids stale research tab from previous item"
  - "openResearchForItem handler added now for Plan 03 click-through — zero cost to add, avoids Plan 03 having to touch GearClient again"
metrics:
  duration: "~2 min"
  completed_date: "2026-04-04"
  tasks_completed: 2
  files_changed: 2
---

# Phase 30 Plan 02: GearResearchTab + Tab Switcher Summary

**One-liner:** Research tab UI component with verdict/alternatives/staleness display wired into gear modal via Documents/Research tab switcher.

## What Was Built

### Task 1: GearResearchTab component (443c35d)

Created `components/GearResearchTab.tsx` as a full client component with all required render states:

- **Loading:** Spinner text while initial GET resolves
- **No research:** Empty state with prominent Research button
- **Researching (no prior data):** Spinning icon with "Researching alternatives..." text
- **Results:** Verdict badge (3 color variants), summary paragraph, alternatives list (AlternativeCard sub-component with pros/cons/price/reason), price disclaimer, Re-research button
- **Stale results:** Yellow warning banner "Research is over 90 days old — results may be outdated" using AlertTriangle icon
- **Researching (with prior data):** Existing results dimmed (opacity-50) while re-research POST is in flight
- **Error:** Inline red error message (no alert())

Staleness check uses `STALE_DAYS = 90` constant and computes from `research.researchedAt`.

### Task 2: Tab switcher in GearClient (1ec2299)

Modified `components/GearClient.tsx`:

- Added `import GearResearchTab` and `useCallback` to imports
- Added `activeTab` state (`'documents' | 'research'`, default `'documents'`)
- `openEdit()` and `openAdd()` both reset `activeTab` to `'documents'`
- Added `openResearchForItem(itemId)` callback — finds item by ID, opens modal, sets `activeTab='research'`
- Replaced hard-coded `<h3>Documents</h3>` + GearDocumentsTab with proper tab switcher UI (amber underline active state, stone muted inactive)

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — GearResearchTab fetches live from the API endpoint created in Plan 01.

## Self-Check: PASSED
