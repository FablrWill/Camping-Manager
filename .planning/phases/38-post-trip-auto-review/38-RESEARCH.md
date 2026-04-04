# Phase 38: Post-Trip Auto-Review - Research

**Researched:** 2026-04-04
**Domain:** Next.js App Router, Prisma SQLite, React state, existing review infrastructure
**Confidence:** HIGH

---

## Summary

Phase 38 adds a structured post-trip review flow to an existing app that already has significant review infrastructure in place. The codebase already has `PostTripReview.tsx` (gear usage review), `PackingItem.usageStatus`, `MealFeedback`, `TripFeedback`, and `Location.rating`. The job for this phase is to **stitch these pieces into a single cohesive modal and add the missing "reviewed" tracking field** on the Trip model — not to build review infrastructure from scratch.

The key insight: `PostTripReview.tsx` already handles gear usage review item-by-item with per-PATCH calls to `/api/trips/[id]/usage`. The meal feedback pipeline (`MealFeedback` model, `/api/trips/[id]/meal-plan/feedback`) and voice debrief flow (`TripFeedback`, `VoiceDebriefButton`) also exist. What's missing is: (1) a unified review modal that flows gear + meals + spot + notes in sequence, (2) a `reviewedAt` timestamp on `Trip` to gate the "Review needed" banner, and (3) a single atomic batch endpoint to commit the review in one shot.

The existing `PostTripReview` component is already rendered inside `TripCard` for past trips when `isSelected`. Phase 38 should replace this embedded inline behavior with a proper modal/sheet triggered from a "Review Trip" button, so the flow is intentional rather than automatic.

**Primary recommendation:** Add `reviewedAt DateTime?` to Trip, build `TripReviewModal.tsx` with a multi-step flow, add `POST /api/trips/[id]/review` as the batch write endpoint, and wire the "Review needed" banner in `TripsClient`/`TripCard`.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout; functional React components with hooks
- No `alert()` — inline error state only
- All API routes must have try-catch with `console.error` + JSON error response
- All React hooks must have correct, minimal dependency arrays
- Immutable state updates (never mutate in place)
- Mobile-first; files <800 lines; functions <50 lines
- Commit messages: imperative mood, concise
- State-based error messages only
- `GSD workflow` enforcement: edits go through `/gsd:execute-phase`, not direct

---

## Existing Schema — What Already Exists

### PackingItem (confidence: HIGH — read from schema.prisma)

```prisma
model PackingItem {
  id          String    @id @default(cuid())
  tripId      String
  gearId      String
  packed      Boolean   @default(false)
  notes       String?
  usageStatus String?   // "used" | "didn't need" | "forgot but needed" | null
  cachedAt    DateTime?
  ...
}
```

`usageStatus` is the gear review field. Already populated by `PATCH /api/trips/[id]/usage` called from `PostTripReview.tsx`. The aggregation function `aggregateGearFeedback()` in `lib/claude.ts` reads this field across trips to build feedback context for new packing lists. **No new fields needed on PackingItem.**

### MealFeedback (confidence: HIGH)

```prisma
model MealFeedback {
  id         String   @id @default(cuid())
  mealId     String?
  mealPlanId String
  mealName   String
  rating     String   // "liked" | "disliked" (also accepts "loved", "ok", "skip")
  notes      String?
  createdAt  DateTime @default(now())
  ...
}
```

Meal feedback is upserted (find existing → update, else create). Route: `POST /api/trips/[id]/meal-plan/feedback` (takes `mealId`, `mealName`, `rating`, `notes`). Also per-meal: `POST /api/trips/[id]/meal-plan/meals/[mealId]/feedback`. **No new fields needed on Meal or MealFeedback.**

### Location (confidence: HIGH)

```prisma
model Location {
  id      String @id @default(cuid())
  rating  Int?   // 1-5
  notes   String?
  ...
}
```

`Location.rating` (1–5 Int) is the spot rating field. The existing TripFeedback's `generateTripSummary` call already passes `currentLocationRating` and proposes `summary.locationRating`. The `POST /api/trips/[id]/feedback` route reads this from the location. **No new fields needed on Location.** The batch review endpoint can write directly to `Location` via a Prisma update.

### Trip (confidence: HIGH)

```prisma
model Trip {
  id          String   @id @default(cuid())
  notes       String?
  ...
  // No reviewedAt field exists yet
}
```

**Missing field:** `reviewedAt DateTime?` — needed to gate "Review needed" banner and show "Reviewed" badge. This is the only schema migration required.

### TripFeedback (confidence: HIGH)

