# Knowledge Base Corpus Manifest

Documents the sources ingested into the Outland OS camping knowledge base.
Updated: 2026-03-31

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

### Area Intel -- Deep Research Reports (Will's personal research)

These files were generated via deep research and uploaded manually. They contain
operational, on-the-ground intel not captured in the seed corpus.

| File | Topic | Region | Category | Date |
|------|-------|--------|----------|------|
| linville-gorge-intel.md | Linville Gorge operational camping intel — sites, coordinates, tactics, water, permits | linville-gorge | area-intel | 2026-04-02 |
| western-nc-current-conditions.md | Current conditions — burn ban, active fires, road/trail closures | western-nc | conditions | 2026-04-02 |

### External Sources (D-02)

Ingested external sources from government recreation sites:

| Source | Type | URL/Path | Status |
|--------|------|----------|--------|
| NPS Blue Ridge Parkway Camping | Web (scraped) | https://www.nps.gov/blri/planyourvisit/camping.htm | Ingested |

Additional sources can be added:
- **PDFs:** Download and place in `data/external/` directory
- **URLs:** Add to the `EXTERNAL_URLS` array in `tools/ingest/run-ingest.ts`
- Then run: `npx tsx tools/ingest/run-ingest.ts --clear`

Priority sources for future ingestion:
- Recreation.gov — Federal campground reservations, permit info, seasonal closures
- NC State Parks — State park campground details, regulations
- USFS Pisgah/Nantahala — National forest campground data (note: USFS site blocks automated requests, may need PDF download)

### Ingestion Workflow (D-04)

Manual re-ingest: Run `npx tsx tools/ingest/run-ingest.ts --clear` when:
- Research files are updated with new information
- New source files are added to `data/research/`
- External PDFs are placed in `data/external/`
- External URLs are added to `EXTERNAL_URLS` in `run-ingest.ts`

No scheduled background jobs. Single-user tool -- manual is appropriate.

## Statistics

*Updated after each ingest run:*
- Seed corpus: 7 markdown files
- Area intel: 2 markdown files (Linville Gorge, WNC conditions)
- External sources: 1 web page (NPS Blue Ridge Parkway)
- Total files: 10 sources
- Embedding model: voyage-3-lite (512 dimensions)
- Chunk size target: 256-512 tokens
