# Outland OS — Task Tracker

> **Last updated:** 2026-04-02 (Session 26 — Phase 10 plans revised with cross-AI review feedback)
> **Start here** if you're picking up after a break.
> **North star:** `docs/USER-JOURNEY.md` — read this before building anything new.

---

## 🏁 Milestone v1.0 Complete

All 5 phases of v1.0 shipped. The app has: executive trip prep, NC camping knowledge base, streaming chat agent with 11 tools, AI spot recommendations with weather, and voice trip debriefs.

## Milestone v1.1 — Close the Loop

**Status:** Phase 10 planned and reviewed. Ready to execute.

| Phase | Status | Summary |
|-------|--------|---------|
| 6. Stabilization | ✅ Complete | AI output persistence, CRUD gaps fixed, design system migration, packing list fixes |
| 7. Day-Of Execution | ✅ Complete | Departure checklist + float plan email, settings page, Nodemailer Gmail integration |
| 8. PWA and Offline | ✅ Complete | Installable PWA, service worker, offline banner, "Leaving Now" trip caching, passive map tile caching |
| 9. Learning Loop | ○ Not started | Post-trip gear usage tracking, Claude debrief, voice writeback |
| 10. Offline Read Path | 📋 Planned | 4 plans, 3 waves — dual-mode components, tile prefetch, offline write queue, Phase 8 docs |

**Next:** `/gsd:execute-phase 10` — execute offline read path

---

## Phase 1 — Foundation

| Task | Status | Notes |
|------|--------|-------|
| Project structure + scaffolding | ✅ Done | Next.js 16, TypeScript, Tailwind, Prisma, SQLite |
| Database schema (9 models) | ✅ Done | GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem, Photo, TimelinePoint, PlaceVisit, ActivitySegment |
| Mobile layout shell + nav | ✅ Done | **Redesigned Session 6:** Bottom tab bar (Lucide icons), glassmorphic top header, dark mode toggle |
| Home page dashboard | ✅ Done | **Redesigned Session 6:** Live stats (gear count, weight, spots, photos), recent gear, quick actions, wishlist callout |
| Seed data | ✅ Done | **Expanded Session 11:** 3 mods, 9 gear + 2 wishlist, 4 locations (Linville, Beech Gap, Rough Ridge, Davidson River), 4 trips |
| **Gear inventory CRUD** | ✅ Done | List, add, edit, delete, wishlist toggle, category filters, search. **Dark mode added Session 6.** |
| **Vehicle profile page** | ✅ Done | **Built Session 6:** Hero card with gradient, specs list, expandable cargo dimensions, mods CRUD with cost tracking |
| **Style guide + design system** | ✅ Done | **Session 6:** docs/STYLE-GUIDE.md, CSS custom properties, component library (Button, Card, Badge, Input, Modal, Chip, EmptyState, PageHeader, StatCard) |

---

## Phase 2 — Locations & Photos

| Task | Status | Notes |
|------|--------|-------|
| Interactive map (/spots) | ✅ Done | Leaflet/OpenStreetMap, full-screen, mobile-friendly |
| Photo upload + EXIF GPS extraction | ✅ Done | Drag-drop, auto-compress to ~100KB, GPS auto-extracted |
| Photo + location markers with popups | ✅ Done | Thumbnails, dates, altitude in popups |
| Marker clustering | ✅ Done | leaflet.markercluster for large sets |
| Layer toggles + dark mode | ✅ Done | Photos / Spots / Path / Places / dark mode |
| Google Takeout import tools | ✅ Done | Python: extract_photos, extract_timeline, enrich_screenshots |
| Timeline models + import APIs | ✅ Done | TimelinePoint, PlaceVisit, ActivitySegment + bulk import |
| GPS path visualization | ✅ Done | Color-coded polylines by activity type |
| Place visit markers | ✅ Done | Pulsing red circles with name, duration, time range |
| Day picker + date filtering | ✅ Done | Summary card: distance, photos, places, active time |
| Path animation | ✅ Done | Replay trail with speed control (1x–16x) |
| Color-coded photo markers | ✅ Done | Blue=EXIF, green=vision exact, orange=approximate |
| Vision AI screenshot enrichment | ✅ Done | Claude Sonnet reads map screenshots for location |
| **Location save/edit with pin drop** | ✅ Done | Click map → slide-up form → CRUD API. Edit via popup button. visitedAt date/time field. |
| **Trip planning page** | ✅ Done | **Built Session 6:** Create trips with date range, location, vehicle. Upcoming/past sections, countdown, active trip ribbon. |
| **Auto-tag photos to trips/locations** | ❌ Ready | Match via GPS proximity + timestamp overlap |
| Personal signal map | ❌ Planned | Log cell + Starlink quality per spot over time |
| Seasonal ratings | ❌ Planned | Rate spots differently by time of year |
| GPX import | ❌ Planned | Import trails from AllTrails/Wikiloc exports |
| Google Maps list import | ❌ Planned | Paste a shared list URL, pull pins into the app |

