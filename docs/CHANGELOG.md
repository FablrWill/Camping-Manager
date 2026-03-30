# Changelog

All notable changes to Camp Commander are tracked here.

## 2026-03-29 — Session 1: Project Kickoff

### Created
- Project directory structure (app, components, lib, prisma, public, docs)
- `CLAUDE.md` — project-level instructions for Claude Code
- `docs/PLAN.md` — full project plan with 4 phases and 6 core modules
- `docs/vehicle-profile.md` — 2022 Hyundai Santa Fe Hybrid specs and camping notes
- `docs/CHANGELOG.md` — this file
- `docs/STATUS.md` — current status and session handoff doc
- `docs/GOALS.md` — project goals and success criteria

### Decisions Made
- **Tech stack:** Next.js 16 (App Router) + Tailwind + SQLite/Prisma + TypeScript
- **Maps:** Google Maps (Will is familiar with it)
- **AI:** Claude API for gear identification and conversational agent
- **Deployment:** Local dev first, Vercel later
- **No auth:** Single-user personal tool

### Status at End of Session
- See `docs/STATUS.md` for pickup instructions

## 2026-03-29 — Session 2: Foundation Build

### Created
- Next.js 16 app with TypeScript, Tailwind, App Router (Turbopack)
- Prisma schema with 6 models: GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem
- SQLite database with initial migration
- Mobile-responsive layout shell with sticky nav (stone/amber theme)
- Home page with 4 module cards (Gear, Vehicle, Spots, Trips)
- Database seed script (`prisma/seed.ts`) — genesis spot + Santa Fe vehicle
- Prisma client singleton (`lib/db.ts`)
- Genesis spot photos saved to `00_Context/photos/genesis-spot/`

### Data Seeded
- **Location:** South Rim of Linville Gorge (35.8783, -81.9094) — dispersed, rated 5/5, Starlink strong, cell weak
- **Vehicle:** 2022 Hyundai Santa Fe Hybrid — full specs from vehicle-profile.md

### Feature Ideas Captured
- **User Guide Finder** — auto-search and save product manuals when adding gear (added to PLAN.md)
- **Voice Ghostwriter** — voice-first journaling, agent interviews you and drafts the entry (added to IDEAS.md)

### Decisions Made
- **SQLite for now** — Prisma makes the switch to Postgres a one-liner when deploying to Vercel
- **Build for scale** — no shortcuts that need rework later; forward-compatible architecture choices
- **Large media excluded from git** — MOV/HEIC/MP4 in .gitignore, only PNGs committed
- **EXIF extraction works** — GPS coords confirmed from iPhone 14 Pro videos; will auto-extract location from photos in Phase 2
- **Branching strategy** — main stays stable, feature branches for development going forward

### Status at End of Session
- Phase 1 foundation complete
- Next: gear inventory CRUD, vehicle profile page
- See `docs/STATUS.md` for pickup instructions

## 2026-03-30 — Session 3: Photo Map

### Created
- `Photo` model in Prisma schema (latitude, longitude, altitude, takenAt, imagePath)
- `/spots` page — full-screen Leaflet/OpenStreetMap map, no Google API key required
- `components/SpotMap.tsx` — Leaflet map with custom pins, clustering, click popups
- `components/PhotoUpload.tsx` — drag-drop / camera roll upload with GPS feedback
- `app/api/photos/upload/route.ts` — EXIF GPS extraction + sharp compression (~100KB)
- `app/api/photos/route.ts` — list photos for client-side refresh
- `lib/exif.ts` — EXIF GPS parser utility
- Leaflet/OpenStreetMap markers: amber camera pins (photos) + green location pins (spots)

### Changed
- `app/layout.tsx` — Spots nav link updated to `/spots`, removed max-width from main (map needs full width)
- `app/page.tsx` — Spots card link updated to `/spots`, added container padding directly

### Dependencies Added
- `leaflet`, `@types/leaflet` — map rendering (raw Leaflet API, not react-leaflet wrapper)
- `exif-parser` — EXIF GPS extraction
- `sharp` — image compression

