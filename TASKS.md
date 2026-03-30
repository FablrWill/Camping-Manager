# Camp Commander — Task Tracker

> **Last updated:** 2026-03-30 (Session 5)
> **Start here** if you're picking up after a break.

---

## Up Next

These are the highest-priority tasks ready to build now. Pick one and go.

1. **Vehicle profile page** — Display and edit the Santa Fe specs and mods. Vehicle + VehicleMod models exist, seed data is in the DB. Needs: a read-only profile view, then an edit mode.

2. **Auto-tag photos to trips/locations** — Match photos to saved locations via GPS proximity + timestamp overlap.

3. **Basic trip creation** — Date range, location, vehicle, notes. Trip model exists.

---

## Phase 1 — Foundation

| Task | Status | Notes |
|------|--------|-------|
| Project structure + scaffolding | ✅ Done | Next.js 16, TypeScript, Tailwind, Prisma, SQLite |
| Database schema (9 models) | ✅ Done | GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem, Photo, TimelinePoint, PlaceVisit, ActivitySegment |
| Mobile layout shell + nav | ✅ Done | Sticky nav, stone/amber theme |
| Home page with module cards | ✅ Done | 4 cards: Gear, Vehicle, Spots, Trips |
| Seed data | ✅ Done | Genesis spot (Linville Gorge) + Santa Fe vehicle |
| **Gear inventory CRUD** | ✅ Done | List, add, edit, delete gear items. Built in parallel session. |
| **Vehicle profile page** | ❌ Ready | Display + edit Santa Fe specs and mods. Model + seed data exist. |

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
| **Auto-tag photos to trips/locations** | ❌ Ready | Match via GPS proximity + timestamp overlap |
| **Basic trip creation** | ❌ Ready | Date range, location, vehicle, notes. Trip model exists. |
| Personal signal map | ❌ Planned | Log cell + Starlink quality per spot over time |
| Seasonal ratings | ❌ Planned | Rate spots differently by time of year |
| GPX import | ❌ Planned | Import trails from AllTrails/Wikiloc exports |
| Google Maps list import | ❌ Planned | Paste a shared list URL, pull pins into the app |

---

## Phase 3 — Intelligence

| Task | Status | Notes |
|------|--------|-------|
| Gear photo identification | ❌ Planned | Snap a photo → Claude identifies brand/type/specs |
| User guide finder | ❌ Planned | Auto-search web for product manuals, save PDF |
| **Nearby trails & recreation API** | ❌ Planned | Query OSM Overpass, NPS, Recreation.gov, USDA Forest Service for trails, campsites, and points of interest near a location. Display as map layers. |
| AI trip planning agent | ❌ Planned | Campsite discovery, research, recommendations |
| Smart packing lists | ❌ Planned | Based on trip type, duration, weather, gear |
| Meal planning | ❌ Planned | Recipes, shopping list, home prep vs camp cooking |
| Weather integration | ❌ Planned | Forecasts for trip dates/location |
| Power budget calculator | ❌ Planned | EcoFlow + solar + devices, weather-adjusted |
| Voice Ghostwriter | ❌ Planned | Voice-first journaling — agent interviews, writes entry |
| Chat interface | ❌ Planned | Messenger-style interaction |
| Safety float plan | ❌ Planned | Trip summary sent to emergency contacts |
| *...and more in FEATURE-PHASES.md* | | |

---

## Phase 4 — Polish & Deploy

| Task | Status | Notes |
|------|--------|-------|
| Offline-first / PWA | ❌ Planned | Service worker, cached data, offline maps |
| Deploy to Vercel | ❌ Planned | Switch SQLite → Postgres |
| *...and more in FEATURE-PHASES.md* | | |

---

## Open Questions

- **Claude API key** — Will needs one for Phase 3 features and for enrich_screenshots.py
- **Speech API** — Web Speech API (free) vs Whisper (better) for Voice Ghostwriter

---

## How This File Works

- **This is the single source of truth** for what's done and what's next
- Claude updates this at the end of every session
- Status values: `✅ Done` | `❌ Ready` (can build now) | `❌ Planned` (future)
- "Up Next" section always has the top 2-3 recommended tasks
- Full feature roadmap lives in `docs/FEATURE-PHASES.md`
- Session history lives in `docs/CHANGELOG.md`