---

## Phase 3 — Intelligence & Agent Features

### Smart Campsite
| Task | Status | Notes |
|------|--------|-------|
| Smart device fields on GearItem model | ❌ Ready | `isSmartDevice`, `deviceRole`, `connectionType`, `haIntegration`, `appRequired` — all nullable, Prisma migration |
| Smart device UI in gear inventory | ❌ Ready | Filter + badge for smart devices; connection/HA fields in add/edit form |
| Campsite setup checklist in trip planning | ❌ Ready | Trip prep step pulling smart devices from gear inventory |
| Claude device suggestions | ❌ Planned | Suggest automations + kit gaps based on device inventory. Pull HA docs via Context7 at build time. |
| HA bridge — status dashboard | ❌ Planned | Local HA REST/WebSocket. Blocked until HA hardware is set up (~mid-April 2026). |
| HA automation templates | ❌ Planned | Camping-specific YAML automations generated for HA |

### Other Phase 3
| Task | Status | Notes |
|------|--------|-------|
| AI trip recommendations | ✅ Done | Session 19 — `recommend_spots` agent tool. Saved locations + RAG + weather forecasts. Rich cards in chat with Save button. |
| Voice Ghostwriter / trip debrief | ✅ Done | Session 19 — Whisper transcription → Claude insight extraction → review sheet → apply to gear/locations/trips. Mic button on trip cards. |
| Chat interface | ✅ Done | Session 18 — Streaming SSE agent with BetaToolRunner, 11 tools (gear/trips/locations/weather/knowledge/write ops), conversation persistence, context-aware FAB, bottom nav Chat tab |
| NC camping knowledge base (RAG) | ✅ Done | Session 17 — 237 chunks from 7 research files + external sources. Hybrid search (FTS5 + vec0/RRF). voyage-3-lite 512-dim embeddings. PDF + web parsers. POST /api/knowledge/search endpoint. |
| Gear photo identification | ❌ Planned | Snap a photo → Claude identifies brand/type/specs |
| Safety float plan | ✅ Done | Phase 7 — Claude-composed plain text email via Gmail to emergency contact |
| Nearby trails & recreation API | ❌ Planned | OSM, NPS, Recreation.gov near a saved location |
| Fuel & last stop planner | ❌ Planned | Route-aware: last gas, grocery, ice before backcountry |
| *...and more in FEATURE-PHASES.md* | | |

---

## Phase 4 — Polish & Deploy

| Task | Status | Notes |
|------|--------|-------|
| Offline-first / PWA | ✅ Done | Phase 8 — installable PWA, service worker, offline banner, "Leaving Now" trip caching, passive OSM tile caching |
| Deploy to Vercel | ❌ Planned | Switch SQLite → Postgres |
| *...and more in FEATURE-PHASES.md* | | |

---

## Known Bugs / Gaps (from GPT code review, 2026-03-31)

| Issue | Severity | Notes |
|-------|----------|-------|
| Dashboard trips stat hardcoded to 0 | Low | `DashboardClient.tsx:163` — needs `tripCount` from server props |
| Packing item checkbox uses `update` not `upsert` | Medium | `api/packing-list/items/route.ts:16` — will 404 if PackingItem rows don't exist yet. Should upsert on `(tripId, gearId)` |
| No per-trip update/delete route | Medium | `app/api/trips/[id]/route.ts` doesn't exist — can't edit or delete a trip |
| Missing `placeholder.jpg` in public/ | Low | `api/import/photos/route.ts:87` references `/photos/placeholder.jpg` — broken images for imported photos without files |
| Prep power section uses heuristic, not computed budget | Low | Prep API power status doesn't call `calculatePowerBudget` — can misrepresent readiness |

---

## Open Questions / Blockers

- **Claude API key** ✅ — Configured in `.env` (2026-03-30). Packing list, meal planning, and enrich_screenshots.py are unblocked.
- **Weather API key** — NOT NEEDED. Switched to Open-Meteo (free, no key required). See `docs/AUDIT.md`.
- **Voyage AI API key** ✅ — Configured in `.env` (2026-03-31). Used for knowledge base embeddings (voyage-3-lite).
- **OpenAI API key** — Needed for voice debrief (Whisper transcription). Add `OPENAI_API_KEY` to `.env` when ready to test.
- **Speech API** ✅ — Decided on OpenAI Whisper (Session 19). Better accuracy than Web Speech API, handles background noise.

---

## How This File Works

- **This is the single source of truth** for what's done and what's next
- Claude updates this at the end of every session
- Status values: `✅ Done` | `❌ Ready` (can build now) | `❌ Planned` (future)
- "Up Next" section always has the top 2-3 recommended tasks
- Full feature roadmap lives in `docs/FEATURE-PHASES.md`
- Session history lives in `docs/CHANGELOG.md`
