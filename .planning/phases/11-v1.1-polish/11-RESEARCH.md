# Phase 11: v1.1 Polish - Research

**Researched:** 2026-04-02
**Domain:** React component guard, Vitest integration testing, planning doc consistency
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Wrap VoiceDebriefButton rendering in TripCard.tsx with `{isPast && ...}` — follows same pattern as PostTripReview (line 216). `isPast` already computed at line 70.
- **D-02:** Rewrite the circular gearId validation test as a real API integration test. Hit `PATCH /api/trips/[id]/usage` with a body missing `gearId`, assert 400 response. This tests actual route validation, not test fixtures.
- **D-03:** Keep the existing `it.todo` stubs as-is — they mark where future comprehensive API tests belong but are out of scope for this phase.
- **D-04:** Full consistency pass across REQUIREMENTS.md, ROADMAP.md, STATE.md, and PROJECT.md — not just the 3 audit-flagged items. Fix every stale marker, outdated status, and incorrect completion date.
- **D-05:** Update PROJECT.md with final v1.1 state to set up clean handoff for future milestones.

### Claude's Discretion

- Test DB setup approach for the API integration test (in-memory SQLite, test fixtures, etc.)
- Order of operations for doc updates (which file first)

### Deferred Ideas (OUT OF SCOPE)

- Full project review with Gemini after v1.1 Polish is complete — Will wants external AI perspective on the project as a whole
- Comprehensive API test suite for all usage-tracking endpoints (the it.todo stubs) — belongs in a dedicated testing phase
</user_constraints>

---

## Summary

Phase 11 is a focused tech debt closure. Three isolated changes are required: a one-line component guard in TripCard.tsx, a rewrite of one logically circular Vitest test, and a consistency pass across four planning docs.

The VoiceDebriefButton fix is trivially small — the `isPast` variable is already computed at line 70 of TripCard.tsx and the identical guard pattern (`{isPast && isSelected && ...}`) is used at line 216 for PostTripReview. The new VoiceDebriefButton guard will be `{isPast && ...}` (no `isSelected` requirement, so it shows whenever the trip is past and the card is expanded at minimum — but the current render is unconditional, so the guard needs to be added to the existing `<div>` wrapper at lines 173-181).

The circular test at `tests/usage-tracking.test.ts` line 5-8 tests `'gearId' in body` where `body` is a local fixture object. It never calls the API. The fix is an API integration test that calls the actual Next.js route handler with a missing `gearId` and asserts a 400 response.

The doc consistency pass has four targets with specific known issues identified in the audit. All issues are documentation-only — no code changes required.

**Primary recommendation:** Implement in three discrete tasks — component guard, test rewrite, doc pass — in that order (code before docs).

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Vitest | (in package.json) | Test runner | Already used throughout project |
| next/server | bundled with Next.js 16 | Route handler types | Already used in the route under test |

**No new dependencies required for any of the three changes.**

## Architecture Patterns

### VoiceDebriefButton Guard Pattern

The existing code at TripCard.tsx lines 173-181:

```tsx
{/* Voice debrief button */}
<div className="mt-2 flex items-center" onClick={(e) => e.stopPropagation()}>
  <VoiceDebriefButton
    tripId={trip.id}
    tripName={trip.name}
    locationId={trip.location?.id ?? null}
    onOpen={() => onDebrief({ id: trip.id, name: trip.name, locationId: trip.location?.id ?? null })}
  />
</div>
```

The guard pattern used at line 216 for PostTripReview:

```tsx
{isPast && isSelected && (
  <div className="mt-3 border-t ...">
    <PostTripReview tripId={trip.id} />
  </div>
)}
```

**Fix:** Wrap the VoiceDebriefButton `<div>` in `{isPast && (...)}`. The `isSelected` condition is NOT required here — VoiceDebriefButton should show on any expanded past trip, not only when the card is selected. (The current render has no `isSelected` constraint either.)

