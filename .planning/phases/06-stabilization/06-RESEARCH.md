# Phase 6: Stabilization — Research

**Researched:** 2026-04-01
**Domain:** Next.js App Router / React / Prisma / Zod / Design system migration
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**AI Output Persistence**
- D-01: Persist AI outputs (packing list, meal plan) immediately on generation — no explicit save step.
- D-02: When returning to a previously generated result, show the saved version with a "Regenerate" button.
- D-03: Regeneration replaces the previous result — no version history. One packing list and one meal plan per trip.
- D-04: Regeneration resets individual item check-off state (packed/not packed). New list = clean slate.
- D-05: Meal plans follow the identical persist-on-generate + replace pattern as packing lists.

**Design System Migration**
- D-06: Migrate all existing forms to design system primitives in one sweep during this phase.
- D-07: Adopt existing UI primitives only (Button, Input, Card, Modal, Badge, Chip, EmptyState, PageHeader, StatCard). Do not build new primitives.

**Schema Foundations**
- D-08: PackingItem gets three usage states: `used`, `didn't need`, `forgot but needed`.
- D-09: TripFeedback is append-only. Fields: summary text, raw voice transcript, extracted insights (structured JSON), applied/pending status.
- D-10: Add a MealPlan model for persisting meal plan results. Same migration as PackingItem usage fields + TripFeedback.
- D-11: Add optional `cachedAt` timestamp to key models for Phase 8 offline snapshot support.

**Error Resilience**
- D-12: Malformed Claude responses show inline error with Retry button. No modal, no navigation disruption.
- D-13: Build a shared `parseClaudeJSON<T>` utility with Zod validation. Use `.safeParse()`. Return 422 for schema mismatches.
- D-14: Add try-catch error handling to all API routes currently lacking it.

### Claude's Discretion
- Migration order for form pages (which pages to tackle first)
- MealPlan model field names and JSON structure
- Exact Zod schemas for packing list and meal plan responses
- Whether PackingItem usage is stored as an enum or string field
- TripFeedback JSON insights schema structure
- Which models get the `cachedAt` field (trip-adjacent models most likely)
- Loading state UX during AI regeneration

### Deferred Ideas (OUT OF SCOPE)
- Home Assistant integration — v2.0+ feature, blocked on hardware. TripFeedback JSON schema should be extensible but HA is not implemented here.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| STAB-01 | User can generate AI outputs (packing list, meal plan) without crashes from malformed Claude responses (Zod parseClaudeJSON utility) | Zod .safeParse() pattern, 422 vs 500 status strategy, lib/claude.ts analysis showing bare JSON.parse at lines 209 and 359 |
| STAB-02 | User can view previously generated packing lists and meal plans after navigating away (persisted to database) | New MealPlan model required; packing list needs Trip-level JSON column or separate PackingListResult table; component load-on-mount fetch pattern |
| STAB-03 | User can edit and delete trips from the trips page | Trip PUT/DELETE API already exists (app/api/trips/[id]/route.ts) — only UI is missing in TripsClient.tsx |
| STAB-04 | User can edit vehicle profile and edit/delete vehicle mods | Vehicle PUT exists; mod DELETE API route missing (no app/api/vehicle/[id]/mods/[modId]/route.ts); UI for both missing in VehicleClient.tsx |
| STAB-05 | User can delete photos from the photo gallery | No DELETE API at app/api/photos/[id]/route.ts; no delete UI in photo gallery; filesystem cleanup required |
| STAB-06 | All existing forms use the design system UI primitives for visual consistency | TripsClient.tsx and VehicleClient.tsx identified as migration targets with raw HTML form elements |
</phase_requirements>

---

## Summary

Phase 6 is a stabilization sweep with six discrete problem areas: (1) Zod-based error resilience for Claude responses, (2) database persistence for AI outputs so they survive navigation, (3) missing CRUD UI for trips/vehicle/photos, (4) design system form migration, (5) schema additions for the learning loop, and (6) minor API hardening.

