# Phase 30: Gear Product Research - Research

**Researched:** 2026-04-03
**Domain:** AI-powered gear research — Claude API integration, Prisma schema extension, React tab UI, upgrade surfacing
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** New `GearResearch` Prisma model — do NOT extend GearDocument. Research results are structured (alternatives list, pros/cons, verdict) not URL+title pairs. A dedicated table keeps the schema honest.
- **D-02:** One row per GearItem, overwrite on re-research. `researchedAt` field tracks staleness. No history kept — simple and clean.
- **D-03:** Staleness threshold = 90 days.
- **D-04:** Top 3 alternatives per gear item.
- **D-05:** Explicit upgrade verdict per research run: "Worth upgrading", "Keep what you have", or "Only if budget allows".
- **D-06:** Approximate price range for each alternative (e.g. "$180–220"). Claude notes that prices may be outdated.
- **D-07:** Pros/cons vs. current item for each alternative.
- **D-08:** Claude inputs: `name`, `brand`, `modelNumber`, `category`, `condition`, `price` from GearItem.
- **D-09:** New "Research" tab in the gear detail modal, alongside the existing Documents tab. Button in the tab header triggers the research run.
- **D-10:** Stale results (>90 days): show old results with a stale warning banner and a "Re-research" button. Old results remain visible.
- **D-11:** Collapsible "Upgrade Opportunities (N)" section on the gear page (not the dashboard). Shows only items where verdict = "Worth upgrading."
- **D-12:** Each entry: gear name → top alternative name + verdict + brief reason.
- **D-13:** Clicking an entry opens that gear item's Research tab.

### Claude's Discretion
- Exact Claude prompt design and system prompt for gear research
- How to handle gear items with no brand/modelNumber (graceful degradation)
- Loading state UX during research (spinner, progress message, etc.)
- How alternatives are sorted/ranked (Claude decides ordering)
- GearResearch model field names and JSON structure for alternatives array
- Whether to add a `verdict` enum column or store as a string

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope.
</user_constraints>

## Summary

Phase 30 adds AI-powered product research to gear items. The core pattern is identical to `findGearManual` in `lib/claude.ts` — a POST route under `/api/gear/[id]/research` calls Claude, result is stored in a new `GearResearch` Prisma model with a one-to-one relation to `GearItem`, and the UI renders a new "Research" tab in the gear detail modal following the exact `GearDocumentsTab.tsx` structure.

The `GearResearch` model stores a JSON blob of the research result plus a `researchedAt` timestamp. Staleness is computed client-side: if `Date.now() - researchedAt > 90 * 24 * 60 * 60 * 1000`, show the stale banner. The Upgrade Opportunities collapsible on the gear page requires the gear page server component to also fetch `GearResearch` rows where `verdict = "Worth upgrading"` and pass them as a prop to `GearClient`.

All decisions align with established project patterns. No new libraries are needed. The only novel decision area is the `GearResearch` Prisma model shape and the Claude prompt — both are at Claude's discretion per CONTEXT.md.

**Primary recommendation:** Follow the `findGearManual` / `GearDocumentsTab` pattern exactly. The only new work is: schema migration, Zod schema in `parse-claude.ts`, new function in `claude.ts`, POST route at `/api/gear/[id]/research`, and two UI components (`GearResearchTab` and the Upgrade Opportunities collapsible in `GearClient`).

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.80.0 (installed) | Claude API calls | Already used; all AI calls go through this |
| Prisma | 6.19.2 (installed) | GearResearch schema + migration | Project ORM |
| Zod | ^4.3.6 (installed) | Schema validation for Claude output | Already used in `parse-claude.ts` |
| Next.js App Router | 16.2.1 (installed) | API route at `/api/gear/[id]/research` | Project framework |
| React 19 | installed | GearResearchTab client component | Project framework |
| Vitest | ^3.2.4 (installed) | Unit tests for route + schema | Project test runner |

### No New Dependencies
This phase requires zero new npm packages. All required libraries are already installed.

**Installation:**
```bash
# Nothing to install — all dependencies already present
```

## Architecture Patterns

### Recommended Project Structure
```
app/api/gear/[id]/
  research/
    route.ts          # POST — trigger research, GET — fetch stored result
lib/
  claude.ts           # Add generateGearResearch() function
  parse-claude.ts     # Add GearResearchResultSchema + types
components/
  GearResearchTab.tsx # New tab component (mirrors GearDocumentsTab)
  GearClient.tsx      # Add Upgrade Opportunities collapsible + pass research to modal
prisma/
  schema.prisma       # Add GearResearch model
  migrations/         # New migration for GearResearch table
tests/
  gear-research-route.test.ts  # Unit tests for POST route
```

