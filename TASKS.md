# Outland OS — Task Tracker

> **Last updated:** 2026-03-30 (Session 11 — Claude API Packing List Generator)
> **Start here** if you're picking up after a break.
> **North star:** `docs/USER-JOURNEY.md` — read this before building anything new.

---

## Up Next

These are the highest-priority tasks based on the user journey defined in `docs/USER-JOURNEY.md`. Build in this order.

1. ~~**Weather integration**~~ ✅ Done (Session 9) — Open-Meteo, no API key. Auto-fetches for upcoming trips. Camping-relevant alerts (rain, cold, wind, UV).

2. ~~**Claude API integration + packing list generator**~~ ✅ Done (Session 11) — First AI feature. Anthropic SDK installed. Claude generates categorized packing list from trip details + gear inventory + weather. Editable checklist with progress bar. "Generate with Claude" CTA on upcoming trip cards.

3. **Meal planning with shopping list** — Claude generates a full meal plan for the trip duration. Shopping list organized by store section. Home prep vs. camp cooking split.

4. **Power budget calculator** — EcoFlow + solar + devices. Weather-adjusted solar estimates.

5. **Executive trip prep flow** — Single "prepare this trip" view: weather → packing → meals → checklist. The Wednesday-before-Saturday experience.

### Housekeeping (do alongside or after)
- **Seed the dev database** — so dashboard, vehicle, and trips pages show real data
- **Polish spots page dark mode** — control bar and stats footer still need dark mode classes

---

## Phase 1 — Foundation

| Task | Status | Notes |
|------|--------|-------|
| Project structure + scaffolding | ✅ Done | Next.js 16, TypeScript, Tailwind, Prisma, SQLite |
| Database schema (9 models) | ✅ Done | GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem, Photo, TimelinePoint, PlaceVisit, ActivitySegment |
| Mobile layout shell + nav | ✅ Done | **Redesigned Session 6:** Bottom tab bar (Lucide icons), glassmorphic top header, dark mode toggle |
| Home page dashboard | ✅ Done | **Redesigned Session 6:** Live stats (gear count, weight, spots, photos), recent gear, quick actions, wishlist callout |
| Seed data | ✅ Done | Genesis spot (Linville Gorge) + Santa Fe vehicle |
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
| AI trip recommendations | ❌ Planned | "Find me a spot within 2hrs of Asheville this weekend" |
| Voice Ghostwriter / trip debrief | ❌ Planned | Voice-first journaling on the drive home |
| Chat interface | ❌ Planned | Messenger-style interaction with the agent |
| NC camping knowledge base (RAG) | ❌ Planned | Architecture planned. Corpus ready in data/. Vectra + FTS5 hybrid retrieval. |
| Gear photo identification | ❌ Planned | Snap a photo → Claude identifies brand/type/specs |
| Safety float plan | ❌ Planned | Send trip summary to emergency contacts |
| Nearby trails & recreation API | ❌ Planned | OSM, NPS, Recreation.gov near a saved location |
| Fuel & last stop planner | ❌ Planned | Route-aware: last gas, grocery, ice before backcountry |
| *...and more in FEATURE-PHASES.md* | | |

---

## Phase 4 — Polish & Deploy

| Task | Status | Notes |
|------|--------|-------|
| Offline-first / PWA | ❌ Planned | Service worker, cached data, offline maps |
| Deploy to Vercel | ❌ Planned | Switch SQLite → Postgres |
| *...and more in FEATURE-PHASES.md* | | |

---

## Open Questions / Blockers

- **Claude API key** ✅ — Configured in `.env` (2026-03-30). Packing list, meal planning, and enrich_screenshots.py are unblocked.
- **Weather API key** — NOT NEEDED. Switched to Open-Meteo (free, no key required). See `docs/AUDIT.md`.
- **OpenAI API key** — Needed for KB embeddings (Phase 3, not urgent)
- **Speech API** — Web Speech API (free) vs Whisper (better) for Voice Ghostwriter (Phase 3)

---

## How This File Works

- **This is the single source of truth** for what's done and what's next
- Claude updates this at the end of every session
- Status values: `✅ Done` | `❌ Ready` (can build now) | `❌ Planned` (future)
- "Up Next" section always has the top 2-3 recommended tasks
- Full feature roadmap lives in `docs/FEATURE-PHASES.md`
- Session history lives in `docs/CHANGELOG.md`