### Decisions Made
- **Leaflet/OpenStreetMap** over Google Maps — free, no API key, no rate limits; sufficient for personal use
- **Store compressed copy locally** (~100KB JPEG) — avoids Google Photos link complexity, works offline
- **No Google Takeout pipeline** — direct phone upload is simpler; can add bulk import later if needed
- **Server component for data, client component for map** — Leaflet needs browser `window`, handled via dynamic import

### Status at End of Session
- Phase 2 photo map complete
- Linville Gorge pin visible on load; upload geotagged photos to add pins
- Next: location save/edit with pin drop, gear inventory CRUD
- See `docs/STATUS.md` for pickup instructions

## 2026-03-30 — Session 4: Interactive Timeline Map + Google Takeout Import

### Created
- `tools/photo-map/extract_photos.py` — Extract GPS metadata from Google Photos Takeout sidecars
- `tools/photo-map/extract_timeline.py` — Extract GPS path + place visits from Location History (streaming parser for large files)
- `tools/photo-map/enrich_screenshots.py` — Claude Sonnet vision AI identifies locations from map screenshots
- `tools/photo-map/README.md` — Full setup guide, usage, troubleshooting
- `app/api/import/photos/route.ts` — Bulk import photos from Takeout JSON
- `app/api/import/timeline/route.ts` — Bulk import timeline data (path points, place visits, activity segments)
- `app/api/timeline/route.ts` — Serve timeline data to frontend with date filtering
- Prisma models: `TimelinePoint`, `PlaceVisit`, `ActivitySegment`
- Migration: `add_timeline_models_and_photo_enhancements`

### Changed
- `components/SpotMap.tsx` — Complete rewrite: marker clustering (leaflet.markercluster), color-coded activity path polylines, place visit markers with pulse animation, dark mode tiles (CartoDB Dark Matter), layer toggles, path animation with speed control, forwardRef for imperative API
- `app/spots/spots-client.tsx` — Added: day picker with date filtering, day summary card, layer toggles (photos/spots/path/places), animation controls (play/stop/speed slider), dark mode toggle, timeline data fetching, unplaced photos count
- `app/spots/page.tsx` — Queries new Photo fields (locationSource, locationConfidence, visionApproximate, googleUrl)
- `app/api/photos/route.ts` — Returns new enrichment fields
- `prisma/schema.prisma` — Photo model: nullable lat/lon, locationSource, locationDescription, locationConfidence, visionApproximate, googleUrl fields

### Dependencies Changed
- Added: `leaflet.markercluster`, `@types/leaflet.markercluster`
- Removed: `react-leaflet`, `react-leaflet-cluster` (unused — SpotMap uses raw Leaflet API)

### Decisions Made
- **Google Takeout import** added alongside direct upload — both approaches supported now
- **Timeline data in SQLite** — bulk import via API, not parsed on-the-fly in the browser
- **tools/ directory** for standalone Python scripts — keeps Next.js app root clean
- **Activity color coding** — hiking=green, driving=red, cycling=blue, kayaking=teal, flying=purple
- **Photo marker colors** by source — blue=EXIF GPS, green=vision exact, orange=vision approximate

### Status at End of Session
- Timeline visualization fully working on /spots page
- Python extraction tools ready for Google Takeout data
- Next: location save/edit, gear inventory CRUD, or start using real Takeout data
- See `docs/STATUS.md` for pickup instructions

## 2026-03-30 — Session 5: Location Pin Drop + Gear CRUD

### Created
- `components/LocationForm.tsx` — mobile-friendly slide-up form for creating/editing locations. Fields: name, date/time visited, type, star rating, road condition, clearance, cell/Starlink signal, water access, description, notes.
- `app/api/locations/route.ts` — GET all locations, POST create new location
- `app/api/locations/[id]/route.ts` — GET single, PUT update, DELETE location
- Prisma migration: `add_visited_at_to_location` — adds `visitedAt DateTime?` to Location model
- Gear inventory CRUD (built in parallel session) — list, add, edit, delete gear items

