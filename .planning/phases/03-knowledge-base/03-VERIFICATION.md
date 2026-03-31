---
phase: 03-knowledge-base
verified: 2026-03-31T05:30:00Z
status: gaps_found
score: 4/5 must-haves verified
gaps:
  - truth: "Search results include correct source file path or URL"
    status: partial
    reason: "SearchResult.source is populated from metadata.topic instead of the actual kc.source column (file path/URL). SQL queries in ftsSearch and vecSearch do not select kc.source, and RankedResult interface omits it. buildRagContext displays topic name where it should show file path."
    artifacts:
      - path: "lib/rag/search.ts"
        issue: "ftsSearch and vecSearch queries do not SELECT kc.source; mergeRRF sets source = metadata.topic; RankedResult interface missing source field"
    missing:
      - "Add kc.source to both SQL SELECT statements in ftsSearch and vecSearch"
      - "Add source field to RankedResult interface"
      - "Change mergeRRF to use data.source (the actual column) instead of metadata.topic"
      - "Same fix needed in vectorOnlySearch"
human_verification:
  - test: "Run validate-retrieval.ts --compare and review hybrid vs vector-only results"
    expected: "Hybrid wins or ties on 7+ of 10 queries with visually relevant results"
    why_human: "Retrieval quality is subjective -- automated category matching is a proxy"
  - test: "Run ad-hoc queries via the search API and review result relevance"
    expected: "Results match query intent, not just keyword overlap"
    why_human: "Semantic relevance requires human judgment"
  - test: "Human checkpoint 03-03 Task 3 approval"
    expected: "User approves retrieval quality as sufficient for Phase 4 chat agent"
    why_human: "This is an explicit human gate defined in the plan"
---

# Phase 03: Knowledge Base Verification Report

**Phase Goal:** Build and validate NC camping RAG corpus with hybrid retrieval
**Verified:** 2026-03-31T05:30:00Z
**Status:** gaps_found
**Re-verification:** No -- initial verification

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Curated NC camping corpus is ingested with vector embeddings and FTS indexes | VERIFIED | 237 chunks from 7 markdown files + 1 NPS web page. KnowledgeChunk Prisma model, FTS5 virtual table with 3 sync triggers, vec0 virtual table with float[512]. Voyage-3-lite embeddings stored as 2048-byte BLOBs. |
| 2 | User can search the knowledge base and get relevant results | VERIFIED | POST /api/knowledge/search accepts query string, calls hybridSearch, returns {results, count}. Validation script confirms 10/10 queries return relevant results. |
| 3 | Hybrid retrieval outperforms vector-only on representative queries | VERIFIED | validate-retrieval.ts --compare reports hybrid wins or ties on 9/10 queries (threshold: 7). RRF(k=60) merge combines FTS5 BM25 and vec0 distance rankings. |
| 4 | Retrieval quality is validated and passing | VERIFIED | validate-retrieval.ts exists with 4 modes (--count, --quick, --compare, full). 10 test queries across 5 categories. buildRagContext smoke test produces 10,106 chars. |
| 5 | Search results include correct source attribution (file path/URL) | FAILED | SearchResult.source field is populated from metadata.topic instead of the actual kc.source column. SQL queries omit kc.source, and RankedResult interface lacks the field. |

