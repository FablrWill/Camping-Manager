# Knowledge Base Corpus Manifest

Documents the sources ingested into the Outland OS camping knowledge base.
Updated: 2026-03-30

## Sources

### Seed Corpus -- Gemini Deep Research Files

All files live in `data/research/` and were generated via Gemini Deep Research
with a structured prompt (see `RESEARCH-PROMPT.md`). Each has YAML frontmatter
with `topic`, `region`, `category`, `confidence` fields.

| File | Topic | Region | Category |
|------|-------|--------|----------|
| bear-safety-lnt.md | Bear Safety & Leave No Trace in NC | statewide | safety |
| campgrounds-asheville-3hr-radius.md | Campgrounds within 3hr of Asheville | western-nc | campgrounds |
| campgrounds-by-region.md | NC Campgrounds by Region | statewide | campgrounds |
| dispersed-camping-regulations.md | Dispersed Camping Regulations | statewide | regulations |
| forest-road-access.md | Forest Road Access & Conditions | western-nc | access |
| seasonal-planning-guide.md | Seasonal Camping Planning | statewide | planning |
| water-and-connectivity.md | Water Access & Connectivity | statewide | infrastructure |

### External Sources (D-02)

Priority external sources for ingestion:
- US Forest Service (USFS) -- Pisgah and Nantahala National Forest campground data
- Recreation.gov -- Federal campground reservations, permit info, seasonal closures
- NC State Parks -- State park campground details, regulations

These are ingested via PDF parsing and web scraping (see Plan 04 for pipeline support).

### Ingestion Workflow (D-04)

Manual re-ingest: Run `npx tsx tools/ingest/run-ingest.ts --clear` when:
- Research files are updated with new information
- New source files are added to `data/research/`
- External sources are downloaded and placed in the corpus directory

No scheduled background jobs. Single-user tool -- manual is appropriate.

## Statistics

*Updated after each ingest run:*
- Total files: 7 (seed corpus)
- Total chunks: 237 (as of 2026-03-31 initial ingest)
- Embedding model: voyage-3-lite (512 dimensions)
- Chunk size target: 256-512 tokens