```prisma
model TripFeedback {
  id              String    @id @default(cuid())
  tripId          String    // NOT unique — append-only
  summary         String?
  voiceTranscript String?
  insights        String?
  status          String    @default("pending")
  ...
}
```

`TripFeedback` is append-only (multiple records per trip). The free-form "notes" field from the review modal can be stored here as `summary` with `status: 'applied'` — or written directly to `Trip.notes`. The cleanest approach: write trip notes to `Trip.notes` (already exists as `String?`) since they're trip metadata, not AI-generated feedback.

---

## Existing Feedback Infrastructure (Phase 17)

### How `generatePackingList` consumes gear feedback (confidence: HIGH — read from source)

The pipeline in `app/api/packing-list/route.ts`:
1. Queries last 5 completed trips where `packingItems.usageStatus != null`
2. Calls `aggregateGearFeedback(recentTrips)` → groups by gearId, counts `used`, `didn't need`, `forgot but needed`
3. Calls `filterSignificantFeedback()` → keeps items with `didntNeedCount >= 2` OR `forgotCount >= 1`
4. Passes result as `feedbackContext` to `generatePackingList()`
5. Claude sees it as `GEAR HISTORY FROM PAST TRIPS: - [name]: marked "didn't need" on N/M trips`

**Format the batch review must produce:** Each `PackingItem.usageStatus` must be one of: `"used"`, `"didn't need"`, `"forgot but needed"`, or `null`. The batch endpoint writes these via individual Prisma updates (or `updateMany` grouped by status value).

### Meal feedback consumption (Phase 35) (confidence: HIGH)

`MealFeedback` records are read by the meal plan generation flow. The existing feedback endpoint already upserts (so re-reviewing a meal updates rather than duplicates). Rating values accepted: `"liked"` | `"disliked"` (primary), also `"loved"`, `"ok"`, `"skip"` (legacy). **Use `"liked"` / `"disliked"` for the review modal** — these are what the feedback route enforces.

---

## Existing Review Component Analysis

### `PostTripReview.tsx` (confidence: HIGH — read from source)

Already implemented in `components/PostTripReview.tsx`:
- Loads packing list via `GET /api/packing-list?tripId=...`
- Loads current usageState from the same response
- Renders per-item Used/Didn't Need/Forgot buttons
- Each tap calls `PATCH /api/trips/[id]/usage` individually (optimistic update)
- Auto-generates trip summary when all items reviewed
- Shows `TripSummaryResult` (whatToDrop, whatWasMissing, locationRating suggestion)

**Current state:** This component is embedded inline in `TripCard` for past trips when `isSelected`. It handles gear review only — no meals, no spot rating, no free-form notes.

**Phase 38 disposition:** The inline `PostTripReview` already covers the gear step. Phase 38 adds a proper modal wrapper (`TripReviewModal`) that flows gear → meals → spot → notes → submit. The inline `PostTripReview` can be kept as the gear sub-section of the modal, or its content can be inlined directly.

### `TripCard.tsx` — current past-trip rendering (confidence: HIGH)

For past trips (`isPast && isSelected`):
```tsx
<PostTripReview tripId={trip.id} />
```

For past trips generally:
```tsx
<VoiceDebriefButton ... onOpen={() => onDebrief(...)} />
```

The "Review Trip" button for Phase 38 should appear on past trips in the card header area (not gated on `isSelected`). `VoiceDebriefButton` can remain as a companion entry point.

---

## Trip Completion Detection

### How trips are currently classified (confidence: HIGH)

In `TripsClient.tsx` (line 235–236):
```tsx
const now = new Date().toISOString()
const upcoming = trips.filter((t) => t.endDate >= now)
const past = trips.filter((t) => t.endDate < now)
```

In `TripCard.tsx` (line 81):
```tsx
const isPast = trip.endDate < now
```

**"Review needed" detection:** A past trip needs review if `reviewedAt === null`. This is a pure client-side filter on the trips array — no additional API call needed.

**"Reviewed" badge:** If `trip.reviewedAt !== null`, show checkmark badge. If null and isPast, show "Review Trip" button.

**TripsClient data shape:** `TripData` interface currently does not include `reviewedAt`. The page-level fetch (`/api/trips`) and the `TripData` interface in both `TripsClient.tsx` and `TripCard.tsx` need `reviewedAt: string | null` added after the migration.

---

## Atomic Batch Update Pattern

### How existing batch writes work (confidence: HIGH — read from source)

The packing list generation uses `prisma.$transaction()`:

```typescript
await prisma.$transaction(async (tx) => {
  for (const item of gearItems) {
    await tx.packingItem.upsert({ ... })
  }
  await tx.packingItem.updateMany({ ... })
  await tx.trip.update({ ... })
})
```