### Pattern 1: Claude Research Function (mirrors findGearManual)
**What:** Export async function `generateGearResearch(params)` from `lib/claude.ts`
**When to use:** Called exclusively from the API route — never from client

```typescript
// Source: lib/claude.ts (existing findGearManual pattern)
export async function generateGearResearch(params: {
  name: string;
  brand: string | null;
  modelNumber: string | null;
  category: string;
  condition: string | null;
  price: number | null;
}): Promise<GearResearchResult> {
  // Build prompt with gear context
  // Call anthropic.messages.create({ model: 'claude-sonnet-4-20250514', max_tokens: 2000 })
  // parseClaudeJSON(text, GearResearchResultSchema)
  // Return typed result or throw
}
```

### Pattern 2: GearResearch Prisma Model (mirrors GearDocument one-to-one)
**What:** One row per GearItem — upsert on re-research, never append

```prisma
// Source: prisma/schema.prisma (GearDocument pattern adapted)
model GearResearch {
  id           String   @id @default(cuid())
  gearItemId   String   @unique          // one-to-one enforced by @unique
  result       String                    // JSON blob of GearResearchResult
  verdict      String                    // top-level signal: "Worth upgrading" | "Keep what you have" | "Only if budget allows"
  researchedAt DateTime @default(now())
  createdAt    DateTime @default(now())

  gearItem GearItem @relation(fields: [gearItemId], references: [id], onDelete: Cascade)
}
```

Note: Adding `verdict` as a top-level column (not buried in JSON) enables efficient filtering for the Upgrade Opportunities section without JSON parsing in SQL queries on SQLite.

Also add the relation back-reference to `GearItem`:
```prisma
model GearItem {
  // ... existing fields ...
  research     GearResearch?
}
```

### Pattern 3: Zod Schema in parse-claude.ts (mirrors GearDocumentResultSchema)
**What:** Add `GearResearchResultSchema` and exported types

```typescript
// Source: lib/parse-claude.ts (existing GearDocumentResultSchema pattern)
const GearResearchAlternativeSchema = z.object({
  name: z.string(),
  brand: z.string().optional(),
  priceRange: z.string(),          // e.g. "$180–220"
  pros: z.array(z.string()),
  cons: z.array(z.string()),
  reason: z.string(),              // one-line summary for Upgrade Opportunities
});

export const GearResearchResultSchema = z.object({
  verdict: z.enum(['Worth upgrading', 'Keep what you have', 'Only if budget allows']),
  alternatives: z.array(GearResearchAlternativeSchema).max(3),
  summary: z.string(),             // 1-2 sentence overall assessment
  priceDisclaimer: z.string(),     // e.g. "Prices as of training data — verify before purchasing"
});

export type GearResearchResult = z.infer<typeof GearResearchResultSchema>;
export type GearResearchAlternative = z.infer<typeof GearResearchAlternativeSchema>;
```

### Pattern 4: API Route (mirrors documents/find/route.ts)
**What:** POST at `/api/gear/[id]/research` — fetch gear, call Claude, upsert GearResearch row, return result
**GET at same route** — return existing research or 404

```typescript
// Source: app/api/gear/[id]/documents/find/route.ts (pattern)
// POST /api/gear/:id/research
export async function POST(_req: NextRequest, { params }: ...) {
  const { id } = await params;
  const item = await prisma.gearItem.findUnique({ where: { id } });
  if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const result = await generateGearResearch({
    name: item.name, brand: item.brand,
    modelNumber: item.modelNumber, category: item.category,
    condition: item.condition, price: item.price,
  });

  const saved = await prisma.gearResearch.upsert({
    where: { gearItemId: id },
    create: { gearItemId: id, result: JSON.stringify(result), verdict: result.verdict, researchedAt: new Date() },
    update: { result: JSON.stringify(result), verdict: result.verdict, researchedAt: new Date() },
  });

  return NextResponse.json({ ...result, id: saved.id, researchedAt: saved.researchedAt.toISOString() });
}
```

### Pattern 5: GearResearchTab Component (mirrors GearDocumentsTab)
**What:** Client component loaded in gear detail modal as a tab alongside Documents
**Integration point:** `GearClient.tsx` line 366-377 — the `extraContent` prop of `GearForm`

