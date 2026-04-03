# Phase 22: Plan A/B/C Fallback Chain - Research

**Researched:** 2026-04-03
**Domain:** Prisma self-relation, Next.js App Router API routes, React state management
**Confidence:** HIGH

## Summary

Phase 22 adds a self-referencing relationship to the `Trip` model so any trip can be marked as a fallback (Plan B, Plan C) for a primary trip. The schema change is minimal — two nullable fields (`fallbackFor String?`, `fallbackOrder Int?`) added to the existing `Trip` model. No new join tables or complex migrations are needed.

The UI work is three-pronged: (1) a new "Add Plan B/C" button on trip cards that pre-fills the trip create form with `fallbackFor`, (2) a "Fallback Plans" card in TripPrepClient showing alternatives with weather, and (3) a badge on TripCard showing the alternatives count. The delete behavior requires explicit handling — the existing `prisma.trip.delete()` in `[id]/route.ts` must set `fallbackFor = null` on dependent trips before deleting the primary, since Prisma's `onDelete: SetNull` is not supported by SQLite.

Depending phases (S04 dog-aware, S06 permit) are marked `Done` in the queue, so all upstream models and components are available.

**Primary recommendation:** Two-wave plan — Wave 1: schema + migration + API routes; Wave 2: UI components (TripCard badge + TripsClient "Add Plan B" button + TripPrepClient fallback card). Wave 2 plans can run in parallel since TripCard and TripPrepClient are separate files.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| FALLBACK-01 | Trip can be created as Plan B or Plan C (`fallbackFor` + `fallbackOrder` fields) | Prisma self-relation pattern; SQLite-compatible nullable fields |
| FALLBACK-02 | Trip prep shows "Fallback Plans" card with destination + weather comparison | TripPrepClient follows existing card pattern (Fuel/Permit cards as templates); weather already fetched via `useEffect` + `/api/weather` |
| FALLBACK-03 | Trip card shows count of alternatives when fallbacks exist | TripCard already uses `_count` for packingItems/photos; extend `_count` to include alternatives |
| FALLBACK-04 | Fallbacks are first-class trips (own gear, checklists, packing lists) | No schema restriction needed — fallbacks are regular Trip rows with extra FK; all existing relationships untouched |
| FALLBACK-05 | Deleting primary trip sets `fallbackFor = null` on alternatives (no cascade delete) | SQLite limitation means Prisma `onDelete: SetNull` not available; manual update-before-delete required in DELETE handler |
</phase_requirements>

## Project Constraints (from CLAUDE.md)

- TypeScript throughout; functional components with hooks
- No `alert()` — state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- All API routes: try-catch + console.error + JSON error response
- No premature abstractions — build what's needed now
- Commit messages: imperative mood, concise
- All mutations must use immutable patterns (new objects, not in-place mutation)
- `TASKS.md` is single source of truth — update every session
- Changelog: new `session-NN.md` file per session; `docs/CHANGELOG.md` index table updated

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | ORM — schema + migration + query | Already in project; self-relations are first-class |
| Next.js App Router | 16.2.1 | API routes + server components | Already in project |
| React | 19.2.4 | Client component state | Already in project |
| Vitest | 3.2.4 | Test framework | Already in project; existing tests follow this pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@/lib/weather` | project | DayForecast type + weather fetching | Already used in TripCard and TripPrepClient |
| `@/lib/validate` | project | `isValidDate()` for date input safety | Used in all trip API routes |

**No new dependencies.** Everything needed already exists in the project.

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  migrations/
    20260403NNNNNN_add_fallback_chain/   # new migration
      migration.sql
app/api/trips/
  route.ts                               # MODIFY: accept fallbackFor + fallbackOrder in POST
  [id]/
    route.ts                             # MODIFY: pre-delete SetNull + expose new fields
    alternatives/
      route.ts                           # NEW: GET alternatives for a trip
components/
  TripCard.tsx                           # MODIFY: alternatives count badge
  TripsClient.tsx                        # MODIFY: "Add Plan B" button + pre-fill logic
  TripPrepClient.tsx                     # MODIFY: Fallback Plans card
```

### Pattern 1: Prisma Self-Relation (SQLite)

