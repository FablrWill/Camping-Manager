# Phase 25: Gear Docs & Manual Finder - Research

**Researched:** 2026-04-03
**Domain:** Prisma schema migration, Claude API integration, binary file storage, service worker caching, React UI patterns
**Confidence:** HIGH

## Summary

Phase 25 replaces the single `manualUrl` text field on `GearItem` with a proper multi-document model (`GearDocument`). This involves a two-step Prisma migration (migrate existing data, then drop the old column), new API routes under `app/api/gear/[id]/documents/`, a "Find Manual" Claude call that returns structured JSON, PDF download to `public/docs/`, and a Documents tab in the gear detail UI.

The primary technical risk is the two-phase migration: Prisma's SQLite driver does not support DROP COLUMN in the same migration that moves data. The migration SQL must be hand-crafted to copy data first, then drop the column in a separate migration step. All other components have direct precedents in the existing codebase.

Claude's "Find Manual" strategy uses URL prediction (brand + modelNumber pattern-matched to known manufacturer support domains) rather than live web search, since the app has no tool-use infrastructure for web fetching. The response is parsed via `parseClaudeJSON` + Zod, matching all other Claude calls in the project. PDF download follows the same pattern as photo upload (`writeFile` to `public/docs/`, `randomUUID()` filename).

**Primary recommendation:** Build in three layers — schema first (migration + Prisma model), then API routes, then UI. The migration is the highest-risk step; it must be split across two migration files to be SQLite-safe.

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- **D-01:** Migrate + remove. Write a Prisma migration that converts each non-null `manualUrl` value on `GearItem` into a `GearDocument` row (type: `support_link`, title: `'Manual'`, url: existing value), then drops the `manualUrl` column.
- **D-02:** Migrated `manualUrl` values become type `support_link` — most existing values are HTML pages, not PDFs, so `support_link` is the honest type.
- **D-03:** GearDocument includes: `id`, `gearItemId`, `type` (enum: `manual_pdf`, `support_link`, `warranty`, `product_page`), `url`, `title` (Claude-generated, editable), `localPath` (nullable, set when PDF downloaded), `createdAt`.
- **D-04:** Title is included — e.g. "MSR Hubba Hubba NX Owner's Manual". Claude generates it; user can edit after.

### Claude's Discretion
- Claude search strategy (URL generation vs. live web search with tool use)
- PDF inline viewing approach (iframe, react-pdf, browser redirect)
- Whether warranty upload flow (user uploads receipt/warranty card) is in scope — assess against ROADMAP success criteria

### Deferred Ideas (OUT OF SCOPE)
- None explicitly deferred beyond the "Claude's Discretion" items above, which are implementation choices within phase scope.
</user_constraints>

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 (pinned) | Schema migration + ORM | Already in project; all DB access goes through it |
| @anthropic-ai/sdk | 0.80.0 (pinned) | Claude API call for "Find Manual" | Already in project; pattern established in `lib/claude.ts` |
| zod | (via parse-claude.ts) | Validate Claude JSON response | Established pattern: all Claude responses go through `parseClaudeJSON` |
| Node.js `fs/promises` + `crypto` | built-in | PDF file download to `public/docs/` | Same pattern as photo upload (`writeFile`, `randomUUID`) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| idb-keyval | (via offline-storage.ts) | IndexedDB for offline caching | If PDF cache tracking needs to survive service worker restarts |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| URL prediction in Claude prompt | Tool-use web search | Tool use requires infrastructure not yet in the project; URL prediction works well for established brands with stable support URL patterns |
| `<iframe>` for PDF inline view | react-pdf library | `react-pdf` requires canvas + PDF.js bundle (~300KB); `<iframe>` is zero-dependency but mobile browsers vary. `<a target="_blank">` is the safe fallback. |
| `public/docs/` static folder | Separate `/api/docs/serve` route | Static serving is simpler; no need for auth on a single-user app |

**Installation:** No new dependencies required. All needed packages are already installed.