Current `GearClient.tsx` passes Documents via `extraContent`. The Research tab should be added as a second section in that same `extraContent` block, or a tab switcher should be introduced. Since CONTEXT.md says "Research tab alongside Documents tab with a tab header", a tab switcher is appropriate.

```typescript
// New pattern: tabbed extra content in GearForm modal
// extraContent receives both Documents and Research as sibling tabs
// Tab state managed in GearClient (activeTab: 'documents' | 'research')
```

### Pattern 6: Upgrade Opportunities Section in GearClient
**What:** Collapsible section rendered above the gear list. Shows items with verdict "Worth upgrading".
**Data flow:** Gear page server component (`app/gear/page.tsx`) fetches `GearResearch` rows with `verdict = "Worth upgrading"` and passes them to `GearClient` as `initialResearchUpgrades`.

```typescript
// app/gear/page.tsx addition
const upgradeResearch = await prisma.gearResearch.findMany({
  where: { verdict: 'Worth upgrading' },
  include: { gearItem: { select: { id: true, name: true } } },
});
```

### Anti-Patterns to Avoid
- **Embedding verdict in JSON blob only:** Filtering upgrade items in server-side queries requires verdict as a top-level column. Don't bury it inside the JSON `result` field.
- **Client-side Claude calls:** All AI calls are server-side only (API routes). Never call Anthropic SDK from a React component.
- **Storing history:** D-02 locks "one row, overwrite" — do not create multiple GearResearch rows per item with a history pattern.
- **Mutating `GearItem`:** Research is additive. Never write research data back to GearItem fields.
- **Tab state in GearForm:** Tab switching (Documents vs Research) should be managed in `GearClient`, which already owns the `editingItem` state.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude response parsing | Custom JSON cleaner | `parseClaudeJSON` in `lib/parse-claude.ts` | Already handles markdown fence stripping, safeParse, error messages |
| Staleness check | Custom date logic | `Date.now() - new Date(researchedAt).getTime() > 90 * 86400000` | Simple inline check, no lib needed |
| Upsert logic | Custom find-then-create | Prisma `upsert` with `where: { gearItemId }` | @unique on gearItemId enables direct upsert |
| Schema validation | Manual type narrowing | Zod schema via `parseClaudeJSON` | Ensures Claude output matches expected shape before persisting |

## Common Pitfalls

### Pitfall 1: Tab Integration with Existing GearForm/GearClient
**What goes wrong:** Adding a Research tab requires introducing tab switching state into `GearClient`, which currently uses a flat `extraContent` prop for Documents. If this is done by hacking tab state into `GearForm`, it creates coupling.
**Why it happens:** `GearDocumentsTab` is currently rendered unconditionally in `extraContent`. Adding Research as a second tab requires a tab switcher wrapping both.
**How to avoid:** Add `activeTab: 'documents' | 'research'` state to `GearClient` (not `GearForm`). Pass a single `extraContent` element that is a tab switcher rendering either `GearDocumentsTab` or `GearResearchTab` based on state.
**Warning signs:** If `GearForm` receives tab state props, refactor.

### Pitfall 2: Upgrade Opportunities Requires Server-Side GearResearch Fetch
**What goes wrong:** Forgetting to fetch `GearResearch` rows in `app/gear/page.tsx` — `GearClient` is a client component that receives only `initialItems` today. The upgrade section needs research data at render time.
**Why it happens:** The current page only fetches `GearItem[]`. Research data is in a separate table.
**How to avoid:** Add a second Prisma query to `app/gear/page.tsx` (parallel via `Promise.all`). Pass `initialResearchUpgrades` prop to `GearClient`.
**Warning signs:** If `GearClient` fetches research data via `useEffect` on mount, it will cause a loading flash — prefer SSR-passed prop.

### Pitfall 3: Verdict as String vs Column — Migration Must Be Correct
**What goes wrong:** If `verdict` is not a top-level column on `GearResearch`, the Upgrade Opportunities query requires JSON parsing in SQLite (not supported via Prisma directly).
**Why it happens:** It's tempting to store everything in the JSON blob.
**How to avoid:** `verdict` MUST be a top-level column. Defined in schema, included in upsert.
**Warning signs:** If the query `findMany({ where: { verdict: '...' } })` fails at runtime, the column is missing.

### Pitfall 4: Research on Items with Minimal Data
**What goes wrong:** Gear items with only `name` and `category` (no brand, no modelNumber, no price) produce vague Claude output.
**Why it happens:** Claude has little to anchor a comparison on.
**How to avoid:** Prompt design should instruct Claude to handle sparse input gracefully: "If brand or model is unknown, recommend the best-in-class options for the category generally."
**Warning signs:** Claude returning empty alternatives array or generic non-actionable output.