**What:** A `Trip` row can reference another `Trip` row via `fallbackFor` (the primary trip's ID). `fallbackOrder` indicates which fallback slot (2 = Plan B, 3 = Plan C).

**When to use:** Whenever one entity is a contingency version of another of the same type.

SQLite does not support `onDelete: SetNull` in Prisma — this constraint is silently ignored. The delete handler must manually null out the FK before deleting the primary record.

**Schema addition:**
```prisma
// In model Trip — add after permitNotes line
fallbackFor   String?   // Phase 22: ID of the primary trip this is a fallback for
fallbackOrder Int?      // Phase 22: 2 = Plan B, 3 = Plan C
```

**Migration SQL:**
```sql
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "fallbackFor" TEXT;
ALTER TABLE "Trip" ADD COLUMN "fallbackOrder" INTEGER;
```

No Prisma relation directive is strictly required for a nullable FK in SQLite — the field is a plain nullable String. Adding `@relation` with `references: [id]` is best practice for referential integrity (Prisma will check in `prisma validate`) but the ORM will not enforce foreign key constraints in SQLite by default.

**Note on Prisma relations and SQLite:** SQLite does support foreign key constraints when `PRAGMA foreign_keys = ON` is set, but Prisma does not set this pragma by default. For this project (personal tool, no concurrent writers), a plain `String?` field with manual cleanup in the DELETE handler is the pragmatic approach — consistent with how other nullable FK-like fields work in the schema.

### Pattern 2: Pre-Delete SetNull

**What:** Before deleting the primary trip, update all trips that reference it to clear `fallbackFor`.

**Why:** SQLite + Prisma `onDelete: SetNull` is not reliably enforced. Manual approach mirrors how other cascade-like behavior is handled.

**Example — DELETE handler in `app/api/trips/[id]/route.ts`:**
```typescript
// Source: project pattern (established in app/api/trips/[id]/route.ts)
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    // Clear fallbackFor on any trips pointing to this one (FALLBACK-05)
    await prisma.trip.updateMany({
      where: { fallbackFor: id },
      data: { fallbackFor: null, fallbackOrder: null },
    })
    await prisma.trip.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    console.error('Failed to delete trip:', error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
```

### Pattern 3: Alternatives Endpoint

**What:** `GET /api/trips/[id]/alternatives` returns all trips with `fallbackFor = id`, ordered by `fallbackOrder`.

**Example:**
```typescript
// Source: project pattern (mirrors last-stops route structure)
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const alternatives = await prisma.trip.findMany({
      where: { fallbackFor: id },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
      orderBy: { fallbackOrder: 'asc' },
    })
    return NextResponse.json(alternatives)
  } catch (error) {
    console.error('Failed to fetch alternatives:', error)
    return NextResponse.json({ error: 'Failed to fetch alternatives' }, { status: 500 })
  }
}
```

### Pattern 4: Alternatives Count on Trip List

**What:** The `GET /api/trips` route already uses `_count` for `packingItems` and `photos`. Extend it to count alternatives.

Prisma does not support `_count` on a plain String field — it counts relations. Since `fallbackFor`/`fallbackOrder` are plain fields (not a `@relation` directive), counting alternatives requires either:

1. Adding a proper Prisma `@relation` to the schema (bi-directional), OR
2. Fetching alternatives count as a separate query, OR
3. Using `_count` only after adding the relation directive.

**Recommended approach:** Add the self-relation directive to enable `_count`. This is the cleanest approach and Prisma supports self-relations fully.

**Schema with relation directives:**
```prisma
model Trip {
  // ... existing fields ...
  fallbackFor   String?
  fallbackOrder Int?

  // Self-relation for fallback chain
  primaryTrip  Trip?   @relation("FallbackChain", fields: [fallbackFor], references: [id], onDelete: NoAction, onUpdate: NoAction)
  alternatives Trip[]  @relation("FallbackChain")
  // ... rest of relations ...
}
```

This enables `_count: { alternatives: true }` in Prisma queries.

**Note on `onDelete: NoAction`:** SQLite requires explicit `onDelete` when using self-relations in Prisma. `NoAction` means no automatic referential action — the manual pre-delete pattern in Pattern 2 handles cleanup.

### Pattern 5: Fallback Plans Card in TripPrepClient

**What:** After the "Permits & Reservations" card (anchored to `config.key === 'weather'` in the Fragment), add a "Fallback Plans" card using the same insertion pattern.

The card fetches alternatives on mount (same `useEffect` pattern as `lastStops`) and shows each alternative's destination name + a mini weather summary if coordinates exist.

**Insertion point in TripPrepClient:**
```typescript
{/* Fallback Plans card — after Permits & Reservations (Phase 22) */}
{config.key === 'weather' && (
  // ... FallbackPlansCard JSX ...
)}
```

**Weather data for alternatives:** Fetch weather for each alternative that has a location with coordinates using the existing `/api/weather` endpoint. This matches the pattern in `TripsClient` (weather fetched per-trip in `useEffect`). Keep it simple: fetch one alternative at a time, show loading state per-alternative.

### Pattern 6: "Add Plan B" in TripsClient

**What:** A button on each upcoming trip card that opens the create-trip form pre-filled with `fallbackFor = trip.id` and the same dates as the primary trip.

**Implementation:** Reuse the existing `showForm` / `handleCreate` flow. Add state `fallbackForTripId: string | null` and `fallbackOrder: number | null`. When the form submits, include these in the POST body. When `fallbackForTripId` is set, show a banner in the form: "Creating as Plan B for [Trip Name]".

### Anti-Patterns to Avoid

- **Cascade deleting fallbacks when primary is deleted:** The spec is explicit — fallbacks survive primary deletion. Do NOT add `onDelete: Cascade` to the self-relation.
- **Enforcing max-2-fallback limit in DB:** Soft limit in UI only. No DB constraint.
- **Fetching all alternatives inside the trip list route:** This would blow up query complexity. Use the dedicated `/alternatives` endpoint, called lazily from TripPrepClient.
- **Adding `gearFeedback` JSON field:** Fallbacks are first-class trips with the full schema — do not add a flag to mark them as "secondary" in any way that affects gear/packing features.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Referential integrity (SetNull) | Custom trigger or middleware | `updateMany` before `delete` | SQLite doesn't support onDelete:SetNull reliably; 2 lines of Prisma is simpler |
| Weather for alternatives | New weather utility | Existing `/api/weather` endpoint + `DayForecast` type | Zero new code; just another fetch call |
| Trip count badge | Custom DB count query | Prisma `_count` with `@relation` on self-relation | Prisma handles the aggregation |
| Form pre-fill state | URL params or localStorage | React state (`fallbackForTripId`) | In-memory state is sufficient; no URL needed for single-user tool |

**Key insight:** This phase is almost entirely plumbing — wiring existing models, existing API patterns, and existing UI card patterns together with a small schema addition.

## Common Pitfalls

### Pitfall 1: Prisma Self-Relation + SQLite Migration

**What goes wrong:** Adding a self-relation with `@relation` to an existing table in SQLite via Prisma can fail if the migration tries to create a new table (SQLite doesn't support `ALTER TABLE ADD CONSTRAINT`).

**Why it happens:** Prisma may generate a migration that tries to recreate the table. With an existing production table, this requires careful review.

**How to avoid:** Check the generated migration SQL before applying. It should only contain `ALTER TABLE "Trip" ADD COLUMN` statements plus an index. If Prisma generates a table recreation, manually edit the migration SQL to use `ALTER TABLE ADD COLUMN` only. Index on `fallbackFor` is useful: `CREATE INDEX "Trip_fallbackFor_idx" ON "Trip"("fallbackFor")`.

**Warning signs:** Migration SQL contains `CREATE TABLE "new_Trip"` — this is the table-recreation pattern for SQLite, which will fail if there is existing data (or succeed but wipe the table in dev).

### Pitfall 2: `_count` on Self-Relation Requires Bi-Directional Relation

**What goes wrong:** Trying to use `_count: { alternatives: true }` in a Prisma query before adding the `@relation` directive and the `alternatives Trip[]` back-reference field.

**Why it happens:** Prisma only supports `_count` on declared relation fields, not on plain String FK fields.

**How to avoid:** Add both sides of the `@relation("FallbackChain", ...)` before running `prisma generate`.

**Warning signs:** Prisma type errors on `_count` object; `prisma generate` fails with "relation field not found".

### Pitfall 3: TripPrepClient Props Missing New Fields

**What goes wrong:** `TripPrepClient` receives `trip` as a prop from the server page. If `fallbackFor`/`fallbackOrder` aren't included in the server-side query and passed through the prop interface, the component can't determine if the current trip IS a fallback (which affects the card header label).

**Why it happens:** Server components fetch data and pass it as props — omitting new fields is a silent miss.

**How to avoid:** Update `app/trips/[id]/prep/page.tsx` to include `fallbackFor` and `fallbackOrder` in the trip query; update `TripPrepClientProps` interface to include them.

**Warning signs:** TypeScript doesn't catch this if the field isn't typed — verify `TripPrepClientProps` explicitly types all fields needed.

### Pitfall 4: Stale Alternatives List After "Add Plan B"

**What goes wrong:** After creating a Plan B trip, the TripCard alternatives count badge doesn't update because `trips` state doesn't include the new trip's relationship to the primary.

**Why it happens:** The trip list in `TripsClient` is `initialTrips` + state updates. The new fallback trip is appended to the list, but the primary trip's `_count.alternatives` in state is still the old value.

**How to avoid:** After a successful `fallbackFor` creation, either (a) refetch the primary trip from the API and update it in state, or (b) optimistically increment `_count.alternatives` on the primary trip in state. Option (b) is simpler for a personal tool.

### Pitfall 5: Weather Fetch for Alternatives with Missing Coordinates

**What goes wrong:** Some alternatives may not have a location set, or the location may not have latitude/longitude. Attempting to fetch weather for these will hit the API with null coordinates.

**Why it happens:** `locationId` is nullable on `Trip`; `Location.latitude`/`longitude` are also nullable.

**How to avoid:** Guard: `if (!alt.location?.latitude || !alt.location?.longitude) return` before fetching weather. Show "No location set" in the card for those alternatives instead of a weather block.

## Code Examples

### Migration SQL (verified against existing project migration pattern)
```sql
-- Source: project pattern (prisma/migrations/20260403090000_add_permit_fields/migration.sql)
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "fallbackFor" TEXT;
ALTER TABLE "Trip" ADD COLUMN "fallbackOrder" INTEGER;

-- Index for efficient lookup
CREATE INDEX "Trip_fallbackFor_idx" ON "Trip"("fallbackFor");
```

### Prisma schema self-relation block
```prisma
-- Source: Prisma docs — self-relations with named relations
model Trip {
  // ... existing fields ...
  fallbackFor   String?
  fallbackOrder Int?

  // Fallback chain self-relation (Phase 22)
  primaryTrip  Trip?   @relation("FallbackChain", fields: [fallbackFor], references: [id], onDelete: NoAction, onUpdate: NoAction)
  alternatives Trip[]  @relation("FallbackChain")

  // existing relations below...
  location           Location?          @relation(fields: [locationId], references: [id])
  // ... etc
}
```

### Alternatives count in trip list query
```typescript
// Source: project pattern (app/api/trips/route.ts — existing _count pattern)
const trips = await prisma.trip.findMany({
  include: {
    location: { select: { id: true, name: true, latitude: true, longitude: true } },
    vehicle: { select: { id: true, name: true } },
    _count: { select: { packingItems: true, photos: true, alternatives: true } },
  },
  orderBy: { startDate: 'desc' },
})
```

### TripCard badge — alternatives count
```typescript
// Source: project pattern (TripCard.tsx — bringingDog and permitUrl badges)
{trip._count.alternatives > 0 && (
  <span
    title={`${trip._count.alternatives} fallback plan${trip._count.alternatives !== 1 ? 's' : ''}`}
    className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-full px-1.5 py-0.5 shrink-0"
  >
    +{trip._count.alternatives}B
  </span>
)}
```

### Fallback Plans card fetch in TripPrepClient
```typescript
// Source: project pattern (TripPrepClient.tsx — lastStops useEffect)
const [alternatives, setAlternatives] = useState<AlternativeTrip[]>([])
const [alternativesLoading, setAlternativesLoading] = useState(false)

useEffect(() => {
  setAlternativesLoading(true)
  fetch(`/api/trips/${trip.id}/alternatives`)
    .then(r => r.ok ? r.json() : Promise.reject())
    .then((data: AlternativeTrip[]) => {
      setAlternatives(data)
      setAlternativesLoading(false)
    })
    .catch(() => setAlternativesLoading(false))
}, [trip.id])
```

## Environment Availability

Step 2.6: SKIPPED (no external dependencies — this phase is schema + API + UI changes only; no new services or CLI tools required).

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | vitest.config.ts (inferred — project uses `vitest run` script) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| FALLBACK-01 | POST /api/trips with `fallbackFor` creates linked trip | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ Wave 0 |
| FALLBACK-02 | GET /api/trips/[id]/alternatives returns ordered alternatives | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ Wave 0 |
| FALLBACK-03 | `_count.alternatives` included in trip list response | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ Wave 0 |
| FALLBACK-04 | Alternatives have own packingItems (no schema restriction) | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ Wave 0 |
| FALLBACK-05 | DELETE primary trip sets fallbackFor=null on alternatives | unit | `npm test -- tests/fallback-chain.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/fallback-chain.test.ts` — covers FALLBACK-01 through FALLBACK-05

*(All fallback logic is concentrated in 2 API routes — one test file is sufficient)*

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Multiple `permitUrl` etc. added as standalone fields | Schema fields added to Trip model in-place | Phase 21 | Pattern confirmed: add nullable fields directly to Trip, not a separate model |
| Custom fetch for prep data | Independent useEffects per card (fuel, permit) | Phase 18 | Fallback Plans card should follow same independent-fetch pattern |
| Single-query `_count` | `_count` extended per phase (packingItems → photos → alternatives) | Phase 19+ | Adding `alternatives` to `_count` is the natural next step |

## Open Questions

1. **Should the TripPrepClient show the "Fallback Plans" card even when `alternatives` is empty?**
   - What we know: Permits card always renders (empty state = input fields). Fuel card only renders when `trip.location?.latitude` exists.
   - What's unclear: Whether the card should always show (inviting user to add a Plan B) or only when alternatives exist.
   - Recommendation: Show always for upcoming/active trips, with an "Add Plan B" link when empty. This makes the feature discoverable without requiring the user to go back to the trip list.

2. **Should fallback trips be visually distinct in the main trip list?**
   - What we know: The spec says "Alternatives are first-class trips" — they appear in the trip list like any other trip.
   - What's unclear: Whether a small "Plan B for [Primary Trip]" label should appear on the card when it has `fallbackFor` set.
   - Recommendation: Add a subtle "Plan B" / "Plan C" label on the trip card when `fallbackFor` is set. Helps Will distinguish fallbacks from primary trips in the list.

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — confirmed Trip model structure, existing nullable field patterns
- `app/api/trips/[id]/route.ts` — confirmed DELETE handler pattern; existing PUT/DELETE shapes
- `app/api/trips/route.ts` — confirmed POST pattern, `_count` usage
- `components/TripPrepClient.tsx` — confirmed Fragment-based card insertion after `config.key === 'weather'`
- `components/TripCard.tsx` — confirmed badge pattern (bringingDog, permitUrl)
- `components/TripsClient.tsx` — confirmed form state pattern, create flow
- `prisma/migrations/20260403090000_add_permit_fields/migration.sql` — confirmed SQLite ALTER TABLE pattern

### Secondary (MEDIUM confidence)
- Prisma docs knowledge (training data, confirmed by schema patterns in project): self-relations require named `@relation`, `_count` requires declared relation field, `onDelete: NoAction` required for self-relation in SQLite

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools already in project; versions confirmed by package.json
- Architecture: HIGH — patterns directly observed in TripPrepClient, TripCard, existing migrations
- Pitfalls: HIGH — SQLite/Prisma limitation confirmed by existing schema (no onDelete:SetNull anywhere); wave pattern confirmed by prior phases

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack — Prisma/Next.js versions won't change mid-project)
