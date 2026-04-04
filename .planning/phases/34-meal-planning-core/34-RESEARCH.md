# Phase 34: Meal Planning Core - Research

**Researched:** 2026-04-03
**Domain:** Prisma schema migration, Next.js API routes (nested), Claude AI integration, React component replacement
**Confidence:** HIGH

## Summary

This phase replaces the existing JSON-blob MealPlan model with normalized `Meal` rows, adds new per-trip RESTful API routes, adds a `regenerateMeal()` function to `lib/claude.ts`, and builds a new `MealPlanClient.tsx` component that renders normalized data with per-meal regeneration. The old `MealPlan.tsx` component and `app/api/meal-plan/route.ts` are superseded but can remain in place for now.

The existing infrastructure is mature and well-patterned. The migration is destructive (drops `result` JSON blob), which is explicitly accepted in CONTEXT.md (personal project, no prod data to preserve). The primary technical complexity is: (1) the schema migration with cascading `Meal` rows, (2) the `regenerateMeal()` Claude function and its PATCH route, and (3) ensuring `TripPrepClient` and `TripsClient` are wired without breaking existing offline/prep state machinery.

The VehicleChecklistCard pattern (Phase 29) is the closest prior art: generate-on-demand, optimistic UI updates, ConfirmDialog for regeneration, JSON blob stored on Trip model. The new meal plan goes further — normalized rows with per-meal PATCH — so the pattern needs to be extended rather than copied verbatim.

**Primary recommendation:** Follow the vehicle checklist test pattern (vitest, mocked prisma + claude, require() inside test bodies) and the VehicleChecklistCard UX pattern for generate/regenerate. The Meal normalized schema and regenerateMeal() function are the highest-risk items; plan Wave 0 tests for both the generate and regenerate routes before implementing.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Schema Migration**
- Add `Meal` model: `id, mealPlanId, day (1-based int), slot (breakfast/lunch/dinner/snack), name, description, ingredients (JSON array of {item, quantity, unit}), cookInstructions, prepNotes, estimatedMinutes`
- Update `MealPlan` model: keep `id, tripId (@unique), generatedAt`; add `notes String?`; **remove `result` JSON blob** and `cachedAt`
- Existing MealPlan rows will be cleared — no prod data migration needed
- Write a Prisma migration for both changes

**API Routes (new per-trip RESTful structure)**
- `GET  /api/trips/[id]/meal-plan` — fetch plan with all Meal rows
- `DELETE /api/trips/[id]/meal-plan` — clear plan (delete MealPlan + cascade Meals)
- `POST /api/trips/[id]/meal-plan/generate` — call Claude, persist MealPlan + Meal rows, return full plan; also update `Trip.mealPlanGeneratedAt`
- `PATCH /api/trips/[id]/meal-plan/meals/[mealId]` — regenerate single meal via `regenerateMeal()`, update the Meal row in DB
- `DELETE /api/trips/[id]/meal-plan/meals/[mealId]` — delete single meal

**lib/claude.ts Functions**
- Update `generateMealPlan()` to accept `bringingDog?: boolean` param and inject into prompt
- Add `regenerateMeal()` function: takes meal context (day, slot, trip details) and generates one replacement meal
- The Claude prompt for meal generation already has vacuum sealer / sous vide constraints — keep and don't change
- Snack slot is optional per spec ("snack optional")

**MealPlanClient.tsx (new component)**
- NEW file: `components/MealPlanClient.tsx`
- Replaces/supersedes existing `MealPlan.tsx` for the meals tab in TripPrepClient
- Days as collapsible sections (day number + date as header)
- Meal cards: name, prepType (home/camp), prepNotes, ingredients list, cook instructions
- "Generate Plan" button (when no plan exists)
- "Regenerate All" button (when plan exists)
- Per-meal "↺ Regenerate" button on each meal card
- Loading state during generation/regeneration
- Error state inline (no alert())
- Existing `MealPlan.tsx` can be kept or removed — TripPrepClient will use MealPlanClient

**TripPrepClient wiring**
- Update the `meals` section to render `<MealPlanClient tripId={trip.id} tripName={trip.name} />` instead of `<MealPlan ...>`
- Use new per-trip API routes (`/api/trips/${id}/meal-plan`)