### Pitfall 5: Prisma Migration in Non-Interactive Environment
**What goes wrong:** `prisma migrate dev` requires interactive input — fails in agent environments.
**Why it happens:** Known from Phase 29 decision log: "Migration created manually and applied via `prisma migrate deploy` due to non-interactive agent environment."
**How to avoid:** Create migration file manually, apply with `prisma migrate deploy` (not `dev`). This is the established pattern for this project.
**Warning signs:** Command hangs or prompts for confirmation.

### Pitfall 6: Zod 4 Import Syntax
**What goes wrong:** Zod 4 changed some API surface. The project has `zod: ^4.3.6` — `z.string().url()` and enum syntax are unchanged, but `.nullable()` behavior and discriminated unions have minor differences.
**Why it happens:** Version mismatch between training data (Zod 3) and project (Zod 4).
**How to avoid:** Mirror existing schemas in `parse-claude.ts` exactly. All schemas in the file use Zod 4 already and work — copy patterns from `GearDocumentResultSchema` or `VehicleChecklistResultSchema`.
**Warning signs:** TypeScript errors on `.nullable()` or `.optional()` chaining.

## Code Examples

Verified patterns from existing source files:

### Claude API Call Pattern (from lib/claude.ts line 683-693)
```typescript
// Source: lib/claude.ts findGearManual()
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1500,
  messages: [{ role: 'user', content: prompt }],
});
const text = message.content[0].type === 'text' ? message.content[0].text : '';
const parseResult = parseClaudeJSON(text, GearDocumentResultSchema);
if (!parseResult.success) {
  throw new Error(parseResult.error);
}
return parseResult.data;
```

### parseClaudeJSON Pattern (from lib/parse-claude.ts)
```typescript
// Source: lib/parse-claude.ts lines 8-28
export function parseClaudeJSON<T>(
  raw: string,
  schema: ZodSchema<T>
): { success: true; data: T } | { success: false; error: string }
// Returns discriminated union — never throws
// Strips markdown fences before JSON.parse
```

### Prisma Upsert Pattern (from State.md DepartureChecklist decision)
```typescript
// Pattern from Phase 6: upsert with unique field
await prisma.gearResearch.upsert({
  where: { gearItemId: id },
  create: { gearItemId: id, result: JSON.stringify(result), verdict: result.verdict, researchedAt: new Date() },
  update: { result: JSON.stringify(result), verdict: result.verdict, researchedAt: new Date() },
});
```

### API Route Pattern (from app/api/gear/[id]/documents/find/route.ts)
```typescript
// Source: app/api/gear/[id]/documents/find/route.ts
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.gearItem.findUnique({ where: { id } });
    if (!item) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 });
    }
    // ... call Claude, return result
  } catch (error) {
    console.error('Failed to find gear manual:', error);
    return NextResponse.json({ error: 'Failed to find gear manual' }, { status: 500 });
  }
}
```

### GearClient extraContent Tab Pattern (current — line 366-377)
```typescript
// Source: components/GearClient.tsx — current Documents injection
extraContent={editingItem ? (
  <div className="border-t border-stone-200 dark:border-stone-700 pt-4 mt-2">
    <h3 className="text-sm font-medium ...">Documents</h3>
    <GearDocumentsTab gearItemId={editingItem.id} ... />
  </div>
) : undefined}
```

New pattern replaces this with a tab switcher:
```typescript
// Replace with tab-switched version
const [activeTab, setActiveTab] = useState<'documents' | 'research'>('documents')
// ... pass tab state into extraContent
```

### Staleness Check Pattern (inline, no lib needed)
```typescript
// Compute staleness in GearResearchTab
const STALE_DAYS = 90;
const isStale = researchedAt
  ? Date.now() - new Date(researchedAt).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
  : false;
```

