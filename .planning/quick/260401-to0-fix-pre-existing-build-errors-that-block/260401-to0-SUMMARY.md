---
quick_id: 260401-to0
description: Fix pre-existing build errors that block npx next build
date: 2026-04-02
status: complete
---

# Quick Task 260401-to0: Fix Build Errors — Summary

## What changed

Converted top-level imports to dynamic `await import()` calls in 4 files to prevent module resolution failures during Next.js static page data collection at build time:

1. **lib/rag/embed.ts** — `voyageai` (ESM directory-import bug)
2. **lib/rag/db.ts** — `better-sqlite3` + `sqlite-vec` (native bindings)
3. **lib/email.ts** — `nodemailer`
4. **lib/voice/transcribe.ts** — `openai`

## Cascading changes

Since `getVecDb()` became async, updated all callers:
- `lib/rag/search.ts` — `ftsSearch()` and `vecSearch()` now async
- `lib/rag/ingest.ts` — await getVecDb()
- `tools/ingest/run-ingest.ts` — await getVecDb()
- `tools/ingest/validate-retrieval.ts` — await getVecDb()

## Files modified

- `lib/rag/embed.ts`
- `lib/rag/db.ts`
- `lib/rag/search.ts`
- `lib/rag/ingest.ts`
- `lib/email.ts`
- `lib/voice/transcribe.ts`
- `tools/ingest/run-ingest.ts`
- `tools/ingest/validate-retrieval.ts`

## Verification

`npx next build` completes cleanly — all 32 pages generated successfully (10 static, 22 dynamic).