---

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  migrations/
    XXXXXXXXXXXXXX_add_gear_document/   — adds GearDocument, NOT yet drops manualUrl
    XXXXXXXXXXXXXX_drop_manual_url/     — drops manualUrl column (second migration)

app/api/gear/[id]/documents/
  route.ts                              — GET (list), POST (add manually)
  [docId]/
    route.ts                            — DELETE, PATCH (edit title)
  find/
    route.ts                            — POST: calls Claude to find manual, returns GearDocumentResult

lib/
  claude.ts                             — add findGearManual() export
  parse-claude.ts                       — add GearDocumentResultSchema

public/
  docs/                                 — downloaded PDFs (created at runtime, gitignored)

components/
  GearDocumentsTab.tsx                  — Documents tab content (list + Find Manual button)
  GearClient.tsx                        — add Documents tab to gear detail modal
  GearForm.tsx                          — remove manualUrl field
```

### Pattern 1: Two-Phase Prisma Migration (SQLite DROP COLUMN constraint)

**What:** SQLite does not support dropping columns in the same statement that modifies data. The migration must be split: migration 1 creates `GearDocument` and inserts migrated rows; migration 2 drops `manualUrl`.

**When to use:** Any time a column removal depends on data that must be migrated first.

**Example:**
```sql
-- Migration 1: 20260403_add_gear_document/migration.sql
-- Create GearDocument table
CREATE TABLE "GearDocument" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "gearItemId" TEXT NOT NULL,
  "type" TEXT NOT NULL DEFAULT 'support_link',
  "url" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "localPath" TEXT,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "GearDocument_gearItemId_fkey"
    FOREIGN KEY ("gearItemId") REFERENCES "GearItem"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "GearDocument_gearItemId_idx" ON "GearDocument"("gearItemId");

-- Migrate existing manualUrl values to GearDocument rows
INSERT INTO "GearDocument" ("id", "gearItemId", "type", "url", "title", "createdAt")
SELECT
  lower(hex(randomblob(9))),  -- short CUID-like id
  "id",
  'support_link',
  "manualUrl",
  'Manual',
  CURRENT_TIMESTAMP
FROM "GearItem"
WHERE "manualUrl" IS NOT NULL AND "manualUrl" != '';
```

```sql
-- Migration 2: 20260403_drop_manual_url/migration.sql
-- SQLite requires full table rebuild to drop a column
-- Use Prisma's generated migration for this step
ALTER TABLE "GearItem" DROP COLUMN "manualUrl";
```

**Note on Prisma cuid generation in raw SQL:** Prisma's `@id @default(cuid())` is handled at the application layer, not the database. For migration-time INSERT, use SQLite's `lower(hex(randomblob(9)))` or a fixed prefix + randomblob. Alternatively, do the data migration in a seed/migration script via Prisma Client (more robust for production).

### Pattern 2: Claude "Find Manual" — URL Prediction Strategy

**What:** Claude receives `name`, `brand`, `modelNumber`, and `category`; generates likely manufacturer support page URL and PDF URL without live web access.

**When to use:** When the app has no tool-use web fetch infrastructure and brand support URLs follow predictable patterns (brand.com/support/[model]).

**Example (prompt structure):**
```typescript
// Source: lib/claude.ts pattern — all Claude calls follow this shape
const prompt = `You are a product manual research assistant.
Given gear details, return the most likely manufacturer support page URL and PDF manual URL.

GEAR:
- Name: ${name}
- Brand: ${brand}
- Model Number: ${modelNumber}
- Category: ${category}

INSTRUCTIONS:
1. Generate the most likely URL for the manufacturer's support/product page for this exact model.
2. If the brand typically hosts PDF manuals (e.g. MSR, GSI, Black Diamond, Garmin), generate the likely PDF URL.
3. For each URL, provide a confidence level: "high" (you know this brand's URL pattern well) or "low" (guessing).
4. Generate a descriptive title for each document (e.g. "MSR Hubba Hubba NX Owner's Manual").

Respond ONLY with valid JSON:
{
  "documents": [
    {
      "type": "support_link",
      "url": "https://www.cascadedesigns.com/msr/tents/hubba-hubba-nx/product",
      "title": "MSR Hubba Hubba NX Product Page",
      "confidence": "high"
    },
    {
      "type": "manual_pdf",
      "url": "https://www.cascadedesigns.com/assets/pdf/hubba-hubba-nx-instructions.pdf",
      "title": "MSR Hubba Hubba NX Setup Instructions (PDF)",
      "confidence": "low"
    }
  ]
}
Do NOT wrap JSON in markdown code blocks.`
```

**Confidence caveat:** URL prediction is LOW confidence for exact URL correctness. The planner should ensure the UI communicates to the user that Claude's guessed URLs may be wrong, and allow easy deletion. The "Find Manual" flow should be non-destructive (user confirms before saving).

### Pattern 3: PDF Download to public/docs/

**What:** Fetch a PDF from a URL, save to `public/docs/`, update `GearDocument.localPath`.

**Example:**
```typescript
// Source: app/api/photos/upload/route.ts pattern
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { getDocsDir } from '@/lib/paths'  // to add, mirrors getPhotosDir()

