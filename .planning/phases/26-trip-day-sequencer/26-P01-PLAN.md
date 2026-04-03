---
phase: 26-trip-day-sequencer
plan: 26-P01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - lib/parse-claude.ts
  - app/api/trips/[id]/route.ts
  - tests/departure-checklist-schema.test.ts
  - tests/trip-patch-departure-time.test.ts
autonomous: true
requirements: [D-09, D-10]

must_haves:
  truths:
    - "Trip model has departureTime DateTime? field in the database"
    - "DepartureChecklistItemSchema accepts suggestedTime as string, null, or absent"
    - "PATCH /api/trips/[id] accepts departureTime and persists it"
    - "Existing checklists without suggestedTime still parse successfully"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "departureTime DateTime? on Trip model"
      contains: "departureTime"
    - path: "lib/parse-claude.ts"
      provides: "suggestedTime field on DepartureChecklistItemSchema"
      contains: "suggestedTime"
    - path: "app/api/trips/[id]/route.ts"
      provides: "PATCH handler for departureTime"
      exports: ["PATCH"]
    - path: "tests/departure-checklist-schema.test.ts"
      provides: "Zod schema validation tests for suggestedTime"
    - path: "tests/trip-patch-departure-time.test.ts"
      provides: "PATCH route handler tests"
  key_links:
    - from: "app/api/trips/[id]/route.ts"
      to: "prisma.trip.update"
      via: "PATCH handler"
      pattern: "prisma\\.trip\\.update"
    - from: "lib/parse-claude.ts"
      to: "DepartureChecklistItemSchema"
      via: "suggestedTime field"
      pattern: "suggestedTime.*z\\.string"
---

<objective>
Add the departureTime field to Trip model, extend the DepartureChecklist Zod schema with suggestedTime, add PATCH handler for departureTime, and create Wave 0 test scaffolds.

Purpose: Foundation layer — schema and validation must exist before the Claude prompt or UI can use them.
Output: Migration applied, Zod schema extended, PATCH endpoint working, tests green.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/26-trip-day-sequencer/26-CONTEXT.md
@.planning/phases/26-trip-day-sequencer/26-RESEARCH.md
@.planning/phases/26-trip-day-sequencer/26-VALIDATION.md

<interfaces>
<!-- Key types and contracts the executor needs. Extracted from codebase. -->

From lib/parse-claude.ts (lines 94-111):
```typescript
const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
})

const DepartureChecklistSlotSchema = z.object({
  label: z.string(),
  items: z.array(DepartureChecklistItemSchema),
})

export const DepartureChecklistResultSchema = z.object({
  slots: z.array(DepartureChecklistSlotSchema),
})

export type DepartureChecklistResult = z.infer<typeof DepartureChecklistResultSchema>
export type DepartureChecklistItem = z.infer<typeof DepartureChecklistItemSchema>
export type DepartureChecklistSlot = z.infer<typeof DepartureChecklistSlotSchema>
```

From app/api/trips/[id]/route.ts (line 5):
```typescript
type Params = { params: Promise<{ id: string }> }
```

From prisma/schema.prisma Trip model (lines 178-215):
```prisma
model Trip {
  id          String   @id @default(cuid())
  name        String
  startDate   DateTime
  endDate     DateTime
  locationId  String?
  vehicleId   String?
  notes       String?
  weatherNotes String?
  currentBatteryPct  Float?
  batteryUpdatedAt   DateTime?
  // ... other fields
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  // ... relations
}
```

