---
phase: 29-vehicle-pre-trip-checklist
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - lib/parse-claude.ts
  - tests/vehicle-checklist-schema.test.ts
  - tests/vehicle-checklist-route.test.ts
autonomous: true
requirements:
  - SC-1
  - SC-2
  - SC-3
  - SC-4
  - SC-5

must_haves:
  truths:
    - "VehicleChecklistResultSchema validates Claude output with id, text, checked fields"
    - "Trip model has vehicleChecklistResult and vehicleChecklistGeneratedAt fields"
    - "Test files exist and pass for schema validation and route behavior"
  artifacts:
    - path: "prisma/schema.prisma"
      provides: "vehicleChecklistResult and vehicleChecklistGeneratedAt fields on Trip model"
      contains: "vehicleChecklistResult"
    - path: "lib/parse-claude.ts"
      provides: "VehicleChecklistResultSchema and exported types"
      exports: ["VehicleChecklistResultSchema", "VehicleChecklistResult", "VehicleChecklistItem"]
    - path: "tests/vehicle-checklist-schema.test.ts"
      provides: "Zod schema unit tests"
      min_lines: 30
    - path: "tests/vehicle-checklist-route.test.ts"
      provides: "Route unit tests with mocked Prisma and Claude"
      min_lines: 50
  key_links:
    - from: "lib/parse-claude.ts"
      to: "tests/vehicle-checklist-schema.test.ts"
      via: "import VehicleChecklistResultSchema"
      pattern: "VehicleChecklistResultSchema"
---

<objective>
Add the Vehicle Checklist schema foundation: Prisma migration (two fields on Trip), Zod validation schema in parse-claude.ts, and Wave 0 test scaffolds for both schema validation and route behavior.

Purpose: Establish the data layer and test infrastructure before API routes and UI are built.
Output: Migration applied, Zod types exported, two test files passing.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/STATE.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-CONTEXT.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-RESEARCH.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-VALIDATION.md

<interfaces>
<!-- Existing Zod schema pattern from lib/parse-claude.ts -->
From lib/parse-claude.ts (DepartureChecklist pattern to follow):
```typescript
const DepartureChecklistItemSchema = z.object({
  id: z.string(),
  text: z.string(),
  checked: z.boolean().default(false),
  isUnpackedWarning: z.boolean().default(false),
  suggestedTime: z.string().nullable().optional(),
})

export const DepartureChecklistResultSchema = z.object({
  slots: z.array(DepartureChecklistSlotSchema),
})

export type DepartureChecklistResult = z.infer<typeof DepartureChecklistResultSchema>
```

From prisma/schema.prisma (Trip model — existing JSON blob pattern):
```prisma
model Trip {
  packingListResult      String?   // JSON blob of PackingListResult
  packingListGeneratedAt DateTime?
  // Phase 29 adds two more fields following this exact pattern
}
```

From tests/departure-checklist-schema.test.ts (test pattern):
```typescript
import { DepartureChecklistResultSchema } from '@/lib/parse-claude'
import { z } from 'zod'

// Inline item schema for direct testing
const ItemSchema = z.object({ id: z.string(), text: z.string(), ... })

describe('DepartureChecklistResultSchema', () => {
  it('parses slots with mixed items', () => { ... })
})
```

From tests/departure-checklist-route.test.ts (mock pattern):
```typescript
vi.mock('@/lib/db', () => ({ prisma: { trip: { findUnique: vi.fn() }, departureChecklist: { upsert: vi.fn() } } }))
vi.mock('@/lib/claude', () => ({ generateDepartureChecklist: vi.fn() }))
```
</interfaces>
</context>

<tasks>

