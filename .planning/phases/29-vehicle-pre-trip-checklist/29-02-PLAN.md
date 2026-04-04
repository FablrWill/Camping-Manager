---
phase: 29-vehicle-pre-trip-checklist
plan: 02
type: execute
wave: 2
depends_on: ["29-01"]
files_modified:
  - lib/claude.ts
  - app/api/vehicle-checklist/route.ts
  - app/api/vehicle-checklist/[tripId]/check/route.ts
autonomous: true
requirements:
  - SC-1
  - SC-2
  - SC-3
  - SC-4

must_haves:
  truths:
    - "POST /api/vehicle-checklist generates a vehicle checklist via Claude and persists it on Trip"
    - "GET /api/vehicle-checklist returns the stored checklist for a trip"
    - "PATCH /api/vehicle-checklist/[tripId]/check toggles a checklist item's checked state"
    - "No-vehicle trips return 400 from generation endpoint"
  artifacts:
    - path: "lib/claude.ts"
      provides: "generateVehicleChecklist function"
      exports: ["generateVehicleChecklist"]
    - path: "app/api/vehicle-checklist/route.ts"
      provides: "GET + POST for vehicle checklist generation and retrieval"
      exports: ["GET", "POST"]
    - path: "app/api/vehicle-checklist/[tripId]/check/route.ts"
      provides: "PATCH for toggling checklist item checked state"
      exports: ["PATCH"]
  key_links:
    - from: "app/api/vehicle-checklist/route.ts"
      to: "lib/claude.ts"
      via: "generateVehicleChecklist() call"
      pattern: "generateVehicleChecklist"
    - from: "app/api/vehicle-checklist/route.ts"
      to: "lib/parse-claude.ts"
      via: "parseClaudeJSON + VehicleChecklistResultSchema"
      pattern: "parseClaudeJSON.*VehicleChecklistResultSchema"
    - from: "app/api/vehicle-checklist/[tripId]/check/route.ts"
      to: "lib/safe-json.ts"
      via: "safeJsonParse for reading JSON blob"
      pattern: "safeJsonParse"
---

<objective>
Implement the two API route files and the Claude generation function for vehicle checklists. This is the backend layer between the schema (Plan 01) and the UI (Plan 03).

Purpose: Provide working API endpoints that generate, retrieve, and toggle vehicle checklist items.
Output: generateVehicleChecklist in lib/claude.ts, GET+POST route, PATCH check-off route — all passing the RED tests from Plan 01.
</objective>

<execution_context>
@$HOME/.claude/get-shit-done/workflows/execute-plan.md
@$HOME/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/PROJECT.md
@.planning/ROADMAP.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-CONTEXT.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-RESEARCH.md
@.planning/phases/29-vehicle-pre-trip-checklist/29-01-SUMMARY.md

<interfaces>
<!-- From lib/parse-claude.ts (created in Plan 01) -->
```typescript
export const VehicleChecklistResultSchema = z.object({
  items: z.array(z.object({
    id: z.string(),
    text: z.string(),
    checked: z.boolean().default(false),
  })),
})
export type VehicleChecklistResult = z.infer<typeof VehicleChecklistResultSchema>
export type VehicleChecklistItem = z.infer<typeof VehicleChecklistItemSchema>
```

<!-- From lib/parse-claude.ts (parseClaudeJSON signature) -->
```typescript
export function parseClaudeJSON<T>(
  raw: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string }
```

<!-- From lib/safe-json.ts -->
```typescript
export function safeJsonParse<T>(raw: string): T | null
```

<!-- From lib/claude.ts (existing generation function signature pattern) -->
```typescript
export async function generateDepartureChecklist(params: {
  tripName: string
  startDate: string
  endDate: string
  // ...etc
}): Promise<DepartureChecklistResult>
```