**TripsClient status indicator**
- Add "Meal plan ready" / "No meal plan" badge/indicator on each trip card
- Data: use `trip.mealPlanGeneratedAt` (already on Trip model) — null = no plan

### Claude's Discretion
- Component structure within MealPlanClient (how many sub-components to extract)
- Exact Tailwind styling for meal cards (follow existing TripPrepClient patterns)
- Whether to keep or delete the old `MealPlan.tsx` (can keep for now)
- Error message copy
- Exact behavior when regenerating a single meal while another regeneration is in flight (disable button)

### Deferred Ideas (OUT OF SCOPE)
- Shopping list (S12)
- Prep guide (S12)
- Feedback/rating UI (S12)
- Headcount field on Trip model (future session)
- Dietary restrictions / preferences field (future — feedback history in S12)
- Offline snapshot for meal plan (existing `cachedAt` field being removed — can add back later)
- Headcount > 1 (assume 1 for now per spec)
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 | ORM + migrations | Already in use; schema.prisma is source of truth |
| @anthropic-ai/sdk | 0.80.0 | Claude API calls | Already in use for all AI generation |
| Zod | (via parse-claude.ts) | Claude response validation | Pattern established in Phase 06 — parseClaudeJSON wraps all Claude responses |
| Next.js App Router | 16.2.1 | Nested dynamic API routes | `app/api/trips/[id]/meal-plan/...` follows existing pattern |
| React | 19.2.4 | MealPlanClient component | Functional components with hooks |
| Vitest | (existing) | Tests | `tests/*.test.ts` pattern established across all prior phases |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| lucide-react | 1.7.0 | Icons (RotateCcw, Loader2, ChevronDown) | Match existing MealPlan.tsx icon usage |
| Tailwind CSS 4 | (existing) | Styling | Follow stone/amber palette established in all prep components |

**Version verification:** All packages already installed in project. No new installs required for this phase.

---

## Architecture Patterns

### Recommended Project Structure (new files)
```
prisma/migrations/
  20260403XXXXXX_normalize_meal_plan/
    migration.sql               — DROP TABLE + CREATE TABLE for Meal; ALTER TABLE MealPlan

app/api/trips/[id]/
  meal-plan/
    route.ts                    — GET (fetch plan + meals), DELETE (clear)
    generate/
      route.ts                  — POST: Claude generate + persist Meal rows
    meals/
      [mealId]/
        route.ts                — PATCH (regenerate single), DELETE

components/
  MealPlanClient.tsx            — NEW: normalized meal plan component

lib/
  claude.ts                     — ADD regenerateMeal(), UPDATE generateMealPlan() with bringingDog

tests/
  meal-plan-route.test.ts       — generate + GET + DELETE route tests
  meal-regenerate-route.test.ts — PATCH /meals/[mealId] test
```

### Pattern 1: Normalized Meal Schema (Prisma)

**What:** Replace JSON blob `MealPlan.result` with a `Meal` table. The `MealPlan` model becomes a lightweight header (id, tripId, generatedAt, notes). Each meal is a separate row linked by `mealPlanId`.

**When to use:** When individual records need to be updated independently (per-meal regeneration requires a real DB row with an id to PATCH).

**Example (target schema additions):**
```prisma
// Source: CONTEXT.md locked decisions
model MealPlan {
  id          String   @id @default(cuid())
  tripId      String   @unique
  generatedAt DateTime @default(now())
  notes       String?
  createdAt   DateTime @default(now())

  trip  Trip   @relation(fields: [tripId], references: [id], onDelete: Cascade)
  meals Meal[]
}

model Meal {
  id               String   @id @default(cuid())
  mealPlanId       String
  day              Int      // 1-based
  slot             String   // "breakfast" | "lunch" | "dinner" | "snack"
  name             String
  description      String?
  ingredients      String   // JSON array of {item, quantity, unit}
  cookInstructions String?
  prepNotes        String?
  estimatedMinutes Int?
  createdAt        DateTime @default(now())

  mealPlan MealPlan @relation(fields: [mealPlanId], references: [id], onDelete: Cascade)

  @@index([mealPlanId])
  @@index([mealPlanId, day, slot])
}
```

### Pattern 2: Migration SQL for Destructive Schema Change

**What:** Drop the `result` and `cachedAt` columns from `MealPlan`, add `notes`. Create new `Meal` table. Since no prod data exists, no data migration is needed.

