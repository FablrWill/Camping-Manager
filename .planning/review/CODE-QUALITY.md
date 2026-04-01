# Code Quality Audit Report

**Project:** Outland OS
**Date:** 2026-04-01
**Auditor:** Claude Code (automated audit)
**Scope:** 25 API routes, 3 Claude integration modules, data layer, security

---

## Summary Table

| # | Severity | Area | Finding | File(s) |
|---|----------|------|---------|---------|
| 1 | CRITICAL | Claude AI | Unprotected `JSON.parse` on LLM output | `lib/claude.ts:209,359`, `lib/voice/extract.ts:30`, `lib/agent/memory.ts:88` |
| 2 | HIGH | Security | Mass assignment in vehicle routes | `app/api/vehicle/route.ts:24`, `app/api/vehicle/[id]/route.ts:30`, `app/api/vehicle/[id]/mods/route.ts:17` |
| 3 | HIGH | Security | Path traversal in photo import | `app/api/import/photos/route.ts:54` |
| 4 | HIGH | Claude AI | No response validation / no Zod schemas | `lib/claude.ts`, `lib/voice/extract.ts`, `lib/agent/memory.ts` |
| 5 | HIGH | Error Handling | Chat route API key used at module scope | `app/api/chat/route.ts:11` |
| 6 | MEDIUM | Data Layer | Location delete orphans related photos | `app/api/locations/[id]/route.ts:105` |
| 7 | MEDIUM | Data Layer | Trip delete without photo cleanup | `app/api/trips/[id]/route.ts:66` |
| 8 | MEDIUM | Error Handling | Photo upload outer try-catch missing | `app/api/photos/upload/route.ts:10` |
| 9 | MEDIUM | Code Quality | Duplicated weather-fetch pattern (3x) | `app/api/packing-list/route.ts`, `meal-plan/route.ts`, `power-budget/route.ts` |
| 10 | MEDIUM | Data Layer | Timeline GET fetches all points without limit | `app/api/timeline/route.ts:17-37` |
| 11 | MEDIUM | Claude AI | Claude client instantiated at module scope without guard | `lib/claude.ts:3-4`, `lib/agent/memory.ts:6` |
| 12 | LOW | API Quality | Inconsistent delete response formats | Various |
| 13 | LOW | API Quality | Gear [id] PUT missing 404 check | `app/api/gear/[id]/route.ts:40` |
| 14 | LOW | API Quality | `voice/extract` does not check for ANTHROPIC_API_KEY | `app/api/voice/extract/route.ts` |
| 15 | LOW | Code Quality | Dead legacy tool exports | `lib/agent/tools/index.ts:26-32,53-68` |
| 16 | LOW | Data Layer | BigInt lossy conversion in timeline serialization | `app/api/timeline/route.ts:44,49` |

**Totals:** 1 CRITICAL, 4 HIGH, 5 MEDIUM, 6 LOW

---

## Detailed Findings

### 1. CRITICAL: Unprotected `JSON.parse` on LLM output

**Files:**
- `lib/claude.ts` line 209 (packing list)
- `lib/claude.ts` line 359 (meal plan)
- `lib/voice/extract.ts` line 30
- `lib/agent/memory.ts` line 88

**Description:** All Claude API responses are parsed with bare `JSON.parse(text)` with no try-catch. LLMs can return malformed JSON, markdown-wrapped JSON, or unexpected formats. A single malformed response crashes the request with an unhandled exception.

**Evidence:**
```typescript
// lib/claude.ts:209
const parsed = JSON.parse(text)  // no try-catch

// lib/voice/extract.ts:30
return JSON.parse(text) as InsightPayload  // no try-catch

// lib/agent/memory.ts:88
const memories: Array<{ key: string; value: string }> = JSON.parse(text);
```

**Impact:** Any LLM response with leading/trailing whitespace, markdown code fences, or conversational preamble will throw a `SyntaxError`, returning a 500 to the user. This is the most common failure mode in LLM-integrated apps.