From lib/validate.ts:
```typescript
export function isValidDate(value: unknown): Date | null
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Prisma migration + Zod schema + Wave 0 tests</name>
  <files>prisma/schema.prisma, lib/parse-claude.ts, tests/departure-checklist-schema.test.ts</files>
  <read_first>
    - prisma/schema.prisma (current Trip model at line 178)
    - lib/parse-claude.ts (DepartureChecklistItemSchema at line 94)
    - tests/overpass.test.ts (existing test patterns for reference)
    - .planning/phases/26-trip-day-sequencer/26-RESEARCH.md
  </read_first>
  <behavior>
    - Test 1: DepartureChecklistItemSchema.parse({ id: "chk-0-0", text: "Pack bags", checked: false, isUnpackedWarning: false, suggestedTime: "9:00 PM Thu" }) succeeds and returns suggestedTime as "9:00 PM Thu"
    - Test 2: DepartureChecklistItemSchema.parse({ id: "chk-0-0", text: "Pack bags", checked: false, isUnpackedWarning: false, suggestedTime: null }) succeeds and returns suggestedTime as null
    - Test 3: DepartureChecklistItemSchema.parse({ id: "chk-0-0", text: "Pack bags", checked: false, isUnpackedWarning: false }) succeeds (suggestedTime absent is ok — backwards compat)
    - Test 4: Full DepartureChecklistResultSchema.parse with slots containing mixed items (some with suggestedTime, some without) succeeds
  </behavior>
  <action>
    1. Add `departureTime DateTime?` field to the Trip model in prisma/schema.prisma, placed after `permitNotes` and before `fallbackFor`. Add comment: `// Phase 26: departure time anchor for day sequencer`.

    2. Run `npx prisma migrate dev --name add_departure_time_to_trip` to create and apply the migration.

    3. In lib/parse-claude.ts, modify the DepartureChecklistItemSchema (line 94-99) to add suggestedTime:
       ```typescript
       const DepartureChecklistItemSchema = z.object({
         id: z.string(),
         text: z.string(),
         checked: z.boolean().default(false),
         isUnpackedWarning: z.boolean().default(false),
         suggestedTime: z.string().nullable().optional(),
       })
       ```
       This is backwards compatible per D-09 — old checklists without the field parse fine.

    4. Create tests/departure-checklist-schema.test.ts with 4 tests per the behavior block above. Import DepartureChecklistItemSchema and DepartureChecklistResultSchema from '@/lib/parse-claude'. Use vitest describe/it/expect pattern matching existing tests in tests/overpass.test.ts.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx vitest run tests/departure-checklist-schema.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - prisma/schema.prisma contains `departureTime  DateTime?` inside model Trip
    - prisma/migrations/ has a new directory containing migration.sql with `ALTER TABLE "Trip" ADD COLUMN "departureTime" DATETIME`
    - lib/parse-claude.ts line containing DepartureChecklistItemSchema has `suggestedTime: z.string().nullable().optional()`
    - tests/departure-checklist-schema.test.ts exists and contains `describe('DepartureChecklistItemSchema'`
    - `npx vitest run tests/departure-checklist-schema.test.ts` exits 0 with 4 passing tests
  </acceptance_criteria>
  <done>departureTime field exists in DB, suggestedTime accepted by Zod schema in all 3 forms (string, null, absent), tests green</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: PATCH handler for departureTime + tests</name>
  <files>app/api/trips/[id]/route.ts, tests/trip-patch-departure-time.test.ts</files>
  <read_first>
    - app/api/trips/[id]/route.ts (full file — GET/PUT/DELETE handlers, Params type)
    - lib/validate.ts (isValidDate signature)
    - tests/last-stops-route.test.ts (existing API route test patterns)
    - .planning/phases/26-trip-day-sequencer/26-RESEARCH.md (PATCH pattern section)
  </read_first>
  <behavior>
    - Test 1: PATCH with valid ISO string `{ departureTime: "2026-04-18T07:00:00" }` returns 200 with departureTime as ISO string
    - Test 2: PATCH with `{ departureTime: null }` returns 200 with departureTime as null (clears it)
    - Test 3: PATCH to nonexistent trip ID returns 404 with `{ error: 'Trip not found' }`
  </behavior>
  <action>
    Add a PATCH export to app/api/trips/[id]/route.ts after the existing DELETE handler. The PATCH handler:
    1. Extracts `id` from `await params`
    2. Reads `data.departureTime` from request body
    3. If `data.departureTime` is truthy, converts via `new Date(data.departureTime)`. If null/undefined, sets to null.
    4. Calls `prisma.trip.update({ where: { id }, data: { departureTime } })`
    5. Returns `NextResponse.json({ departureTime: trip.departureTime?.toISOString() ?? null })`
    6. Catches Prisma P2025 (not found) and returns 404
    7. Catches other errors with console.error + 500

    Exact implementation:
    ```typescript
    export async function PATCH(req: NextRequest, { params }: Params) {
      try {
        const { id } = await params
        const data = await req.json()
        const departureTime = data.departureTime ? new Date(data.departureTime) : null
        const trip = await prisma.trip.update({
          where: { id },
          data: { departureTime },
        })
        return NextResponse.json({ departureTime: trip.departureTime?.toISOString() ?? null })
      } catch (error) {
        if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        console.error('Failed to update departure time:', error)
        return NextResponse.json({ error: 'Failed to update departure time' }, { status: 500 })
      }
    }
    ```

    Create tests/trip-patch-departure-time.test.ts with 3 tests per the behavior block. Mock prisma.trip.update using vi.mock('@/lib/db'). Follow the same mocking pattern as tests/last-stops-route.test.ts.
  </action>
  <verify>
    <automated>cd "/Users/willis/Camping Manager/.claude/worktrees/relaxed-dubinsky" && npx vitest run tests/trip-patch-departure-time.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - app/api/trips/[id]/route.ts contains `export async function PATCH`
    - app/api/trips/[id]/route.ts PATCH handler contains `prisma.trip.update`
    - app/api/trips/[id]/route.ts PATCH handler contains `data.departureTime ? new Date(data.departureTime) : null`
    - app/api/trips/[id]/route.ts PATCH handler catches P2025 and returns 404
    - tests/trip-patch-departure-time.test.ts exists and contains `describe(`
    - `npx vitest run tests/trip-patch-departure-time.test.ts` exits 0 with 3 passing tests
  </acceptance_criteria>
  <done>PATCH /api/trips/[id] accepts departureTime (ISO string or null), persists to DB, returns updated value, tests green</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/departure-checklist-schema.test.ts tests/trip-patch-departure-time.test.ts` — all 7 tests pass
- `npx prisma migrate status` shows no pending migrations
- `npm run build` passes (no type errors from schema changes)
</verification>

<success_criteria>
- Trip.departureTime field exists in SQLite database
- DepartureChecklistItemSchema accepts suggestedTime in all 3 forms
- PATCH endpoint operational for setting/clearing departureTime
- 7 tests green across 2 test files
</success_criteria>

<output>
After completion, create `.planning/phases/26-trip-day-sequencer/26-P01-SUMMARY.md`
</output>