const id = randomUUID()
const filename = `${id}.pdf`
const docsDir = getDocsDir()
await mkdir(docsDir, { recursive: true })
const filepath = join(docsDir, filename)
const response = await fetch(url)
const buffer = Buffer.from(await response.arrayBuffer())
await writeFile(filepath, buffer)
// localPath = `/docs/${filename}`
```

**Caution:** `fetch()` in Next.js API routes is the Node.js global fetch (Node 18+). Content-type validation should be checked: if the server returns HTML instead of a PDF (404 page), the download must be rejected. Check `response.headers.get('content-type')` includes `application/pdf`.

### Pattern 4: GearDocumentResultSchema (Zod)

All Claude responses go through `parseClaudeJSON`. Add to `lib/parse-claude.ts`:

```typescript
// Source: existing pattern in lib/parse-claude.ts
export const GearDocumentResultSchema = z.object({
  documents: z.array(z.object({
    type: z.enum(['manual_pdf', 'support_link', 'warranty', 'product_page']),
    url: z.string().url(),
    title: z.string(),
    confidence: z.enum(['high', 'low']).optional(),
  })),
})
export type GearDocumentResult = z.infer<typeof GearDocumentResultSchema>
```

### Pattern 5: API Route Structure (follows existing gear pattern)

```typescript
// app/api/gear/[id]/documents/route.ts
// GET — list documents for a gear item
// POST — manually add a document

// app/api/gear/[id]/documents/[docId]/route.ts
// PATCH — update title (editable per D-04)
// DELETE — remove document