### Vitest Mock Pattern (from tests/vehicle-checklist-route.test.ts)
```typescript
// Source: tests/vehicle-checklist-route.test.ts lines 1-21
vi.mock('@/lib/db', () => ({ prisma: { gearItem: { findUnique: vi.fn() }, gearResearch: { upsert: vi.fn() } } }))
vi.mock('@/lib/claude', () => ({ generateGearResearch: vi.fn() }))
// imports AFTER mocks
import { POST, GET } from '@/app/api/gear/[id]/research/route'
```

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` |
| Quick run command | `npx vitest run tests/gear-research-route.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | POST /api/gear/[id]/research returns research result and persists | unit | `npx vitest run tests/gear-research-route.test.ts` | No — Wave 0 |
| SC-2 | GET /api/gear/[id]/research returns stored result | unit | `npx vitest run tests/gear-research-route.test.ts` | No — Wave 0 |
| SC-3 | parseClaudeJSON validates GearResearchResultSchema correctly | unit | `npx vitest run tests/gear-research-schema.test.ts` | No — Wave 0 |
| SC-4 | 404 returned when gearItemId not found | unit | `npx vitest run tests/gear-research-route.test.ts` | No — Wave 0 |
| SC-5 | npm run build passes | build | `npm run build` | N/A |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/gear-research-route.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run build` before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/gear-research-route.test.ts` — covers SC-1, SC-2, SC-4 (POST triggers research, GET returns stored, 404 on missing)
- [ ] `tests/gear-research-schema.test.ts` — covers SC-3 (Zod schema validates good/bad Claude output)

## Environment Availability

Step 2.6: SKIPPED — this phase is purely code/config changes. All dependencies (Anthropic SDK, Prisma, Zod, Next.js) are already installed and verified running in this codebase.

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no plain JS
- All API routes must have try-catch error handling with `console.error` + JSON error response
- No `alert()` in components — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays — never include state that the hook itself updates
- Functional components with hooks only
- Immutable patterns — no in-place mutation
- Files focused under 800 lines
- Functions under 50 lines
- `npm run build` must pass at phase completion
- Commit messages: imperative mood, concise
- Update TASKS.md every session
- Create session changelog file in `docs/changelog/session-NN.md`
- Prisma migrations: use `prisma migrate deploy` (not `prisma migrate dev`) in agent environments

## Open Questions

1. **Tab switcher location in GearForm vs GearClient**
   - What we know: `GearClient` passes `extraContent` to `GearForm`. Currently a flat Documents section.
   - What's unclear: Whether `GearForm` itself has a tab header area, or whether the tab switcher must be built entirely inside the `extraContent` block.
   - Recommendation: Read `GearForm.tsx` before planning to understand how `extraContent` is rendered. Tab state belongs in `GearClient`; the `extraContent` block renders the active tab.

2. **GET vs POST-only for research route**
   - What we know: Documents use a separate GET route (`/api/gear/[id]/documents`). Research is one row.
   - Recommendation: Single route file with both `GET` (return existing) and `POST` (trigger + save). `GearResearchTab` calls GET on mount to populate, POST on button click.

3. **Upgrade Opportunities click-to-open behavior**
   - What we know: D-13 says clicking an entry opens the gear item's Research tab.
   - What's unclear: `GearClient` manages `editingItem` for the form modal. Clicking from Upgrade Opportunities section must set `editingItem` AND `activeTab = 'research'`.
   - Recommendation: `handleOpenResearch(gearId: string)` function in `GearClient` that sets both states atomically.

## Sources

### Primary (HIGH confidence)
- `lib/claude.ts` — `findGearManual()` function — direct code reference for Claude call pattern
- `lib/parse-claude.ts` — `GearDocumentResultSchema` — direct code reference for Zod schema pattern
- `components/GearDocumentsTab.tsx` — direct code reference for tab UI pattern
- `app/api/gear/[id]/documents/find/route.ts` — direct code reference for API route pattern
- `prisma/schema.prisma` — `GearDocument` model — direct code reference for Prisma one-to-many (adapting to one-to-one)
- `components/GearClient.tsx` — direct code reference for `extraContent` integration point
- `app/gear/page.tsx` — direct code reference for server component data fetching pattern
- `tests/vehicle-checklist-route.test.ts` — direct code reference for Vitest mock + route test pattern
- `.planning/STATE.md` — Phase 29 decision: use `prisma migrate deploy` not `prisma migrate dev`
- `package.json` — confirmed: zod@^4.3.6, vitest@^3.2.4, no new deps needed

### Secondary (MEDIUM confidence)
- CONTEXT.md `30-CONTEXT.md` — locked decisions and canonical refs (primary source for this phase)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages verified from `package.json`
- Architecture: HIGH — patterns extracted directly from existing codebase files
- Pitfalls: HIGH — most derived from existing code structure + Phase 29 migration precedent
- Validation: HIGH — vitest config and test pattern verified from existing test files

**Research date:** 2026-04-03
**Valid until:** 2026-07-03 (stable stack, 90-day estimate)