Exact change: add `{isPast && (` before line 174's `<div>`, close with `)}` after line 181's `</div>`.

### Vitest API Integration Test Pattern

The route handler at `app/api/trips/[id]/usage/route.ts` uses Next.js route handler signature with `NextRequest` and `params: Promise<{ id: string }>`. Testing it requires calling the exported `PATCH` function directly.

The project's Vitest config uses `environment: 'jsdom'`. For API route tests that use Prisma, three approaches exist:

**Option A — Mock Prisma (recommended for this phase):**
```typescript
// tests/usage-tracking.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/trips/[id]/usage/route'

// Mock Prisma to avoid DB dependency
vi.mock('@/lib/db', () => ({
  prisma: {
    packingItem: {
      update: vi.fn(),
    },
  },
}))

describe('Usage Tracking (LEARN-01)', () => {
  describe('PATCH /api/trips/[id]/usage', () => {
    it('returns 400 when gearId is missing', async () => {
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const params = Promise.resolve({ id: 'trip-1' })
      const res = await PATCH(req, { params })
      expect(res.status).toBe(400)
      const body = await res.json()
      expect(body.error).toBe('gearId is required')
    })
    // ...
  })
})
```

**Option B — In-memory SQLite:**
More complex setup (requires a test database and migrations). Out of scope for one test rewrite.

**Option C — Fetch against a running dev server:**
Requires `npm run dev` to be running. Brittle in CI, not appropriate for unit-level tests.

