# Changelog

All notable changes to Outland OS are tracked here. Newest first.

---

## 2026-03-30 — Session 9: Audit + Weather Integration + Smart Campsite

### Created
- `docs/AUDIT.md` — Top-to-bottom project audit: code quality, docs consistency, open source research (Open-Meteo, RIDB, NPS, GPX tools, Serwist PWA), Google integration analysis, PWA vs native hardware access, 5 creative feature ideas, implementation plan
- `lib/weather.ts` — Open-Meteo API client. WMO weather code mapping, unit conversion (metric→imperial), smart camping alerts: rain, cold, heat, wind, UV with severity levels
- `components/WeatherCard.tsx` — Compact forecast display: day grid with emoji/high/low/precip, expandable details (wind, UV, sunrise/sunset), alert strips, loading skeleton, error state
- `app/api/weather/route.ts` — GET endpoint with input validation, date format checks, 1-hour cache header

### Changed
- `components/TripsClient.tsx` — Auto-fetches weather for upcoming trips with GPS locations. WeatherCard displayed inline on trip cards. Replaced `alert()` with inline error state.
- `app/trips/page.tsx` — Now passes location GPS coordinates to client
- `app/api/trips/route.ts` — Added try-catch + validation, returns location lat/lon
- `app/api/vehicle/route.ts` — Added try-catch + validation
- `app/api/vehicle/[id]/route.ts` — Added try-catch to GET and PUT
- `app/api/vehicle/[id]/mods/route.ts` — Added try-catch + validation
- `app/api/timeline/route.ts` — Wrapped Promise.all in try-catch
- `.env.example` — Updated: Claude API key moved up, weather note (Open-Meteo, no key needed)
- `docs/FEATURE-PHASES.md` — Smart Campsite section added to Phase 3
- `TASKS.md` — Weather marked done, smart campsite subtasks added, blockers updated

### Key Decisions
- **Open-Meteo over OpenWeatherMap** — free, no API key, better camping data (wind, UV, solar radiation, soil temp). Eliminates a blocker.
- **Smart devices extend gear model** — `isSmartDevice` flag + connection metadata, all nullable. Not a separate feature.
- **HA as control plane** — app adds camping context on top. App never talks to devices directly.
- **PWA for now, native later if needed** — camera, GPS, mic, offline all work in PWA. Only Bluetooth (EcoFlow) and background GPS require native.