### Changed
- `components/SpotMap.tsx` — Added `onLocationEdit` callback prop, Edit button in location popups, expanded `MapLocation` interface with all Location fields
- `app/spots/spots-client.tsx` — Map click → LocationForm with lat/lng pre-filled, edit existing locations via popup Edit button, location state management with API refresh
- `app/spots/page.tsx` — Fetches all Location fields (not just map subset), serializes visitedAt/createdAt/updatedAt
- `TASKS.md` — Marked gear CRUD + location pin drop done, added nearby trails API task, updated Up Next

### Decisions Made
- **visitedAt field** — like Google Photos info panel, lets you record when you visited, not just when you saved
- **Slide-up panel** over modal — better mobile UX, doesn't obscure map completely
- **Nearby trails API** planned for Phase 3 — will use OSM Overpass, NPS, Recreation.gov, USDA Forest Service (no AllTrails/Wikiloc APIs available)

### Status at End of Session
- Location save/edit fully working on /spots page
- Gear CRUD built in parallel session
- Next: vehicle profile page, auto-tag photos, basic trip creation

## 2026-03-30 — Session 6: Knowledge Base Architecture + Corpus Organization

### Planned
- Full RAG architecture for NC camping knowledge base
- Hybrid retrieval: Vectra (vector/semantic) + SQLite FTS5 (keyword)
- Embeddings: OpenAI text-embedding-3-small at 512 dimensions, 800-token chunks with 100-token overlap
- PDF ingestion pipeline: pdf-parse → chunk → embed → store
- Chat interface: Claude Sonnet with streaming, source citations, conversation history
- 5 new Prisma models: KnowledgeSource, KnowledgeChunk, ChatConversation, ChatMessage + FTS5 virtual table
- New dependencies: @anthropic-ai/sdk, openai, vectra, pdf-parse, tiktoken
- Full plan saved to `/Users/willis/.claude/plans/harmonic-watching-crown.md`

### Created
- `data/research/` — knowledge base corpus (7 markdown files, cleaned + frontmatted)
  - `bear-safety-lnt.md` — Bear safety + Leave No Trace in NC
  - `campgrounds-by-region.md` — Best campgrounds statewide
  - `campgrounds-asheville-3hr-radius.md` — Best spots within 3hrs of Asheville
  - `dispersed-camping-regulations.md` — Dispersed camping rules across all NC public lands
  - `forest-road-access.md` — Forest road conditions and vehicle access
  - `seasonal-planning-guide.md` — Month-by-month NC camping guide
  - `water-and-connectivity.md` — Water sources + cell/Starlink coverage
  - `RESEARCH-PROMPT.md` — Gemini Deep Research prompt templates (not for ingestion)
- `data/pdfs/` — PDF corpus for ingestion
  - `black-mountain-trails-campground.pdf` — Black Mountain trails + campground map
  - `asheville-western-nc-hikes.pdf` — Asheville & Western NC Hikes guide
  - `backpackers-handbook-townsend.pdf` — Backpacker's Handbook 3rd ed. (general reference)
  - `wunc-nc-state-parks-guide.pdf` — WUNC NC State Parks guide

### Decisions Made
- **Vectra over sqlite-vec** — sqlite-vec is alpha and incompatible with Prisma; Vectra is zero-dep JSON-file store, clean swap to pgvector when deploying to Vercel
- **OpenAI for embeddings, Claude for chat** — two API keys needed; OpenAI embeddings are $0.02/M tokens, entire corpus under $1
- **Hybrid retrieval** — 0.7 semantic + 0.3 keyword weighting; FTS5 catches exact campground names and regulation numbers that semantic search misses
- **Gemini Deep Research for initial corpus** — structured markdown output, ingests same as PDFs; all citation artifacts stripped on import
- **800-token chunks, 100-token overlap** — balances coherent context vs. embedding dilution for camping reference content
- **`data/vectors/` gitignored** — Vectra JSON index files are local-only

### Status at End of Session
- Knowledge base corpus complete and ready to ingest
- Architecture documented in ARCHITECTURE.md
- Next build session: schema migration + deps + FTS5 table + Vectra setup (small task), then chunking/embedding utilities
