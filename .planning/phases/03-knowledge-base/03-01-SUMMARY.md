---
phase: 03-knowledge-base
plan: 01
subsystem: database
tags: [sqlite, prisma, sqlite-vec, fts5, rag, vector-search, better-sqlite3, voyageai]

# Dependency graph
requires: []
provides:
  - KnowledgeChunk Prisma model with embedding (Bytes), source, title, content, metadata, chunkIdx, tokenCount fields
  - FTS5 virtual table knowledge_chunks_fts with porter unicode61 tokenizer and 3 sync triggers
  - vec0 virtual table vec_knowledge_chunks for 512-dim float vector search
  - lib/rag/db.ts: getVecDb() singleton with sqlite-vec loaded and WAL mode
  - lib/rag/types.ts: ChunkMetadata, RawChunk, KnowledgeChunkRow, SearchResult, RankedResult interfaces
affects: [03-02, 03-03, 03-04, phase-4-chat-agent]

# Tech tracking
tech-stack:
  added: [sqlite-vec@0.1.8, voyageai@0.2.1, better-sqlite3@12.8.0, gray-matter@4.0.3, gpt-tokenizer, "@types/better-sqlite3"]
  patterns:
    - "getVecDb() singleton pattern: separate better-sqlite3 connection (not Prisma) for vec0 operations"
    - "Raw SQL migration file for FTS5/vec0 (Prisma doesn't understand virtual tables)"
    - "Trigger-based FTS5 sync: insert/update/delete triggers keep FTS5 in sync with KnowledgeChunk"

key-files:
  created:
    - lib/rag/db.ts
    - lib/rag/types.ts
    - prisma/migrations/20260330_knowledge_fts5/migration.sql
    - prisma/migrations/20260331024138_add_knowledge_chunk/migration.sql
  modified:
    - prisma/schema.prisma
    - .env.example
    - package.json
    - package-lock.json

key-decisions:
  - "Separate better-sqlite3 connection from Prisma for vec0 operations — Prisma's internal connection can't load extensions; WAL mode enables concurrent access"
  - "Raw SQL migration file (not Prisma migration) for FTS5/vec0 virtual tables — Prisma doesn't understand CREATE VIRTUAL TABLE"
  - "voyage-3-lite embeddings at 512 dimensions — pinned sqlite-vec at v0.1.8 per STATE.md blocker note"

patterns-established:
  - "lib/rag/ module directory for all RAG infrastructure (db, types, ingest, search in subsequent plans)"
  - "getVecDb() for vec0 operations, prisma client (lib/db.ts) for standard CRUD"
  - "FTS5 sync via triggers — no manual sync code needed in application layer"

requirements-completed: [RAG-01]

# Metrics
duration: 4min
completed: 2026-03-31
---

# Phase 03 Plan 01: Knowledge Base DB Foundation Summary

**SQLite RAG infrastructure: KnowledgeChunk table, FTS5 virtual table with trigger sync, vec0 512-dim vector table, and better-sqlite3 + sqlite-vec connection module**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-31T02:40:42Z
- **Completed:** 2026-03-31T02:44:06Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- KnowledgeChunk Prisma model added and migrated to SQLite with all required fields including embedding (Bytes) for storing 512-dim float vectors as BLOBs
- FTS5 virtual table with porter stemming + 3 auto-sync triggers ensures keyword search stays in sync with the KnowledgeChunk table without application-layer code
- vec0 virtual table (sqlite-vec v0.1.8) enables efficient cosine similarity search over 512-dimensional voyage-3-lite embeddings
- lib/rag/ module created with typed interfaces and a singleton db connection that loads sqlite-vec and enables WAL for concurrent Prisma + vec access

## Task Commits

Each task was committed atomically:

1. **Task 1: Install dependencies, add KnowledgeChunk model, create migrations** - `8ffb6d4` (feat)
2. **Task 2: Create better-sqlite3 vec connection module and RAG type definitions** - `c7f303d` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `prisma/schema.prisma` - Added KnowledgeChunk model with 9 fields and @@index([source])
- `prisma/migrations/20260331024138_add_knowledge_chunk/migration.sql` - Prisma migration for KnowledgeChunk table
- `prisma/migrations/20260330_knowledge_fts5/migration.sql` - Raw SQL: FTS5 table + 3 triggers + vec0 table
- `lib/rag/db.ts` - getVecDb() singleton with sqlite-vec loaded, WAL mode, DATABASE_URL env var
- `lib/rag/types.ts` - ChunkMetadata, RawChunk, KnowledgeChunkRow, SearchResult, RankedResult interfaces
- `.env.example` - Added VOYAGE_API_KEY with instructions
- `package.json` / `package-lock.json` - 5 new dependencies added

## Decisions Made
- Used a separate better-sqlite3 connection (not Prisma's internal one) for sqlite-vec operations. Prisma's internal SQLite connection doesn't expose extension loading. WAL mode allows both connections to access the same dev.db concurrently.
- Raw SQL migration file for FTS5/vec0 rather than a Prisma migration — Prisma doesn't parse or apply CREATE VIRTUAL TABLE statements. The SQL file serves as documentation and a repeatable script; applied via better-sqlite3 at setup time.
- Pinned sqlite-vec at v0.1.8 as noted in STATE.md blockers. The vec0 table uses float[512] matching voyage-3-lite output dimensions.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Resolved worktree DATABASE_URL path resolution mismatch**
- **Found during:** Task 1 (Prisma migrate dev)
- **Issue:** Worktree didn't have a .env file. After copying from main repo, Prisma resolved `file:prisma/dev.db` relative to the schema file location, creating `prisma/prisma/dev.db` instead of `prisma/dev.db`. The FTS5 migration then targeted the wrong db file.
- **Fix:** Updated worktree .env to use `file:./prisma/prisma/dev.db` (the path Prisma actually resolved to) so all subsequent better-sqlite3 connections use the same file.
- **Files modified:** .env (worktree-local, not committed — contains secrets)
- **Verification:** All 6 table/trigger checks pass against `prisma/prisma/dev.db`
- **Committed in:** Not committed (worktree .env is excluded from git)

---

**Total deviations:** 1 auto-fixed (blocking path resolution)
**Impact on plan:** Necessary worktree setup issue. The .env.example file remains clean. Production and main repo are unaffected.

## Issues Encountered
- Worktree didn't inherit the main repo's .env file — required copying and adjusting DATABASE_URL to match Prisma's actual path resolution in the worktree context.

## User Setup Required
- `VOYAGE_API_KEY` is required for Plan 02 (embedding generation). The key is already in the main repo's .env from project setup. See `.env.example` for instructions.

## Next Phase Readiness
- Plan 02 (ingest pipeline) can immediately import `getVecDb()` from `lib/rag/db.ts` and write to `KnowledgeChunk` table
- Plan 03 (hybrid search) can use `getVecDb()` for vec0 queries and the FTS5 virtual table for keyword search
- sqlite-vec v0.1.8 pinned — if v1.0 ships, migration sprint needed (vec0 → new API)

---
*Phase: 03-knowledge-base*
*Completed: 2026-03-31*
