# Phase 25: Gear Docs & Manual Finder - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Every gear item can have attached documents (manuals, warranties, support links, product pages) that Claude finds automatically and are cached for offline access. A new `GearDocument` model replaces the existing single `manualUrl` field on `GearItem` with a proper multi-document store.

</domain>

<decisions>
## Implementation Decisions

### Schema: manualUrl Migration
- **D-01:** Migrate + remove. Write a Prisma migration that converts each non-null `manualUrl` value on `GearItem` into a `GearDocument` row (type: `support_link`, title: `'Manual'`, url: existing value), then drops the `manualUrl` column. Clean break, no duplication.
- **D-02:** Migrated `manualUrl` values become type `support_link` — most existing values are HTML pages, not PDFs, so `support_link` is the honest type.

### Schema: GearDocument Model
- **D-03:** GearDocument includes: `id`, `gearItemId`, `type` (enum: `manual_pdf`, `support_link`, `warranty`, `product_page`), `url`, `title` (Claude-generated, editable), `localPath` (nullable, set when PDF downloaded), `createdAt`.
- **D-04:** Title is included — e.g. "MSR Hubba Hubba NX Owner's Manual" is useful in a list of multiple docs. Claude generates it when finding the doc; it's editable by user after.

### Claude's Discretion
- Claude search strategy (how "Find Manual" works — URL generation vs. web search), PDF inline viewing approach, and document type scope (whether warranty upload flow is in-scope) were not discussed. Planner has flexibility here within the success criteria constraints from ROADMAP.md.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Schema
- `prisma/schema.prisma` — GearItem model (has `manualUrl`, `modelNumber`, `brand` fields that inform migration and search)

### Existing Patterns
- `lib/claude.ts` — Claude API integration pattern; use this for the "Find Manual" AI call
- `components/GearForm.tsx` — Shows how `manualUrl` is currently exposed in the form (line 346–353); this field needs to be removed
- `components/GearClient.tsx` — Gear list and detail UI; Documents tab will be added here
- `public/photos/` — Existing local file storage pattern for binary assets; PDFs should follow the same pattern (e.g., `public/docs/`)

### Offline/PWA
- `lib/offline-storage.ts` — Existing offline caching infrastructure; service worker doc caching may build on this

No external specs — requirements fully captured in ROADMAP.md success criteria and decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/claude.ts`: Established pattern for Claude API calls — use for the "Find Manual" search prompt
- `components/GearForm.tsx`: Has `manualUrl` input (to be removed) and `modelNumber` input (useful for Claude search context)
- `components/ui/`: Design system components (Card, Modal, Badge) for the Documents tab UI
- PWA service worker infrastructure (Phase 8): Already caches tiles and offline data; extend for PDFs

### Established Patterns
- API routes in `app/api/gear/`: CRUD pattern to follow for `app/api/gear/[id]/documents/` routes
- Photo upload to `public/photos/` via `app/api/photos/`: Model for PDF download + local storage
- `lib/parse-claude.ts`: Zod-based Claude output validation — use for "Find Manual" response parsing

### Integration Points
- `GearItem` ← `GearDocument` (one-to-many via `gearItemId`)
- `GearItem.manualUrl` column: must be removed via migration after data migration step
- Gear detail modal in `GearClient.tsx`: Documents tab added alongside existing tabs/sections

</code_context>

<specifics>
## Specific Ideas

- Memory note from prior session: Will wants gear additions to auto-find and save product manuals/user guides locally. This phase is the implementation of that idea.
- The `modelNumber` and `brand` fields on `GearItem` are the key inputs for Claude to generate accurate manual search queries.

</specifics>

<deferred>
## Deferred Ideas

- Claude search strategy details (URL generation vs. real web search with tool use) — left to planner/researcher
- PDF inline viewing approach (iframe, react-pdf, browser redirect) — left to planner/researcher
- Warranty upload flow (user uploads receipt/warranty card as a file, different from Claude auto-search) — may or may not be in scope; planner to assess against ROADMAP success criteria

None of these represent new capabilities — they are implementation choices within the phase scope.

</deferred>

---

*Phase: 25-gear-docs-manual-finder*
*Context gathered: 2026-04-03*