### Status at End of Session
- Weather integration complete and working
- All API routes now have error handling
- Claude API key configured, no blockers for Phase 2
- Next: Claude API packing list generator (task #2 in Up Next)

---

## 2026-03-30 — Session 8: Merge All Branches + App Rename

### No Code Written — Integration & Housekeeping

### What We Did
- Reviewed all parallel session output and identified gaps
- Merged 3 branches into main: KB architecture session, `pedantic-hellman` (frontend), `thirsty-hawking` (planning)
- Resolved TASKS.md conflict: user journey priorities win over KB and frontend session priorities
- Added trip prep component specs to STYLE-GUIDE.md (weather card, packing list, meal plan, power budget, AI response patterns, trip prep flow layout)
- Reviewed and confirmed TripsClient.tsx as a solid foundation — one noted gap (all trip cards need to be tappable, not just past trips)
- **Renamed app from "Camp Commander" to "Outland OS"** — updated all source files, docs, scripts, seed data, style guide, and plans

### Key Decision
- **Outland OS** — new app name, effective immediately

### Status at End of Session
- main is clean and up to date
- All branches merged
- Next: get Claude API key + weather API key, then build weather integration

---

## 2026-03-30 — Session 7: User Journey + Roadmap Rewrite

### No Code Written — Planning Session

### What We Did
- Will completed a voice interview with an LLM to define the primary user loop
- Defined before/during/after trip experience
- Identified must-have features vs. nice-to-haves
- Set a clear "definition of done enough"
- Rewrote TASKS.md and FEATURE-PHASES.md based on the output

### Key Decisions
- **Phase 3 AI features pulled forward** — packing list, meal planning, weather are now Phase 2 must-haves
- **Trip creation UI is the immediate next task** — it's the anchor for all trip prep features
- **Claude API key is now a blocker** — needed to start building the core value
- **Timeline/path animation deprioritized** — great work, not core to the user journey

### Status at End of Session
- Roadmap is clear. Next build session starts with trip creation UI.

---

## 2026-03-30 — Session 6b: Project Review + Planning Pause

### No Code Written — Planning Session (parallel session)

### What We Did
- Full project critique: reviewed all 5 sessions of work against the original goals
- Identified the core gap: the app has modules (gear, map, photos) but no coherent user journey
- Identified scope creep: Google Takeout timeline visualization is impressive but not the priority
- Wrote a voice interview prompt for Will to use with an LLM to define the user journey

### Key Findings
- **Missing:** A primary loop — what does Will *do* with this app before/during/after a trip?
- **Premature:** Timeline/path animation was built before the core trip flow
- **Untouched:** All Phase 3 AI features, which are the actual value proposition

### Status at End of Session
- No code changes — working tree clean
- Next: Will brings back user journey doc → rewrite roadmap → resume building

---

## 2026-03-30 — Session 6a: Frontend Design System & Page Build-Out

### Created (parallel session)
- **Style Guide** (`docs/STYLE-GUIDE.md`) — comprehensive design system: color tokens (light + dark), typography scale, spacing grid, component specs, navigation patterns, accessibility guidelines
- **CSS Design Tokens** (`globals.css`) — CSS custom properties for all colors/shadows/radii, `.dark` class overrides, animations (slide-up, fade-in), skeleton loading, safe area support
- **UI Component Library** (`components/ui/`): Button, Card, Badge, Input, Textarea, Select, Modal, ConfirmDialog, Chip, ChipRow, EmptyState, PageHeader, StatCard
- **ThemeProvider** — React context for dark mode with system preference detection
- **Bottom Navigation** + **Top Header** + **AppShell** — mobile navigation shell
- **Dashboard** — live stats grid, wishlist callout, recent gear, quick actions
- **Vehicle Page** — hero card, specs, expandable cargo, mods CRUD with cost tracking
- **Trips Page** — trip creation form, upcoming/past sections, countdown timer, active trip ribbon
- **Vehicle API** — GET/POST vehicles, GET/PUT single vehicle, POST mods

### Design Decisions
- **Bottom nav over top nav** — standard mobile pattern, thumb-friendly
- **Stone/amber palette** — earthy, warm, outdoor-appropriate
- **Dark mode from day one** — camping at night means red-shifted UI matters
- **System fonts** — no external font loads. Performance > aesthetics.

---

## 2026-03-30 — Session 5b: Knowledge Base Architecture + Corpus

### Planned (parallel session)
- Full RAG architecture for NC camping knowledge base
- Hybrid retrieval: Vectra (vector/semantic) + SQLite FTS5 (keyword)
- 5 new Prisma models planned, PDF ingestion pipeline designed

### Created
- `data/research/` — 7 markdown files covering NC camping topics
- `data/pdfs/` — 4 PDF guides for ingestion

### Key Decisions
- **Vectra over sqlite-vec** — sqlite-vec is alpha; Vectra swaps to pgvector on Vercel
- **OpenAI for embeddings, Claude for chat** — entire corpus under $1

---

## 2026-03-30 — Session 5a: Location Pin Drop + Gear CRUD

### Created
- `components/LocationForm.tsx` — mobile slide-up form for creating/editing locations
- `app/api/locations/route.ts` — GET all, POST create
- `app/api/locations/[id]/route.ts` — GET single, PUT update, DELETE
- Prisma migration: `add_visited_at_to_location`
- Gear inventory CRUD (built in parallel session) — list, add, edit, delete gear items

### Decisions Made
- **visitedAt field** — record when you visited, not just when you saved
- **Slide-up panel** over modal — better mobile UX, doesn't obscure map

---

## 2026-03-30 — Session 4: Interactive Timeline Map + Google Takeout Import

### Created
- `tools/photo-map/` — Python scripts: extract_photos.py, extract_timeline.py, enrich_screenshots.py
- Prisma models: `TimelinePoint`, `PlaceVisit`, `ActivitySegment`
- Import APIs: `/api/import/photos`, `/api/import/timeline`
- Timeline API: `/api/timeline` with date filtering

### Changed
- `SpotMap.tsx` — Complete rewrite: marker clustering, color-coded activity paths, place visit markers, dark mode tiles, layer toggles, path animation with speed control
- `spots-client.tsx` — Day picker, day summary card, animation controls

### Decisions Made
- **Activity color coding** — hiking=green, driving=red, cycling=blue, kayaking=teal, flying=purple
- **Photo marker colors** — blue=EXIF GPS, green=vision exact, orange=vision approximate

---

## 2026-03-30 — Session 3: Photo Map

### Created
- `Photo` model, `/spots` page with Leaflet/OpenStreetMap
- `SpotMap.tsx`, `PhotoUpload.tsx` — drag-drop upload with EXIF GPS extraction
- `lib/exif.ts` — EXIF GPS parser utility

### Decisions Made
- **Leaflet/OpenStreetMap** over Google Maps — free, no API key, no rate limits
- **Store compressed copy locally** (~100KB JPEG) — works offline

---

## 2026-03-29 — Session 2: Foundation Build

### Created
- Next.js 16 app with TypeScript, Tailwind, App Router
- Prisma schema with 6 models: GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem
- SQLite database with initial migration
- Mobile-responsive layout shell, home page, database seed script

### Data Seeded
- **Location:** South Rim of Linville Gorge (35.8783, -81.9094)
- **Vehicle:** 2022 Hyundai Santa Fe Hybrid

---

## 2026-03-29 — Session 1: Project Kickoff

### Created
- Project directory structure, `CLAUDE.md`, planning docs (PLAN.md, GOALS.md, STATUS.md)
- 2022 Hyundai Santa Fe Hybrid specs documented

### Decisions Made
- **Tech stack:** Next.js 16 + Tailwind + SQLite/Prisma + TypeScript
- **No auth:** Single-user personal tool
- **Local dev first**, Vercel later
