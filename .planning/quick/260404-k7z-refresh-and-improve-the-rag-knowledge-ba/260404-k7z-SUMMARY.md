---
phase: quick-260404-k7z
plan: 01
subsystem: rag-knowledge-base
tags: [rag, knowledge-base, corpus-refresh, agent-jobs, settings-ui]
dependency_graph:
  requires: [lib/rag/ingest.ts, lib/rag/db.ts, lib/rag/embed.ts, scripts/agent-runner.ts]
  provides: [lib/rag/sources.ts, lib/rag/parsers/rss.ts, scripts/refresh-corpus.ts, app/api/knowledge/stats]
  affects: [components/SettingsClient.tsx, prisma/schema.prisma]
tech_stack:
  added: [child_process.spawn for subprocess job execution, crypto.createHash for SHA-256]
  patterns: [robots.txt check before scraping, vec0 orphan cleanup before Prisma delete, hash-based change detection]
key_files:
  created:
    - lib/rag/sources.ts
    - lib/rag/parsers/rss.ts
    - scripts/refresh-corpus.ts
    - app/api/knowledge/stats/route.ts
    - prisma/migrations/20260404250000_add_knowledge_chunk_refresh_fields/migration.sql
  modified:
    - prisma/schema.prisma
    - lib/rag/ingest.ts
    - scripts/agent-runner.ts
    - components/SettingsClient.tsx
decisions:
  - Manual migration used instead of prisma migrate dev — shadow DB replays conflicted with pre-existing duplicate columns in dev.db
  - Vec0 orphan cleanup runs before Prisma deleteMany — prevents orphaned embedding rows when re-ingesting
  - Per-source error isolation via try-catch — one failed source never blocks others
  - spawn('npx', ['tsx', ...]) for Mac mini PATH safety — avoids relying on globally installed tsx
metrics:
  duration: 22min
  completed: 2026-04-04T18:51:44Z
  tasks_completed: 2
  files_changed: 9
---

# Quick Task 260404-k7z: Refresh and Improve the RAG Knowledge Base

**One-liner:** SHA-256-based incremental corpus refresh with robots.txt gating, RSS parsing via cheerio xmlMode, source registry, agent job subprocess handler, and Settings UI section.

## What Was Built

### Task 1: Schema + Source Registry + RSS Parser + chunkText

**Schema migration** (`prisma/migrations/20260404250000_add_knowledge_chunk_refresh_fields`):
- Added `contentHash String?` — SHA-256 of chunk content for change detection
- Added `refreshedAt DateTime?` — timestamp of last successful refresh from source
- Applied via `prisma migrate deploy` (manual SQL, not `migrate dev` — see deviations)

**Source registry** (`lib/rag/sources.ts`):
- Exports `KnowledgeSource` interface and `SOURCES` array with 3 live NC camping sources
- USFS Pisgah/Nantahala RSS feed, NC State Parks listing, LNT 7 Principles
- iOverlander excluded with TODO comment — no public bulk export URL found

**RSS parser** (`lib/rag/parsers/rss.ts`):
- `chunkRssFeed(url)` fetches with OutlandOS/1.0 User-Agent
- Uses `cheerio.load(xml, { xmlMode: true })` — critical for correct XML parsing
- Each `<item>` becomes one chunk; items over 512 tokens split at paragraph boundaries
- Sets `verifyFlag: true` on all RSS chunks (web content changes over time)

**Header-aware chunking** (`lib/rag/ingest.ts`):
- New `chunkText(text, source)` function exported alongside existing functions
- Detects markdown-like content via `text.includes('\n## ') || text.includes('\n### ')`
- Routes to `chunkMarkdown()` for markdown, `splitAtParagraphs()` for plain text
- Does not modify existing `chunkMarkdown` or `chunkWebPage` — zero regression risk

### Task 2: Refresh Script + Agent Handler + Stats API + Settings UI

**Refresh script** (`scripts/refresh-corpus.ts`):
- Validates `VOYAGE_API_KEY` and `DATABASE_URL` at startup — exits 1 with clear message if missing
- Robots.txt check per-origin (cached within run) before fetching any content page
- SHA-256 hash comparison: only re-embeds chunks with changed content
- Vec0 orphan cleanup: deletes embedding rows by rowid BEFORE deleting Prisma rows
- Per-source try-catch: one failure logs error and continues to next source
- Exits 0 unless all sources failed with no successes

**Agent-runner handler** (`scripts/agent-runner.ts`):
- Added `import { spawn } from 'child_process'` at top
- Added `corpus_refresh` to the `processors` map
- Uses `spawn('npx', ['tsx', 'scripts/refresh-corpus.ts'], { stdio: 'inherit', env: process.env, cwd: process.cwd() })`
- Resolves on exit code 0, rejects on non-zero — agent-runner marks job done/failed accordingly

**Stats API** (`app/api/knowledge/stats/route.ts`):
- `GET /api/knowledge/stats` returns `{ chunkCount, lastRefreshed, sourceCount }`
- Queries `prisma.knowledgeChunk.count()` and latest `refreshedAt` in parallel
- Returns `SOURCES.length` from source registry for context

**Settings UI** (`components/SettingsClient.tsx`):
- Added `KnowledgeStats` interface
- Fetches stats on mount via `useEffect` (non-critical — silently skips on failure)
- "Knowledge Base" Card: shows chunk count, source count, relative "last refreshed" time
- "Refresh Now" button: POSTs `{ type: 'corpus_refresh', payload: {} }` to `/api/agent/jobs`
- Loading state during POST, "Refresh queued" confirmation for 2s, inline error text

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Manual migration instead of `prisma migrate dev`**
- **Found during:** Task 1 migration step
- **Issue:** `prisma migrate dev` uses a shadow database that replays all migrations from scratch. The dev.db had multiple migrations with duplicate column errors (pre-existing conflicts from parallel sessions — `prepGuide`, `SignalLog`, `targetPrice`, `altitude` already applied outside Prisma). Shadow DB replay failed on these.
- **Fix:** Created migration SQL manually (`prisma/migrations/20260404250000_.../migration.sql`), applied with `prisma migrate deploy`. Resolved 6 pre-existing "stuck" migrations as applied/rolled-back to unblock deploy.
- **Files modified:** `prisma/migrations/20260404250000_add_knowledge_chunk_refresh_fields/`
- **Commits:** 559fd85

## Self-Check

**Files created/exist:**
- [x] `lib/rag/sources.ts` — exists
- [x] `lib/rag/parsers/rss.ts` — exists
- [x] `scripts/refresh-corpus.ts` — exists
- [x] `app/api/knowledge/stats/route.ts` — exists
- [x] `prisma/migrations/20260404250000_add_knowledge_chunk_refresh_fields/migration.sql` — exists

**Commits exist:**
- [x] 559fd85 — Task 1: schema + sources + RSS + chunkText
- [x] 212254c — Task 2: refresh script + agent handler + stats API + Settings UI

**Build:** `npx next build` passes with no errors.

**TypeScript:** `npx tsc --noEmit --skipLibCheck` — only pre-existing test error in `lib/__tests__/bulk-import.test.ts` (Buffer type mismatch, unrelated to this task).

## Self-Check: PASSED
