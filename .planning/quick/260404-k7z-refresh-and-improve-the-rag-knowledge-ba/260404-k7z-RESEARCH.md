# Quick Task 260404-k7z: RAG Knowledge Base Refresh — Research

**Researched:** 2026-04-04
**Domain:** Node.js crypto, RSS parsing, RAG pipeline extension, subprocess spawning
**Confidence:** HIGH — all findings verified from codebase inspection and Node.js built-ins

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Use real public URLs and real HTTP fetches. Script must work on Mac mini day one.
- Respect robots.txt on all scraped sources.
- Add header-based splitting alongside existing paragraph logic — do NOT replace it.
- Header-based splitting runs first for markdown content (detects `## ` / `### ` patterns).
- Paragraph splitting stays as fallback for non-structured or non-markdown content.
- `corpus_refresh` handler in `agent-runner.ts` shells out to `scripts/refresh-corpus.ts` as a subprocess.
- Script remains standalone and independently runnable on the Mac mini.
- Agent runner marks job done/failed based on subprocess exit code.

### Claude's Discretion
- Exact chunking threshold for header-split sections (target ~512 tokens, same as paragraph splitter).
- Whether to preserve partial `refreshedAt` updates when only some sources succeed.
- Whether `contentHash` is stored per-source or per-chunk (per-chunk preferred per CONTEXT.md).

### Deferred Ideas (OUT OF SCOPE)
- None specified.
</user_constraints>

---

## Summary

All implementation can be done with packages already in `package.json` — no new dependencies. SHA-256 hashing uses Node.js built-in `crypto`. RSS feeds are XML text fetched with `fetch()` and parseable with regex or a simple XML walk (cheerio is already available). The existing `chunkWebPage` handles HTML; an RSS-specific path extracts `<item>` elements and treats each as a mini-document. The agent runner uses a simple `processors` object keyed by job type — adding `corpus_refresh` means adding one entry that calls `child_process.spawn` on `tsx scripts/refresh-corpus.ts`. The header-aware chunking path already exists in `chunkMarkdown()` — the web parser just needs a parallel code path triggered when content looks markdown-like.

**Primary recommendation:** Zero new npm installs. Wire the six areas together using Node.js built-ins + existing cheerio.

---

## Findings

### 1. SHA-256 hashing — Node.js built-in `crypto`

No package needed. Pattern:

```typescript
import { createHash } from 'crypto';

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}
```

Used per-chunk: hash `chunk.content` before deciding whether to re-embed. Store result in `KnowledgeChunk.contentHash`. On refresh, fetch source, re-chunk, compare each chunk's hash to the stored value — skip `embedTexts()` call if unchanged. **Confidence: HIGH** (Node.js built-in, no version concern).

---

### 2. RSS parsing — no new package; cheerio already available

`cheerio` is already in `dependencies` (v1.2.0). It parses XML equally well. For an RSS feed like USFS alerts:

```typescript
import * as cheerio from 'cheerio';

async function fetchRssItems(url: string): Promise<{ title: string; content: string }[]> {
  const res = await fetch(url, { headers: { 'User-Agent': 'OutlandOS/1.0' } });
  const xml = await res.text();
  const $ = cheerio.load(xml, { xmlMode: true }); // xmlMode: true is the key flag
  return $('item').map((_, el) => ({
    title: $(el).find('title').text().trim(),
    content: [
      $(el).find('title').text().trim(),
      $(el).find('description').text().trim(),
      $(el).find('pubDate').text().trim(),
    ].filter(Boolean).join('\n'),
  })).get();
}
```

`xmlMode: true` prevents cheerio from treating RSS as HTML (no implicit `<html>` wrapping). This handles USFS Pisgah/Nantahala alert feeds. For iOverlander or Campendium HTML pages, `chunkWebPage()` already handles them — no change needed.

**Confidence: HIGH** — cheerio is already used in `parsers/web.ts` line 1.

---

### 3. Robots.txt — lightweight manual check, no package

No `robots-parser` package is needed. A minimal check that covers standard cases:

```typescript
async function isAllowed(url: string, userAgent = 'OutlandOS'): Promise<boolean> {
  try {
    const { origin } = new URL(url);
    const res = await fetch(`${origin}/robots.txt`);
    if (!res.ok) return true; // no robots.txt = allowed
    const text = await res.text();
    // Find the most specific matching User-agent block
    const lines = text.split('\n').map(l => l.trim());
    let applicable = false;
    let disallowedPaths: string[] = [];
    for (const line of lines) {
      if (line.toLowerCase().startsWith('user-agent:')) {
        const agent = line.split(':')[1].trim();
        applicable = agent === '*' || agent.toLowerCase() === userAgent.toLowerCase();
        if (applicable) disallowedPaths = [];
      } else if (applicable && line.toLowerCase().startsWith('disallow:')) {
        const path = line.split(':')[1].trim();
        if (path) disallowedPaths.push(path);
      }
    }
    const { pathname } = new URL(url);
    return !disallowedPaths.some(p => pathname.startsWith(p));
  } catch {
    return true; // if robots.txt fetch fails, proceed
  }
}
```