**Example (migration SQL pattern based on existing migrations):**
```sql
-- Source: prisma/migrations/20260403130000_add_vehicle_checklist_to_trip/migration.sql pattern
-- AlterTable MealPlan: remove old blob columns, add notes
-- Note: SQLite does not support DROP COLUMN in older versions.
-- Prisma handles this via table recreation.

-- CreateTable
CREATE TABLE "Meal" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "mealPlanId" TEXT NOT NULL,
    "day" INTEGER NOT NULL,
    "slot" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "ingredients" TEXT NOT NULL,
    "cookInstructions" TEXT,
    "prepNotes" TEXT,
    "estimatedMinutes" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Meal_mealPlanId_fkey" FOREIGN KEY ("mealPlanId") REFERENCES "MealPlan" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "Meal_mealPlanId_idx" ON "Meal"("mealPlanId");
CREATE INDEX "Meal_mealPlanId_day_slot_idx" ON "Meal"("mealPlanId", "day", "slot");

-- Recreate MealPlan without result/cachedAt (Prisma handles this)
-- AlterTable: add notes column
ALTER TABLE "MealPlan" ADD COLUMN "notes" TEXT;
-- result and cachedAt removal handled by Prisma migration recreation
```

**CRITICAL:** SQLite cannot `DROP COLUMN` in older SQLite versions. Prisma handles this by recreating the table with `prisma migrate dev`. Because the agent environment is non-interactive, use `prisma migrate deploy` after manually creating the migration file — same approach documented in STATE.md for Phase 29.

### Pattern 3: Per-Trip RESTful API Route (Next.js App Router)

**What:** Routes nested under `/api/trips/[id]/` follow the pattern established in Phase 07+ (prep, alternatives, last-stops). The generate route is a separate nested segment.

**Example (generate route structure):**
```typescript
// Source: app/api/trips/[id]/last-stops/route.ts pattern (confirmed existing)
// File: app/api/trips/[id]/meal-plan/generate/route.ts

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: tripId } = await params
  // 1. Fetch trip with location, vehicle, bringingDog
  // 2. Fetch cooking gear (category === 'cook', isWishlist: false)
  // 3. Fetch weather if within 16 days and coordinates exist
  // 4. Call generateMealPlan() with bringingDog
  // 5. Delete existing MealPlan (cascade deletes Meals)
  // 6. Create MealPlan + Meal rows in prisma.$transaction
  // 7. Update Trip.mealPlanGeneratedAt
  // 8. Return { mealPlan: { id, generatedAt, meals: [...] } }
}
```

**Example (per-meal PATCH route):**
```typescript
// File: app/api/trips/[id]/meal-plan/meals/[mealId]/route.ts
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; mealId: string }> }
) {
  const { id: tripId, mealId } = await params
  // 1. Find Meal by mealId, verify it belongs to this trip's meal plan
  // 2. Fetch trip context for regenerateMeal()
  // 3. Call regenerateMeal({ day, slot, tripContext, ... })
  // 4. Update the Meal row with new fields
  // 5. Return updated Meal
}
```

### Pattern 4: regenerateMeal() Claude Function

**What:** New function in `lib/claude.ts` that generates a single meal using trip context and the existing meal's slot/day for contrast.

**Zod schema needed (new in parse-claude.ts):**
```typescript
// Source: CONTEXT.md specifics section
export const SingleMealSchema = z.object({
  name: z.string(),
  description: z.string().optional(),
  ingredients: z.array(z.object({
    item: z.string(),
    quantity: z.string(),
    unit: z.string().optional(),
  })),
  cookInstructions: z.string().optional(),
  prepNotes: z.string().optional(),
  estimatedMinutes: z.number().optional(),
})
```

**Note:** The existing `MealPlanMeal` interface uses `ingredients: string[]`. The new normalized `Meal` model uses `ingredients: JSON array of {item, quantity, unit}`. These are different shapes. The new `regenerateMeal()` function must target the NEW shape (structured objects), not the old string array shape. The existing `generateMealPlan()` still returns the old shape for now — it will need a future refactor once fully migrated, but for this phase the generate route maps old shape to new DB schema.

### Pattern 5: MealPlanClient Component Shape

**What:** New component that fetches from `/api/trips/${id}/meal-plan` (GET), posts to `/api/trips/${id}/meal-plan/generate` (POST), patches `/api/trips/${id}/meal-plan/meals/${mealId}` (PATCH). Per-meal regenerating state keyed by mealId.