**Fix:**
1. Wrap every `JSON.parse` on LLM output in try-catch with a retry or fallback
2. Add a shared `parseLlmJson(text: string)` utility that strips markdown fences, trims whitespace, and attempts parse with structured error messages
3. Consider adding Zod schemas for runtime validation of the parsed shape (see finding #4)

```typescript
// lib/llm-parse.ts
export function parseLlmJson<T>(text: string, label: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  }
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(`Failed to parse ${label} JSON from Claude: ${(err as Error).message}. Raw: ${text.slice(0, 200)}`);
  }
}
```

---

### 2. HIGH: Mass assignment in vehicle routes

**Files:**
- `app/api/vehicle/route.ts` line 24: `prisma.vehicle.create({ data })`
- `app/api/vehicle/[id]/route.ts` line 30: `prisma.vehicle.update({ where: { id }, data })`
- `app/api/vehicle/[id]/mods/route.ts` line 17: `prisma.vehicleMod.create({ data: { ...data, vehicleId: id } })`

**Description:** These routes pass the raw request body directly to Prisma without whitelisting fields. A malicious or buggy client could set `id`, `createdAt`, `updatedAt`, or any field Prisma accepts.

**Evidence:**
```typescript
// vehicle/route.ts:24
const vehicle = await prisma.vehicle.create({ data });

// vehicle/[id]/route.ts:30
const vehicle = await prisma.vehicle.update({ where: { id }, data });
```

**Impact:** While Prisma will reject truly unknown fields, it still allows overriding auto-generated fields like `createdAt`, `updatedAt`, and potentially `id` on create. This is a data integrity risk.

**Fix:** Destructure only allowed fields, matching the pattern already used in gear routes:
```typescript
const vehicle = await prisma.vehicle.create({
  data: {
    name: data.name,
    year: data.year ?? null,
    make: data.make ?? null,
    // ... explicit fields only
  },
});
```

---

### 3. HIGH: Path traversal in photo import

**File:** `app/api/import/photos/route.ts` line 54

**Description:** The `takeoutRoot` parameter comes from the request body and is joined directly with user-supplied `photo.imagePath` to construct a file path. No validation ensures the resulting path stays within the intended directory.

**Evidence:**
```typescript
const sourcePath = join(takeoutRoot, photo.imagePath);
if (existsSync(sourcePath)) {
  // reads and processes the file
  const buffer = await readFile(sourcePath);
```

**Impact:** An attacker could set `takeoutRoot` to `/` and `imagePath` to `etc/passwd` (or any sensitive file). The file would be read, processed through sharp (which would fail for non-images, but the read still occurs). Since this is a single-user app, the practical risk is low, but it is a textbook path traversal.

**Fix:** Validate that `sourcePath` resolves to a path within `takeoutRoot`:
```typescript
import { resolve } from 'path';
const resolvedRoot = resolve(takeoutRoot);
const sourcePath = resolve(takeoutRoot, photo.imagePath);
if (!sourcePath.startsWith(resolvedRoot)) {
  errors.push(`${photo.title}: path traversal detected, skipped`);
  continue;
}
```

---

### 4. HIGH: No response validation / no Zod schemas for LLM output

**Files:**
- `lib/claude.ts` lines 210-222 (packing list)
- `lib/claude.ts` lines 359-361 (meal plan)
- `lib/voice/extract.ts` line 30
- `lib/agent/memory.ts` line 88

**Description:** After `JSON.parse`, the code assumes the parsed object has the exact structure expected (categories array, tips array, etc.) with zero runtime validation. If Claude returns valid JSON with a different shape, the code will silently produce corrupt data or throw at property access.

**Evidence:**
```typescript
// lib/claude.ts:211 — assumes parsed.categories exists and is an array
const result: PackingListResult = {
  categories: parsed.categories.map(...)  // throws if categories is missing/undefined
```

```typescript
// lib/claude.ts:361 — trusts the shape entirely
return parsed as MealPlanResult
```

**Impact:** LLMs occasionally return structurally valid JSON with renamed or missing keys, causing runtime TypeErrors that surface as unhelpful 500 errors. The meal plan route blindly trusts the shape with an `as` cast.

**Fix:** Add Zod schemas for each LLM response type and validate after parsing:
```typescript
import { z } from 'zod';

const PackingListSchema = z.object({
  categories: z.array(z.object({
    name: z.string(),
    items: z.array(z.object({
      name: z.string(),
      fromInventory: z.boolean(),
      gearId: z.string().optional(),
      reason: z.string().optional(),
    })),
  })),
  tips: z.array(z.string()).default([]),
});

const parsed = parseLlmJson(text, 'packing-list');
const validated = PackingListSchema.parse(parsed);
```

---

### 5. HIGH: Chat route API key used at module scope

**File:** `app/api/chat/route.ts` line 11

**Description:** The Anthropic client is instantiated at module scope (`const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })`). If the env var is missing, the client construction may succeed but fail silently on first API call, or worse, throw during module load and break the entire route with no meaningful error message.

**Evidence:**
```typescript
// Line 11 — module scope, no guard
const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
```

Compare with `packing-list/route.ts` and `meal-plan/route.ts` which properly check `if (!process.env.ANTHROPIC_API_KEY)` inside the handler.

**Same pattern in:**
- `lib/claude.ts:3-4` (module scope, no guard)
- `lib/agent/memory.ts:6` (module scope, no guard)

**Fix:** Either add the API key check at the top of the POST handler (like packing-list does), or use lazy initialization:
```typescript
function getClient() {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
```

---

### 6. MEDIUM: Location delete orphans related photos

**File:** `app/api/locations/[id]/route.ts` line 105

**Description:** Deleting a location does not cascade to photos linked via `locationId`. The Prisma schema does NOT have `onDelete: Cascade` on the Photo-to-Location relation. After delete, photos reference a non-existent location.

**Evidence:** In `prisma/schema.prisma` line 112:
```prisma
location Location? @relation(fields: [locationId], references: [id])
```
No `onDelete` clause. Compare with `PackingItem` (line 203) which correctly has `onDelete: Cascade`.

**Fix:** Either:
1. Add `onDelete: SetNull` to the Photo->Location relation (safest: photos survive, locationId becomes null)
2. Or nullify locationId in a transaction before deleting the location:
```typescript
await prisma.$transaction([
  prisma.photo.updateMany({ where: { locationId: id }, data: { locationId: null } }),
  prisma.location.delete({ where: { id } }),
]);
```

---

### 7. MEDIUM: Trip delete without photo cleanup

**File:** `app/api/trips/[id]/route.ts` line 66

**Description:** Same issue as #6 but for trips. Photos with `tripId` pointing to a deleted trip become orphaned references. The Trip-to-Photo relation in the schema (line 193) has no `onDelete` cascade.

**Fix:** Add `onDelete: SetNull` to the Photo->Trip relation in `prisma/schema.prisma`, or use a transaction to nullify `tripId` before deleting the trip.

---

### 8. MEDIUM: Photo upload outer try-catch missing

**File:** `app/api/photos/upload/route.ts` line 10

**Description:** The `formData` parsing at line 10 (`const formData = await request.formData()`) and the `photosDir` mkdir at line 21 are outside the per-file try-catch. If `formData()` throws (e.g., request body too large, corrupt multipart), the route returns an unhandled 500 with no structured JSON error.

**Evidence:**
```typescript
export async function POST(request: NextRequest) {
  // Lines 10-21 have NO try-catch
  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];
  // ...
  const photosDir = join(process.cwd(), "public", "photos");
  await mkdir(photosDir, { recursive: true });
```

**Fix:** Wrap the entire handler in try-catch (matching the pattern in every other route):
```typescript
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    // ... rest of handler
  } catch (error) {
    console.error('Failed to upload photos:', error);
    return NextResponse.json({ error: 'Failed to upload photos' }, { status: 500 });
  }
}
```

---

### 9. MEDIUM: Duplicated weather-fetch pattern (3x copy-paste)

**Files:**
- `app/api/packing-list/route.ts` lines 59-79
- `app/api/meal-plan/route.ts` lines 49-67
- `app/api/power-budget/route.ts` lines 79-97

**Description:** The exact same "fetch weather if location has GPS and trip is within forecast range" logic is copied across three routes. Each copy has the same structure: check lat/lon, check daysOut <= 16, try/catch fetchWeather, map to `{ days, alerts }`.

**Impact:** A bug fix in one copy won't propagate to others. This has already diverged slightly: power-budget maps to `{ days }` (no `alerts`), while the other two map to `{ days, alerts }`.

**Fix:** Extract a shared helper:
```typescript
// lib/trip-weather.ts
export async function fetchTripWeather(
  location: { latitude: number | null; longitude: number | null } | null,
  startDate: Date,
  endDate: Date
): Promise<{ days: DayForecast[]; alerts: WeatherAlert[] } | undefined> {
  if (!location?.latitude || !location?.longitude) return undefined;
  const daysOut = Math.ceil((startDate.getTime() - Date.now()) / 86400000);
  if (daysOut > 16) return undefined;
  try {
    const forecast = await fetchWeather(location.latitude, location.longitude, ...);
    return { days: forecast.days, alerts: forecast.alerts };
  } catch (err) {
    console.error('Weather fetch failed (non-blocking):', err);
    return undefined;
  }
}
```

---

### 10. MEDIUM: Timeline GET fetches all points without limit

**File:** `app/api/timeline/route.ts` lines 17-37

**Description:** When no `date` query parameter is provided, the route fetches ALL timeline points, place visits, and activity segments from the database with no pagination or limit. Google Takeout imports can contain tens of thousands of points.

**Evidence:**
```typescript
const [points, placeVisits, activitySegments] = await Promise.all([
  prisma.timelinePoint.findMany({
    where: date ? { timestamp: dateFilter } : undefined,  // undefined = fetch ALL
    orderBy: { timestamp: "asc" },
    // no `take` limit
  }),
```

**Fix:** Add a default limit when no date filter is provided, or require the date parameter:
```typescript
if (!date) {
  return NextResponse.json(
    { error: 'date parameter (YYYY-MM-DD) is required' },
    { status: 400 }
  );
}
```

---

### 11. MEDIUM: Claude client instantiated at module scope without guard

**Files:**
- `lib/claude.ts` lines 3-4
- `lib/agent/memory.ts` line 6

**Description:** The Anthropic SDK client is created at module import time. If `ANTHROPIC_API_KEY` is undefined, the SDK may initialize with `undefined` and fail cryptically on first call rather than at startup.

**Fix:** Use lazy initialization or validate the key exists. See finding #5 for the recommended pattern.

---

### 12. LOW: Inconsistent delete response formats

**Files:**
- `app/api/gear/[id]/route.ts:76` returns `{ success: true }`
- `app/api/locations/[id]/route.ts:106` returns `{ deleted: true }`
- `app/api/trips/[id]/route.ts:67` returns `204 No Content` (empty body)

**Description:** Three different response formats for successful deletes across the API. Not a bug, but makes client-side handling harder.

**Fix:** Standardize on one pattern. `204 No Content` is the most RESTful option; alternatively `{ success: true }` with 200.

---

### 13. LOW: Gear [id] PUT missing 404 check

**File:** `app/api/gear/[id]/route.ts` line 40

**Description:** The PUT handler calls `prisma.gearItem.update()` without first checking if the item exists. If the ID doesn't exist, Prisma throws a `P2025` error that lands in the generic catch block, returning a 500 instead of a 404.

**Compare:** `locations/[id]/route.ts` correctly checks `findUnique` before update (line 36). `trips/[id]/route.ts` catches `P2025` and returns 404 (line 55).

**Fix:** Either add a `findUnique` guard like locations, or catch `P2025` like trips:
```typescript
} catch (error) {
  if (error instanceof Error && 'code' in error && (error as any).code === 'P2025') {
    return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
  }
```

---

### 14. LOW: voice/extract route does not check for ANTHROPIC_API_KEY

**File:** `app/api/voice/extract/route.ts`

**Description:** The `voice/transcribe` route checks for `OPENAI_API_KEY` (line 6) and returns a helpful 503. The `voice/extract` route, which also requires Claude, does not check for `ANTHROPIC_API_KEY`. If the key is missing, the user gets an unhelpful 500 error.

**Fix:** Add the guard:
```typescript
if (!process.env.ANTHROPIC_API_KEY) {
  return NextResponse.json(
    { error: 'Insight extraction requires ANTHROPIC_API_KEY' },
    { status: 503 }
  );
}
```

---

### 15. LOW: Dead legacy tool exports

**File:** `lib/agent/tools/index.ts` lines 26-32, 53-68

**Description:** `ALL_TOOLS` and `executeTool` are legacy exports from "Plan 01" that are no longer used by the chat route (which uses `AGENT_TOOLS` and `executeAgentTool`). Dead code that adds confusion.

**Fix:** Remove `ALL_TOOLS` and `executeTool` unless there's a consumer. If keeping for backward compat, add a `@deprecated` JSDoc comment.

---

### 16. LOW: BigInt lossy conversion in timeline serialization

**File:** `app/api/timeline/route.ts` lines 44, 49

**Description:** `startMs` and `endMs` (stored as `BigInt` in SQLite) are converted to `Number()`. JavaScript's `Number` type loses precision above `2^53`. Timestamps in milliseconds are currently safe (current epoch ms is ~1.7 trillion, well under `2^53 = 9 quadrillion`), but this is a latent bug if the field is ever used for non-timestamp BigInt values.

**Fix:** Use `.toString()` instead of `Number()` for truly safe serialization, or keep `Number()` with a comment documenting the safety assumption:
```typescript
startMs: Number(pv.startMs), // Safe: epoch ms fits in Number.MAX_SAFE_INTEGER until year 287396
```

---

## Areas That Passed Audit

### SQL Injection
- **No raw SQL in API routes.** All database access uses Prisma's parameterized queries.
- The RAG module uses `better-sqlite3` `.prepare().all()` with parameterized queries (`?` placeholders) in `lib/rag/search.ts`. The FTS5 query is properly escaped via `escapeFts5Query()` which strips special characters before quoting. No injection vectors found.
- `lib/rag/ingest.ts` also uses parameterized queries exclusively.

### Error Handling Consistency
- 22 of 25 routes have proper try-catch with `console.error` + JSON error response. The pattern is well-established.
- All routes that create resources return 201. All validation failures return 400.

### File Upload Validation
- `photos/upload/route.ts` processes files through `sharp()` which validates image format. Non-images will fail at the sharp processing step and be caught per-file.
- Files are written to `public/photos/` with UUID filenames, preventing name collisions and name-based attacks.

### Environment Variable Exposure
- No `NEXT_PUBLIC_` prefixed env vars expose secrets. API keys stay server-side.
- The `.env.example` file documents required vars without exposing values.

### N+1 Query Patterns
- Trip list uses `include` for eager loading of relations (good).
- `voice/apply/route.ts` does have sequential queries in a loop for gear updates (lines 32-39), but this is bounded by the number of gear items in a debrief (typically 1-3). Not a practical concern.

### Transaction Usage
- Timeline import correctly uses `$transaction` for clearing existing data (line 56).
- No other routes need transactions (single-table operations).

---

## Priority Recommendations

1. **Immediate (before next feature work):** Fix finding #1 (unprotected JSON.parse). Create `lib/llm-parse.ts` with safe parsing + markdown fence stripping. This is the highest-probability production failure.

2. **Soon (within 1-2 sessions):** Fix findings #2 (mass assignment) and #3 (path traversal). Both are correctness issues that take 5-10 minutes each.

3. **Next session:** Add Zod schemas for Claude response validation (#4). This prevents a class of bugs permanently and makes the code self-documenting.

4. **Cleanup pass:** Fix the remaining medium/low findings as part of a code quality sweep. Most are 1-5 line fixes.