<!-- From app/api/departure-checklist/[id]/check/route.ts (check-off pattern) -->
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Uses prisma.$transaction to prevent race conditions
}
```

<!-- From prisma/schema.prisma Trip model (relevant fields) -->
```prisma
model Trip {
  vehicleChecklistResult      String?
  vehicleChecklistGeneratedAt DateTime?
  vehicleId   String?
  locationId  String?
  vehicle     Vehicle?  @relation(...)
  location    Location? @relation(...)
}
```

<!-- From prisma/schema.prisma Vehicle model -->
```prisma
model Vehicle {
  year            Int?
  make            String?
  model           String?
  drivetrain      String?
  groundClearance Float?
}
```

<!-- From prisma/schema.prisma Location model (relevant fields) -->
```prisma
model Location {
  name          String
  roadCondition String?
  clearanceNeeded String?
}
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: generateVehicleChecklist in lib/claude.ts + generation API route</name>
  <files>lib/claude.ts, app/api/vehicle-checklist/route.ts</files>
  <read_first>
    - lib/claude.ts (full file — existing generation function patterns, especially generateDepartureChecklist at line ~430)
    - app/api/meal-plan/route.ts (GET+POST pattern for Claude generation + JSON blob persistence)
    - app/api/packing-list/route.ts (GET pattern for reading Trip JSON blob field)
    - lib/parse-claude.ts (parseClaudeJSON function + VehicleChecklistResultSchema added in Plan 01)
    - prisma/schema.prisma (Trip model with new fields, Vehicle model, Location model)
  </read_first>
  <action>
    **Step 1: Add generateVehicleChecklist to lib/claude.ts**

    Add after the existing `generateDepartureChecklist` function (around line ~530). Follow the exact same pattern:

    ```typescript
    export async function generateVehicleChecklist(params: {
      vehicleYear: number | null
      vehicleMake: string | null
      vehicleModel: string | null
      drivetrain: string | null
      groundClearance: number | null
      tripDays: number
      destinationName: string | null
      roadCondition: string | null
      clearanceNeeded: string | null
    }): Promise<VehicleChecklistResult> {
    ```

    Import `VehicleChecklistResult` and `VehicleChecklistResultSchema` from `@/lib/parse-claude`.

    Claude prompt (per D-04, exactly this structure):
    ```
    You are a vehicle pre-trip inspection assistant for car camping.
    Generate a practical, action-oriented pre-trip checklist specific to this vehicle and trip.

    VEHICLE:
    - Year/Make/Model: ${params.vehicleYear ?? 'Unknown'} ${params.vehicleMake ?? ''} ${params.vehicleModel ?? ''}
    - Drivetrain: ${params.drivetrain ?? 'Unknown'}
    - Ground Clearance: ${params.groundClearance != null ? `${params.groundClearance}"` : 'Unknown'}

    TRIP CONTEXT:
    - Duration: ${params.tripDays} day${params.tripDays !== 1 ? 's' : ''}
    ${params.destinationName ? `- Destination: ${params.destinationName}` : ''}
    ${params.roadCondition ? `- Road Condition: ${params.roadCondition}` : ''}
    ${params.clearanceNeeded ? `- Clearance Needed: ${params.clearanceNeeded}` : ''}

    INSTRUCTIONS:
    1. Generate 8-15 practical checklist items for this specific vehicle.
    2. Each item should be action-oriented (verb-first: "Check", "Verify", "Inflate", "Top off").
    3. Cover: tires, fluids (oil, coolant, washer fluid), lights, battery, emergency kit, cargo security.
    4. If road condition indicates dirt/off-road, include items for that (skid plate check, recovery gear, etc.).
    5. Generate a unique ID for each item using format "vc-{index}" (0-based).
    6. All items start with checked: false.

    Respond ONLY with valid JSON (no markdown):
    {"items": [{"id": "vc-0", "text": "Check tire pressure (front/rear)", "checked": false}]}
    ```

    Use model `claude-sonnet-4-20250514`, max_tokens 1024. Parse with `parseClaudeJSON(text, VehicleChecklistResultSchema)`. If parse fails, throw with the error message (same pattern as other generators).

    **Step 2: Create app/api/vehicle-checklist/route.ts**

    GET handler:
    - Read `tripId` from URL searchParams
    - If missing, return 400 `{ error: 'tripId is required' }`
    - `prisma.trip.findUnique({ where: { id: tripId }, select: { vehicleChecklistResult: true, vehicleChecklistGeneratedAt: true } })`
    - If trip not found, return 404
    - If `vehicleChecklistResult` is null, return `{ result: null, generatedAt: null }`
    - Parse with `safeJsonParse<VehicleChecklistResult>` and return `{ result, generatedAt }`

    POST handler:
    - Read `{ tripId }` from request body
    - `prisma.trip.findUnique({ where: { id: tripId }, include: { vehicle: true, location: true } })`
    - If trip not found, return 404 `{ error: 'Trip not found' }`
    - If `trip.vehicle === null`, return 400 `{ error: 'No vehicle assigned to this trip' }`
    - Calculate tripDays: `Math.ceil((endDate - startDate) / 86400000)` or 1 minimum
    - Call `generateVehicleChecklist({ vehicleYear: trip.vehicle.year, vehicleMake: trip.vehicle.make, vehicleModel: trip.vehicle.model, drivetrain: trip.vehicle.drivetrain, groundClearance: trip.vehicle.groundClearance, tripDays, destinationName: trip.location?.name ?? null, roadCondition: trip.location?.roadCondition ?? null, clearanceNeeded: trip.location?.clearanceNeeded ?? null })`
    - Persist: `prisma.trip.update({ where: { id: tripId }, data: { vehicleChecklistResult: JSON.stringify(result), vehicleChecklistGeneratedAt: new Date() } })`
    - Return 200 `{ result, generatedAt: new Date().toISOString() }`

    Wrap both handlers in try-catch. Log errors with `console.error('Failed to [action]:', error)`. Return 500 `{ error: 'user-friendly message' }`.

    Per D-03: AI-generated, not static template.
    Per D-04: Two inputs only — vehicle specs + trip context. No mods, no weather (D-05).
  </action>
  <verify>
    <automated>npx vitest run tests/vehicle-checklist-route.test.ts --reporter=verbose 2>&1 | grep -E "PASS|FAIL|Test 1|Test 2"</automated>
  </verify>
  <acceptance_criteria>
    - lib/claude.ts contains `export async function generateVehicleChecklist(`
    - lib/claude.ts contains `VehicleChecklistResultSchema` import or usage
    - lib/claude.ts generateVehicleChecklist prompt contains `VEHICLE:` and `TRIP CONTEXT:` sections
    - lib/claude.ts generateVehicleChecklist prompt does NOT contain `mods` or `weather` (per D-05)
    - app/api/vehicle-checklist/route.ts exists
    - app/api/vehicle-checklist/route.ts contains `export async function GET(`
    - app/api/vehicle-checklist/route.ts contains `export async function POST(`
    - app/api/vehicle-checklist/route.ts contains `No vehicle assigned to this trip`
    - app/api/vehicle-checklist/route.ts contains `try {` and `catch` blocks
    - app/api/vehicle-checklist/route.ts contains `console.error(`
    - Tests 1 and 2 in tests/vehicle-checklist-route.test.ts pass (POST with/without vehicle)
  </acceptance_criteria>
  <done>generateVehicleChecklist function works, GET+POST route handles generation, retrieval, and no-vehicle edge case</done>
</task>

<task type="auto">
  <name>Task 2: PATCH check-off route for vehicle checklist items</name>
  <files>app/api/vehicle-checklist/[tripId]/check/route.ts</files>
  <read_first>
    - app/api/departure-checklist/[id]/check/route.ts (check-off pattern with $transaction)
    - app/api/vehicle-checklist/route.ts (just created in Task 1 — confirm Trip field names)
    - lib/safe-json.ts (safeJsonParse function)
  </read_first>
  <action>
    Create `app/api/vehicle-checklist/[tripId]/check/route.ts` with a single PATCH handler.

    Key differences from departure-checklist check route:
    - Route param is `tripId` (not `id`) — folder is `[tripId]`
    - Reads from `trip.vehicleChecklistResult` (not a separate DepartureChecklist model)
    - Writes back to `prisma.trip.update` (not prisma.departureChecklist.update)

    Implementation:
    ```typescript
    import { NextRequest, NextResponse } from 'next/server'
    import { prisma } from '@/lib/db'
    import { safeJsonParse } from '@/lib/safe-json'
    import type { VehicleChecklistResult } from '@/lib/parse-claude'

    export async function PATCH(
      request: NextRequest,
      { params }: { params: Promise<{ tripId: string }> }
    ) {
      try {
        const { tripId } = await params
        const { itemId, checked } = await request.json()

        if (!itemId || typeof checked !== 'boolean') {
          return NextResponse.json({ error: 'itemId and checked (boolean) are required' }, { status: 400 })
        }

        await prisma.$transaction(async (tx) => {
          const trip = await tx.trip.findUnique({ where: { id: tripId } })
          if (!trip) throw new Error('NOT_FOUND')
          if (!trip.vehicleChecklistResult) throw new Error('NO_CHECKLIST')

          const result = safeJsonParse<VehicleChecklistResult>(trip.vehicleChecklistResult)
          if (!result) throw new Error('PARSE_ERROR')

          const item = result.items.find(i => i.id === itemId)
          if (!item) throw new Error('ITEM_NOT_FOUND')

          // Mutation is acceptable here — local object inside transaction scope, not React state
          const updatedItems = result.items.map(i =>
            i.id === itemId ? { ...i, checked } : i
          )

          await tx.trip.update({
            where: { id: tripId },
            data: { vehicleChecklistResult: JSON.stringify({ items: updatedItems }) },
          })
        })

        return NextResponse.json({ success: true })
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown error'
        if (message === 'NOT_FOUND') {
          return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
        }
        if (message === 'NO_CHECKLIST' || message === 'PARSE_ERROR') {
          return NextResponse.json({ error: 'No checklist found for this trip' }, { status: 400 })
        }
        if (message === 'ITEM_NOT_FOUND') {
          return NextResponse.json({ error: 'Checklist item not found' }, { status: 400 })
        }
        console.error('Failed to update vehicle checklist item:', error)
        return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
      }
    }
    ```

    Use immutable `map` to update items (not direct mutation) per project coding-style rules.
    Use `prisma.$transaction` to prevent race conditions on rapid sequential taps (per departure-checklist precedent).
    Route param is `tripId` — NOT `id`. Destructure as `{ tripId }` from `await params`.
  </action>
  <verify>
    <automated>npx vitest run tests/vehicle-checklist-route.test.ts --reporter=verbose 2>&1 | grep -E "PASS|FAIL|Test 3|Test 4"</automated>
  </verify>
  <acceptance_criteria>
    - app/api/vehicle-checklist/[tripId]/check/route.ts exists
    - File contains `export async function PATCH(`
    - File contains `const { tripId } = await params`
    - File contains `prisma.$transaction(`
    - File contains `safeJsonParse`
    - File uses immutable map (`result.items.map(`) not direct mutation
    - File contains `console.error(`
    - File does NOT contain `params.id` (would be wrong param name)
    - Tests 3 and 4 in tests/vehicle-checklist-route.test.ts pass
    - Full route test suite: `npx vitest run tests/vehicle-checklist-route.test.ts` exits 0
  </acceptance_criteria>
  <done>PATCH check-off route works with $transaction, all 4 route tests pass (GREEN state)</done>
</task>

</tasks>

<verification>
- `npx vitest run tests/vehicle-checklist-route.test.ts` — all 4 tests pass (GREEN)
- `npx vitest run tests/vehicle-checklist-schema.test.ts` — still passes (no regression)
- `npm run build` passes
</verification>

<success_criteria>
- generateVehicleChecklist exists in lib/claude.ts with vehicle specs + trip context prompt (D-04)
- GET /api/vehicle-checklist returns stored checklist from Trip model
- POST /api/vehicle-checklist generates via Claude, persists JSON blob on Trip (D-08/D-09)
- POST returns 400 when no vehicle assigned to trip
- PATCH /api/vehicle-checklist/[tripId]/check toggles item checked state with $transaction (D-10)
- All 4 route tests pass
- Build passes
</success_criteria>

<output>
After completion, create `.planning/phases/29-vehicle-pre-trip-checklist/29-02-SUMMARY.md`
</output>
