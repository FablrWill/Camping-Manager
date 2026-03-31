# External Sources

Downloaded PDFs and cached web content for the knowledge base.
These files are ingested via `npx tsx tools/ingest/run-ingest.ts`.

## How to add sources

1. Download a PDF or note a URL
2. For PDFs: place in this directory
3. For URLs: add to the `EXTERNAL_URLS` array in `tools/ingest/run-ingest.ts`
4. Run: `npx tsx tools/ingest/run-ingest.ts --clear`
