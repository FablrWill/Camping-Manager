# Phase 12: Fix Build & Clean House - Research

**Researched:** 2026-04-02
**Domain:** Next.js production build, design system consistency, test coverage, cross-AI review
**Confidence:** HIGH

## Summary

Phase 12 is a tech debt cleanup phase with a Gemini cross-AI review attached. The primary goal is to get the production build clean, resolve known tech debt items, implement or remove test stubs, and run a full-codebase Gemini review for blind spots before moving to deployment.

**Current state (verified by running the actual commands):**
- `npm run build` — PASSES cleanly. No errors. BUILD-01/BUILD-02 are already done (`serverExternalPackages` is already configured in `next.config.ts`).
- `tsc --noEmit` — PASSES cleanly (0 errors).
- `npm test` — 90 tests pass, 7 `it.todo` remain (BUILD-08/BUILD-09).
- `npm run lint` — 6 errors, 19 warnings. Lint errors are React compiler rules (setState-in-effect, impure-function-in-render). Not mentioned in phase scope but D-10 says all four must pass.

The critical path assumption in the CONTEXT (BUILD-01/02 must complete first) is already satisfied. The phase can proceed directly to parallelizable tech debt fixes.

**Primary recommendation:** Run BUILD-03 through BUILD-10 as parallel agents. Run REVIEW-01/02 concurrently. BUILD-10 (ROADMAP.md sync) is a doc-only change. The lint errors (6 errors) are out-of-scope per the requirement IDs — none of BUILD-03 through BUILD-10 address them — but the planner should note that D-10 ("all four must pass") conflicts with the current lint state.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Fix native SQLite deps leaking into client bundles using `serverExternalPackages` in `next.config.ts`. Add `better-sqlite3` and `sqlite-vec` to the externals list. No dynamic import wrappers needed — keep it simple.
- **D-02:** BUILD-01/02 is the critical path blocker — must succeed before any tech debt or review work begins.
- **D-03:** Run BUILD-03 through BUILD-07 as parallel agents after BUILD-01/02 passes. All are independent 5-15 min fixes with no interdependencies.
- **D-04:** BUILD-08 through BUILD-10 can also run in parallel with BUILD-03-07.
- **D-05:** Implement all 6 `it.todo` test stubs with real tests. Ship with actual coverage, not placeholders.
- **D-06:** Remove the low-value `usageStatus` array test (BUILD-09) if it doesn't cover meaningful risk.
- **D-07:** Send full codebase (all app/, components/, lib/ files) with a structured review prompt asking for findings categorized by severity (critical/high/medium/low).
- **D-08:** Run the Gemini review concurrently with tech debt fixes (BUILD-03 through BUILD-10). The review reads existing code, not modified code — findings feed into Phase 13 regardless.
- **D-09:** Store the review report as `.planning/phases/12-fix-build-clean-house/GEMINI-REVIEW.md` with findings grouped by severity. Phase 13 reads this directly.
- **D-10:** After all fixes, run the full verification pipeline: `npm run build` + `npm run lint` + `tsc --noEmit` + `npm test`. All four must pass before the phase is considered complete.

