---
phase: 23-gear-category-expansion
plan: 02
subsystem: gear-categories
tags: [refactor, categories, shared-module, power-budget, agent-tools]
dependency_graph:
  requires: [23-01]
  provides: [GEAR-CAT-07]
  affects: [components/DashboardClient.tsx, lib/claude.ts, lib/power.ts, lib/agent/tools/gear.ts, lib/agent/tools/listGear.ts]
tech_stack:
  added: []
  patterns: [shared-module-import, dynamic-template-literal]
key_files:
  created: []
  modified:
    - components/DashboardClient.tsx
    - lib/claude.ts
    - lib/power.ts
    - lib/agent/tools/gear.ts
    - lib/agent/tools/listGear.ts
decisions:
  - power.ts exclusion list uses CATEGORIES.filter() to derive non-electrical set dynamically instead of hardcoded array
  - claude.ts packing prompt uses CATEGORIES.map(c => c.value).join(', ') so prompt stays current as categories change
  - agent tool category descriptions use template literals with CATEGORIES.map() for dynamic listing
metrics:
  duration: ~5 min
  completed: 2026-04-03T06:06:48Z
  tasks_completed: 2
  files_modified: 5
---

# Phase 23 Plan 02: Consumer Category Deduplication Summary

**One-liner:** Replaced 5 local category constant duplicates with imports from lib/gear-categories.ts, updated power exclusion list for 15 categories, and wired agent tool descriptions to dynamic category list.

## Tasks Completed

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Replace category constants in DashboardClient, claude.ts, power.ts | 305f33b | components/DashboardClient.tsx, lib/claude.ts, lib/power.ts |
| 2 | Update agent tool descriptions for 15 categories | 014dae6 | lib/agent/tools/gear.ts, lib/agent/tools/listGear.ts |

## Changes by File

### components/DashboardClient.tsx
- Added `import { getCategoryEmoji } from '@/lib/gear-categories'`
- Removed local `const CATEGORY_EMOJI: Record<string, string>` (7-entry map)
- Replaced `CATEGORY_EMOJI[item.category] ?? '📦'` with `getCategoryEmoji(item.category)` (shared function already handles the fallback)

### lib/claude.ts
- Added `import { CATEGORY_EMOJI, CATEGORIES } from '@/lib/gear-categories'`
- Removed local `const CATEGORY_EMOJIS` (11-entry map including stale `hygiene` and `misc` entries)
- Updated packing prompt instruction #6 to use `${CATEGORIES.map((c) => c.value).join(', ')}` — lists all 15 categories dynamically
- Updated JSON rules comment to use same dynamic string
- Replaced `CATEGORY_EMOJIS[cat.name]` with `CATEGORY_EMOJI[cat.name]` in result mapping

### lib/power.ts
- Added `import { CATEGORIES } from '@/lib/gear-categories'`
- Removed stale `'hygiene'` from exclusion list (not in 15-category set)
- Updated exclusion filter to use `CATEGORIES.filter(c => !electricalCategories.includes(c.value))` — electrical categories: tools, power, electronics, vehicle, lighting
- Added `electronics: { watts: 5, hoursPerDay: 4 }` and `lighting: { watts: 10, hoursPerDay: 6 }` to CATEGORY_FALLBACK

### lib/agent/tools/gear.ts
- Added `import { CATEGORIES } from '@/lib/gear-categories'`
- Replaced hardcoded `'shelter, sleep, cook, power, clothing, tools, vehicle, hygiene, safety, misc'` category list in tool description with template literal `${CATEGORIES.map((c) => c.value).join(', ')}`

### lib/agent/tools/listGear.ts
- Added `import { CATEGORIES } from '@/lib/gear-categories'`
- Replaced hardcoded category list with same dynamic template literal pattern

## Verification Results

- `grep -rn "const CATEGORY_EMOJI|const CATEGORY_EMOJIS|const CATEGORIES" components/ lib/` returns zero results outside gear-categories.ts
- `npx tsc --noEmit` — one pre-existing error in `lib/__tests__/bulk-import.test.ts` (Buffer type mismatch, unrelated to this plan)
- `npm run build` — passes clean
- `npm run lint` — no new warnings introduced by this plan's changes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical Functionality] Used CATEGORIES dynamically in power.ts exclusion list**
- **Found during:** Task 1
- **Issue:** Plan said to add `import { CATEGORIES }` but provided a hardcoded replacement exclusion array, which would leave the import unused and trigger an ESLint `no-unused-vars` warning
- **Fix:** Updated exclusion filter to use `CATEGORIES.filter(...)` dynamically — electrically-consuming categories (tools, power, electronics, vehicle, lighting) remain; all others excluded
- **Files modified:** lib/power.ts
- **Commit:** 305f33b

## Known Stubs

None — all category references are wired to the shared module.

## Self-Check: PASSED

- components/DashboardClient.tsx: FOUND (import getCategoryEmoji from gear-categories)
- lib/claude.ts: FOUND (import CATEGORY_EMOJI, CATEGORIES from gear-categories)
- lib/power.ts: FOUND (import CATEGORIES from gear-categories, used in exclusion filter)
- lib/agent/tools/gear.ts: FOUND (import CATEGORIES, dynamic description)
- lib/agent/tools/listGear.ts: FOUND (import CATEGORIES, dynamic description)
- Commits 305f33b and 014dae6: FOUND in git log