**Recommendation (Claude's discretion — D-02):** Use Option A (mock Prisma). This is the standard pattern for testing Next.js route handlers with Vitest when the goal is to verify request validation logic, not database operations. The test validates the 400 response for missing `gearId` without needing a real DB.

The `vi.mock` must target `@/lib/db` because that is what the route imports.

### Documentation Consistency Pass

**Exact issues found in audit (ROADMAP.md, REQUIREMENTS.md, STATE.md, PROJECT.md):**

**REQUIREMENTS.md:**
- Line 35: `- [ ] **LEARN-03**` should be `- [x] **LEARN-03**` (voice debrief is complete — audit confirms "09-VERIFICATION: passed")
- Traceability table row for LEARN-03 shows `Pending` — update to `Complete`
- Last updated date should be updated

**ROADMAP.md:**
- Phase 6 row in progress table: `Completed` date is missing (shows `-`) — Phase 6 completed 2026-04-01 (same day as Phase 7 per audit)
- Phase 9 shows `Status: Executing` in the prose but all 4 plans are `[x]` — update status to `Complete` with completion date 2026-04-02
- Phase 11 plans count shows `0/TBD` — will need to update after planning, but can at minimum change `Not started` to `In Progress` or leave for execution
- Execution order section says "Phases execute in numeric order: 6 → 7 → 8 → 9" — should include 10 and 11

**STATE.md:**
- `stopped_at` in YAML frontmatter shows `Completed 10-04-PLAN.md — Phase 8 documentation closure` — accurate as of last session, but will need update after Phase 11 completes
- `progress.completed_phases` shows 8 but Phase 10 is complete — should be at least 10
- `progress.percent` shows 60% — with 10/11 phases done it should be ~91% (10 of 11)
- `status: executing` should remain (phase 11 is in progress)
- `Current focus` says "Phase 10 — offline-read-path" — update to "Phase 11 — v1.1 Polish"

**PROJECT.md:**
- "Active" section has `[ ]` checkboxes for features all completed in v1.1 phases — these should be updated to `✓` and moved to "Validated"
- "v1.1 Close the Loop" milestone description says active but all phases are complete through 10
- D-05: needs a final v1.1 state section added

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Mocking Prisma in tests | Custom test DB wrapper | `vi.mock('@/lib/db', ...)` | Vitest built-in; already pattern used in project |
| Constructing HTTP-like requests for route tests | Custom request builder | `new NextRequest(url, options)` | Next.js exports `NextRequest` for exactly this purpose |

## Common Pitfalls

### Pitfall 1: VoiceDebriefButton wrapper div
**What goes wrong:** Conditionally rendering the inner `<VoiceDebriefButton>` while leaving the outer `<div className="mt-2 flex items-center">` unconditional results in an empty div taking up space for non-past trips.
**Why it happens:** Forgetting to wrap the entire element including the container div.
**How to avoid:** The `{isPast && (...)}` wrapper must enclose the entire `<div>` block at line 174, not just the `<VoiceDebriefButton>` component inside it.
**Warning signs:** Extra margin appearing on future trip cards.

### Pitfall 2: Circular test replacement is still circular
**What goes wrong:** Rewriting the test to assert on a local object rather than calling the route handler.
**How to avoid:** The test MUST call `PATCH(req, { params })` with a real `NextRequest` and assert `res.status === 400`. Any test that never calls the imported route handler is still circular by definition (D-02).

### Pitfall 3: vi.mock path must match import exactly
**What goes wrong:** The route imports `@/lib/db`. Mocking `../../lib/db` or `lib/db` instead of `@/lib/db` will result in the mock not being applied and the test hitting the real Prisma client (which will fail with a missing DB connection in test environment).
**How to avoid:** Use `vi.mock('@/lib/db', ...)` — the path alias `@` is configured in vitest.config.ts to resolve to the project root.

### Pitfall 4: Documentation passes that miss the stale date
**What goes wrong:** Updating checkbox states but leaving `Last updated:` dates stale.
**How to avoid:** Each doc update should bump the last-updated line to 2026-04-02 (or the date of execution).

## Code Examples

### VoiceDebriefButton guard (exact change)

Current TripCard.tsx lines 173-181:
```tsx
{/* Voice debrief button */}
<div className="mt-2 flex items-center" onClick={(e) => e.stopPropagation()}>
  <VoiceDebriefButton
    tripId={trip.id}
    tripName={trip.name}
    locationId={trip.location?.id ?? null}
    onOpen={() => onDebrief({ id: trip.id, name: trip.name, locationId: trip.location?.id ?? null })}
  />
</div>
```

After fix:
```tsx
{/* Voice debrief button — only render for past trips */}
{isPast && (
  <div className="mt-2 flex items-center" onClick={(e) => e.stopPropagation()}>
    <VoiceDebriefButton
      tripId={trip.id}
      tripName={trip.name}
      locationId={trip.location?.id ?? null}
      onOpen={() => onDebrief({ id: trip.id, name: trip.name, locationId: trip.location?.id ?? null })}
    />
  </div>
)}
```

### Vitest API integration test (replacement for circular test)

```typescript
// Source: Next.js route handler testing with vi.mock
import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'
import { PATCH } from '@/app/api/trips/[id]/usage/route'

vi.mock('@/lib/db', () => ({
  prisma: {
    packingItem: {
      update: vi.fn(),
    },
  },
}))

describe('Usage Tracking (LEARN-01)', () => {
  describe('PATCH /api/trips/[id]/usage', () => {
    it('returns 400 when gearId is missing', async () => {
      const req = new NextRequest('http://localhost/api/trips/trip-1/usage', {
        method: 'PATCH',
        body: JSON.stringify({ usageStatus: 'used' }),
        headers: { 'content-type': 'application/json' },
      })
      const res = await PATCH(req, { params: Promise.resolve({ id: 'trip-1' }) })
      expect(res.status).toBe(400)
      const json = await res.json()
      expect(json.error).toBe('gearId is required')
    })

    it('validates usageStatus must be one of the allowed values', () => {
      const validStatuses = ['used', "didn't need", 'forgot but needed', null]
      expect(validStatuses).toContain('used')
      expect(validStatuses).toContain("didn't need")
      expect(validStatuses).toContain('forgot but needed')
      expect(validStatuses).toContain(null)
      expect(validStatuses).not.toContain('invalid')
    })

    it.todo('updates PackingItem.usageStatus to "used"')
    it.todo('updates PackingItem.usageStatus to "didn\'t need"')
    it.todo('updates PackingItem.usageStatus to "forgot but needed"')
    it.todo('returns 404 for non-existent tripId_gearId combo')
  })

  describe('GET /api/packing-list includes usageState', () => {
    it('usageState type is Record<string, string | null>', () => {
      const usageState: Record<string, string | null> = {
        'gear-1': 'used',
        'gear-2': "didn't need",
        'gear-3': null,
      }
      expect(usageState['gear-1']).toBe('used')
      expect(usageState['gear-3']).toBeNull()
    })

    it.todo('response includes usageState map alongside packedState')
  })
})
```

Note: The `usageStatus` validation test (lines 11-18 of current file) is logically valid — it tests the constant values match expectations. Keep it as-is. Only the `gearId` test at lines 5-8 needs replacement.

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase modifies existing TypeScript source and test files only, using the already-installed Vitest and Next.js stack).

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest (vitest.config.ts present) |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npx vitest run tests/usage-tracking.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

