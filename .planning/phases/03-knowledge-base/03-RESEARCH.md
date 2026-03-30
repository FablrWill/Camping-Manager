# Phase 03: Knowledge Base - Research

**Researched:** 2026-03-30
**Domain:** RAG (Retrieval-Augmented Generation) — vector embeddings, hybrid full-text + vector search, SQLite-based knowledge corpus
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Initial corpus = 7 existing Gemini Deep Research markdown files in `data/research/` (~265KB, ~2100 lines). Covers NC campgrounds, dispersed camping regulations, bear safety, seasonal planning, forest roads, water/connectivity.
- **D-02:** Also ingest external sources from US Forest Service and recreation.gov — official campground data, permit info, seasonal closures, trail conditions.
- **D-03:** Ingestion pipeline must support markdown files (existing), downloaded PDFs, and scraped web pages. Build general enough to handle all three.
- **D-04:** Manual re-ingest workflow — run the ingest script when files are updated or new sources added. No scheduled background jobs.
- **D-05:** Use Voyage-3-lite (Anthropic's recommended embedding provider) for vector embeddings. Requires a Voyage API key.
- **D-06:** Store embeddings as BLOB in SQLite via `sqlite-vec` extension. Pin `sqlite-vec` at v0.1.8.
- **D-07:** Heading-based section splitting — split on markdown headings (##, ###). Preserves semantic meaning of structured camping data.
- **D-08:** Leverage YAML frontmatter from existing research files as chunk metadata for filtering.
- **D-09:** Target chunk size: 256–512 tokens per chunk. Chunks exceeding this after heading split should be sub-split at paragraph boundaries.
- **D-10:** No user-facing search UI in this phase. Expose server-side retrieval API (`lib/rag/search.ts`) for Phase 4's chat agent.
- **D-11:** Hybrid retrieval: FTS5 keyword matching + `sqlite-vec` vector similarity, merged via Reciprocal Rank Fusion (k=60). Both run in parallel.
- **D-12:** FTS5 virtual table managed via raw SQL migration file (Prisma doesn't support FTS5). Trigger-based sync with `KnowledgeChunk` table.
- **D-13:** 10 representative test queries with manual review before moving to Phase 4. Queries cover campsite recommendations, regulation lookups, seasonal info, gear questions, geographic searches.
- **D-14:** Compare hybrid (vector + FTS5) vs vector-only on same 10 queries to validate hybrid retrieval adds value.

### Claude's Discretion

- FTS5 tokenizer configuration (porter stemming, etc.)
- Exact RRF merge implementation details
- Number of top-k results to return from retrieval
- KnowledgeChunk Prisma model field names and metadata JSON structure
- Ingest script CLI interface (flags, output format)
- How to handle duplicate content across sources

### Deferred Ideas (OUT OF SCOPE)

- Native iOS/Android app
- Personal trip notes in KB (can be a follow-up after pipeline validated)
- Community-sourced camping data (iOverlander, Campendium) — ToS concerns
- AllTrails / hiking guides — large corpus with frequent changes
- Automated relevance scoring via Claude
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| RAG-01 | System has a curated NC camping knowledge corpus ingested with vector embeddings and full-text search indexes | D-01, D-02, D-06, D-12: sqlite-vec BLOB storage + FTS5 virtual table; ingest pipeline for existing 7 markdown files |
| RAG-02 | User can search the knowledge base and get relevant results about NC camping spots, regulations, seasonal info, and local knowledge | D-10: `/api/knowledge/search` endpoint backed by `lib/rag/search.ts` hybrid retrieval |
| RAG-03 | Knowledge base search uses hybrid retrieval (vector similarity + keyword matching) for best results | D-11: FTS5 + sqlite-vec merged via RRF(k=60) |
| RAG-04 | Corpus sources are defined and documented (dispersed camping spots, permit databases, seasonal closures, personal trip notes, etc.) | D-01, D-02, D-04: markdown files + USFS/recreation.gov; documented in corpus manifest |
</phase_requirements>

---

## Summary

Phase 3 builds the RAG knowledge layer that Phase 4's chat agent depends on. The implementation is entirely server-side: an ingest pipeline processes NC camping documents into the `KnowledgeChunk` table, a FTS5 virtual table provides keyword search, and `sqlite-vec` provides vector similarity search. These two retrieval methods are merged via Reciprocal Rank Fusion into a single ranked result list.

The technical stack is well-scoped and all components are pinned by locked decisions. The main implementation challenges are: (1) loading the `sqlite-vec` extension in the right database connection context, (2) keeping Prisma and the FTS5 virtual table synchronized via triggers, and (3) correctly encoding/decoding Float32Array embeddings as BLOBs for SQLite storage. None of these are showstoppers — they're mechanical with known patterns.

The corpus already exists in good shape: 7 research files with consistent YAML frontmatter and clean heading structure make heading-based chunking straightforward. The validation gate (10 manual queries, compare hybrid vs vector-only) is the exit condition before Phase 4.

**Primary recommendation:** Build in this order — (1) Prisma model + FTS5 migration, (2) ingest pipeline with the 7 existing files, (3) hybrid search function, (4) `/api/knowledge/search` route, (5) validation script. No UI needed.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `sqlite-vec` | 0.1.8 (PINNED) | SQLite extension for vector KNN search via `vec0` virtual tables | Maintained by sqlite ecosystem author (Alex Garcia); works with better-sqlite3 via `sqliteVec.load(db)` |
| `voyageai` | 0.2.1 | Voyage AI TypeScript SDK for generating embeddings | Official SDK; VoyageAIClient with auto-retry |
| `better-sqlite3` | 12.8.0 | Synchronous SQLite driver that supports loadable extensions | Required for `sqliteVec.load(db)`; Prisma's SQLite driver does not expose `loadExtension` |
| `gray-matter` | 4.0.3 | YAML frontmatter parser for markdown files | Parses the `topic`, `region`, `category`, `confidence` frontmatter in all 7 research files |
| `@anthropic-ai/sdk` | 0.80.0 (existing) | Already in project — Claude API for Phase 4 synthesis | Already installed |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `tiktoken` or `gpt-tokenizer` | latest | Token counting for chunk size enforcement | Needed to enforce 256-512 token target per chunk |
| Node built-ins (`fs`, `path`) | N/A | Read markdown files from `data/research/` | No additional lib needed for file I/O |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `voyage-3-lite` | `voyage-4-lite` (newer) | voyage-4-lite is newer/better but decision is locked at voyage-3-lite |
| `sqlite-vec` | `pgvector` | pgvector requires Postgres; SQLite is correct for local-first dev |
| heading-based chunking | fixed-size chunking | Fixed-size splits sentences mid-thought; heading-based preserves semantic units |
| RRF merge | simple score sum | RRF is parameter-free beyond k=60 and well-studied; avoids score normalization |

**Installation:**
```bash
npm install sqlite-vec voyageai better-sqlite3 gray-matter
npm install --save-dev @types/better-sqlite3
```

**Version verification (confirmed against npm registry 2026-03-30):**
- `sqlite-vec`: 0.1.8 (latest = 0.1.8 — confirmed pre-1.0, pin as instructed)
- `voyageai`: 0.2.1 (latest)
- `better-sqlite3`: 12.8.0 (latest)
- `gray-matter`: 4.0.3 (latest)

---

## Architecture Patterns

### Recommended Project Structure

```
lib/rag/
  ├── ingest.ts          — chunk + embed + write to knowledge_chunks
  ├── search.ts          — hybrid search: FTS5 + vec0, RRF merge
  └── context.ts         — assemble retrieved chunks into Claude prompt string

tools/ingest/
  └── run-ingest.ts      — Node script entry point: reads data/research/*.md, calls lib/rag/ingest.ts

data/research/
  ├── RESEARCH-PROMPT.md — prompt template (do not ingest this file)
  └── *.md               — 7 corpus files (ingest these)

prisma/
  └── migrations/
      └── 20260330_knowledge_fts5/
          └── migration.sql  — CREATE VIRTUAL TABLE + triggers

app/api/knowledge/
  └── search/route.ts    — POST endpoint wrapping lib/rag/search.ts
```

### Pattern 1: sqlite-vec Extension Loading

**What:** Load `sqlite-vec` via `sqliteVec.load(db)` using a `better-sqlite3` database instance. This is separate from Prisma's connection.

**When to use:** Any time vector operations are needed — ingest (writing embeddings), search (KNN query).

**Critical detail:** Prisma uses its own internal SQLite connection that does not expose extension loading. You must open a parallel `better-sqlite3` connection to the same database file for vector operations. Both connections point to the same `dev.db` file — SQLite allows multiple readers, one writer at a time (WAL mode recommended).

**Example:**
```typescript
// lib/rag/db.ts — Source: https://alexgarcia.xyz/sqlite-vec/js.html
import * as sqliteVec from 'sqlite-vec';
import Database from 'better-sqlite3';

let vecDb: Database.Database | null = null;

export function getVecDb(): Database.Database {
  if (!vecDb) {
    const dbPath = process.env.DATABASE_URL?.replace('file:', '') ?? './prisma/dev.db';
    vecDb = new Database(dbPath);
    vecDb.pragma('journal_mode = WAL');
    sqliteVec.load(vecDb);
  }
  return vecDb;
}
```

### Pattern 2: Embedding as Float32Array BLOB

**What:** Voyage API returns embeddings as `number[]`. Convert to `Float32Array` and store `.buffer` as SQLite BLOB. Reverse on read.

**When to use:** Every INSERT (ingest) and SELECT comparison (search).

```typescript
// Storing: number[] → Float32Array → Buffer for Prisma raw insert
const embedding = await client.embed({ input: [text], model: 'voyage-3-lite' });
const vector = new Float32Array(embedding.embeddings[0]);
const blob = Buffer.from(vector.buffer);

// Reading: BLOB → Float32Array for vec0 queries
const row = db.prepare('SELECT embedding FROM knowledge_chunks WHERE id = ?').get(id);
const vector = new Float32Array(row.embedding.buffer);
```

### Pattern 3: KnowledgeChunk Prisma Model + FTS5 Virtual Table

**What:** Prisma manages `KnowledgeChunk` as a standard model. FTS5 virtual table `knowledge_chunks_fts` is created in a raw SQL migration and kept in sync via INSERT/UPDATE/DELETE triggers.

**KnowledgeChunk model fields:**
```prisma
model KnowledgeChunk {
  id        String   @id @default(cuid())
  source    String   // e.g. "data/research/dispersed-camping-regulations.md"
  title     String   // heading text or document title
  content   String   // plain text chunk, 256-512 tokens
  embedding Bytes    // Float32Array as BLOB — 512 dims * 4 bytes = 2048 bytes
  metadata  String   // JSON: { topic, region, category, confidence, verifyFlag }
  chunkIdx  Int      // position within source document (0-based)
  tokenCount Int     // estimated token count for this chunk
  createdAt DateTime @default(now())

  @@index([source])
}
```

**Raw SQL migration (`migration.sql`):**
```sql
-- Source: Prisma FTS5 raw migration pattern (ARCHITECTURE.md §2)
CREATE VIRTUAL TABLE IF NOT EXISTS knowledge_chunks_fts
  USING fts5(
    id UNINDEXED,
    title,
    content,
    tokenize = 'porter unicode61'
  );

-- Sync triggers
CREATE TRIGGER knowledge_chunks_fts_insert
  AFTER INSERT ON KnowledgeChunk BEGIN
    INSERT INTO knowledge_chunks_fts(id, title, content)
    VALUES (new.id, new.title, new.content);
  END;

CREATE TRIGGER knowledge_chunks_fts_update
  AFTER UPDATE ON KnowledgeChunk BEGIN
    UPDATE knowledge_chunks_fts
    SET title = new.title, content = new.content
    WHERE id = new.id;
  END;

CREATE TRIGGER knowledge_chunks_fts_delete
  AFTER DELETE ON KnowledgeChunk BEGIN
    DELETE FROM knowledge_chunks_fts WHERE id = old.id;
  END;
```

### Pattern 4: Hybrid Search with RRF

**What:** Run FTS5 and vector KNN in parallel (can use `Promise.all`), assign rank positions, merge via RRF formula.

**RRF formula:** `score = Σ 1/(k + rank_i)` where k=60.

```typescript
// lib/rag/search.ts — conceptual pattern
// Source: ARCHITECTURE.md §2 hybrid search pattern + alexgarcia.xyz blog

export async function hybridSearch(query: string, topK = 10): Promise<SearchResult[]> {
  const [ftsResults, vecResults] = await Promise.all([
    ftsSearch(query, topK * 2),
    vectorSearch(query, topK * 2),
  ]);

  // Assign rank positions (1-based)
  const RRF_K = 60;
  const scores = new Map<string, number>();

  ftsResults.forEach((r, idx) => {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + idx + 1));
  });
  vecResults.forEach((r, idx) => {
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (RRF_K + idx + 1));
  });

  // Sort by combined RRF score, return top-k
  const allIds = [...scores.entries()].sort((a, b) => b[1] - a[1]).slice(0, topK);
  return fetchChunksByIds(allIds.map(([id]) => id));
}
```

**vec0 KNN query pattern:**
```typescript
// Source: https://github.com/asg017/sqlite-vec/blob/main/examples/simple-node/demo.mjs
function vectorSearch(queryEmbedding: Float32Array, topK: number) {
  const db = getVecDb();
  // vec0 tables use MATCH syntax for KNN
  return db.prepare(`
    SELECT kc.id, kc.title, kc.content, kc.metadata,
           vt.distance
    FROM vec_knowledge_chunks vt
    JOIN KnowledgeChunk kc ON kc.rowid = vt.rowid
    WHERE vt.embedding MATCH ?
    ORDER BY distance
    LIMIT ?
  `).all(queryEmbedding, topK);
}
```

**FTS5 query pattern:**
```typescript
function ftsSearch(query: string, topK: number) {
  const db = getVecDb();
  return db.prepare(`
    SELECT kc.id, kc.title, kc.content, kc.metadata,
           fts.rank
    FROM knowledge_chunks_fts fts
    JOIN KnowledgeChunk kc ON kc.id = fts.id
    WHERE fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `).all(query, topK);
}
```

### Pattern 5: Heading-Based Chunking with YAML Frontmatter

**What:** Parse YAML frontmatter with `gray-matter`, then split document body on `##` and `###` headings. Each heading section becomes one chunk. Sub-split at paragraph boundaries if section exceeds 512 tokens.

```typescript
// lib/rag/ingest.ts — chunking pattern
import matter from 'gray-matter';

function chunkMarkdown(fileContent: string, filePath: string): Chunk[] {
  const { data: frontmatter, content } = matter(fileContent);

  // Split on H2/H3 headings — preserve heading as chunk title
  const sections = content.split(/^(?=#{2,3}\s)/m).filter(Boolean);

  return sections.flatMap((section) => {
    const headingMatch = section.match(/^(#{2,3})\s+(.+)/);
    const title = headingMatch ? headingMatch[2].trim() : frontmatter.topic ?? 'Introduction';
    const body = section.replace(/^#{2,3}\s+.+\n/, '').trim();

    // Sub-split at blank-line paragraph boundaries if too long
    if (estimateTokens(body) > 512) {
      return splitAtParagraphs(body, title, frontmatter);
    }

    return [{
      title,
      content: body,
      source: filePath,
      metadata: {
        topic: frontmatter.topic,
        region: frontmatter.region,
        category: frontmatter.category,
        confidence: frontmatter.confidence,
        verifyFlag: body.includes('⚠️ VERIFY CURRENT STATUS'),
      },
    }];
  });
}
```

### Anti-Patterns to Avoid

- **Opening `sqlite-vec` DB in every request:** Use a module-level singleton (`getVecDb()`) — opening and loading extensions is expensive.
- **Storing embeddings as JSON text:** Float32Array as BLOB is 2048 bytes (512 dims × 4 bytes). JSON is ~10x larger and slower to parse.
- **Calling Voyage API in the search hot path:** Embeddings are generated only during ingest. At search time, embed the query string once per request.
- **Running FTS5 and vec0 sequentially:** Both queries are fast and independent — run in `Promise.all`.
- **Ingesting RESEARCH-PROMPT.md:** This file has no YAML frontmatter and no camping knowledge — skip it explicitly in the ingest script.
- **Prisma migrations for FTS5:** Prisma does not generate FTS5-compatible DDL. Use a raw SQL migration file alongside Prisma's own migrations.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| YAML frontmatter parsing | Custom regex parser | `gray-matter` | Handles edge cases in YAML (multiline, colons in values, etc.) |
| Token counting | Count characters / words | `gpt-tokenizer` or `tiktoken` | Character count != token count; BPE tokenization differs by model |
| Vector extension loading | Manual `.so`/`.dylib` path resolution | `sqlite-vec` npm package | The npm package bundles platform-specific binaries and calls `loadExtension` automatically |
| Exponential backoff on Voyage API | Manual retry loop | `voyageai` SDK built-in | SDK retries automatically (default 2 retries) with exponential backoff |
| Float32 ↔ BLOB conversion | Custom binary encoding | `Float32Array.buffer` → `Buffer.from()` | Native JS typed array conversion, no library needed |

**Key insight:** The main complexity in RAG is in chunking quality and retrieval tuning, not in the infrastructure. Don't invent infrastructure — use the established primitives.

---

## Common Pitfalls

### Pitfall 1: Two Database Connections — sqlite-vec vs Prisma

**What goes wrong:** The Prisma client and the `better-sqlite3` connection that loads `sqlite-vec` are separate. Writing embeddings to `KnowledgeChunk` via Prisma (standard) and then reading the `rowid` for the `vec0` table requires that both connections see the same committed data.

**Why it happens:** Prisma's SQLite implementation uses a different connection pool. The `sqlite-vec` MATCH query joins on `rowid`, which is SQLite's internal integer key — not the Prisma-generated `id` (a CUID string).

**How to avoid:** Store `rowid` (assigned by SQLite during INSERT) explicitly. After inserting with Prisma, use a raw query to get `last_insert_rowid()` or use the `@@map` + `@default(autoincrement())` trick. Alternatively, insert embeddings via the `better-sqlite3` connection in a single transaction.

**Recommended approach:** Insert the main chunk record via Prisma (gets the `id` CUID), then immediately insert the embedding row into the `vec0` virtual table using the same `better-sqlite3` connection, using the SQLite `rowid` of the just-inserted row. Keep both in a transaction.

**Warning signs:** KNN search returns 0 results even though chunks are in the DB; join between `vec0` table and `KnowledgeChunk` returns NULL for all `rowid` lookups.

### Pitfall 2: vec0 Table Schema Must Match Embedding Dimensions Exactly

**What goes wrong:** `CREATE VIRTUAL TABLE vec_knowledge_chunks USING vec0(embedding float[512])` — the dimension (512) must match `voyage-3-lite`'s output dimension exactly. If you later switch to a model with different dimensions, you must DROP and recreate the vec0 table.

**Why it happens:** vec0 validates the length of inserted vectors against the schema. Inserting a 1024-dim vector into a `float[512]` table throws an error.

**How to avoid:** voyage-3-lite = 512 dimensions (confirmed). Create the vec0 table with `float[512]`. Document this in a comment.

**Warning signs:** `sqlite-vec: vector size mismatch` error during ingest.

### Pitfall 3: FTS5 MATCH Query Syntax Errors on Special Characters

**What goes wrong:** Location names like "Nantahala National Forest" and campground names with apostrophes or hyphens cause FTS5 MATCH queries to throw syntax errors if passed raw without quoting.

**Why it happens:** FTS5 MATCH syntax treats some characters as query operators. A query like `SELECT ... WHERE fts MATCH 'Bear's Den'` fails because of the apostrophe.

**How to avoid:** Wrap the FTS5 query in double quotes: `WHERE fts MATCH '"Bear''s Den"'` or pre-process the query string to escape special characters. Use `fts5_tokenize` to verify tokenization.

**Warning signs:** `fts5: syntax error near "s"` in query logs.

### Pitfall 4: Voyage API Rate Limits During Bulk Ingest

**What goes wrong:** Ingesting 7 files generates ~200-400 chunks. Embedding all in a single batch or rapid serial loop can hit Voyage's free tier rate limits.

**Why it happens:** Voyage's free tier has request rate limits. Batching embeddings in groups of 10-20 per API call is more efficient than one-at-a-time.

**How to avoid:** Batch chunks into groups of 10-25 when calling `client.embed({ input: [...] })`. The SDK accepts arrays. Add a small delay (100ms) between batches if hitting rate limits.

**Warning signs:** HTTP 429 from Voyage API during ingest; SDK retry exhaustion errors.

### Pitfall 5: WAL Mode Required for Concurrent Prisma + better-sqlite3 Access

**What goes wrong:** Without WAL mode, SQLite uses a write lock that blocks all readers during a write. Since ingest writes via `better-sqlite3` while the Next.js dev server has Prisma open, concurrent access without WAL mode can cause `SQLITE_BUSY` errors.

**Why it happens:** Default SQLite journal mode is `DELETE`, which uses exclusive locks. WAL (Write-Ahead Logging) allows concurrent readers + one writer.

**How to avoid:** Set `PRAGMA journal_mode = WAL;` on the `better-sqlite3` connection when it first opens. This is a database-level setting that persists.

---

## Code Examples

### Voyage AI Embedding API (TypeScript)
```typescript
// Source: https://github.com/voyage-ai/typescript-sdk
import { VoyageAIClient } from 'voyageai';

const client = new VoyageAIClient({ apiKey: process.env.VOYAGE_API_KEY });

// Single string
const result = await client.embed({
  input: ['What are the bear regulations in Pisgah National Forest?'],
  model: 'voyage-3-lite',
});
const embedding: number[] = result.embeddings[0]; // 512 dimensions

// Batch (preferred for ingest)
const batchResult = await client.embed({
  input: chunks.map(c => c.content), // up to 25 at once
  model: 'voyage-3-lite',
});
```

### sqlite-vec Extension Loading
```typescript
// Source: https://alexgarcia.xyz/sqlite-vec/js.html
import * as sqliteVec from 'sqlite-vec';
import Database from 'better-sqlite3';

const db = new Database('./prisma/dev.db');
db.pragma('journal_mode = WAL');
sqliteVec.load(db);

// Create vec0 virtual table (512 dims for voyage-3-lite)
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS vec_knowledge_chunks
  USING vec0(embedding float[512]);
`);
```

### Inserting a Vector
```typescript
// Source: https://github.com/asg017/sqlite-vec/blob/main/examples/simple-node/demo.mjs
const insertVec = db.prepare(`
  INSERT INTO vec_knowledge_chunks(rowid, embedding) VALUES (?, ?)
`);

const floatArray = new Float32Array(embedding); // embedding is number[512]
insertVec.run(rowid, floatArray); // pass Float32Array directly (not .buffer needed for better-sqlite3 v12+)
```

### KNN Vector Search
```typescript
// Source: sqlite-vec demo pattern
const rows = db.prepare(`
  SELECT rowid, distance
  FROM vec_knowledge_chunks
  WHERE embedding MATCH ?
  ORDER BY distance
  LIMIT ?
`).all(new Float32Array(queryEmbedding), topK);
```

### gray-matter Frontmatter Parsing
```typescript
// Source: https://github.com/jonschlinkert/gray-matter
import matter from 'gray-matter';
import { readFileSync } from 'fs';

const raw = readFileSync('data/research/dispersed-camping-regulations.md', 'utf-8');
const { data, content } = matter(raw);
// data = { topic: '...', region: 'statewide', category: 'regulations', confidence: 'high', ... }
// content = everything after the frontmatter block
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `sqlite-vss` (Faiss-based) | `sqlite-vec` (pure C, no Faiss dep) | 2024 | sqlite-vec is the maintained successor; sqlite-vss is archived |
| Fixed-size character chunking | Semantic/heading-based chunking | 2024 RAG best practices | Heading-based significantly reduces irrelevant chunk retrievals |
| Single-vector retrieval | Hybrid FTS5 + vector with RRF | 2024 | Hybrid outperforms either alone on structured knowledge |
| `text-embedding-ada-002` | `voyage-3-lite` / `voyage-3.5-lite` | 2024-2025 | Voyage models have better retrieval benchmarks; Anthropic-aligned choice |

**Deprecated/outdated:**
- `sqlite-vss`: Archived, replaced by `sqlite-vec`. Do not use.
- `next-pwa`: Unmaintained, unrelated to this phase but noted for Phase 5 PWA work.
- `voyage-3-lite` vs `voyage-4-lite`: voyage-4-lite is the newest (released 2025), but D-05 locks the choice to voyage-3-lite. This is fine — voyage-3-lite is production-stable at 512 dimensions.

---

## Open Questions

1. **How to map Prisma rowid to vec0 rowid**
   - What we know: SQLite's `rowid` is an internal integer. Prisma uses CUID strings as `@id`. The `vec0` virtual table requires `rowid` for joins.
   - What's unclear: Whether Prisma exposes `last_insert_rowid()` easily or if a raw query is required after each insert.
   - Recommendation: Use `better-sqlite3` for the full ingest transaction (insert chunk row + insert vec row) to control `rowid` directly. Use Prisma only for reads in the application layer.

2. **Token counting library choice**
   - What we know: The chunk size target is 256-512 tokens. `gpt-tokenizer` (BPE) approximates OpenAI tokenization; Voyage models use similar but not identical BPE. Exact token count matching the embedding model isn't strictly required — it's an approximate size target.
   - What's unclear: Whether tiktoken or gpt-tokenizer is closer to Voyage's tokenizer.
   - Recommendation: Use `gpt-tokenizer` (smaller, no WASM dependency unlike tiktoken). Treat the count as an approximation — a 10-15% variance from voyage's actual tokenization is acceptable for chunking purposes.

3. **External source ingestion scope for this phase**
   - What we know: D-02 requires USFS and recreation.gov sources. D-03 requires the pipeline to handle markdown, PDFs, and scraped web pages.
   - What's unclear: How many external documents should be ingested before validation (D-13 requires "at least 20 real NC camping documents").
   - Recommendation: The 7 existing markdown files + 3-5 downloaded USFS/recreation.gov PDFs satisfies the 20-document threshold. Phase the external ingestion: get the 7 markdown files working perfectly first, then add 3-5 PDFs from USFS (publicly available, no scraping needed).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | All TS/JS scripts | ✓ | v23.11.0 | — |
| npx tsx | Ingest script runner | ✓ | 4.21.0 (via npx) | — |
| SQLite (via better-sqlite3) | Vector operations | ✓ (to be installed) | 12.8.0 on npm | — |
| sqlite-vec npm package | Vector extension | ✓ (to be installed) | 0.1.8 | — |
| voyageai npm package | Embedding generation | ✓ (to be installed) | 0.2.1 | — |
| VOYAGE_API_KEY env var | voyageai calls | ✗ (must be added) | — | Phase blocked without it — Will must create Voyage AI account |
| gray-matter npm package | Markdown parsing | ✓ (to be installed) | 4.0.3 | — |
| data/research/*.md | Corpus seed | ✓ | 7 files, ~2300 lines | — |

**Missing dependencies with no fallback:**
- `VOYAGE_API_KEY` — required for embedding generation. Will must create a Voyage AI account at https://dash.voyageai.com and add the key to `.env`. Free tier is sufficient for a corpus of 200-400 chunks.

**Missing dependencies with fallback:**
- None identified beyond the Voyage API key.

---

## Validation Architecture

### Test Framework

No test framework is currently installed in this project. Phase 3 validation is defined by D-13/D-14: manual review of 10 representative queries comparing hybrid vs vector-only retrieval. This is a purpose-built validation script, not a unit test suite.

| Property | Value |
|----------|-------|
| Framework | None installed — validation via purpose-built Node script |
| Config file | `tools/ingest/validate-retrieval.ts` (Wave 0 creation) |
| Quick run command | `npx tsx tools/ingest/validate-retrieval.ts` |
| Full suite command | Same — validation is a single manual-review script |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| RAG-01 | Corpus ingested with embeddings + FTS5 index | smoke | `npx tsx tools/ingest/validate-retrieval.ts --count` | ❌ Wave 0 |
| RAG-02 | Search returns relevant results for 10 queries | manual | `npx tsx tools/ingest/validate-retrieval.ts` | ❌ Wave 0 |
| RAG-03 | Hybrid outperforms vector-only on same 10 queries | manual-comparison | `npx tsx tools/ingest/validate-retrieval.ts --compare` | ❌ Wave 0 |
| RAG-04 | Corpus sources documented | manual | Review `data/research/` + corpus manifest file | N/A |

### Sampling Rate

- **Per task commit:** `npx tsx tools/ingest/validate-retrieval.ts --count` (verifies chunk count > 0)
- **Per wave merge:** Full validation run — review all 10 query results
- **Phase gate:** All 10 queries return relevant top-5 results; hybrid scores higher than vector-only on at least 7/10 queries

### Wave 0 Gaps

- [ ] `tools/ingest/validate-retrieval.ts` — manual validation script for RAG-02, RAG-03
- [ ] `VOYAGE_API_KEY` in `.env` — required before any ingest can run
- [ ] `better-sqlite3`, `sqlite-vec`, `voyageai`, `gray-matter` installed — `npm install`

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — all `lib/rag/`, `tools/ingest/` files must be `.ts`
- All API routes must have try-catch with `console.error` + JSON error response
- No `alert()` — no UI in this phase, N/A
- React hooks dependency arrays — N/A (server-side only)
- Commit messages: imperative mood, concise
- TASKS.md is the single source of truth — update each session
- Changelog: create `docs/changelog/session-NN.md` for this session, add row to `docs/CHANGELOG.md` index
- Handler functions: `handleEventName()` — N/A for this backend phase
- `@/*` path alias maps to root — use for `@/lib/rag/...`
- Error handling pattern: `try { ... } catch (error) { console.error('Action:', error); return NextResponse.json(...) }`
- **GSD workflow enforcement:** All work must go through `/gsd:execute-phase`, not direct edits

---

## Sources

### Primary (HIGH confidence)
- [sqlite-vec Node.js docs](https://alexgarcia.xyz/sqlite-vec/js.html) — loading extension with better-sqlite3, Float32Array pattern
- [sqlite-vec simple-node demo](https://github.com/asg017/sqlite-vec/blob/main/examples/simple-node/demo.mjs) — vec0 CREATE, INSERT, MATCH pattern
- [voyageai npm package](https://www.npmjs.com/package/voyageai) — VoyageAIClient, embed() usage, version 0.2.1
- [Voyage AI TypeScript SDK](https://github.com/voyage-ai/typescript-sdk) — official SDK
- [Voyage AI embeddings docs](https://docs.voyageai.com/docs/embeddings) — model dimensions, model names
- `.planning/research/ARCHITECTURE.md` §2 — hybrid search pattern, lib/rag/ structure, FTS5 migration approach
- `data/research/*.md` — confirmed YAML frontmatter schema in all 7 files

### Secondary (MEDIUM confidence)
- [sqlite-vec hybrid search blog post](https://alexgarcia.xyz/blog/2024/sqlite-vec-hybrid-search/index.html) — RRF SQL pattern (authored by sqlite-vec maintainer)
- npm registry: `sqlite-vec@0.1.8`, `better-sqlite3@12.8.0`, `gray-matter@4.0.3` — confirmed current versions

### Tertiary (LOW confidence)
- None — all critical claims verified against primary sources

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all versions confirmed against npm registry
- Architecture: HIGH — based on ARCHITECTURE.md (prior project research) + sqlite-vec official docs
- Pitfalls: HIGH — Pitfall 1 (dual connection) and Pitfall 2 (dimensions) verified against sqlite-vec source/docs
- Validation approach: HIGH — D-13/D-14 define it explicitly; no test framework gap is a known project characteristic

**Research date:** 2026-03-30
**Valid until:** 2026-06-30 for stable components (sqlite-vec, voyageai SDK); re-verify if sqlite-vec 1.0 ships (see STATE.md blocker note)