**Pattern from VehicleChecklistCard (Phase 29):**
```typescript
// Source: components/VehicleChecklistCard.tsx — confirmed pattern
// - useEffect on mount to fetch existing plan (silent fail)
// - handleGenerate / handleRegenerate with ConfirmDialog guard
// - optimistic update on PATCH
// - inline error state, no alert()
```

**Key difference from VehicleChecklistCard:** MealPlanClient needs per-meal regenerating state (not just one global loading flag):
```typescript
const [regeneratingMealId, setRegeneratingMealId] = useState<string | null>(null)
// Disable all regenerate buttons while any one is in flight
```

### Pattern 6: TripsClient meal plan status indicator

**What:** `TripData` interface in TripsClient does not currently include `mealPlanGeneratedAt`. The trips GET endpoint (`app/api/trips/route.ts`) returns all Trip fields via Prisma `findMany` — `mealPlanGeneratedAt` IS on the Trip model and will be included in the response. The `TripData` interface just needs `mealPlanGeneratedAt: string | null` added, and TripCard needs a badge rendered when non-null.

**Confirmed:** `TripsClient.tsx` TripData interface (line 12-29) does not include `mealPlanGeneratedAt`. The API already returns it (it's on the model). Just add the field to the interface and render the badge.

### Anti-Patterns to Avoid

- **Don't store generated meals as a JSON blob on MealPlan.result** — the whole point of this phase is normalized rows. If Claude returns a flat structure, map it to individual Meal rows in the route handler.
- **Don't attempt `prisma migrate dev` non-interactively** — use `prisma migrate deploy` with a manually written migration file, per Phase 29 decision in STATE.md.
- **Don't call `generateMealPlan()` and expect normalized output** — the existing function returns the old `MealPlanResult` shape with `string[]` ingredients. The generate route must transform this to normalized Meal rows.
- **Don't use `window.alert()` for errors** — use inline state-based error messages (project standard).
- **Don't add `offlineData` prop to MealPlanClient** — the spec doesn't require offline support in this phase (cachedAt is being removed). The old MealPlan.tsx had offline support but it's being dropped.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude response validation | Custom JSON parser | `parseClaudeJSON(text, Schema)` from `lib/parse-claude.ts` | Established in Phase 06; strips markdown fences, handles schema mismatch → 422 |
| Prisma migration for SQLite column removal | Manual ALTER TABLE | `prisma migrate deploy` with manually written migration | SQLite column drop requires table recreation — Prisma handles this |
| Weather fetch for meal context | Duplicate weather logic | Copy the weather fetch block from existing `app/api/meal-plan/route.ts` | Same 16-day window check, same `fetchWeather()` call |
| Cooking gear fetch | Custom query | Same `prisma.gearItem.findMany({ where: { category: 'cook', isWishlist: false } })` pattern from existing route | Already tested pattern |

**Key insight:** The existing `app/api/meal-plan/route.ts` is a complete reference implementation for the generate logic — the new generate route is largely a port of it, with normalized persistence replacing the JSON blob upsert.

---

## Common Pitfalls

### Pitfall 1: Ingredients Shape Mismatch
**What goes wrong:** `generateMealPlan()` returns `ingredients: string[]` (old shape). The `Meal` DB model stores `ingredients` as a JSON string of `{item, quantity, unit}[]` (new shape). If you pass Claude output directly to Prisma create, you'll store the wrong format.
**Why it happens:** The existing Zod schema (`MealPlanMealSchema`) validates `ingredients: z.array(z.string())`. The new `Meal` model uses structured objects.
**How to avoid:** In the generate route, when mapping Claude output to Meal rows, convert `string[]` ingredients to `{item, quantity, unit}[]` objects. Simple conversion: `{ item: ingredientString, quantity: '', unit: '' }`. OR, update `generateMealPlan()`'s prompt and Zod schema to return the new structured shape directly.
**Warning signs:** `ingredients` stored as `["4 flour tortillas", ...]` instead of `[{"item":"4 flour tortillas","quantity":"4","unit":""}]`.

### Pitfall 2: Prisma Migration Fails Non-Interactively
**What goes wrong:** `prisma migrate dev` prompts for confirmation; in agent environment it hangs or fails.
**Why it happens:** `migrate dev` is interactive; `migrate deploy` is non-interactive but only applies existing migration files.
**How to avoid:** Write the `.sql` migration file manually in `prisma/migrations/YYYYMMDDHHMMSS_normalize_meal_plan/migration.sql`, then run `prisma migrate deploy && prisma generate`. Per STATE.md Phase 29 decision.
**Warning signs:** Prisma command hanging or returning "migration needs to be applied" error.

### Pitfall 3: TripData Interface Missing mealPlanGeneratedAt
**What goes wrong:** TripsClient renders trip cards but `mealPlanGeneratedAt` is undefined at runtime even though the API returns it.
**Why it happens:** `TripData` interface (line 12-29 of TripsClient.tsx) doesn't include `mealPlanGeneratedAt`. TypeScript won't error if you just access it with `?.` but the type is missing.
**How to avoid:** Add `mealPlanGeneratedAt: string | null` to the `TripData` interface.
**Warning signs:** Badge never renders even for trips with existing meal plans.

### Pitfall 4: MealPlan CASCADE on Regeneration
**What goes wrong:** When "Regenerate All" is triggered, deleting the MealPlan and creating a new one is straightforward. But if you only delete Meals without deleting MealPlan (to preserve the generatedAt timestamp), the cascade won't fire.
**Why it happens:** `onDelete: Cascade` is on the Meal → MealPlan relation. To replace all meals without replacing the MealPlan header, use `deleteMany({ where: { mealPlanId } })` then re-create meals.
**How to avoid:** Decide in the plan: either always delete+recreate MealPlan (simpler, generatedAt refreshes), or keep MealPlan header and only replace Meal rows. CONTEXT.md says "upsert MealPlan" — use upsert for header, then deleteMany + createMany for meals.
**Warning signs:** Stale meals from previous generation still showing up after regeneration.

### Pitfall 5: TripPrepClient MealPlan section offline prop
**What goes wrong:** Existing `<MealPlan ... offlineData={...} />` passes an `offlineData` prop. The new `<MealPlanClient>` doesn't have this prop. If you just swap the component without removing the prop, TypeScript will error.
**Why it happens:** TripPrepClient.tsx line 362-368 passes `offlineData` to `MealPlan`. `MealPlanClient` won't accept this prop.
**How to avoid:** When updating TripPrepClient, remove the `offlineData` prop — `MealPlanClient` doesn't need it per the spec (offline support deferred).
**Warning signs:** TypeScript build error: "Property 'offlineData' does not exist on type 'MealPlanClientProps'".

### Pitfall 6: Trip.mealPlanGeneratedAt Not Updated After Generate
**What goes wrong:** Meal plan is generated and stored, but `Trip.mealPlanGeneratedAt` is not updated. The prep status in `/api/trips/[id]/prep` will still show "No meal plan yet".
**Why it happens:** The existing `app/api/meal-plan/route.ts` does NOT update `Trip.mealPlanGeneratedAt` — only the `MealPlan` model is upserted. The new generate route must explicitly update `Trip.mealPlanGeneratedAt`.
**How to avoid:** Include `prisma.trip.update({ where: { id: tripId }, data: { mealPlanGeneratedAt: new Date() } })` in the generate route, either in the transaction or after.
**Warning signs:** Prep section still shows "not_started" after generating a meal plan.

---

## Code Examples

### Existing Weather Fetch Block (copy to generate route)
```typescript
// Source: app/api/meal-plan/route.ts lines 76-94 (verified)
let weather = undefined
if (trip.location?.latitude && trip.location?.longitude) {
  const daysOut = Math.ceil(
    (trip.startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  )
  if (daysOut <= 16) {
    try {
      const forecast = await fetchWeather(
        trip.location.latitude,
        trip.location.longitude,
        startDate,
        endDate
      )
      weather = { days: forecast.days, alerts: forecast.alerts }
    } catch (err) {
      console.error('Weather fetch failed (non-blocking):', err)
    }
  }
}
```

### TripPrepClient MealPlan Section (current — to replace)
```typescript
// Source: components/TripPrepClient.tsx lines 362-368 (verified)
{config.key === 'meals' && (
  <MealPlan
    tripId={trip.id}
    tripName={trip.name}
    offlineData={!isOnline && offlineSnapshot?.mealPlan ? offlineSnapshot.mealPlan as import('@/lib/claude').MealPlanResult : undefined}
  />
)}
// Replace with:
{config.key === 'meals' && (
  <MealPlanClient
    tripId={trip.id}
    tripName={trip.name}
  />
)}
```

### Existing Cooking Gear Query (copy to generate route)
```typescript
// Source: app/api/meal-plan/route.ts lines 55-67 (verified)
const cookingGear = await prisma.gearItem.findMany({
  where: { isWishlist: false, category: 'cook' },
  select: { id: true, name: true, brand: true, category: true, weight: true, condition: true },
  orderBy: { name: 'asc' },
})
```

### parseClaudeJSON Usage Pattern
```typescript
// Source: lib/claude.ts lines 467-472 (verified)
const parseResult = parseClaudeJSON(text, SomeZodSchema)
if (!parseResult.success) {
  throw new Error(parseResult.error)
}
return parseResult.data
// In route handler: catch schema mismatch errors → 422, others → 500
```

### VehicleChecklistCard Per-Item Update Pattern (analogous to per-meal)
```typescript
// Source: components/VehicleChecklistCard.tsx lines 68-80 (verified)
const handleCheck = useCallback(
  (itemId: string, checked: boolean) => {
    // Optimistic update
    setChecklist((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        items: prev.items.map((item) =>
          item.id === itemId ? { ...item, checked } : item
        ),
      }
    })
    // Fire-and-forget PATCH to server
  },
  []
)
```

### Test Pattern (from vehicle-checklist-route.test.ts)
```typescript
// Source: tests/vehicle-checklist-route.test.ts lines 1-30 (verified)
// Mock db and claude at top level
vi.mock('@/lib/db', () => ({ prisma: { trip: { findUnique: vi.fn(), ... }, $transaction: vi.fn() } }))
vi.mock('@/lib/claude', () => ({ generateMealPlan: vi.fn(), regenerateMeal: vi.fn() }))
// Use require() inside test bodies for route handlers to prevent compile-time failure
// params are Promise<{ id: string }> per Next.js App Router convention
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| MealPlan.result JSON blob | Normalized Meal rows | Phase 34 (this phase) | Enables per-meal PATCH without full re-generation |
| app/api/meal-plan/route.ts (GET/POST with ?tripId=) | /api/trips/[id]/meal-plan/* (RESTful) | Phase 34 (this phase) | Consistent with all other trip sub-resources |
| MealPlan.tsx (JSON blob renderer, 474 lines) | MealPlanClient.tsx (normalized rows, per-meal regen) | Phase 34 (this phase) | Old component can remain but TripPrepClient won't use it |

**Existing infrastructure not changing:**
- `generateMealPlan()` prompt — kept verbatim (vacuum sealer / sous vide constraints locked)
- `Trip.bringingDog` — already on model, just needs to be passed to generate function
- `Trip.mealPlanGeneratedAt` — already on model, already checked by prep/route.ts
- `MealPlanResultSchema` in parse-claude.ts — still valid for the full-plan generate response

---

## Open Questions

1. **Ingredient shape in generateMealPlan output vs. Meal DB schema**
   - What we know: `generateMealPlan()` returns `ingredients: string[]` (existing Zod schema). The new `Meal` model specifies `ingredients` as JSON array of `{item, quantity, unit}`.
   - What's unclear: Should the generate route do a naive conversion (wrap each string in `{item: str, quantity: '', unit: ''}`), OR should `generateMealPlan()` be updated to return structured objects?
   - Recommendation: Update `generateMealPlan()` prompt and Zod schema to return structured ingredients directly. This is cleaner and avoids lossy conversion. Add a new `SingleMealSchema` to `parse-claude.ts` with `ingredients: z.array(z.object({ item, quantity, unit }))`.

2. **Snack slot persistence**
   - What we know: Existing code uses `snacks: string[]` per day. The new schema has `slot` as a string including "snack".
   - What's unclear: Are snacks stored as one `Meal` row per snack, or one row for all snacks as a JSON list, or omitted per the "snack optional" note?
   - Recommendation: Store snacks as a single `Meal` row per day with `slot: 'snack'` and `name` being a comma-joined summary (e.g., "Trail mix, jerky, apple"). This keeps the schema clean. Planner should document this decision.

3. **MealPlan upsert vs. delete+create on Regenerate All**
   - What we know: CONTEXT.md says upsert MealPlan (one per trip). Meals need to be replaced.
   - What's unclear: Should the generate route use `prisma.$transaction` to delete-all-meals + create-new-meals atomically?
   - Recommendation: Yes — use `prisma.$transaction([ prisma.meal.deleteMany({ where: { mealPlanId } }), prisma.meal.createMany({ data: [...] }), prisma.trip.update({ data: { mealPlanGeneratedAt: new Date() } }) ])` to keep state consistent.

---

## Environment Availability

Step 2.6: SKIPPED — this phase modifies existing code and runs Prisma migrations. No new external dependencies. All tools (node, npm, prisma, vitest) already confirmed present from prior phases.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| MEAL-01 | POST /generate creates MealPlan + Meal rows, updates Trip.mealPlanGeneratedAt | unit | `npx vitest run tests/meal-plan-route.test.ts` | ❌ Wave 0 |
| MEAL-02 | POST /generate passes bringingDog to generateMealPlan | unit | `npx vitest run tests/meal-plan-route.test.ts` | ❌ Wave 0 |
| MEAL-03 | GET /meal-plan returns plan with meals array | unit | `npx vitest run tests/meal-plan-route.test.ts` | ❌ Wave 0 |
| MEAL-04 | DELETE /meal-plan clears MealPlan + cascades Meal rows | unit | `npx vitest run tests/meal-plan-route.test.ts` | ❌ Wave 0 |
| MEAL-05 | PATCH /meals/[mealId] calls regenerateMeal and updates the Meal row | unit | `npx vitest run tests/meal-regenerate-route.test.ts` | ❌ Wave 0 |
| MEAL-06 | PATCH /meals/[mealId] returns 404 when mealId doesn't belong to trip | unit | `npx vitest run tests/meal-regenerate-route.test.ts` | ❌ Wave 0 |
| MEAL-07 | SingleMealSchema validates regenerateMeal output shape | unit | `npx vitest run tests/meal-plan-schema.test.ts` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/meal-plan-route.test.ts tests/meal-regenerate-route.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/meal-plan-route.test.ts` — covers MEAL-01 through MEAL-04
- [ ] `tests/meal-regenerate-route.test.ts` — covers MEAL-05, MEAL-06
- [ ] `tests/meal-plan-schema.test.ts` — covers MEAL-07 (SingleMealSchema Zod validation)

*(No new test infrastructure needed — vitest + existing mocking patterns are sufficient)*

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — current MealPlan model structure (JSON blob confirmed), Trip model fields confirmed
- `lib/claude.ts` lines 116-473 — `MealPlanMeal`, `MealPlanDay`, `MealPlanResult` interfaces + `generateMealPlan()` implementation (verified)
- `lib/parse-claude.ts` lines 53-90 — `MealPlanResultSchema` Zod schema (verified)
- `app/api/meal-plan/route.ts` — existing GET/POST route, weather fetch, cooking gear query (verified)
- `components/MealPlan.tsx` — existing 474-line component, full UI patterns (verified)
- `components/TripPrepClient.tsx` lines 362-368 — current meals section wiring (verified)
- `components/VehicleChecklistCard.tsx` — per-item PATCH pattern (verified)
- `components/TripsClient.tsx` lines 12-29 — TripData interface (verified, missing mealPlanGeneratedAt)
- `tests/vehicle-checklist-route.test.ts` — test pattern (mocking, require() in test bodies, params as Promise) (verified)
- `vitest.config.ts` — test runner config (verified)
- `app/api/trips/route.ts` lines 5-19 — trips GET endpoint (returns all Trip fields including mealPlanGeneratedAt) (verified)
- `app/api/trips/[id]/prep/route.ts` lines 84-95 — mealPlanGeneratedAt usage for prep status (verified)
- `.planning/V2-SESSIONS.md` lines 467-514 — S11 full spec (verified)

### Secondary (MEDIUM confidence)
- STATE.md decisions — Prisma migration via `migrate deploy` in non-interactive agent environment (from Phase 29 decision)

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project, no new installs
- Architecture: HIGH — all patterns verified directly from source files
- Pitfalls: HIGH — each pitfall is grounded in a specific verified code location
- Schema design: HIGH — CONTEXT.md locked decisions are explicit and complete

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable stack, 30-day horizon)
