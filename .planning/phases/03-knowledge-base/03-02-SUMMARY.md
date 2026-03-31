---
phase: 03-knowledge-base
plan: 02
subsystem: database
tags: [rag, voyageai, embeddings, sqlite-vec, fts5, chunking, ingestion]

# Dependency graph
requires:
  - phase: 03-01
    provides: "KnowledgeChunk model, vec0 connection, FTS5 table, RAG types"
provides:
  - "Voyage AI embedding client with rate limit retry"
  - "Markdown chunking pipeline (heading-based, 512-token target)"
  - "Ingestion pipeline writing to Prisma + vec0 + FTS5"
  - "CLI ingest script with --clear and --file flags"
  - "Corpus manifest documenting all 7 research sources"
  - "237 chunks with 512-dim embeddings in database"
affects: [03-03-hybrid-search, 03-04-agent-tool]

# Tech tracking
tech-stack:
  added: [voyageai, gray-matter, gpt-tokenizer, dotenv]
  patterns: [batch-embedding-with-retry, heading-based-chunking, bigint-vec0-rowid]

key-files:
  created:
    - lib/rag/embed.ts
    - lib/rag/ingest.ts
    - tools/ingest/run-ingest.ts
    - data/research/CORPUS-MANIFEST.md
  modified:
    - lib/rag/db.ts
    - prisma/migrations/20260331030000_knowledge_fts5/migration.sql
    - package.json

key-decisions:
  - "Move vec0 table creation from migration to runtime init (Prisma SQLite engine lacks sqlite-vec)"
  - "Use BigInt for vec0 rowid inserts (better-sqlite3 requirement)"
  - "Batch size 10 with 21s delay for Voyage free tier 3 RPM limit"
  - "Retry up to 5 times with linear backoff on 429 rate limits"
  - "Resolve DB path relative to prisma/ dir to match Prisma convention"

patterns-established:
  - "Rate-limited API pattern: exponential backoff with configurable retries in embed.ts"
  - "Heading-based chunking: split markdown at H2/H3 with 512-token target size"
  - "CLI ingest pattern: dotenv/config import for env loading in tools/ scripts"

requirements-completed: [RAG-01, RAG-04]

# Metrics
duration: 25min
completed: 2026-03-31
---

# Phase 03 Plan 02: Ingestion Pipeline Summary

**Voyage-3-lite embedding pipeline ingesting 7 NC camping research files into 237 chunks with heading-based markdown splitting and vec0/FTS5 dual storage**

## Performance

- **Duration:** 25 min
- **Started:** 2026-03-31T03:39:52Z
- **Completed:** 2026-03-31T04:04:32Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Built Voyage AI embedding client with robust 429 retry logic for free-tier rate limits
- Created markdown chunking pipeline that splits by H2/H3 headings with 512-token target
- Ingested all 7 research files producing 237 chunks with 512-dim embeddings
- All three tables in sync: KnowledgeChunk=237, vec0=237, FTS5=237
- Created CLI ingest script and corpus manifest documenting all sources

## Task Commits

Each task was committed atomically:

1. **Task 1: Build embedding client and markdown chunking pipeline** - `5d1a3fa` (feat)
2. **Task 2: Create ingest CLI script and corpus manifest, run initial ingestion** - `ff96db5` (feat)

## Files Created/Modified
- `lib/rag/embed.ts` - Voyage AI voyage-3-lite embedding wrapper with retry logic
- `lib/rag/ingest.ts` - Markdown chunking (chunkMarkdown, splitAtParagraphs) and DB ingestion
- `lib/rag/db.ts` - Fixed path resolution, added runtime vec0 table creation
- `tools/ingest/run-ingest.ts` - CLI script for corpus ingestion (--clear, --file flags)
- `data/research/CORPUS-MANIFEST.md` - Documents all 7 research sources, ingest workflow
- `prisma/migrations/20260331030000_knowledge_fts5/migration.sql` - Removed vec0 from migration
- `package.json` - Added voyageai, gray-matter, gpt-tokenizer, dotenv dependencies