The good news: all three problem areas that CONCERNS.md flagged as Critical — missing API try-catch on vehicle/trips routes, and bare JSON.parse on Claude responses — have been partially addressed. The vehicle and trips API routes already have try-catch. The remaining critical fix is the bare `JSON.parse` in `lib/claude.ts` at lines 209 and 359, which is fixed by wrapping with `parseClaudeJSON<T>`.

The most structurally significant work is the **new MealPlan model** (D-10) — meal plans have no persistence today. Packing lists are also not persisted (the component generates and holds state locally, no save to DB). Both need: (a) schema migration, (b) save-on-generate in the API route, (c) load-on-mount in the components, and (d) Regenerate replaces the stored record.

**Primary recommendation:** Execute in dependency order — schema migration first (unblocks everything), then Zod utility (unblocks AI features), then API gaps (photo delete, mod delete), then component-level CRUD UI, then form migration.

---

## Standard Stack

### Core (already installed, no new installs required except Zod)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Zod | 3.x | Runtime schema validation with TypeScript inference | Industry standard for Next.js API validation; .safeParse() avoids throw on invalid input |
| Prisma | 6.19.2 | ORM for schema migrations + queries | Already in use — new models follow existing patterns |
| Next.js App Router | 16.2.1 | API routes + server components | Already in use |
| React | 19.2.4 | Client components with hooks | Already in use |

**Zod is not installed.** It must be added:

```bash
npm install zod
```

Current version as of April 2026: **3.24.x** (stable, widely used — HIGH confidence from npm registry).

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 1.7.0 | Icons in UI (Loader2, RotateCcw, Trash2, Pencil) | All interactive controls in migrated forms |
| TypeScript | 5.x | Type inference from Zod schemas (z.infer<>) | Used throughout — Zod schemas generate TS types automatically |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Zod | Manual type guards | Manual is more code, no coercion, loses .safeParse() convenience |
| Zod | Valibot | Valibot is smaller but less ecosystem support; Zod is the clear standard for Next.js |
| New MealPlan model | JSON column on Trip | JSON column can't be indexed or queried by field; separate model is cleaner |

---

## Architecture Patterns

### Recommended File Structure for Phase 6 Additions

```
lib/
  claude.ts            — Existing: wrap JSON.parse with parseClaudeJSON<T>
  parse-claude.ts      — NEW: shared Zod utility (parseClaudeJSON<T>) + schemas

app/api/
  packing-list/
    route.ts           — Update: save result to Trip.packingListResult JSON column (or new model)
  meal-plan/
    route.ts           — Update: save result to new MealPlan model
  photos/
    [id]/route.ts      — NEW: DELETE handler + filesystem cleanup
  vehicle/
    [id]/
      mods/
        [modId]/route.ts — NEW: DELETE handler (PUT optional per requirements)

prisma/
  schema.prisma        — Add: MealPlan model, PackingItem usage field, TripFeedback model, cachedAt

components/
  PackingList.tsx      — Update: load saved result on mount, show Regenerate if exists
  MealPlan.tsx         — Update: same pattern as PackingList
  TripsClient.tsx      — Update: add edit modal + delete with ConfirmDialog, migrate to design system
  VehicleClient.tsx    — Update: add edit vehicle + delete mod with ConfirmDialog, migrate to design system
```

### Pattern 1: parseClaudeJSON<T> Utility

**What:** Shared Zod-based wrapper around JSON.parse that validates shape and coerces types, returning a typed result or error.

**When to use:** Every place `JSON.parse` is called on a Claude API response.

```typescript
// Source: Zod .safeParse() docs + D-13 decision
import { z, ZodSchema } from 'zod'

export function parseClaudeJSON<T>(
  raw: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string } {
  let parsed: unknown
  try {
    // Claude sometimes wraps JSON in ```json ... ``` — strip it
    const cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()
    parsed = JSON.parse(cleaned)
  } catch {
    return { success: false, error: 'Claude returned non-JSON response' }
  }

  const result = schema.safeParse(parsed)
  if (!result.success) {
    return {
      success: false,
      error: `Claude response schema mismatch: ${result.error.issues.map(i => i.message).join(', ')}`,
    }
  }
  return { success: true, data: result.data }
}
```