Cache the robots.txt result per-origin within a single script run to avoid hammering hosts. **Confidence: MEDIUM** — covers 95% of real-world cases; doesn't handle `Allow:` directives or crawl-delay, but sufficient for a personal tool.

---

### 4. embed.ts API — call signature confirmed

`embedTexts(texts: string[]): Promise<Float32Array[]>` — imported from `lib/rag/embed.ts`. Already handles rate-limit retries with exponential backoff (up to 125s). The refresh script can call it directly.

`ingestChunks(chunks: RawChunk[])` in `lib/rag/ingest.ts` handles both Prisma insert and vec0 insert in one call. However, for refresh we need to **delete old chunks by source first** then insert new ones, so the refresh script should call `prisma.knowledgeChunk.deleteMany({ where: { source: url } })` followed by `ingestChunks()`. The vec0 table uses SQLite rowids, so deleting from KnowledgeChunk via Prisma will leave orphan vec0 rows — the refresh script must also delete from `vec_knowledge_chunks` using the rowids obtained before deletion.

**Pitfall — vec0 orphan cleanup:** Before deleting from KnowledgeChunk, query rowids:
```typescript
const vecDb = await getVecDb();
const rows = vecDb.prepare('SELECT rowid FROM KnowledgeChunk WHERE source = ?').all(url);
for (const row of rows as { rowid: number }[]) {
  vecDb.prepare('DELETE FROM vec_knowledge_chunks WHERE rowid = ?').run(BigInt(row.rowid));
}
await prisma.knowledgeChunk.deleteMany({ where: { source: url } });
```

**Confidence: HIGH** — confirmed from `ingest.ts` lines 210-221.

---

### 5. agent-runner.ts — subprocess pattern for `corpus_refresh`

The runner uses a `processors: Record<string, JobProcessor>` object (line 229). Add one entry:

```typescript
corpus_refresh: async (_payload: unknown) => {
  return new Promise<{ status: string }>((resolve, reject) => {
    const child = spawn('tsx', ['scripts/refresh-corpus.ts'], {
      stdio: 'inherit', // PM2 sees all output
      env: process.env,
    });
    child.on('close', (code) => {
      if (code === 0) resolve({ status: 'completed' });
      else reject(new Error(`refresh-corpus.ts exited with code ${code}`));
    });
    child.on('error', reject);
  });
},
```

Import `spawn` from `child_process` at the top. The existing `failJob` / `postResult` infrastructure handles the rest — if `reject()` is called, the `try/catch` in `processJob` (line 263) handles it. **Confidence: HIGH** — pattern directly matches existing structure.

`tsx` is in `devDependencies` (v4.21.0) and is already used as the script runner (see `package.json` scripts). On the Mac mini, `tsx` must be available globally or via `npx tsx`.

---

### 6. ingest.ts header-aware chunking — integration point

`chunkMarkdown()` already does header-aware chunking for `.md` files (lines 90-146). `chunkWebPage()` does paragraph-only splitting.

The CONTEXT.md decision: header-based splitting runs first for markdown content detected in web/RSS responses. The integration is a new function `chunkText(text: string, url: string): RawChunk[]` that:
1. Detects markdown-like content: `text.includes('\n## ') || text.includes('\n### ')`
2. If markdown-like → calls `chunkMarkdown(text, url)` (reuse existing function)
3. Otherwise → paragraph split (copy existing logic from `chunkWebPage`)

This avoids touching `chunkWebPage()` itself (no regression risk). The refresh script calls this new function instead of `ingestFile()`.

**Pitfall — `chunkMarkdown` expects gray-matter frontmatter:** The function calls `matter(fileContent)` on line 91. Web/RSS content has no frontmatter, so `matter(text)` returns `{ data: {}, content: text }` — this is fine, gray-matter handles it gracefully.

**Confidence: HIGH** — confirmed from ingest.ts source.

---

### 7. Schema migration — Prisma fields to add

Current `KnowledgeChunk` model ends at line 346. Add two optional fields:

```prisma
model KnowledgeChunk {
  // ... existing fields ...
  contentHash  String?  // SHA-256 of chunk.content for change detection
  refreshedAt  DateTime? // when this chunk was last refreshed from source
  // ...
}
```