## Decisions Made
- Moved vec0 virtual table creation from Prisma migration to runtime init in db.ts because Prisma's SQLite engine does not have the sqlite-vec extension loaded
- Used BigInt for vec0 rowid parameter because better-sqlite3 rejects plain Number for vec0 primary keys
- Reduced batch size from 20 to 10 and added 21s inter-batch delay to respect Voyage free tier 3 RPM / 10K TPM limits
- Fixed DATABASE_URL path resolution to match Prisma's schema-relative convention (prisma/ directory)
- Renamed FTS5 migration directory to fix ordering: must come after KnowledgeChunk table creation

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed migration ordering: FTS5 before KnowledgeChunk table**
- **Found during:** Task 1 (setting up database)
- **Issue:** Migration `20260330_knowledge_fts5` sorted before `20260331024138_add_knowledge_chunk`, causing "no such table" error
- **Fix:** Renamed FTS5 migration to `20260331030000_knowledge_fts5` to sort after KnowledgeChunk
- **Files modified:** prisma/migrations/ directory
- **Verification:** `npx prisma migrate deploy` succeeds with all 8 migrations
- **Committed in:** 5d1a3fa (Task 1 commit)

**2. [Rule 3 - Blocking] Moved vec0 table creation from migration to runtime**
- **Found during:** Task 1 (migration deployment)
- **Issue:** Prisma's SQLite engine doesn't have sqlite-vec, so `CREATE VIRTUAL TABLE ... USING vec0()` fails in migrations
- **Fix:** Removed vec0 creation from migration SQL, added to getVecDb() runtime initialization
- **Files modified:** prisma/migrations/20260331030000_knowledge_fts5/migration.sql, lib/rag/db.ts
- **Verification:** Migrations deploy clean, vec0 table created on first getVecDb() call
- **Committed in:** 5d1a3fa (Task 1 commit)

**3. [Rule 1 - Bug] Fixed DATABASE_URL path resolution in getVecDb()**
- **Found during:** Task 2 (running ingest)
- **Issue:** `dbUrl.replace('file:', '')` produced `./dev.db` (CWD-relative) but Prisma resolves relative to schema dir (`prisma/dev.db`)
- **Fix:** Added resolveDbPath() that joins relative paths with prisma/ directory
- **Files modified:** lib/rag/db.ts
- **Verification:** Ingest script finds and writes to correct database file
- **Committed in:** ff96db5 (Task 2 commit)

**4. [Rule 1 - Bug] Fixed vec0 rowid type: Number vs BigInt**
- **Found during:** Task 2 (running ingest)
- **Issue:** vec0 extension with better-sqlite3 requires BigInt for rowid parameter, plain Number rejected
- **Fix:** Changed `.run(rowIdResult.rowid, ...)` to `.run(BigInt(rowIdResult.rowid), ...)`
- **Files modified:** lib/rag/ingest.ts
- **Verification:** All 237 chunks inserted successfully into vec0 table
- **Committed in:** ff96db5 (Task 2 commit)

---

**Total deviations:** 4 auto-fixed (2 blocking, 2 bugs)
**Impact on plan:** All auto-fixes necessary for correct operation. No scope creep. Plan 01 had infrastructure issues (migration ordering, path resolution, vec0 BigInt) that were discovered and resolved during pipeline execution.

## Issues Encountered
- Voyage AI free tier rate limit (3 RPM, 10K TPM) caused multiple 429 errors during ingestion. Resolved with retry logic (5 retries, linear 25s backoff) and smaller batch sizes (10 chunks per API call). Full ingestion completes in ~3-4 minutes.

## User Setup Required

None - VOYAGE_API_KEY was already configured in .env. Future users need to set this key per .env.example.

## Known Stubs

None - all data is live from Voyage API, no mock or placeholder data.

## Next Phase Readiness
- 237 chunks with embeddings ready for hybrid search (Plan 03)
- vec0 and FTS5 tables populated and in sync for dual retrieval
- embed.ts exported for query-time embedding in search layer

## Self-Check: PASSED

All 4 created files verified present. Both task commits (5d1a3fa, ff96db5) verified in git log.

---
*Phase: 03-knowledge-base*
*Completed: 2026-03-31*