### Claude's Discretion
- Settings placeholder (BUILD-05): Claude decides whether to replace with real content or remove entirely, based on what makes sense for the app's current state.
- Gemini review prompt structure: Claude designs the review prompt to maximize useful findings.

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| BUILD-01 | Production build (`npm run build`) completes without errors | **ALREADY DONE.** Build passes cleanly. `serverExternalPackages` already configured in `next.config.ts`. |
| BUILD-02 | Native SQLite deps (better-sqlite3, sqlite-vec) don't leak into client bundles | **ALREADY DONE.** `serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio']` is already in `next.config.ts`. |
| BUILD-03 | Raw `<button>` elements in PackingList/MealPlan replaced with design system Button | Raw `<button>` confirmed in `components/PackingList.tsx` (lines 198, 277, 390, 396, 407) and `components/MealPlan.tsx` (lines 161, 239, 265, 331, 354, 368). Also one in `PostTripReview.tsx` line 238 (STATUS_OPTIONS chip buttons). |
| BUILD-04 | `variant="outline"` fix in PostTripReview Retry button | No `variant="outline"` found in the codebase at all. `PostTripReview.tsx` line 274 uses `variant="secondary"` (valid). This requirement may already be satisfied or was fixed in a prior phase. |
| BUILD-05 | SettingsClient placeholder card replaced with actual content or removed | `components/SettingsClient.tsx` lines 177-182 contain a `<Card>` with "More settings coming in future phases." text. Claude's discretion: remove or replace. |
| BUILD-06 | SW SHELL_ASSETS updated with dynamic trip routes | `public/sw.js` line 3: `const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings']`. Missing: `/trips/[id]/depart` and `/trips/[id]/prep` dynamic routes. |
| BUILD-07 | `tripCoords` piped to LeavingNowButton for tile prefetch | `components/DepartureChecklistClient.tsx` uses `<LeavingNowButton>` without passing `tripCoords` (verified at line 260-265). The depart page `app/trips/[id]/depart/page.tsx` fetches trip but does not query location coords. |
| BUILD-08 | 6 `it.todo` test stubs implemented or removed | 7 `it.todo` items found: `tests/usage-tracking.test.ts` (5 todos at lines 36-39, 53) and `tests/trip-summary.test.ts` (2 todos at lines 90-91). |
| BUILD-09 | Low-value `usageStatus` array test rewritten or removed | `tests/usage-tracking.test.ts` lines 27-33: `it('validates usageStatus must be one of the allowed values')` — tests a hardcoded array in the test file, not the actual route logic. D-06 says remove if low risk. |
| BUILD-10 | ROADMAP.md consistency fixes (header + unchecked boxes) | `ROADMAP.md` in working tree still has v1.1 header ("Milestone v1.1 Close the Loop") and Phase 8 plan checkboxes as unchecked. The v1.2 ROADMAP (from commit 3d2ff09) is the correct version. |
| REVIEW-01 | Gemini receives full codebase with structured review prompt | Gemini CLI available via `npx gemini` (version 0.35.3). Pattern established in prior phases. |
| REVIEW-02 | Findings categorized by severity (critical/high/medium/low) | Output file: `.planning/phases/12-fix-build-clean-house/GEMINI-REVIEW.md`. Gemini prompt must request severity categorization. |
</phase_requirements>

## Standard Stack

### Core (already installed — verified)
| Library | Version | Purpose | Notes |
|---------|---------|---------|-------|
| Next.js | 16.2.1 | Framework | `serverExternalPackages` config key is correct for this version |
| Vitest | ^3.2.4 | Test runner | Already configured via `vitest.config.ts` |
| Zod | ^4.3.6 | Schema validation | `TripSummaryResultSchema` already exists in `lib/parse-claude` |
| @google/gemini-cli | 0.35.3 | Cross-AI review | Installed globally, invoked via `npx gemini` |

### Design System (already exists)
| Component | Location | Valid Variants |
|-----------|----------|----------------|
| Button | `components/ui/Button.tsx` | `primary`, `secondary`, `danger`, `ghost` |
| Card | `components/ui/Card.tsx` | No variants |
| Modal / ConfirmDialog | `components/ui/Modal.tsx` | — |

**Key finding on BUILD-04:** The Button component has NO `outline` variant. Valid variants: `primary | secondary | danger | ghost`. A search confirmed `variant="outline"` does NOT exist anywhere in the codebase. BUILD-04 is already satisfied or is a no-op.

## Architecture Patterns

### Service Worker SHELL_ASSETS (BUILD-06)

The service worker at `public/sw.js` caches a static list of shell routes. Dynamic routes like `/trips/[id]/depart` cannot be statically listed — they require a different caching strategy.

**Pattern options:**
1. **Add representative static paths:** Add placeholder entries like `/trips/example/depart` and `/trips/example/prep` to SHELL_ASSETS. These won't pre-cache real content but will cache the app shell for those URL shapes.
2. **Use runtime caching:** In the `fetch` event handler, intercept requests matching `/trips/*/depart` and `/trips/*/prep` patterns and serve from cache with network fallback.

