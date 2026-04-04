---
phase: 41-camp-kit-presets
plan: 03
subsystem: ui
tags: [packing-list, kit-presets, claude-ai, react, gap-analysis]

# Dependency graph
requires:
  - phase: 41-01
    provides: lib/kit-utils.ts with buildReviewPrompt
  - phase: 41-02
    provides: appliedKits state + KitStackPanel in PackingList.tsx
provides:
  - app/api/kits/review/route.ts: POST endpoint calling Claude for gap analysis
  - components/PackingList.tsx: Ask Claude to review button + inline bullet result
affects: [components/PackingList.tsx, app/api/kits/review/route.ts]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Review route resolves gearIds to names before Claude prompt — keeps prompts human-readable (Pitfall 4)"
    - "max_tokens: 500 keeps gap analysis brief and cost-effective"
    - "React elements for bullet list — no dangerouslySetInnerHTML (security best practice)"
    - "Review state cleared on kit add/remove — stale results never displayed"

key-files:
  created:
    - app/api/kits/review/route.ts
  modified:
    - components/PackingList.tsx

key-decisions:
  - "Used location.type (not locationType) — field is named 'type' in Location model"
  - "Review button renders in BOTH empty-state and generated-list sections — consistent visibility regardless of packing list state"
  - "Safer React element bullet list chosen over dangerouslySetInnerHTML per plan recommendation"
  - "Review state (reviewResult + reviewError) cleared in handleRemoveKit and both onApplied callbacks"

patterns-established:
  - "Gap-analysis pattern: lightweight Claude call separate from full packing list generation — bypasses D-04 by default, opt-in review"

requirements-completed: [D-04]

# Metrics
duration: 4min
completed: 2026-04-04
---

# Phase 41 Plan 03: Camp Kit Presets — Claude Gap Analysis Review Summary

**Claude review route + amber ghost review button in PackingList with inline bullet-point gap analysis — optional AI safety net on top of manual kit presets**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-04T19:53:00Z
- **Completed:** 2026-04-04T19:57:00Z
- **Tasks:** 2
- **Files modified:** 2 (1 created, 1 modified)

## Accomplishments

- Created `app/api/kits/review/route.ts` — POST endpoint that resolves gearIds to names, builds prompt via `buildReviewPrompt`, calls Claude with max_tokens: 500, returns `{ review: string }`
- Updated `components/PackingList.tsx` — added `reviewResult`, `reviewing`, `reviewError` state; `handleReview` function; amber ghost "Ask Claude to review" button; inline bullet-list result container; cleared review state on kit add/remove

## Task Commits

1. **Task 1: Create Claude review API route** - `4015351`
2. **Task 2: Add Ask Claude to review button + inline result to PackingList** - `45e40b2`

## Files Created/Modified

- `app/api/kits/review/route.ts` — POST /api/kits/review: validates body, loads trip + gear names, builds gap-analysis prompt, returns Claude bullet text
- `components/PackingList.tsx` — Review state + handler + amber ghost button + bullet list result + state clearing on kit changes

## Decisions Made

- Location model uses `type` not `locationType` — corrected field reference discovered when reading schema
- Review button placed in both the empty-state section and the generated-list header so user always sees it regardless of whether a Claude-generated packing list exists
- React element bullet list (`<ul>/<li>`) preferred over `dangerouslySetInnerHTML` per plan instruction — eliminates any XSS surface even though Claude response is trusted
- Review state cleared in all three mutation paths: `handleRemoveKit`, empty-state `onApplied`, and generated-list `onApplied`

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed locationType field reference**
- **Found during:** Task 1
- **Issue:** Plan specified `trip.location?.locationType` but Location model field is named `type`
- **Fix:** Changed to `trip.location?.type ?? 'campsite'`
- **Files modified:** app/api/kits/review/route.ts
- **Commit:** 4015351

All other aspects executed exactly as written.

## Issues Encountered

None — build passed on first attempt for both tasks.

## User Setup Required

None — no external service configuration required. Uses existing `ANTHROPIC_API_KEY` env var.

## Known Stubs

None — all functionality is wired end-to-end.

---
## Self-Check: PASSED

- app/api/kits/review/route.ts: FOUND
- components/PackingList.tsx: FOUND
- 41-03-SUMMARY.md: FOUND
- Commit 4015351: FOUND
- Commit 45e40b2: FOUND

---
*Phase: 41-camp-kit-presets*
*Completed: 2026-04-04*
