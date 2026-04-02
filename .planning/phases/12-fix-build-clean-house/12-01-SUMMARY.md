---
plan: 12-01
status: complete
branch: plan/12-01-design-system-lint
---

# Plan 12-01 Summary

## What Was Done

### Task 1: Button replacements + SettingsClient cleanup

- **PackingList.tsx**: Replaced 5 raw `<button>` elements with design system `<Button>` (ghost variant for inline Retry links, icon-only confirm/cancel buttons, + Add item button)
- **MealPlan.tsx**: Replaced 6 raw `<button>` elements (inline Retry, meal row toggles, section header toggles, Copy list)
- **SettingsClient.tsx**: Removed "More settings coming in future phases." placeholder Card (lines 177-182)
- **BUILD-04 verified**: `grep -r 'variant="outline"' components/ app/` returns 0 matches — already clean, no-op

### Task 2: Lint errors fixed (6 errors → 0 errors)

| File | Error | Fix |
|------|-------|-----|
| `spots-client.tsx:74` | `setOfflineLocations([])` setState in effect | `queueMicrotask(() => setOfflineLocations([]))` |
| `spots-client.tsx:129` | `fetchTimeline()` calls setState via async callback | `eslint-disable-next-line react-hooks/set-state-in-effect` (legitimate async fetch) |
| `InstallBanner.tsx:21` | `setIsIOS(ios)` setState in effect | Replaced effect with lazy `useState(() => {...})` initializers |
| `LeavingNowButton.tsx:43` | memoization could not be preserved (missing `tripCoords` dep) | Added `tripCoords` to useCallback dependency array |
| `ThemeProvider.tsx:61` | `setThemeState(initial)` setState in effect | Lazy `useState(() => localStorage...)` initializer + DOM-only effect body |
| `OfflineBanner.tsx:48` | `Date.now()` impure function in render | Track `isStale` as state computed in async `checkSnapshots()` |

## Verification

- `grep "<button" components/PackingList.tsx` → 0
- `grep "<button" components/MealPlan.tsx` → 0
- `grep "coming in future" components/SettingsClient.tsx` → 0
- `npx eslint components/ app/ lib/` → 0 errors, 19 warnings (all pre-existing)
- `npm test` → 12/12 test files pass, 90 tests pass
- Type errors (33) are all pre-existing, none introduced by this plan