**Recommended approach (LOW effort, consistent with existing sw.js pattern):** Add the static route stubs AND add a runtime cache rule. The sw.js is manually authored (not Serwist-generated), so direct edits are safe.

### tripCoords Pipe (BUILD-07)

`LeavingNowButton` accepts `tripCoords?: { lat: number; lon: number }`. The prop is already defined in the interface and consumed internally to call `cacheTripData(tripId, emergencyContact, callback, tripCoords)`.

**Gap:** The `depart/page.tsx` server component fetches trip but omits location coords from the Prisma query. Fix requires:
1. Add `location: { select: { latitude: true, longitude: true } }` to the Prisma `findUnique` in `app/trips/[id]/depart/page.tsx`
2. Pass `tripCoords={trip.location ? { lat: trip.location.latitude, lon: trip.location.longitude } : undefined}` to `DepartureChecklistClient`
3. Forward `tripCoords` prop through `DepartureChecklistClient` to `LeavingNowButton`

### Test Stub Implementation (BUILD-08)

The 7 `it.todo` items break down as:

**`tests/usage-tracking.test.ts` (5 todos):**
- `'updates PackingItem.usageStatus to "used"'` — PATCH route, mock `prisma.packingItem.update`, assert called with correct `{ data: { usageStatus: 'used' } }`
- `'updates PackingItem.usageStatus to "didn\'t need"'` — same pattern, different status value
- `'updates PackingItem.usageStatus to "forgot but needed"'` — same pattern
- `'returns 404 for non-existent tripId_gearId combo'` — mock `prisma.packingItem.update` to throw `PrismaClientKnownRequestError` with code `P2025`, expect 500 (or 404 if route handles it)
- `'response includes usageState map alongside packedState'` — GET /api/packing-list, this is an integration concern; the route mock is already set up

**`tests/trip-summary.test.ts` (2 todos):**
- `'returns existing summary if one exists (no duplicate generation)'` — POST /api/trips/[id]/feedback, mock `prisma.tripFeedback.findFirst` to return a record, assert `cached: true` in response
- `'returns 400 if not all packing items have usageStatus'` — POST /api/trips/[id]/feedback, mock trip with items where some `usageStatus` is null, expect 400

**Pattern established in `tests/voice-debrief.test.ts`:**
```typescript
vi.mock('@/lib/db', () => ({
  prisma: {
    packingItem: { update: vi.fn() },
  },
}))
// then in test:
const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
expect(res.status).toBe(200)
```

**For 404 test (Prisma error simulation):**
```typescript
import { Prisma } from '@prisma/client'
// mock to throw:
mockPackingItemUpdate.mockRejectedValue(
  new Prisma.PrismaClientKnownRequestError('Not found', { code: 'P2025', clientVersion: '6.0.0', meta: {} })
)
```

Note: The current PATCH handler catches all errors and returns 500, not 404. The test should expect 500 (matching actual behavior) or the route needs updating to distinguish 404.

### Gemini Review Pattern (REVIEW-01/02)

Prior phases used this flow:
1. Cat all relevant source files into a single prompt string
2. Append structured review instructions requesting severity categorization
3. Pipe to `npx gemini` with the `--yolo` flag (non-interactive mode)
4. Save output to the review file

**Prior prompt pattern (from phase 11):**
```
Review this codebase for [specific concerns].
Categorize findings as: CRITICAL / HIGH / MEDIUM / LOW.
For each finding: file path, line numbers, description, suggested fix.
```

**Scope for Phase 12 review:** Full codebase review (app/, components/, lib/) — not just the phase changes. This is a pre-deployment audit.

**Gemini CLI invocation:**
```bash
npx gemini -p "$(cat review-prompt.txt)" --yolo
```