**API route usage:**
```typescript
const parseResult = parseClaudeJSON(text, PackingListResultSchema)
if (!parseResult.success) {
  return NextResponse.json({ error: parseResult.error }, { status: 422 })
}
const packingList = parseResult.data
```

**Client component usage — map 422 to retry UI:**
```typescript
if (!res.ok) {
  const data = await res.json()
  // 422 = schema mismatch; show retry
  setError(data.error || 'Couldn\'t generate — tap Retry')
  return
}
```

### Pattern 2: AI Output Persistence (Persist-on-Generate)

**What:** On generation success, save JSON blob to DB before returning to client. On component mount, fetch existing result and show it. Regenerate = overwrite.

**Packing list approach:** Store as `packingListResult String?` JSON column on Trip model (simplest — avoids extra join, only one result per trip per D-03).

**Meal plan approach:** Store as new MealPlan model linked to Trip (needed anyway for D-10, gives clean model boundary).

```typescript
// After generating, save to DB before responding
await prisma.trip.update({
  where: { id: tripId },
  data: {
    packingListResult: JSON.stringify(packingList),
    packingListGeneratedAt: new Date(),
  },
})
return NextResponse.json(packingList)
```

**Component load-on-mount:**
```typescript
useEffect(() => {
  async function loadSaved() {
    const res = await fetch(`/api/trips/${tripId}/packing-list`)
    if (res.ok) {
      const data = await res.json()
      if (data.result) {
        setPackingList(data.result)
        setGeneratedAt(data.generatedAt)
      }
    }
  }
  loadSaved()
}, [tripId])
```

### Pattern 3: Missing CRUD — New API Routes

**Photo delete requires filesystem cleanup:**
```typescript
// app/api/photos/[id]/route.ts
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const photo = await prisma.photo.findUnique({ where: { id } })
    if (!photo) return NextResponse.json({ error: 'Photo not found' }, { status: 404 })

    // Delete file from disk before DB record
    const filePath = path.join(process.cwd(), 'public', photo.imagePath)
    try { await unlink(filePath) } catch { /* file may already be gone */ }

    await prisma.photo.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete photo:', error)
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 })
  }
}
```

**Mod delete route:**
```typescript
// app/api/vehicle/[id]/mods/[modId]/route.ts
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string; modId: string }> }) {
  try {
    const { modId } = await params
    await prisma.vehicleMod.delete({ where: { id: modId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 })
    }
    console.error('Failed to delete vehicle mod:', error)
    return NextResponse.json({ error: 'Failed to delete vehicle mod' }, { status: 500 })
  }
}
```

### Pattern 4: Design System Form Migration

**What:** Replace all raw `<input>`, `<button>`, `<select>`, `<textarea>` in TripsClient and VehicleClient with primitives from `components/ui/`.

**Key import:**
```typescript
import { Button, Input, Textarea, Select, Modal, ConfirmDialog } from '@/components/ui'
```

**TripsClient migration:** The create-trip form (lines 303–412) uses all four raw elements. Wrap the form in a `Modal`. Replace each field with `Input`, `Select`, `Textarea`. Replace buttons with `Button`.

**VehicleClient migration:** The add-mod form (lines 227–311) uses raw elements. Replace similarly. Add edit-vehicle and delete-mod actions with `ConfirmDialog`.

**ConfirmDialog usage pattern (already in Modal.tsx):**
```typescript
const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)

// In JSX:
{confirmDelete && (
  <ConfirmDialog
    title="Delete trip?"
    message="This will permanently remove the trip and all its packing items. This can't be undone."
    confirmLabel="Delete"
    confirmVariant="danger"
    onConfirm={() => handleDelete(confirmDelete.id)}
    onCancel={() => setConfirmDelete(null)}
  />
)}
```

### Pattern 5: Schema Migration for Phase 6

Prisma migration adds these changes to `schema.prisma`:

