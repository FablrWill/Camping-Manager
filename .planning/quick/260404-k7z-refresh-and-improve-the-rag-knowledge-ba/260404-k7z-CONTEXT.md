# Quick Task 260404-k7z: Refresh and improve the RAG knowledge base - Context

**Gathered:** 2026-04-04
**Status:** Ready for planning

<domain>
## Task Boundary

Add `refreshedAt DateTime?` and `contentHash String?` fields to `KnowledgeChunk` in Prisma and run a migration. Create `lib/rag/sources.ts` as a registry of real public NC camping source URLs. Build `scripts/refresh-corpus.ts` for the Mac mini: fetch each source with real HTTP, compute SHA-256 hash, skip if unchanged, re-chunk and re-embed if changed. Improve `lib/rag/ingest.ts` to add header-aware chunking alongside existing paragraph splitting. Add `corpus_refresh` AgentJob type handler in `scripts/agent-runner.ts` that shells out to `refresh-corpus.ts`. Add GET `/api/knowledge/stats` route. Add "Knowledge Base" section to `components/SettingsClient.tsx` with corpus stats and a "Refresh now" button.

</domain>

<decisions>
## Implementation Decisions

### Source fetching
- Use real public URLs and real HTTP fetches. Script should work on Mac mini day one.
- Respect robots.txt on all scraped sources.
- Sources: USFS Pisgah/Nantahala alerts RSS, NC State Parks pages, LNT guidelines, iOverlander NC export, Campendium NC.

### Chunker upgrade
- Add header-based splitting alongside existing paragraph logic — do NOT replace it.
- Header-based splitting runs first for markdown content (detects `## ` / `### ` patterns).
- Paragraph splitting stays as fallback for non-structured or non-markdown content.
- No regression risk to existing corpus ingest pipeline.

### Job execution
- `corpus_refresh` handler in `agent-runner.ts` shells out to `scripts/refresh-corpus.ts` as a subprocess.
- Script remains standalone and independently runnable on the Mac mini.
- Agent runner marks job done/failed based on subprocess exit code.

### Claude's Discretion
- Exact chunking threshold for header-split sections (target ~512 tokens, same as paragraph splitter).
- Whether to preserve partial `refreshedAt` updates when only some sources succeed.
- Whether `contentHash` is stored per-source or per-chunk (per-chunk is more granular — preferred).

</decisions>

<specifics>
## Specific Ideas

- `lib/rag/sources.ts` should export a `SOURCES` array with `{ name, url, type: 'rss' | 'html' | 'api' }` per entry.
- `scripts/refresh-corpus.ts` should log each source result (skipped/updated/failed) for Mac mini PM2 log visibility.
- The `/api/knowledge/stats` endpoint can query `prisma.knowledgeChunk.count()` and `prisma.knowledgeChunk.findFirst({ orderBy: { refreshedAt: 'desc' } })` — no heavy aggregation.
- "Refresh now" button in Settings POSTs `{ type: 'corpus_refresh', payload: {} }` to `/api/agent/jobs`.

</specifics>

<canonical_refs>
## Canonical References

- Full S36 spec: `.planning/V2-SESSIONS.md` under `### S36 — Knowledge Base Refresh`
- Existing RAG pipeline: `lib/rag/ingest.ts`, `lib/rag/types.ts`, `lib/rag/embed.ts`
- Existing agent job infrastructure: `scripts/agent-runner.ts`, `app/api/agent/jobs/route.ts`

</canonical_refs>