Or pipe files directly into the prompt. The `--yolo` flag skips confirmation prompts.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Native module bundling exclusion | Custom webpack plugin | `serverExternalPackages` in `next.config.ts` | Already implemented and working |
| Test database | Real SQLite in tests | `vi.mock('@/lib/db')` with Vitest | Faster, no file I/O, established pattern |
| Button styling | Custom CSS button | Design system `Button` component | Consistency, dark mode support, correct disabled states |

## Common Pitfalls

### Pitfall 1: Replacing Raw Buttons That Need Complex className Logic
**What goes wrong:** `PackingList.tsx` and `MealPlan.tsx` raw buttons often have conditional classes (e.g., `isSelected ? selectedClass : baseClass`). Replacing with `<Button>` loses this flexibility.
**Why it happens:** The design system `Button` uses `className` prop for additions but has opinionated base styles.
**How to avoid:** Use the `className` prop to pass conditional classes to Button, or use the `ghost` variant as a base and add conditional classes. For STATUS_OPTIONS chips in `PostTripReview` (tiny pill buttons), using raw `<button>` with ARIA labels is acceptable — they're not the same UX pattern as a standard action button.
**Warning signs:** If button needs `isSelected` state styling that conflicts with Button variant styles.

### Pitfall 2: BUILD-01/BUILD-02 Already Done
**What goes wrong:** Agent wastes time adding `serverExternalPackages` that's already there.
**How to avoid:** Read `next.config.ts` first. It already has `serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio']`.

### Pitfall 3: BUILD-04 Variant="outline" Already Gone
**What goes wrong:** Agent searches for `variant="outline"` and spends time on a non-issue.
**How to avoid:** grep confirmed zero instances of `variant="outline"` in the codebase. Skip BUILD-04 or mark as already complete.

### Pitfall 4: Test for Prisma P2025 Returns 500 Not 404
**What goes wrong:** Writing a test that expects `404` when the route actually returns `500` for not-found Prisma errors.
**Why it happens:** The `usage/route.ts` PATCH handler has a generic `catch` that returns 500 for all errors, including record-not-found.
**How to avoid:** Either (a) test for 500 to match current behavior, or (b) update the route to detect P2025 and return 404, then test for 404. Option (b) is correct semantically.

### Pitfall 5: Gemini CLI Non-Interactive Mode
**What goes wrong:** `npx gemini` opens an interactive REPL instead of processing a prompt and exiting.
**How to avoid:** Use `npx gemini -p "your prompt here"` or pipe with `--yolo`. If the codebase is too large for a single prompt, send files in batches with a summary prompt.
**Warning signs:** Process hangs waiting for input.

### Pitfall 6: ROADMAP.md Working Tree vs. Git HEAD
**What goes wrong:** The ROADMAP.md in the working tree at `.planning/ROADMAP.md` is the v1.1 version, not the v1.2 version from git commit 3d2ff09. BUILD-10 requires updating it.
**How to avoid:** The correct v1.2 ROADMAP exists in git at commit 3d2ff09. `git show 3d2ff09:'.planning/ROADMAP.md'` returns the correct content. The working tree file must be replaced with the v1.2 version. This is a doc-only change.

### Pitfall 7: Lint Errors Not in Phase Scope
**What goes wrong:** D-10 says "all four must pass" (including `npm run lint`), but lint currently has 6 errors. None of BUILD-03 through BUILD-10 address these.
**Why it happens:** Lint errors are React compiler rules (`setState-in-effect`, `impure-function-in-render`) in `spots-client.tsx`, `InstallBanner.tsx`, `OfflineBanner.tsx`, `ThemeProvider.tsx`, and `LeavingNowButton.tsx`. These are pre-existing and not in scope.
**How to avoid:** Either (a) add lint fix to the plan as an additional task, or (b) acknowledge the lint errors are pre-existing and defer them, updating D-10 to exclude lint. Recommend noting this in the plan so the verification step isn't a surprise failure.

## Code Examples

### next.config.ts (already correct — BUILD-01/02 done)
```typescript
// Source: current next.config.ts
const nextConfig: NextConfig = {
  serverExternalPackages: ['better-sqlite3', 'sqlite-vec', 'voyageai', 'pdf-parse', 'cheerio'],
  // ...
}
```