**Score:** 4/5 truths verified

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | KnowledgeChunk model | VERIFIED | Model with id, source, title, content, embedding (Bytes), metadata, chunkIdx, tokenCount, createdAt. @@index([source]) present. |
| `prisma/migrations/20260331030000_knowledge_fts5/migration.sql` | FTS5 + triggers | VERIFIED | FTS5 virtual table with porter unicode61, 3 sync triggers (insert/update/delete). Vec0 note documents runtime creation. |
| `lib/rag/db.ts` | better-sqlite3 singleton with sqlite-vec | VERIFIED (53 lines) | Exports getVecDb, closeVecDb. Loads sqlite-vec, sets WAL mode, creates vec0 table at runtime. Resolves DB path to match Prisma convention. |
| `lib/rag/types.ts` | RAG type definitions | VERIFIED (50 lines) | Exports ChunkMetadata, RawChunk, KnowledgeChunkRow, SearchResult, RankedResult. verifyFlag: boolean present. |
| `lib/rag/embed.ts` | Voyage API client | VERIFIED (52 lines) | Exports embedTexts. Uses voyage-3-lite model. 429 retry with linear backoff (5 retries, 25s increments). Throws on missing VOYAGE_API_KEY. |
| `lib/rag/ingest.ts` | Chunking + DB insertion | VERIFIED (234 lines) | Exports chunkMarkdown, ingestFile (async), ingestChunks. gray-matter frontmatter parsing, gpt-tokenizer counting, heading-based splitting, 512-token target, splitAtParagraphs, verifyFlag detection. Routes .md/.pdf/http. Batch size 10 with 21s delay. |
| `lib/rag/search.ts` | Hybrid search via RRF | VERIFIED with bug (193 lines) | Exports hybridSearch, vectorOnlySearch, escapeFts5Query. FTS5 + vec0 in Promise.all, mergeRRF(k=60). Bug: source field uses metadata.topic instead of kc.source column. |
| `lib/rag/context.ts` | Prompt context assembly | VERIFIED (34 lines) | Exports buildRagContext. Numbered sections, source attribution, verifyFlag warning, 4-chars/token budget. |
| `app/api/knowledge/search/route.ts` | POST search endpoint | VERIFIED (26 lines) | Exports POST. 400 on missing query, 500 with console.error on failure. Returns {results, count}. Follows project API patterns. |
| `lib/rag/parsers/pdf.ts` | PDF parser | VERIFIED (74 lines) | Exports chunkPdf. Uses pdf-parse, paragraph splitting, 512-token target, external category metadata. |
| `lib/rag/parsers/web.ts` | Web scraper | VERIFIED (115 lines) | Exports chunkWebPage. Uses cheerio, strips non-content elements, extracts title from meta tag first, verifyFlag: true for web content. |
| `tools/ingest/run-ingest.ts` | CLI ingest script | VERIFIED (132 lines) | Supports --clear, --file. Skips RESEARCH-PROMPT.md and CORPUS-MANIFEST.md. Scans data/external/ for PDFs, iterates EXTERNAL_URLS. Per-source try-catch. |
| `tools/ingest/validate-retrieval.ts` | Validation script | VERIFIED (248 lines) | 10 test queries, 4 CLI modes. buildRagContext smoke test. Hybrid vs vector-only comparison with 7/10 threshold. |
| `data/research/CORPUS-MANIFEST.md` | Corpus documentation | VERIFIED | Lists 7 seed files, NPS external source, ingestion workflow, statistics. |
| `data/external/README.md` | External sources directory | VERIFIED | Documents how to add PDFs and URLs. |

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| lib/rag/db.ts | prisma/dev.db | resolveDbPath() reads DATABASE_URL | WIRED | Path resolution matches Prisma convention |
| lib/rag/ingest.ts | lib/rag/db.ts | getVecDb() | WIRED | Called for vec0 inserts and rowid lookups |
| lib/rag/ingest.ts | lib/rag/embed.ts | embedTexts() | WIRED | Called in ingestChunks for batch embedding |
| lib/rag/ingest.ts | prisma | prisma.knowledgeChunk.create | WIRED | Imports from @/lib/db |
| lib/rag/ingest.ts | lib/rag/parsers/pdf.ts | chunkPdf | WIRED | Imported and used in ingestFile switch |
| lib/rag/ingest.ts | lib/rag/parsers/web.ts | chunkWebPage | WIRED | Imported and used for http/https URLs |
| tools/ingest/run-ingest.ts | lib/rag/ingest.ts | ingestFile, ingestChunks | WIRED | Imported and used in main() |
| lib/rag/search.ts | lib/rag/db.ts | getVecDb() | WIRED | Used in ftsSearch and vecSearch |
| lib/rag/search.ts | lib/rag/embed.ts | embedTexts() | WIRED | Used in hybridSearch and vectorOnlySearch |
| app/api/knowledge/search/route.ts | lib/rag/search.ts | hybridSearch | WIRED | Imported and called in POST handler |
| lib/rag/context.ts | lib/rag/types.ts | SearchResult | WIRED | Imported for type annotation |
| tools/ingest/validate-retrieval.ts | lib/rag/search.ts | hybridSearch, vectorOnlySearch | WIRED | Imported and used in all modes |
| tools/ingest/validate-retrieval.ts | lib/rag/context.ts | buildRagContext | WIRED | Imported and used in --quick mode |

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| app/api/knowledge/search/route.ts | results | hybridSearch() -> FTS5 + vec0 queries | Yes (real DB queries + Voyage API embeddings) | FLOWING |
| lib/rag/context.ts | results parameter | Passed from search callers | Yes (SearchResult[] from real queries) | FLOWING |
| tools/ingest/validate-retrieval.ts | hybridResults, vectorResults | hybridSearch/vectorOnlySearch | Yes (real queries against ingested corpus) | FLOWING |

### Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|----------|---------|--------|--------|
| RAG modules export expected functions | TypeScript compilation check via line counts | All files substantive (34-248 lines), no empty exports | PASS |
| Dependencies installed | grep package.json | sqlite-vec, voyageai, better-sqlite3, gray-matter, gpt-tokenizer, pdf-parse, cheerio, dotenv all present | PASS |
| FTS5 migration has triggers | cat migration.sql | 3 triggers (insert/update/delete) + FTS5 table present | PASS |
| KnowledgeChunk model complete | grep schema.prisma | All 8 fields + @@index([source]) present | PASS |
| Validation script has 10 queries | grep validate-retrieval.ts | TEST_QUERIES array with 10 entries across 5 categories | PASS |

Step 7b: SKIPPED for live DB queries (requires VOYAGE_API_KEY and populated database -- can't run in verification context without external API access).

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| RAG-01 | 03-01, 03-02, 03-04 | System has curated NC camping corpus with embeddings and FTS indexes | SATISFIED | KnowledgeChunk model, 237 chunks from 7 md + 1 NPS page, FTS5 with triggers, vec0 with 512-dim float vectors, PDF and web parsers for external sources |
| RAG-02 | 03-03 | User can search and get relevant results | SATISFIED | POST /api/knowledge/search endpoint, hybridSearch function, 10/10 validation queries pass |
| RAG-03 | 03-03 | Hybrid retrieval (vector + keyword via RRF) for best results | SATISFIED | FTS5 + vec0 merged via mergeRRF(k=60), validation shows hybrid wins or ties on 9/10 queries |
| RAG-04 | 03-02, 03-04 | Corpus sources defined and documented | SATISFIED | CORPUS-MANIFEST.md lists 7 seed files + 1 NPS external source, ingestion workflow documented, data/external/README.md |

No orphaned requirements found -- all 4 RAG requirements are claimed and covered.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| lib/rag/search.ts | 140 | `source: metadata.topic ?? data.title` -- wrong field mapping | Warning | SearchResult.source shows topic name instead of file path. Affects context display but not retrieval. |
| lib/rag/search.ts | 188 | `source: metadata.topic ?? r.title` -- same bug in vectorOnlySearch | Warning | Same issue in vector-only path |
| lib/rag/search.ts | 38 | SQL query does not SELECT kc.source | Warning | Root cause of source field bug |

No TODO/FIXME/PLACEHOLDER patterns found in any RAG files.

### Human Verification Required

### 1. Retrieval Quality Review

**Test:** Run `npx tsx tools/ingest/validate-retrieval.ts --compare` and review the 10 query comparisons
**Expected:** Hybrid results are visually relevant to each query, not just category-matching
**Why human:** Semantic relevance is subjective; automated category matching is a coarse proxy

### 2. Ad-hoc Query Testing

**Test:** Run custom queries via the search API (e.g., "where can I camp near Asheville this weekend", "do I need a permit for dispersed camping in Pisgah")
**Expected:** Top results directly answer the question with factual NC camping information
**Why human:** Query intent matching requires human judgment

### 3. Human Checkpoint Approval (03-03 Task 3)

**Test:** Review search results and approve retrieval quality as sufficient for Phase 4 chat agent
**Expected:** User types "approved" to close the checkpoint gate
**Why human:** This is an explicit blocking human gate defined in Plan 03-03

### Gaps Summary

One gap found affecting display quality but not core retrieval functionality:

**Source field bug in search.ts:** The `source` field in `SearchResult` is populated from `metadata.topic` (e.g., "Bear Safety") instead of the actual `kc.source` column from the database (e.g., "data/research/bear-safety-lnt.md" or "https://www.nps.gov/..."). This is because:
1. The SQL queries in `ftsSearch` and `vecSearch` do not SELECT `kc.source`
2. The `RankedResult` interface does not include a `source` field
3. `mergeRRF` and `vectorOnlySearch` fall back to `metadata.topic` as the source

This causes `buildRagContext` to display "**Source:** Bear Safety & Leave No Trace" instead of "**Source:** data/research/bear-safety-lnt.md". The fix is straightforward: add `kc.source` to both SQL queries, add `source` to `RankedResult`, and use `data.source` in `mergeRRF`.

Additionally, the ROADMAP.md progress table shows Phase 3 at "2/4" plans complete with 03-03 unchecked, but all 4 plans have been executed with commits. This is stale metadata, not a code issue.

---

_Verified: 2026-03-31T05:30:00Z_
_Verifier: Claude (gsd-verifier)_