<task type="auto" tdd="true">
  <name>Task 1: Prisma migration + Zod schema + schema tests</name>
  <files>prisma/schema.prisma, lib/parse-claude.ts, tests/vehicle-checklist-schema.test.ts</files>
  <read_first>
    - prisma/schema.prisma (current Trip model shape — lines 178-216)
    - lib/parse-claude.ts (existing Zod schemas — full file)
    - tests/departure-checklist-schema.test.ts (test pattern to follow)
  </read_first>
  <behavior>
    - Test 1: VehicleChecklistItemSchema accepts {id: "vc-0", text: "Check tire pressure", checked: false} and parses successfully
    - Test 2: VehicleChecklistItemSchema defaults checked to false when omitted
    - Test 3: VehicleChecklistResultSchema accepts {items: [{id: "vc-0", text: "...", checked: false}, {id: "vc-1", text: "...", checked: true}]}
    - Test 4: VehicleChecklistResultSchema rejects empty object (missing items array)
    - Test 5: VehicleChecklistResultSchema rejects items with missing id field
  </behavior>
  <action>
    1. Add two fields to the Trip model in prisma/schema.prisma, immediately after the `departureTime` field (line ~198):
       ```
       vehicleChecklistResult      String?   // Phase 29: JSON blob of VehicleChecklistResult
       vehicleChecklistGeneratedAt DateTime? // Phase 29: when vehicle checklist was last generated
       ```
    2. Run `npx prisma migrate dev --name add-vehicle-checklist-to-trip`
    3. Add Zod schemas to lib/parse-claude.ts at the end of the file (before any closing comments), following the DepartureChecklist pattern:
       ```typescript
       // --- Vehicle Checklist Schemas (Phase 29) ---

       const VehicleChecklistItemSchema = z.object({
         id: z.string(),
         text: z.string(),
         checked: z.boolean().default(false),
       })

       export const VehicleChecklistResultSchema = z.object({
         items: z.array(VehicleChecklistItemSchema),
       })

       export type VehicleChecklistResult = z.infer<typeof VehicleChecklistResultSchema>
       export type VehicleChecklistItem = z.infer<typeof VehicleChecklistItemSchema>
       ```
    4. Create tests/vehicle-checklist-schema.test.ts following the departure-checklist-schema.test.ts pattern. Import VehicleChecklistResultSchema from '@/lib/parse-claude'. Write 5 tests per the behavior block above.
  </action>
  <verify>
    <automated>npx vitest run tests/vehicle-checklist-schema.test.ts</automated>
  </verify>
  <acceptance_criteria>
    - prisma/schema.prisma contains `vehicleChecklistResult      String?`
    - prisma/schema.prisma contains `vehicleChecklistGeneratedAt DateTime?`
    - lib/parse-claude.ts contains `export const VehicleChecklistResultSchema`
    - lib/parse-claude.ts contains `export type VehicleChecklistResult`
    - lib/parse-claude.ts contains `export type VehicleChecklistItem`
    - tests/vehicle-checklist-schema.test.ts exists and contains `describe('VehicleChecklistResultSchema'`
    - `npx vitest run tests/vehicle-checklist-schema.test.ts` exits 0
    - `npx prisma migrate status` shows no pending migrations
  </acceptance_criteria>
  <done>Prisma migration applied, Zod schema exports available, 5 schema tests passing</done>
</task>