### Button variant map (Design System)
```typescript
// Source: components/ui/Button.tsx
type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
// There is NO 'outline' variant.
```

### Test stub implementation pattern
```typescript
// Source: established pattern in tests/voice-debrief.test.ts
it('updates PackingItem.usageStatus to "used"', async () => {
  mockPackingItemUpdate.mockResolvedValue({ id: 'item-1', usageStatus: 'used' })
  const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
    method: 'PATCH',
    body: JSON.stringify({ gearId: 'gear-1', usageStatus: 'used' }),
    headers: { 'content-type': 'application/json' },
  })
  const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
  expect(res.status).toBe(200)
  expect(mockPackingItemUpdate).toHaveBeenCalledWith(
    expect.objectContaining({
      data: { usageStatus: 'used' },
    })
  )
})
```

### depart/page.tsx coords fix
```typescript
// In app/trips/[id]/depart/page.tsx — add location to Prisma query
const trip = await prisma.trip.findUnique({
  where: { id },
  select: {
    id: true,
    name: true,
    startDate: true,
    endDate: true,
    emergencyContactName: true,
    emergencyContactEmail: true,
    location: { select: { latitude: true, longitude: true } }, // ADD THIS
  },
})
// Then pass to component:
// tripCoords={trip.location ? { lat: trip.location.latitude, lon: trip.location.longitude } : undefined}
```

### sw.js SHELL_ASSETS fix
```javascript
// Current (missing dynamic trip routes):
const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings']

// Fixed (add dynamic trip route app shell paths):
const SHELL_ASSETS = ['/', '/gear', '/trips', '/spots', '/vehicle', '/settings', '/chat']
// Note: Dynamic routes like /trips/[id]/depart cannot be statically cached by URL.
// Add runtime caching in the fetch handler for /trips/*/depart and /trips/*/prep patterns.
```

## State of the Art

| Old Pattern | Current Pattern | When Changed | Impact |
|-------------|-----------------|--------------|--------|
| `experimental.serverComponentsExternalPackages` | `serverExternalPackages` | Next.js 14+ | Old key still works via compat shim but generates deprecation warning |
| Jest (testing) | Vitest | Phase 8 (08-00-PLAN) | Already migrated; Vitest is the current runner |
| `it.todo()` stubs | Implemented tests | Phase 12 | Build-08 requires 7 todos to become real tests |

## Open Questions

1. **Lint errors and D-10**
   - What we know: 6 lint errors exist (React compiler rules, not TypeScript errors). D-10 requires all four verification commands to pass. The phase scope (BUILD-03 to BUILD-10) does not address these errors.
   - What's unclear: Is fixing lint errors in scope for Phase 12, or should D-10 be updated to exclude lint?
   - Recommendation: The planner should add a "fix pre-existing lint errors" task OR note that the phase verification step will fail on lint until addressed. The 6 errors are in `spots-client.tsx`, `InstallBanner.tsx`, `OfflineBanner.tsx`, `ThemeProvider.tsx`, and `LeavingNowButton.tsx`. Most are `setState-in-effect` patterns — addressable by wrapping state updates in callbacks or using `useLayoutEffect`.

2. **BUILD-04 status**
   - What we know: `variant="outline"` doesn't exist in the codebase at all. `PostTripReview.tsx` uses `variant="secondary"` for the Retry button.
   - What's unclear: Was BUILD-04 already fixed in a prior phase, or was the requirement stated incorrectly?
   - Recommendation: Mark BUILD-04 as pre-complete in the plan. No work needed.

3. **STATUS_OPTIONS chip buttons in PostTripReview**
   - What we know: `PostTripReview.tsx` line 238 uses raw `<button>` inside a `.map()` for usage status selection chips ("Used", "Didn't need", "Forgot but needed"). These have custom `isSelected` styling that conflicts with the Button design system.
   - What's unclear: Does BUILD-03 intend to replace these chips with Button components?
   - Recommendation: These pill-style chips are intentionally different from action buttons. Leave as raw `<button>` with ARIA labels, or note explicitly in the plan. The BUILD-03 requirement targets PackingList/MealPlan specifically.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All npm commands | ✓ | v23.11.0 | — |