// app/api/gear/[id]/documents/find/route.ts
// POST — call Claude, return found documents (does NOT auto-save; UI confirms)
```

### Anti-Patterns to Avoid

- **Auto-saving Claude's guessed URLs without user confirmation:** URLs may be wrong. Present results for review before persisting.
- **Single migration for data move + column drop:** SQLite will reject or require a full table rebuild. Use two separate migrations.
- **Fetching PDFs client-side:** CORS will block most manufacturer servers. PDF download must go through the server (`/api/gear/[id]/documents/download`).
- **Serving PDFs from `public/docs/` without any validation:** Accept-type check on download prevents saving HTML error pages as `.pdf` files.
- **Putting `manualUrl` removal in the same file as `GearDocument` creation:** Safe to combine in a single Prisma migration file as long as the INSERT comes before the DROP, but Prisma auto-generated migrations may not handle this correctly — manual migration SQL is safer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Claude JSON parsing | Custom parser | `parseClaudeJSON` + Zod in `lib/parse-claude.ts` | Handles markdown fences, schema mismatches, returns discriminated union |
| Prisma model types | Manual TypeScript interfaces | `z.infer<typeof schema>` or Prisma-generated types | Already the pattern throughout the codebase |
| File path resolution | Inline `process.cwd()` | `lib/paths.ts` pattern (`getPhotosDir`) | Single place to handle production vs. dev path differences |

**Key insight:** Every new piece of this phase has a direct analogue already in the codebase. The planner should point implementors to the existing pattern rather than inventing new ones.

---

## Runtime State Inventory

This is not a rename/refactor phase, but it does migrate a live database column. Inventory of runtime state:

| Category | Items Found | Action Required |
|----------|-------------|-----------------|
| Stored data | `GearItem.manualUrl` — nullable column with up to N rows; seed data adds manualUrl for 0 items (checked: seed.ts has no manualUrl values) | Data migration via Prisma migration SQL |
| Live service config | None — no external services store gear doc references | None |
| OS-registered state | None | None |
| Secrets/env vars | None — no new secrets required | None |
| Build artifacts | `prisma/dev.db` — local database must be migrated or reset during dev | `npx prisma migrate dev` or `npm run db:reset` |

**Nothing found outside stored data category** — verified by reading schema, seed.ts, and config files.

---

## Common Pitfalls

### Pitfall 1: SQLite Column Drop Failure
**What goes wrong:** `ALTER TABLE "GearItem" DROP COLUMN "manualUrl"` fails on older SQLite versions, or conflicts with Prisma's migration tracking if done incorrectly.
**Why it happens:** SQLite added DROP COLUMN support only in version 3.35.0 (2021). Node.js `better-sqlite3` bundles its own SQLite, typically recent enough, but Prisma's migration system may not handle a combined data-move + drop correctly in a single file.
**How to avoid:** Use two separate migration files. Generate each with `npx prisma migrate dev --name [name]` and edit the SQL manually. Run `npx prisma migrate dev` after each.
**Warning signs:** Migration error mentioning "no such column" or "table locked" during migration run.

### Pitfall 2: PDF Download Returns HTML
**What goes wrong:** A Claude-guessed PDF URL returns a 404 or redirect to a marketing page. The server saves an HTML file with a `.pdf` extension. `localPath` is set but the "file" is not a valid PDF.
**Why it happens:** Manufacturer URLs change. Claude's URL prediction is best-effort.
**How to avoid:** Check `Content-Type` header on the fetch response. Only write to disk if `content-type` includes `application/pdf` or `application/octet-stream`. Return an error to the client otherwise.
**Warning signs:** PDF displays as blank or browser shows HTML source in the viewer.

### Pitfall 3: `manualUrl` in Component TypeScript Interfaces
**What goes wrong:** After the migration, `GearItem` no longer has `manualUrl`, but TypeScript interfaces in components still reference it, causing build failures.
**Why it happens:** `GearClient.tsx` line 27 defines `manualUrl: string | null` in the local GearItem interface. `GearForm.tsx` lines 346–353 render the input. Both must be updated.
**How to avoid:** After schema migration, search the codebase for `manualUrl` and remove all references. The planner should include explicit search-and-remove tasks.
**Warning signs:** `npm run build` fails with "Property 'manualUrl' does not exist".

### Pitfall 4: Service Worker Caches PDFs from `public/docs/` Unexpectedly
**What goes wrong:** The existing SW uses cache-first for everything not in `/api/` or `tile.openstreetmap.org`. A request to `/docs/abc.pdf` gets cached on first access and never updates.
**Why it happens:** The SW's fallthrough rule caches all non-API, non-tile requests.
**How to avoid:** This is actually acceptable behavior for PDFs (they don't change). No action needed unless storage is a concern. For the success criterion "cached for offline access," the existing SW behavior already handles `/docs/*.pdf` files via cache-first. No SW changes are required for basic offline support.
**Warning signs:** Stale PDF served after the file is deleted from `public/docs/`.

### Pitfall 5: Prisma Client Not Regenerated After Schema Change
**What goes wrong:** API routes using `prisma.gearDocument` fail at runtime with "prisma.gearDocument is not a function".
**Why it happens:** Prisma Client must be regenerated after schema changes.
**How to avoid:** Run `npx prisma generate` after adding the `GearDocument` model. Typically `npx prisma migrate dev` does this automatically, but a manual `npx prisma generate` step in the plan is safe insurance.
**Warning signs:** TypeScript intellisense doesn't show `gearDocument` on the prisma client.

---

## Code Examples

### Existing Claude Call Pattern (from lib/claude.ts)
```typescript
// Source: lib/claude.ts lines 261–265
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 2000,
  messages: [{ role: 'user', content: prompt }],
})
const text = message.content[0].type === 'text' ? message.content[0].text : ''
const parseResult = parseClaudeJSON(text, MySchema)
if (!parseResult.success) throw new Error(parseResult.error)
return parseResult.data
```

### Existing File Write Pattern (from app/api/photos/upload/route.ts)
```typescript
// Source: app/api/photos/upload/route.ts lines 39–48
const id = randomUUID()
const filename = `${id}.jpg`
const filepath = join(photosDir, filename)
await sharp(buffer).rotate().resize(1200, 1200, ...).jpeg(...).toFile(filepath)
// For PDF: await writeFile(filepath, buffer) — no sharp processing needed
```

### Existing API Sub-Route Pattern (from app/api/gear/[id]/route.ts)
```typescript
// Source: app/api/gear/[id]/route.ts lines 6–8
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  // ...
}
// New: app/api/gear/[id]/documents/[docId]/route.ts follows same signature
// with params: Promise<{ id: string; docId: string }>
```

### GearDocument Prisma Model (to add to schema.prisma)
```prisma
model GearDocument {
  id         String   @id @default(cuid())
  gearItemId String
  type       String   // "manual_pdf" | "support_link" | "warranty" | "product_page"
  url        String
  title      String
  localPath  String?  // set when PDF downloaded, e.g. /docs/abc123.pdf
  createdAt  DateTime @default(now())

  gearItem GearItem @relation(fields: [gearItemId], references: [id], onDelete: Cascade)

  @@index([gearItemId])
}
```

And add to GearItem:
```prisma
  documents GearDocument[]
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single `manualUrl` text field | `GearDocument` one-to-many model | Phase 25 | Multiple docs per item, typed, downloadable |
| Manual URL entry in GearForm | Claude-assisted "Find Manual" button | Phase 25 | Reduces user friction; URL discovery is automated |

**Deprecated after this phase:**
- `GearItem.manualUrl` column: removed via migration
- `manualUrl` input in `GearForm.tsx`: removed
- `manualUrl` in `GearClient.tsx` interface: removed
- `manualUrl` in `app/api/gear/route.ts` POST and `app/api/gear/[id]/route.ts` PUT: removed

---

## Open Questions

1. **PDF inline viewing on mobile Safari**
   - What we know: `<iframe src="/docs/xxx.pdf">` works on desktop browsers. Mobile Safari on iOS handles PDFs inline since iOS 12 but behavior varies.
   - What's unclear: Whether an iframe embed or `<a target="_blank">` is the better UX on phone (Will's primary device).
   - Recommendation: Use `<a target="_blank" rel="noopener" href={localPath || url}>` as the primary action. No iframe needed to satisfy the success criteria ("display inline" likely means "open without leaving the app"). An iframe is a stretch goal.

2. **Warranty upload flow scope**
   - What we know: Success criteria do not mention warranty upload (file upload from device). The `type` enum includes `warranty`.
   - What's unclear: Whether this phase should include a "upload warranty doc" file picker, or just allow manually adding a warranty URL.
   - Recommendation: Exclude file upload. A manually-added URL with `type: 'warranty'` satisfies the schema success criterion (GearDocument model exists with warranty type) without adding upload infrastructure.

3. **`public/docs/` gitignore**
   - What we know: `public/photos/` contains uploaded photos that should not be in git.
   - What's unclear: Whether `public/docs/` is already gitignored (`.gitignore` not checked).
   - Recommendation: Add `public/docs/` to `.gitignore` as part of this phase.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js fs/promises | PDF download | Yes | Built-in | None needed |
| Node.js global fetch | PDF download | Yes | Node 18+ (Next.js 16 requires it) | None needed |
| Prisma CLI | Migration | Yes | 6.19.2 | None needed |
| Anthropic SDK | Find Manual | Yes | 0.80.0 | None needed |
| SQLite 3.35+ (DROP COLUMN) | Migration | Yes (bundled with better-sqlite3) | Recent | Split migration workaround if needed |

**No missing dependencies.** All required packages are already installed.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (detected in `lib/__tests__/` and `tests/`) |
| Config file | `vitest.config.ts` (inferred from test file patterns) |
| Quick run command | `npx vitest run tests/gear-documents.test.ts` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| SC-1 | GearDocument model exists with correct fields | unit | `npx vitest run tests/gear-documents.test.ts` | ❌ Wave 0 |
| SC-2 | POST /api/gear/[id]/documents/find calls Claude and returns docs | unit | `npx vitest run tests/gear-documents.test.ts` | ❌ Wave 0 |
| SC-3 | PDF download saves to public/docs and sets localPath | unit | `npx vitest run tests/gear-documents.test.ts` | ❌ Wave 0 |
| SC-4 | GET /api/gear/[id]/documents returns document list | unit | `npx vitest run tests/gear-documents.test.ts` | ❌ Wave 0 |
| SC-5 | manualUrl migration: existing values become GearDocument rows | integration | manual DB verify or migration test | ❌ Wave 0 |
| SC-6 | `npm run build` passes | smoke | `npm run build` | — (run at end) |

### Sampling Rate
- **Per task commit:** `npx vitest run tests/gear-documents.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** `npm run build` green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/gear-documents.test.ts` — covers SC-1 through SC-4 (route unit tests with mocked prisma + claude)
- [ ] `tests/conftest` not needed (Vitest uses `beforeEach`/`vi.mock()` inline)
- [ ] No framework install needed — Vitest already in project

---

## Sources

### Primary (HIGH confidence)
- `prisma/schema.prisma` — confirmed GearItem fields including `manualUrl`, confirmed existing model patterns
- `lib/claude.ts` — confirmed Claude call pattern, model ID, response parsing
- `lib/parse-claude.ts` — confirmed parseClaudeJSON + Zod pattern
- `app/api/photos/upload/route.ts` — confirmed file write pattern with writeFile + randomUUID
- `public/sw.js` — confirmed service worker caching strategy; `/docs/*` falls into cache-first via fallthrough
- `lib/offline-storage.ts` — confirmed IndexedDB pattern (idb-keyval); not needed for this phase
- `app/api/gear/route.ts`, `app/api/gear/[id]/route.ts` — confirmed API route pattern

### Secondary (MEDIUM confidence)
- SQLite DROP COLUMN support: added in SQLite 3.35.0 (March 2021); better-sqlite3 bundles recent SQLite so this should work, but verified by project pattern of manual migration SQL in Phase 7 (FTS virtual tables)

### Tertiary (LOW confidence)
- Claude URL prediction accuracy for manufacturer support pages: assessed from general knowledge of brand URL patterns; actual accuracy depends on brand and model

---

## Project Constraints (from CLAUDE.md)

Directives the planner must verify compliance with:

- TypeScript throughout — all new files must be `.ts` or `.tsx`
- All API routes must have try-catch error handling with `console.error` + JSON error response
- No `alert()` in components — use state-based inline error messages
- All React hooks must have correct, minimal dependency arrays
- Files 200–400 lines typical, 800 max — extract `GearDocumentsTab.tsx` as standalone component
- `manualUrl` field removed from `GearForm.tsx` (lines 346–353)
- `GearClient.tsx` gets Documents tab (gear detail modal)
- Follow existing naming: handler functions as `handleEventName()`, async functions descriptive names
- Commit messages: imperative mood, concise
- `public/docs/` should mirror `public/photos/` pattern — created at runtime, should be gitignored
- No new `alert()` usage — use inline error state in the Documents tab component

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all packages already in project, versions confirmed
- Architecture: HIGH — all patterns have direct analogues in existing code
- Migration approach: HIGH — SQLite DROP COLUMN constraint is a known issue with a known workaround; confirmed by Phase 7 manual migration precedent
- Claude URL prediction quality: LOW — depends on brands; UI must communicate uncertainty
- Pitfalls: HIGH — all identified from direct codebase inspection

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (stable dependencies, no moving targets)