### Recommended pattern for review batch endpoint

`POST /api/trips/[id]/review` body:
```typescript
{
  gearUsage: Array<{ gearId: string; usageStatus: 'used' | "didn't need" | 'forgot but needed' }>,
  mealFeedbacks: Array<{ mealId: string; mealName: string; rating: 'liked' | 'disliked'; notes?: string }>,
  spotRating: number | null,        // 1-5, written to Location.rating
  spotNote: string | null,          // written to Location.notes (appended or replaced)
  tripNotes: string | null,         // written to Trip.notes
}
```

Transaction structure:
```typescript
await prisma.$transaction(async (tx) => {
  // 1. Gear usage — updateMany grouped by status
  for (const { gearId, usageStatus } of gearUsage) {
    await tx.packingItem.update({
      where: { tripId_gearId: { tripId, gearId } },
      data: { usageStatus },
    })
  }

  // 2. Meal feedbacks — upsert each
  for (const { mealId, mealName, rating, notes } of mealFeedbacks) {
    const existing = await tx.mealFeedback.findFirst({
      where: { mealId, mealPlanId },
    })
    if (existing) {
      await tx.mealFeedback.update({ where: { id: existing.id }, data: { rating, notes: notes ?? null, mealName } })
    } else {
      await tx.mealFeedback.create({ data: { mealId, mealPlanId, mealName, rating, notes: notes ?? null } })
    }
  }

  // 3. Spot rating — update Location
  if (spotRating !== null && trip.locationId) {
    await tx.location.update({
      where: { id: trip.locationId },
      data: { rating: spotRating, notes: spotNote ?? undefined },
    })
  }

  // 4. Trip notes + reviewedAt
  await tx.trip.update({
    where: { id: tripId },
    data: {
      notes: tripNotes ?? undefined,
      reviewedAt: new Date(),
    },
  })
})
```

**Why not per-call?** The existing `PostTripReview.tsx` uses per-PATCH calls (optimistic, one per tap). The new modal can also collect state locally and submit once on "Done", which is more reliable on mobile and cleaner for the "reviewed" gate.

---

## Schema Changes Required

| Field | Model | Type | Purpose | Migration Needed |
|-------|-------|------|---------|-----------------|
| `reviewedAt` | `Trip` | `DateTime?` | Gates "Review needed" banner; drives "Reviewed" badge | YES — one migration |

All other data lives in existing fields:
- `PackingItem.usageStatus` — gear review
- `MealFeedback.rating` + `.notes` — meal feedback
- `Location.rating` + `.notes` — spot review
- `Trip.notes` — free-form trip notes (already exists)

**Migration statement:**
```sql
ALTER TABLE "Trip" ADD COLUMN "reviewedAt" DATETIME;
```

Prisma migration: add `reviewedAt DateTime?` to Trip model, run `npx prisma migrate dev --name add-trip-reviewed-at`.

---

## Architecture Patterns

### Recommended Project Structure (new files)

```
components/
  TripReviewModal.tsx    — multi-step review sheet/modal
app/api/trips/[id]/
  review/
    route.ts             — POST handler, atomic batch write
```

### Pattern: Multi-Step Review Modal

The modal should be a sheet (full-height bottom-sheet on mobile) with 4 steps:

1. **Gear** — renders the existing `PostTripReview` gear review UI (or its logic inlined)
2. **Meals** — shows meals grouped by day/slot; liked/disliked toggle per meal + optional note
3. **Spot** — 1-5 star tap rating + text note for the location
4. **Notes** — free-form textarea for anything else

Step navigation: Prev/Next buttons at bottom. Final step has "Submit Review" instead of Next.

State management: All review state held in the modal's local state. No API calls until submission. On Submit, single POST to `/api/trips/[id]/review`.

### Pattern: "Review needed" Banner

In `TripCard.tsx`, for past trips where `trip.reviewedAt === null`:
```tsx
{isPast && !trip.reviewedAt && (
  <div className="bg-amber-50 ...">
    <button onClick={() => onReview(trip.id)}>Review this trip</button>
  </div>
)}
{isPast && trip.reviewedAt && (
  <span className="...">Reviewed</span>
)}
```

`onReview` callback bubbles up to `TripsClient` which manages `reviewingTripId` state and renders `<TripReviewModal>`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Atomic multi-table write | Custom saga/rollback | `prisma.$transaction()` | Already used in packing list; handles rollback automatically |
| Gear review UI | New component | Reuse `PostTripReview.tsx` content or extract its gear-item rendering | Already built, tested, styled |
| Meal upsert logic | Custom diff | Pattern from existing `/api/trips/[id]/meal-plan/feedback` route | Exact same logic needed |
| Modal pattern | Custom sheet | Reuse existing `Modal` component from `@/components/ui` | Already handles dark mode, scroll, close |