| npm | Build/test/lint | ✓ | 10.9.2 | — |
| @google/gemini-cli | REVIEW-01/02 | ✓ | 0.35.3 | — |
| Next.js | Build | ✓ | 16.2.1 | — |
| Vitest | Tests (BUILD-08/09) | ✓ | 3.2.4 | — |
| Prisma | DB (test mocks) | ✓ | 6.19.2 | — |
| Zod | Parse-claude schemas | ✓ | 4.3.6 | — |

**Invocation note:** Node.js is at `/opt/homebrew/Cellar/node/23.11.0/bin/node`. The `PATH` must include `/opt/homebrew/Cellar/node/23.11.0/bin` or `/opt/homebrew/bin` for npm/npx to work in bash. Shell sessions initialized from zsh profile should find this automatically.

**Missing dependencies with no fallback:** None.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` (no separate full suite) |
| Lint command | `npm run lint` |
| Type check | `npx tsc --noEmit` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| BUILD-01 | npm run build passes | smoke | `npm run build` | — (command) |
| BUILD-02 | No native deps in client bundle | smoke | `npm run build` (no bundle error) | — (command) |
| BUILD-03 | No raw `<button>` in PackingList/MealPlan | manual visual / code review | `grep "<button" components/PackingList.tsx` | code review |
| BUILD-04 | No `variant="outline"` in codebase | code review | `grep "variant=\"outline\""` (expects 0 results) | code review — already DONE |
| BUILD-05 | No placeholder card in SettingsClient | code review | `grep "coming in future"` (expects 0 results) | code review |
| BUILD-06 | SW SHELL_ASSETS includes trip routes | code review | `grep "SHELL_ASSETS" public/sw.js` | code review |
| BUILD-07 | tripCoords passed to LeavingNowButton | code review + test | grep + unit test | code review |
| BUILD-08 | 0 `it.todo` items remaining | unit | `npm test` (no `todo` in output) | ✅ (tests/usage-tracking.test.ts, tests/trip-summary.test.ts) |
| BUILD-09 | Low-value array test removed or rewritten | unit | `npm test` (suite passes) | ✅ (tests/usage-tracking.test.ts) |
| BUILD-10 | ROADMAP.md header + checkboxes fixed | doc review | `head -3 .planning/ROADMAP.md` shows v1.2 | ✅ (file exists, needs update) |
| REVIEW-01 | Gemini receives codebase + prompt | manual | `npx gemini -p "..."` | file to create |
| REVIEW-02 | Findings categorized by severity | doc review | exists + has sections | file to create |

### Sampling Rate
- **Per task commit:** `npm test` (90 tests, 2 seconds)
- **Per wave merge:** `npm run build && npm test && npx tsc --noEmit`
- **Phase gate:** Full suite green + build passes before `/gsd:verify-work`

### Wave 0 Gaps
None — existing test infrastructure covers all requirements. Vitest is already installed and configured. Test files already scaffolded with todos that need implementation.

## Sources

### Primary (HIGH confidence)
- Direct file reads — `next.config.ts`, `package.json`, `vitest.config.ts`, `components/ui/Button.tsx`, `public/sw.js`, all test files
- Live command execution — `npm run build`, `npm test`, `npm run lint`, `npx tsc --noEmit`
- Git history — confirmed v1.2 ROADMAP and REQUIREMENTS exist at commit 3d2ff09 and 96b9926

### Secondary (MEDIUM confidence)
- Phase 11 REVIEWS.md — Gemini CLI invocation pattern confirmed from prior review sessions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified via live builds and file reads
- Architecture: HIGH — all patterns are from existing codebase files, not external research
- Pitfalls: HIGH — discovered by actually running the verification pipeline
- BUILD-01/02 status: HIGH — build passes, config verified in next.config.ts
- BUILD-04 status: HIGH — grep confirms no `variant="outline"` anywhere

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable project, no external dependency drift expected)