<task type="auto" tdd="true">
  <name>Task 2: Route test scaffolds for vehicle checklist API</name>
  <files>tests/vehicle-checklist-route.test.ts</files>
  <read_first>
    - tests/departure-checklist-route.test.ts (full file — mock pattern and test structure to follow)
    - lib/parse-claude.ts (VehicleChecklistResultSchema just added in Task 1)
  </read_first>
  <behavior>
    - Test 1: POST /api/vehicle-checklist with valid tripId calls generateVehicleChecklist with vehicle specs (year, make, model, drivetrain, groundClearance) and trip context (trip days, destination name, roadCondition, clearanceNeeded) per D-04
    - Test 2: POST /api/vehicle-checklist with tripId whose trip has no vehicle returns 400 with error message "No vehicle assigned to this trip"
    - Test 3: PATCH /api/vehicle-checklist/[tripId]/check with {itemId: "vc-0", checked: true} updates the item in the JSON blob and returns {success: true}
    - Test 4: PATCH /api/vehicle-checklist/[tripId]/check with non-existent itemId returns 400
  </behavior>
  <action>
    Create tests/vehicle-checklist-route.test.ts following the departure-checklist-route.test.ts mock pattern.

    Mock setup:
    ```typescript
    vi.mock('@/lib/db', () => ({
      prisma: {
        trip: { findUnique: vi.fn(), update: vi.fn() },
        $transaction: vi.fn(),
      },
    }))
    vi.mock('@/lib/claude', () => ({
      generateVehicleChecklist: vi.fn(),
    }))
    ```

    Mock data — trip with vehicle:
    ```typescript
    const mockTripWithVehicle = {
      id: 'trip-1',
      name: 'Weekend at Linville Gorge',
      startDate: new Date('2026-05-01'),
      endDate: new Date('2026-05-03'),
      vehicleChecklistResult: null,
      vehicleChecklistGeneratedAt: null,
      location: { name: 'Linville Gorge', roadCondition: 'dirt', clearanceNeeded: 'high' },
      vehicle: { id: 'v-1', year: 2022, make: 'Hyundai', model: 'Santa Fe Hybrid', drivetrain: 'AWD', groundClearance: 8.0 },
    }
    ```

    Mock data — trip without vehicle:
    ```typescript
    const mockTripNoVehicle = { ...mockTripWithVehicle, id: 'trip-2', vehicle: null, vehicleId: null }
    ```

    Mock checklist result:
    ```typescript
    const mockChecklistResult = {
      items: [
        { id: 'vc-0', text: 'Check tire pressure (all four + spare)', checked: false },
        { id: 'vc-1', text: 'Verify oil level on dipstick', checked: false },
      ],
    }
    ```

    Write 4 tests per the behavior block. Tests for POST import from `@/app/api/vehicle-checklist/route`. Tests for PATCH import from `@/app/api/vehicle-checklist/[tripId]/check/route`. Since these route files do not exist yet, the tests will FAIL (RED state) — this is expected. They will pass after Plan 02 implements the routes.

    NOTE: Write the tests so they reference the correct import paths. The tests will fail with MODULE_NOT_FOUND until Plan 02 creates the route files. This is intentional TDD — RED state tests written first.
  </action>
  <verify>
    <automated>npx vitest run tests/vehicle-checklist-route.test.ts 2>&1 | head -5</automated>
  </verify>
  <acceptance_criteria>
    - tests/vehicle-checklist-route.test.ts exists
    - tests/vehicle-checklist-route.test.ts contains `vi.mock('@/lib/db'`
    - tests/vehicle-checklist-route.test.ts contains `vi.mock('@/lib/claude'`
    - tests/vehicle-checklist-route.test.ts contains `describe('POST /api/vehicle-checklist'`
    - tests/vehicle-checklist-route.test.ts contains `describe('PATCH /api/vehicle-checklist/[tripId]/check'`
    - tests/vehicle-checklist-route.test.ts contains at least 4 `it(` test cases
    - Tests reference import paths `@/app/api/vehicle-checklist/route` and `@/app/api/vehicle-checklist/[tripId]/check/route`
  </acceptance_criteria>
  <done>4 route tests written in RED state (will fail until Plan 02 creates route files), test file committed</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/vehicle-checklist-schema.test.ts` — all 5 tests pass
- `npx prisma migrate status` — no pending migrations
- `npx vitest run tests/vehicle-checklist-route.test.ts` — tests exist but fail (RED state, expected)
- lib/parse-claude.ts exports VehicleChecklistResultSchema, VehicleChecklistResult, VehicleChecklistItem
</verification>

<success_criteria>
- Trip model has vehicleChecklistResult (String?) and vehicleChecklistGeneratedAt (DateTime?) fields
- Zod schema validates {items: [{id, text, checked}]} structure
- Schema test file passes with 5 tests
- Route test file exists with 4 tests (RED state)
- No build regressions: `npm run build` passes
</success_criteria>

<output>
After completion, create `.planning/phases/29-vehicle-pre-trip-checklist/29-01-SUMMARY.md`
</output>
