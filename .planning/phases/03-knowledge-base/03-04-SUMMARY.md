---
phase: 03-knowledge-base
plan: 04
subsystem: database
tags: [pdf-parse, cheerio, web-scraping, rag, ingestion, nps]

# Dependency graph
requires:
  - phase: 03-02
    provides: Markdown chunking pipeline, ingestFile, ingestChunks, run-ingest CLI
provides:
  - PDF text extraction and chunking via pdf-parse
  - Web page scraping and chunking via cheerio
  - Multi-format ingestFile routing (md, pdf, http/https)
  - External source ingestion (NPS Blue Ridge Parkway)
  - data/external/ directory for downloaded PDFs
affects: [03-knowledge-base, agent, chat]

# Tech tracking
tech-stack:
  added: [pdf-parse, cheerio, @types/pdf-parse]
  patterns: [file-type routing in ingestFile, try-catch per external source]

key-files:
  created:
    - lib/rag/parsers/pdf.ts
    - lib/rag/parsers/web.ts
    - data/external/README.md
  modified:
    - lib/rag/ingest.ts
    - tools/ingest/run-ingest.ts
    - data/research/CORPUS-MANIFEST.md
    - package.json

key-decisions:
  - "Used NPS Blue Ridge Parkway URL instead of USFS (USFS returns 403 Forbidden to automated requests)"
  - "Web parser extracts <title> tag before removing nav elements to get clean page titles"
  - "Each external source wrapped in try-catch so single failure doesn't block full ingest"

patterns-established:
  - "Parser module pattern: lib/rag/parsers/{format}.ts exports async chunk function returning RawChunk[]"
  - "External source resilience: try-catch per source with console.warn on failure"

requirements-completed: [RAG-01, RAG-04]

# Metrics
duration: 15min
completed: 2026-03-31
---

# Phase 3 Plan 4: External Sources Summary

**PDF parsing via pdf-parse, web scraping via cheerio, and NPS Blue Ridge Parkway ingested as first external source**

## Performance

- **Duration:** 15 min
- **Started:** 2026-03-31T04:08:19Z
- **Completed:** 2026-03-31T04:25:24Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- PDF parser (lib/rag/parsers/pdf.ts) extracts text from PDFs and chunks at paragraph boundaries
- Web scraper (lib/rag/parsers/web.ts) fetches HTML, strips non-content elements, extracts and chunks text
- ingestFile now async with routing: .md -> chunkMarkdown, .pdf -> chunkPdf, http/https -> chunkWebPage
- NPS Blue Ridge Parkway camping page ingested as first real external source
- CLI updated to scan data/external/ for PDFs and iterate EXTERNAL_URLS array

## Task Commits

Each task was committed atomically:

1. **Task 1: Install PDF/web dependencies, create parsers, update ingestFile routing** - `dea783d` (feat)
2. **Task 2: Ingest external source, update manifest and CLI** - `dfc2e89` (feat)

## Files Created/Modified
- `lib/rag/parsers/pdf.ts` - PDF text extraction and chunking using pdf-parse
- `lib/rag/parsers/web.ts` - Web page scraping and chunking using cheerio
- `lib/rag/ingest.ts` - Updated ingestFile to async with PDF/web/URL routing
- `tools/ingest/run-ingest.ts` - Added EXTERNAL_URLS, PDF scanning, per-source error handling
- `data/research/CORPUS-MANIFEST.md` - Updated with actual external sources
- `data/external/README.md` - Documents external sources directory
- `package.json` - Added pdf-parse, cheerio, @types/pdf-parse

## Decisions Made
- **NPS over USFS:** USFS website (fs.usda.gov) returns 403 Forbidden for automated requests. NPS (nps.gov) allows fetch with a User-Agent header. Used Blue Ridge Parkway camping page as the external source.
- **Title extraction order:** Extract `<title>` tag before removing nav/header/footer elements to get clean page titles. H1 tags on government sites often contain menu text.
- **Resilient external ingestion:** Each external source is wrapped in try-catch with console.warn, so one failing URL/PDF doesn't block the entire ingest run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Fixed web parser title extraction order**
- **Found during:** Task 2 (external source ingestion)
- **Issue:** Web parser was extracting h1 text before removing nav elements, resulting in titles like "Open\nMenu\n\n\nClose\nMenu"
- **Fix:** Extract `<title>` tag first, then remove non-content elements, then fallback to h1
- **Files modified:** lib/rag/parsers/web.ts
- **Verification:** Re-tested NPS URL, title now extracted correctly from `<title>` tag
- **Committed in:** dfc2e89 (Task 2 commit)

---

**Total deviations:** 1 auto-fixed (1 bug)
**Impact on plan:** Minor fix for correct title extraction. No scope creep.

## Issues Encountered
- **USFS 403 Forbidden:** The plan suggested `https://www.fs.usda.gov/recarea/nfsnc/recarea/?recid=48114` as a URL. USFS blocks automated requests (403). Switched to NPS Blue Ridge Parkway which is equally relevant to Asheville-area camping.
- **Voyage API rate limits:** Free tier (3 RPM, 10K TPM) causes long delays during full corpus re-ingest. Individual source ingestion works within limits.

## User Setup Required

None - no external service configuration required. (Voyage API key was already configured in Plan 02.)

## Known Stubs

None - all functionality is fully wired.

## Next Phase Readiness
- Ingestion pipeline now supports all three content types per D-03: markdown, PDF, web pages
- External sources documented in CORPUS-MANIFEST.md per D-02
- Ready for Plan 03 (hybrid search) which builds on the ingested knowledge base

---
*Phase: 03-knowledge-base*
*Completed: 2026-03-31*
