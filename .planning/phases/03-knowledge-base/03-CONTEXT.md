# Phase 3: Knowledge Base - Context

**Gathered:** 2026-03-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Build and validate an NC camping RAG corpus with hybrid retrieval (vector embeddings + FTS5 keyword search, merged via Reciprocal Rank Fusion). This is pure backend/data infrastructure — no user-facing UI. The chat agent in Phase 4 consumes the retrieval API. Success is measured by retrieval quality on 10 representative test queries, not by a visible feature.

</domain>

<decisions>
## Implementation Decisions

### Corpus Scope & Sources
- **D-01:** Initial corpus includes the 7 existing Gemini Deep Research markdown files in `data/research/` (~265KB, ~2100 lines) covering NC campgrounds, dispersed camping regulations, bear safety, seasonal planning, forest roads, and water/connectivity.
- **D-02:** Also ingest external sources from US Forest Service and recreation.gov — official campground data, permit info, seasonal closures, trail conditions. These are high-value, structured, and public.
- **D-03:** Ingestion pipeline must support markdown files (existing), downloaded PDFs, and scraped web pages. Build the pipeline general enough to handle all three.
- **D-04:** Manual re-ingest workflow — run the ingest script when research files are updated or new sources are added. No scheduled background jobs. Simple and appropriate for a single-user tool.

### Embedding Provider
- **D-05:** Use Voyage-3-lite (Anthropic's recommended embedding provider) for vector embeddings. Requires a Voyage API key. Stays within the Anthropic ecosystem alongside the existing Claude API integration.
- **D-06:** Store embeddings as BLOB in SQLite via `sqlite-vec` extension. Pin `sqlite-vec` at current version (v0.1.8 per STATE.md blocker note) — plan migration sprint if 1.0 ships.

### Chunking Strategy
- **D-07:** Heading-based section splitting — split on markdown headings (##, ###). Each campsite, regulation topic, or geographic area becomes its own chunk. Preserves semantic meaning of structured camping data.
- **D-08:** The existing research files already use clean heading structure with YAML frontmatter (topic, region, category, confidence). Leverage this structure during chunking — frontmatter metadata becomes chunk metadata for filtering.
- **D-09:** Target chunk size: 256–512 tokens per chunk. Chunks that exceed this after heading split should be sub-split at paragraph boundaries, not mid-sentence.

### Search & Retrieval
- **D-10:** No user-facing search UI in this phase. The knowledge base exposes a server-side retrieval API (`lib/rag/search.ts`) that Phase 4's chat agent calls as a tool.
- **D-11:** Hybrid retrieval: FTS5 for keyword matching + `sqlite-vec` for vector similarity, merged via Reciprocal Rank Fusion (k=60). Both search types run in parallel and results are merged by RRF score.
- **D-12:** FTS5 virtual table managed via raw SQL migration file (Prisma doesn't support FTS5). Use trigger-based sync to keep FTS5 in sync with the `KnowledgeChunk` table.

### Validation Approach
- **D-13:** 10 representative test queries with manual review before moving to Phase 4. Queries cover: campsite recommendations, regulation lookups, seasonal info, gear-related questions, and geographic searches. Pass/fail based on whether the top-5 retrieved chunks contain relevant information.
- **D-14:** Compare hybrid (vector + FTS5) vs vector-only on the same 10 queries to validate that hybrid retrieval adds value (per success criteria #3 in ROADMAP.md).

### Claude's Discretion
- FTS5 tokenizer configuration (porter stemming, etc.)
- Exact RRF merge implementation details
- Number of top-k results to return from retrieval
- KnowledgeChunk Prisma model field names and metadata JSON structure
- Ingest script CLI interface (flags, output format)
- How to handle duplicate content across sources

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Architecture & RAG Design
- `.planning/research/ARCHITECTURE.md` §2 RAG Knowledge Base — File structure (`lib/rag/`), data flow, hybrid search pattern, sqlite-vec usage, FTS5 migration approach
- `.planning/research/PITFALLS.md` §Pitfall 6 — RAG chunking warnings specific to camping knowledge data
- `.planning/research/PITFALLS.md` §Pitfall 5 — Claude API cost management (prompt caching for KB injections)

### Existing Corpus
- `data/research/RESEARCH-PROMPT.md` — Gemini Deep Research prompt template with YAML frontmatter schema used across all research files
- `data/research/*.md` (7 files) — The initial corpus seed. All have YAML frontmatter with topic, region, category, confidence fields.

### Requirements & Roadmap
- `.planning/REQUIREMENTS.md` — RAG-01 through RAG-04 define acceptance criteria
- `.planning/ROADMAP.md` §Phase 3 — Success criteria and dependency info
- `.planning/STATE.md` §Blockers — sqlite-vec version pinning note

### Database Schema
- `prisma/schema.prisma` — Current 9-model schema. KnowledgeChunk model will be added here.

### Existing AI Integration
- `lib/claude.ts` — Current Claude API wrapper (Anthropic SDK). RAG context assembly will feed into this pattern.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/claude.ts` — Anthropic SDK client already initialized. RAG context injection will extend this pattern.
- `data/research/*.md` — 7 curated research files with consistent YAML frontmatter. Ready for ingestion without preprocessing.
- `lib/db.ts` — Prisma client singleton. KnowledgeChunk queries will use this.

### Established Patterns
- **Server components fetch, client components render** — RAG is purely server-side, fits naturally
- **API routes with try-catch + JSON responses** — Search API will follow this pattern
- **Raw SQL migrations** — Prisma migrations directory already exists; FTS5 virtual table will be a raw SQL migration file

### Integration Points
- New Prisma model: `KnowledgeChunk` with fields for content, embedding (BLOB), source, metadata
- New FTS5 virtual table: `knowledge_chunks_fts` via raw SQL migration with trigger sync
- New `lib/rag/` directory: `ingest.ts`, `search.ts`, `context.ts`
- New ingest script in `tools/ingest/` for running corpus ingestion
- New API route: `/api/knowledge/search` (internal, consumed by Phase 4 agent)
- `sqlite-vec` loaded as SQLite extension at runtime

</code_context>

<specifics>
## Specific Ideas

- Existing research files were generated via Gemini Deep Research with a structured prompt that enforces consistent markdown formatting — this makes heading-based chunking reliable
- Research files include `⚠️ VERIFY CURRENT STATUS` flags on seasonal/annual data — the system should preserve these as chunk metadata so the agent can surface freshness warnings
- Forest Service and recreation.gov are the external source priority — official, structured, high-trust data

</specifics>

<deferred>
## Deferred Ideas

- **Native iOS/Android app** — Will mentioned openness to building a native iOS app or running on Android tablets with GPS. Platform decision deferred to a future milestone; current mobile-first web approach continues.
- **Personal trip notes in KB** — Pulling Will's personal trip notes and location descriptions from the database into the knowledge base. Good idea but adds complexity to this phase. Can be a follow-up ingestion after the pipeline is validated.
- **Community-sourced camping data** (iOverlander, Campendium) — ToS concerns with scraping. Defer until official sources are validated.
- **AllTrails / hiking guides** — Large corpus with frequent changes. Lower priority than core camping data.
- **Automated relevance scoring** — Using Claude to judge retrieval quality. Overkill for initial validation; manual review of 10 queries is sufficient.

</deferred>

---

*Phase: 03-knowledge-base*
*Context gathered: 2026-03-30*