---

## Common Pitfalls

### Pitfall 1: TripData interface mismatch
**What goes wrong:** Add `reviewedAt` to schema but forget to add it to the `TripData` interface in `TripsClient.tsx` and `TripCard.tsx`. TypeScript won't catch it if the API returns it but the interface doesn't declare it.
**How to avoid:** Update both interface declarations and the API route's `select`/`include` shape simultaneously.
**Warning signs:** Banner never shows because `trip.reviewedAt` is `undefined` (not null).

### Pitfall 2: Meal plan absent
**What goes wrong:** Review modal shows an empty meals step (or crashes) if no meal plan was generated for the trip.
**How to avoid:** Fetch meals in the review modal's data load; if `mealPlan === null`, skip/hide the meals step gracefully.

### Pitfall 3: Location not set on trip
**What goes wrong:** Spot rating step is shown but `trip.locationId` is null — the PATCH to `Location` will fail or error.
**How to avoid:** Conditionally render the spot step only if `trip.location !== null`. In the batch endpoint, guard the `Location.update` with a null check.

### Pitfall 4: Re-review overwrites previous data
**What goes wrong:** Submitting a second review replaces `usageStatus` values already set, and wipes `Trip.notes`.
**How to avoid:** Phase scope says "no re-review" — once `reviewedAt` is set, hide the "Review Trip" button and show "Reviewed" badge. Enforce on the API too: if `trip.reviewedAt` is already set, return 409 or just update `notes` field only.

### Pitfall 5: Per-tap vs. batch mismatch
**What goes wrong:** Existing `PostTripReview.tsx` uses per-tap PATCH calls. If the modal also renders `PostTripReview` as a sub-component, gear usage will be saved immediately (per tap) but meal/spot/notes won't be saved until Submit — creating a split state.
**How to avoid:** Either (a) lift the gear review into the modal's local state (no per-tap calls) and submit everything at once, or (b) keep per-tap gear saves but treat them as pre-saves and call the batch endpoint for the rest. Option (a) is cleaner and matches the mobile UX target.

### Pitfall 6: `usageStatus` null vs. not reviewed
**What goes wrong:** The batch endpoint needs to distinguish "user explicitly chose 'used'" from "user didn't interact with this item." If the review modal is submitted with some gear items still un-marked, the batch should only write the ones the user touched, not write null to all.
**How to avoid:** The batch body should only include `gearUsage` entries for items where the user made a selection. Untouched items keep their existing `usageStatus` (which may already be null from before). The batch endpoint uses `packingItem.update` (not `updateMany`) so untouched items are not touched.

---

## Code Examples

### Existing batch transaction pattern (from packing-list route)
```typescript
// Source: app/api/packing-list/route.ts
await prisma.$transaction(async (tx) => {
  for (const item of gearItems) {
    await tx.packingItem.upsert({
      where: { tripId_gearId: { tripId, gearId: item.gearId! } },
      create: { tripId, gearId: item.gearId!, packed: false },
      update: {},
    })
  }
  await tx.packingItem.updateMany({ where: { tripId }, data: { packed: false } })
  await tx.trip.update({ where: { id: tripId }, data: { packingListResult: JSON.stringify(packingList), packingListGeneratedAt: new Date() } })
})
```

### Existing usageStatus validation (from /api/trips/[id]/usage/route.ts)
```typescript
const VALID_STATUSES = ['used', "didn't need", 'forgot but needed', null] as const
type UsageStatus = typeof VALID_STATUSES[number]
function isValidUsageStatus(value: unknown): value is UsageStatus {
  return (VALID_STATUSES as readonly (string | null)[]).includes(value as string | null)
}
```

### Existing meal feedback upsert pattern (from /api/trips/[id]/meal-plan/feedback/route.ts)
```typescript
// Source: app/api/trips/[id]/meal-plan/feedback/route.ts
const existing = await prisma.mealFeedback.findFirst({ where: { mealId, mealPlanId: mealPlan.id } })
if (existing) {
  await prisma.mealFeedback.update({ where: { id: existing.id }, data: { rating, notes: notes ?? null, mealName } })
} else {
  await prisma.mealFeedback.create({ data: { mealId, mealPlanId: mealPlan.id, mealName, rating, notes: notes ?? null } })
}
```