```prisma
// PackingItem — add usage tracking (D-08)
model PackingItem {
  id       String  @id @default(cuid())
  tripId   String
  gearId   String
  packed   Boolean @default(false)
  usageStatus String? // "used" | "didn't need" | "forgot but needed" | null
  notes    String?
  // ... rest unchanged
}

// Trip — add packing list persistence columns (D-01, D-02, D-11)
model Trip {
  // ... existing fields
  packingListResult    String?   // JSON blob of PackingListResult
  packingListGeneratedAt DateTime? // replaces implicit "was it generated" check
  cachedAt             DateTime? // Phase 8 offline snapshot timestamp
}

// NEW: MealPlan model (D-05, D-10)
model MealPlan {
  id          String   @id @default(cuid())
  tripId      String   @unique  // one per trip (D-05)
  result      String   // JSON blob of MealPlanResult
  generatedAt DateTime @default(now())
  createdAt   DateTime @default(now())

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)
}

// NEW: TripFeedback model (D-09) — append-only
model TripFeedback {
  id              String   @id @default(cuid())
  tripId          String   // NOT unique — multiple feedback records per trip allowed
  summary         String?  // free text summary
  voiceTranscript String?  // raw voice transcript
  insights        String?  // JSON: structured extracted insights
  status          String   @default("pending") // "pending" | "applied"
  createdAt       DateTime @default(now())

  trip Trip @relation(fields: [tripId], references: [id], onDelete: Cascade)

  @@index([tripId])
}
```

Add `mealPlan MealPlan?` and `tripFeedbacks TripFeedback[]` to the Trip model relations.

**Migration command:**
```bash
npm run db:migrate
# Prisma will prompt for a name — use: phase6_stabilization
```

### Anti-Patterns to Avoid