This phase has no formal requirement IDs (tech debt + documentation). The one testable behavior is:

| Behavior | Test Type | Automated Command | File Exists? |
|----------|-----------|-------------------|-------------|
| PATCH returns 400 for missing gearId | unit/integration | `npx vitest run tests/usage-tracking.test.ts` | Yes (rewrite needed) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/usage-tracking.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

None — existing test file covers the target. The test rewrite happens in-place within `tests/usage-tracking.test.ts`.

## Open Questions

1. **VoiceDebriefButton on active trips**
   - What we know: Current code renders VoiceDebriefButton for ALL trips including future ones. Guard is `isPast`.
   - What's unclear: Should active (currently ongoing) trips show VoiceDebriefButton? `isActive` is computed but the audit says "past trips only." `isPast = trip.endDate < now` is false while a trip is active.
   - Recommendation: Follow the audit finding exactly — `isPast` only. An active trip isn't "past" yet. The user can record a voice debrief after the trip ends.

2. **STATE.md percent calculation**
   - What we know: Frontmatter shows `percent: 60` and `completed_phases: 8`. Phase 10 is complete (4/4 plans done, 10-04-PLAN.md complete). Phase 11 is in progress.
   - What's unclear: Whether `completed_phases` counts Phase 11 as complete after this phase executes.
   - Recommendation: During execution, update frontmatter to `completed_phases: 11`, `total_plans: 38` (35 + 3 for Phase 11), `percent: 100`, `status: complete` after all plans finish.

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `components/TripCard.tsx` — exact line numbers verified
- Direct code inspection of `tests/usage-tracking.test.ts` — circular test confirmed
- Direct code inspection of `app/api/trips/[id]/usage/route.ts` — PATCH handler validated
- Direct code inspection of `vitest.config.ts` — test environment and path alias confirmed
- Direct code inspection of `.planning/REQUIREMENTS.md`, `ROADMAP.md`, `STATE.md`, `PROJECT.md` — stale markers identified

### Secondary (MEDIUM confidence)
- Next.js App Router route handler testing with `NextRequest`: standard pattern derived from Next.js documentation on testing route handlers directly
- `vi.mock` path alias resolution: derived from vitest.config.ts alias configuration (`@` → project root)

## Metadata

**Confidence breakdown:**
- Component guard: HIGH — code is read, pattern is identical to PostTripReview at line 216
- Test rewrite: HIGH — route handler is simple, mock pattern is standard Vitest, path alias confirmed
- Doc consistency: HIGH — exact issues catalogued from audit, files directly read

**Research date:** 2026-04-02
**Valid until:** No expiry — all findings are based on static code inspection, not external library APIs