### Gear feedback consumption (from lib/claude.ts)
```typescript
// Source: lib/claude.ts — aggregateGearFeedback
for (const trip of trips) {
  for (const item of trip.packingItems) {
    if (!item.usageStatus) continue
    // ... tally usedCount, didntNeedCount, forgotCount per gearId
  }
}
// filterSignificantFeedback: keeps didntNeedCount >= 2 || forgotCount >= 1
```

---

## Environment Availability

Step 2.6: SKIPPED — Phase 38 is pure code/config changes. No new external services, CLIs, or runtimes needed. All dependencies (Prisma, Next.js, React) are already installed and running.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (jsdom environment) |
| Quick run command | `npm run test` |
| Full suite command | `npm run test` |
| Test directories | `lib/__tests__/`, `components/__tests__/`, `tests/` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| REV-01 | "Review Trip" button shown for past trips with no `reviewedAt` | unit (component) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-02 | "Reviewed" badge shown when `reviewedAt !== null` | unit (component) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-03 | Gear usage status saved to `PackingItem.usageStatus` | unit (api handler logic) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-04 | Meal feedback upserted to `MealFeedback` | unit (api handler logic) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-05 | Spot rating written to `Location.rating` | unit (api handler logic) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-06 | `Trip.reviewedAt` set on successful batch submit | unit (api handler logic) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-07 | Review modal skips meals step gracefully when no meal plan | unit (component) | `npm run test -- --reporter=verbose` | No — Wave 0 |
| REV-08 | Review modal skips spot step gracefully when no location | unit (component) | `npm run test -- --reporter=verbose` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm run test`
- **Per wave merge:** `npm run test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/review-batch.test.ts` — covers REV-03 through REV-06 (batch endpoint logic)
- [ ] `components/__tests__/TripReviewModal.test.tsx` — covers REV-01, REV-02, REV-07, REV-08

---

## Open Questions

1. **Reuse vs. replace `PostTripReview.tsx`**
   - What we know: `PostTripReview.tsx` handles gear review with per-tap calls. TripCard already renders it inline.
   - What's unclear: Should the new `TripReviewModal` wrap `PostTripReview` or duplicate its gear rendering logic into local state?
   - Recommendation: Duplicate the gear step rendering into `TripReviewModal` local state to enable batch submission. Keep `PostTripReview.tsx` for backward compat (it's still rendered inline for expanded past trip cards).

2. **`Trip.notes` overwrite behavior**
   - What we know: `Trip.notes` already holds trip planning notes set at creation time.
   - What's unclear: Should review notes append to existing notes or replace them?
   - Recommendation: Replace (the modal textarea pre-fills with existing `Trip.notes` so user sees and can merge). Document this in UI placeholder text.

3. **Meal rating vocabulary**
   - What we know: The `/api/trips/[id]/meal-plan/feedback` route only accepts `"liked"` | `"disliked"`. The per-meal route also accepts `"loved"`, `"ok"`, `"skip"`.
   - What's unclear: Which values should the review modal use?
   - Recommendation: Use `"liked"` / `"disliked"` for simplicity — aligns with the primary feedback route. If future phases want 5-star meals, the model already has a string field.

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — complete schema, all model fields verified
- `components/PostTripReview.tsx` — existing gear review component, fully read
- `components/TripCard.tsx` — existing card rendering, PostTripReview integration
- `components/TripsClient.tsx` — trip list, past/upcoming split, modal patterns
- `app/api/trips/[id]/usage/route.ts` — PATCH handler for usageStatus
- `app/api/trips/[id]/feedback/route.ts` — TripFeedback model usage
- `app/api/trips/[id]/meal-plan/feedback/route.ts` — meal feedback upsert pattern
- `app/api/trips/[id]/meal-plan/route.ts` — meal plan fetch with feedbacks
- `app/api/packing-list/route.ts` — batch transaction pattern + feedback aggregation
- `lib/claude.ts` — `aggregateGearFeedback`, `filterSignificantFeedback`, `buildFeedbackSection`

### Secondary (MEDIUM confidence)
- `app/api/trips/[id]/route.ts` — existing PUT/PATCH/DELETE patterns; established approach for trip field updates

---

## Metadata

**Confidence breakdown:**
- Existing schema fields: HIGH — read directly from schema.prisma
- Feedback consumption format: HIGH — read from lib/claude.ts and API routes
- Component patterns: HIGH — read from PostTripReview.tsx and TripCard.tsx
- Schema changes needed: HIGH — single `reviewedAt` field on Trip
- Batch transaction approach: HIGH — established pattern in packing-list route

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (stable codebase, no external dependencies)