- **Bare JSON.parse on Claude output:** Always use `parseClaudeJSON<T>` from now on. Even a "mostly valid" response can have numbers-as-strings or missing optional fields.
- **alert() or confirm():** Already established. All destructive actions use ConfirmDialog. All errors use state-based inline messages.
- **Missing try-catch on new API routes:** Every new route handler must follow the `app/api/gear/route.ts` pattern.
- **Optimistic UI without rollback for destructive actions:** Toggle-packed is correctly optimistic with rollback. Delete should NOT be optimistic — wait for server confirmation, then remove from local state.
- **Forgetting the unique constraint on PackingItem:** `@@unique([tripId, gearId])` means PATCH-based upsert for packing items (not POST + DELETE).
- **Storing MealPlanResult in memory only:** The current `MealPlan.tsx` component generates into `useState` — this is what STAB-02 fixes. State is lost on navigation. Must persist to DB.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| JSON schema validation | Custom type guards | Zod `.safeParse()` | Handles coercion, recursive objects, optional fields, generates TS types |
| Delete confirmation dialog | Custom modal | `ConfirmDialog` from `components/ui/Modal.tsx` | Already built and themed |
| Error message inline display | Custom error component | State + conditional JSX inline | Established pattern in GearClient — simple and consistent |
| Claude response cleaning | Custom regex | `cleaned = raw.replace(/^```(?:json)?\n?/m, '').replace(/\n?```$/m, '').trim()` inline in parseClaudeJSON | One-liner, handles the markdown-wrap case Claude occasionally produces |

**Key insight:** The design system is already complete for this phase. No new primitives. The only new library is Zod for validation — everything else reuses what exists.

---

## Common Pitfalls

### Pitfall 1: Packing List GET Route Missing

**What goes wrong:** The component needs to `GET` a saved packing list on mount. Currently `app/api/packing-list/route.ts` only has a `POST`. A GET by tripId is required.

**Why it happens:** The route was built for generation only, not persistence.

**How to avoid:** Add a `GET` handler to `/api/packing-list?tripId=xxx` that reads the `Trip.packingListResult` column. Return `{ result: PackingListResult | null, generatedAt: string | null }`.

**Warning signs:** Component shows "No packing list yet" even after user previously generated one and navigated away.

### Pitfall 2: MealPlan API Route Returns Without Persisting (Existing Issue)

**What goes wrong:** `app/api/meal-plan/route.ts` currently calls `generateMealPlan()` and only saves `mealPlanGeneratedAt` to the Trip — it does NOT save the meal plan result. The `MealPlan` model doesn't exist yet.

**Why it happens:** Meal plan persistence was deferred to Phase 6.

**How to avoid:** After schema migration adds the `MealPlan` model, update `app/api/meal-plan/route.ts` to upsert into MealPlan (create on first generate, replace on regenerate).

**Warning signs:** Generating works, but the meal plan vanishes on navigation. `mealPlanGeneratedAt` is set but no MealPlan record exists.

### Pitfall 3: Photo Delete Requires Filesystem Cleanup

**What goes wrong:** Deleting a Photo DB record doesn't delete the file in `public/photos/`. Stale files accumulate. Alternatively, deleting the file first then having the DB delete fail leaves an orphaned record with a broken image path.

**Why it happens:** Two-step operation with no transaction.

**How to avoid:** Delete file first (best effort — wrap in try-catch but don't fail if file is missing), then delete DB record. If DB delete fails, log the orphaned file path. File deletion errors are non-fatal.

**Warning signs:** `public/photos/` grows unbounded with deleted photos still present.

### Pitfall 4: Trip Relation to TripFeedback — Not a Unique Constraint

**What goes wrong:** If TripFeedback is defined with `@unique` on `tripId`, only one feedback record is allowed per trip. D-09 says append-only — multiple records per trip must be allowed.

**Why it happens:** Confusing it with MealPlan which IS one-per-trip (`@unique` on tripId).

**How to avoid:** TripFeedback uses `@@index([tripId])`, NOT `@unique`. MealPlan uses `@unique` on `tripId`.

### Pitfall 5: Zod Schema Too Strict Breaks Valid Claude Responses

**What goes wrong:** A Zod schema with `.string()` on a numeric field will reject a response where Claude returns `{ weight: 1.5 }` instead of `{ weight: "1.5" }`.

**Why it happens:** Claude sometimes infers numeric types even when the schema asks for strings.

**How to avoid:** Use `.coerce.number()` and `.coerce.string()` where Claude might reasonably guess either type. Use `.optional()` generously — the prompt specifies optional fields but Claude may omit them on short responses.

### Pitfall 6: TripsClient Defines TripCard as Inner Component

**What goes wrong:** `TripCard` is defined as a nested function inside `TripsClient`. React recreates this component reference on every render, causing unnecessary unmounts. Adding edit/delete state to TripCard will make this worse.

**Why it happens:** Convenience — avoids prop-drilling `selectedTripId`.

**How to avoid:** When adding edit/delete to the trip card, keep `TripCard` as an inner component but pass edit/delete handlers as props. Or hoist state for editing into `TripsClient` (single `editingTripId`) and render the edit modal at the parent level — not inside TripCard. This avoids re-mounting the modal on each render.

### Pitfall 7: cachedAt Field — Which Models Need It

**What goes wrong:** Adding `cachedAt` to the wrong models (or all models indiscriminately).

**Why it happens:** D-11 says "key models" without specifying which ones.

**How to avoid (Claude's discretion):** Trip-adjacent models are the right scope. The Phase 8 offline snapshot freezes one trip's data. Add `cachedAt` to: `Trip` (primary), `PackingItem` (snapshot of packing state), and `MealPlan` (snapshot of meal plan). Skip GearItem, Location, Vehicle — these are global state, not per-trip.

---

## Code Examples

### Verified Patterns from Existing Codebase

#### Error handling gold standard (`app/api/gear/route.ts` pattern)
```typescript
// Source: app/api/gear/route.ts
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await prisma.gearItem.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    console.error('Failed to delete gear item:', error)
    return NextResponse.json({ error: 'Failed to delete gear item' }, { status: 500 })
  }
}
```

#### Inline error state pattern (client components)
```typescript
// Source: established convention across GearClient, GearForm
const [error, setError] = useState<string | null>(null)
const [isDeleting, setIsDeleting] = useState(false)

async function handleDelete(id: string) {
  setIsDeleting(true)
  setError(null)
  try {
    const res = await fetch(`/api/resource/${id}`, { method: 'DELETE' })
    if (!res.ok) throw new Error('Failed to delete')
    setItems(prev => prev.filter(i => i.id !== id))
  } catch {
    setError('Couldn\'t delete — try again or reload the page.')
  } finally {
    setIsDeleting(false)
  }
}
```

#### Zod schema for PackingListResult
```typescript
// lib/parse-claude.ts — Recommended structure
import { z } from 'zod'

const PackingListItemSchema = z.object({
  name: z.string(),
  category: z.string(),
  fromInventory: z.boolean(),
  gearId: z.string().optional(),
  reason: z.string().optional(),
})

const PackingListCategorySchema = z.object({
  name: z.string(),
  items: z.array(PackingListItemSchema),
})

export const PackingListResultSchema = z.object({
  categories: z.array(PackingListCategorySchema),
  tips: z.array(z.string()).default([]),
})

export type PackingListResult = z.infer<typeof PackingListResultSchema>
```

#### Design system component usage (already used in VoiceRecordModal)
```typescript
// Source: components/VoiceRecordModal.tsx — confirmed design system imports
import { Button, Badge } from '@/components/ui'
// Button, Input, Textarea, Select, Modal, ConfirmDialog all available from same barrel
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Bare JSON.parse on Claude output | parseClaudeJSON<T> with Zod .safeParse() | Phase 6 | Returns 422 with diagnostic message instead of 500 crash |
| alert() / confirm() in components | ConfirmDialog + state-based errors | Phase 6 | Mobile-friendly, matches design system |
| AI outputs live in component state only | AI outputs persisted to DB on generation | Phase 6 | Navigation-safe; user never loses a generated list |
| Form primitives as raw HTML | Design system Button, Input, Select, etc. | Phase 6 | Visual consistency, dark mode coverage, touch targets |

**Deprecated/outdated in this codebase:**
- `window.confirm()` in LocationForm.tsx: Should be ConfirmDialog. Not in Phase 6 scope per STAB-06 (only TripsClient and VehicleClient targeted), but flagged for future cleanup.
- Raw `<input>` / `<button>` in TripsClient.tsx and VehicleClient.tsx: Replaced by design system this phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Zod | STAB-01 parseClaudeJSON | No — must install | — | None — required |
| Prisma CLI | Schema migration | Yes | 6.19.2 | — |
| SQLite (dev.db) | All data persistence | Yes (local file) | — | — |
| ANTHROPIC_API_KEY | AI generation (STAB-01, STAB-02) | Check .env | — | Features show "API key not configured" error |
| Node.js / npm | Build + migrate | Yes (project is running) | — | — |
| `fs.unlink` (Node built-in) | Photo file deletion (STAB-05) | Yes | — | — |

**Missing dependencies with no fallback:**
- `zod` — must be installed before parseClaudeJSON can be built.

**Missing dependencies with fallback:**
- `ANTHROPIC_API_KEY` — AI features show an error state if not configured. Non-blocking for other work.

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected (no jest.config, no vitest.config, no pytest.ini, no test/ directory) |
| Config file | None — must create in Wave 0 if automated testing is desired |
| Quick run command | `npm run lint` (only automated check available today) |
| Full suite command | `npm run build` (type check + build validation) |

**Note:** This is a personal tool with no test infrastructure. The project has no test files, no test framework config, and no test scripts in package.json. Validation for this phase is manual functional testing against acceptance criteria.

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| STAB-01 | parseClaudeJSON returns 422 on malformed response | manual | — | No test infra |
| STAB-01 | Generate packing list succeeds without crash | manual smoke | — | No test infra |
| STAB-02 | Navigate away from packing list, navigate back — list is still there | manual smoke | — | No test infra |
| STAB-02 | Navigate away from meal plan, navigate back — plan is still there | manual smoke | — | No test infra |
| STAB-03 | Edit trip — form opens, saves, list updates | manual smoke | — | No test infra |
| STAB-03 | Delete trip — ConfirmDialog appears, trip removed | manual smoke | — | No test infra |
| STAB-04 | Edit vehicle profile — saves correctly | manual smoke | — | No test infra |
| STAB-04 | Delete vehicle mod — ConfirmDialog appears, mod removed | manual smoke | — | No test infra |
| STAB-05 | Delete photo — ConfirmDialog, photo removed, file gone from disk | manual smoke | — | No test infra |
| STAB-06 | All forms use Button, Input, Card, Modal primitives | visual inspection | `npm run build` (type check) | — |

### Sampling Rate

- **Per task commit:** `npm run lint` — catches TypeScript errors and ESLint violations
- **Per wave merge:** `npm run build` — full Next.js type check and build
- **Phase gate:** Manual smoke test against all 6 STAB requirements before `/gsd:verify-work`

### Wave 0 Gaps

None required — no test infrastructure exists and none is mandated for this phase. All validation is manual + `npm run lint` + `npm run build`.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — all new files must be `.ts` or `.tsx`
- No `alert()` — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- All API routes must have try-catch with `console.error` + JSON error response
- Error handling pattern: `console.error('Action description:', error)` in catch blocks
- No premature abstractions — build what's needed, not a generic system
- Single quotes for JS/TS strings, backticks for template literals, semicolons always
- 2-space indentation
- Component files: PascalCase; API routes: lowercase with hyphens; lib files: camelCase
- Client components marked with `'use client'`
- State-based error display: `setError(null)` on start, `setError('message')` on failure, inline render
- TASKS.md must be updated every session
- Changelog: create `docs/changelog/session-NN.md`, add one row to `docs/CHANGELOG.md` index

---

## Open Questions

1. **Where to store packing list JSON on the Trip model**
   - What we know: Trip model has no `packingListResult` column today. CONTEXT.md doesn't specify a column name.
   - What's unclear: String column on Trip vs. separate PackingListResult model. D-03 says one per trip, which favors a column.
   - Recommendation: Add `packingListResult String?` and `packingListGeneratedAt DateTime?` directly to Trip. MealPlan gets its own model (D-10). Asymmetric but each is justified by its own decision.

2. **PackingItem usageStatus: Prisma enum vs. String**
   - What we know: D-08 defines three values. SQLite (current provider) has limited enum support in Prisma. Claude's discretion per CONTEXT.md.
   - What's unclear: Whether to use Prisma `enum` or `String` with application-level validation.
   - Recommendation: Use `String?` (nullable) with a Zod enum for validation at the API layer. Keeps schema SQLite-compatible and avoids a migration if values change. Mark as `// "used" | "didn't need" | "forgot but needed" | null` in a comment.

3. **Trip edit form complexity in TripsClient**
   - What we know: TripsClient has an inner `TripCard` component. Adding an edit modal at the TripCard level would create nested modal issues.
   - What's unclear: Whether to hoist edit state to TripsClient parent or keep it in TripCard.
   - Recommendation: Hoist — keep a single `editingTrip: TripData | null` state in TripsClient. Render one Modal at the TripsClient level. Pass `onEdit` callback into TripCard. This avoids re-creating the modal component on every TripCard render.

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `lib/claude.ts`, `components/PackingList.tsx`, `components/MealPlan.tsx`, `components/TripsClient.tsx`, `components/VehicleClient.tsx`
- Codebase direct read — all `app/api/` route files to verify current error handling state
- `prisma/schema.prisma` — current schema, confirmed no MealPlan or TripFeedback models exist
- `components/ui/index.ts` — confirmed 9 primitives available
- `.planning/codebase/CONCERNS.md` — confirmed which routes had missing try-catch (and which have since been fixed)
- `package.json` — confirmed Zod is NOT installed

### Secondary (MEDIUM confidence)
- Zod 3.x `.safeParse()` API — well-established, stable since 3.0 (August 2025 knowledge cutoff)
- Prisma SQLite enum limitation — verified by schema provider setting and Prisma docs knowledge

### Tertiary (LOW confidence)
- Zod current version (3.24.x) — based on knowledge cutoff; executor should run `npm view zod version` to confirm before installing

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — verified by direct codebase reads and package.json inspection
- Architecture: HIGH — patterns derived from existing working code in the same repo
- Pitfalls: HIGH — derived from reading the actual component and API code, not speculation
- Schema design: HIGH — follows established Prisma patterns already in schema.prisma

**Research date:** 2026-04-01
**Valid until:** 2026-05-01 (stable stack, no fast-moving dependencies except Zod version)
