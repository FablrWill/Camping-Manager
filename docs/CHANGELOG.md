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