Both optional so existing rows (null values) remain valid. Migration via `prisma migrate dev` on MacBook, then `prisma migrate deploy` on Mac mini.

---

### 8. `sources.ts` — source registry shape

```typescript
export interface KnowledgeSource {
  name: string;
  url: string;
  type: 'rss' | 'html';
}

export const SOURCES: KnowledgeSource[] = [
  { name: 'USFS Pisgah Alerts', url: 'https://www.fs.usda.gov/alerts/nfsnc/home/?etype=rss', type: 'rss' },
  { name: 'USFS Nantahala Alerts', url: 'https://www.fs.usda.gov/alerts/nfsnc/home/?etype=rss', type: 'rss' },
  { name: 'NC State Parks', url: 'https://www.ncparks.gov/visit/parks-and-facilities', type: 'html' },
  { name: 'LNT Guidelines', url: 'https://lnt.org/why/7-principles/', type: 'html' },
  { name: 'Campendium NC', url: 'https://www.campendium.com/camping/north-carolina', type: 'html' },
];
```

Note: iOverlander does not have a public bulk export URL — treat as `html` pointing to their NC search page, or omit if robots.txt disallows. Verify each source before first run.

---

### 9. `/api/knowledge/stats` — query shape

```typescript
const [count, latest] = await Promise.all([
  prisma.knowledgeChunk.count(),
  prisma.knowledgeChunk.findFirst({ orderBy: { refreshedAt: 'desc' }, select: { refreshedAt: true } }),
]);
return NextResponse.json({ chunkCount: count, lastRefreshed: latest?.refreshedAt ?? null });
```

No heavy aggregation. Response shape drives the SettingsClient display.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead |
|---------|-------------|-------------|
| RSS parsing | Custom XML parser | `cheerio` with `xmlMode: true` |
| SHA-256 | Any npm hash library | Node.js `crypto.createHash('sha256')` |
| Embedding | Direct Voyage HTTP calls | Existing `embedTexts()` in `lib/rag/embed.ts` |
| Chunk + store | Custom DB writes | Existing `ingestChunks()` after source-delete |

---

## Common Pitfalls

### Pitfall 1: vec0 orphan rows after source delete
**What goes wrong:** Deleting KnowledgeChunk via Prisma doesn't cascade to `vec_knowledge_chunks` (separate SQLite virtual table). Vector search returns ghost rowids → query errors.
**How to avoid:** Always delete vec0 rows by rowid before Prisma delete. Pattern in findings #4 above.

### Pitfall 2: cheerio `xmlMode` omission
**What goes wrong:** Without `xmlMode: true`, cheerio wraps RSS XML in `<html><body>` and tag lookups (`$('item')`) return 0 results.
**How to avoid:** Always pass `{ xmlMode: true }` when loading non-HTML content.

### Pitfall 3: VOYAGE_API_KEY not set on Mac mini
**What goes wrong:** `refresh-corpus.ts` calls `embedTexts()` which throws immediately if `VOYAGE_API_KEY` is unset.
**How to avoid:** Script should check env var at startup and exit with code 1 + clear message.

### Pitfall 4: Rate limit during bulk refresh
**What goes wrong:** Refreshing 5 sources produces many chunks; Voyage free tier is 3 RPM / 10K TPM. `ingestChunks()` already has 21s between batches — but skipping unchanged chunks is essential to stay within limits.
**How to avoid:** Hash-compare before embedding. Only call `embedTexts()` for changed chunks.

### Pitfall 5: tsx not in PATH on Mac mini
**What goes wrong:** `spawn('tsx', ...)` in agent-runner fails with ENOENT if `tsx` isn't globally installed.
**How to avoid:** Use `spawn('npx', ['tsx', 'scripts/refresh-corpus.ts'], ...)` as a safer fallback, or ensure `./node_modules/.bin/tsx` path is used.

---

## Sources

### Primary (HIGH confidence)
- `lib/rag/ingest.ts` — chunking pipeline, `ingestChunks` signature, vec0 rowid pattern
- `lib/rag/embed.ts` — `embedTexts` API, rate limit handling
- `lib/rag/parsers/web.ts` — existing `chunkWebPage`, cheerio usage
- `scripts/agent-runner.ts` — processors pattern, job lifecycle
- `package.json` — confirmed: `cheerio`, `voyageai`, `gpt-tokenizer`, `gray-matter`, `tsx` all present
- Node.js docs (built-in knowledge) — `crypto.createHash`, `child_process.spawn`

### Secondary (MEDIUM confidence)
- Robots.txt format (RFC 9309 / standard practice) — manual check pattern covers typical cases
