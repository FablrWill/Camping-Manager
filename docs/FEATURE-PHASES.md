# Feature Phases — Outland OS

Every feature mapped to a build phase.

> **Reprioritized 2026-03-30** based on user journey defined in `docs/USER-JOURNEY.md`.
> Key change: AI/trip prep features moved from Phase 3 → Phase 2. Build to "done enough" first.

---

## Phase 1 — Foundation ✅ Complete
*App skeleton, basic data management, mobile-friendly shell*

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js + TypeScript + Tailwind scaffold | ✅ Done | |
| Prisma + SQLite database | ✅ Done | |
| Database schema (9 models) | ✅ Done | GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem, Photo, TimelinePoint, PlaceVisit, ActivitySegment |
| Mobile-responsive layout shell | ✅ Done | Sticky nav, stone/amber theme |
| Home page with module cards | ✅ Done | |
| Seed data (genesis spot + Santa Fe) | ✅ Done | |
| Gear inventory CRUD | ✅ Done | List, add, edit, delete, wishlist toggle, category filters, search |

---

## Phase 2 — Locations, Photos & Trip Prep ← CURRENT
*Save spots, capture photos, and plan a trip from start to finish*

### Locations & Photos (mostly done)
| Feature | Status | Notes |
|---------|--------|-------|
| Interactive map with location/photo pins | ✅ Done | Leaflet/OpenStreetMap |
| Photo upload with EXIF GPS extraction | ✅ Done | Auto-compress to ~100KB |
| Marker clustering | ✅ Done | |
| Layer toggles + dark mode | ✅ Done | |
| Google Takeout import tools | ✅ Done | Python scripts |
| Timeline: GPS path, place visits, animation | ✅ Done | Day picker, speed control, color-coded paths |
| Location save/edit with pin drop | ✅ Done | Slide-up form, full CRUD |
| Auto-tag photos to trips/locations | ❌ Ready | Match via GPS proximity + timestamp |

### Trip Prep (the core — build next)
| Feature | Status | Notes |
|---------|--------|-------|
| **Trip creation UI** | ✅ Done | Date range, destination, vehicle, notes. Countdown, active ribbon. |
| **Weather integration** | ✅ Done | Open-Meteo (free, no key). Auto-fetches for upcoming trips. Camping alerts (rain, cold, wind, UV). |
| **Claude API: packing list generator** | ✅ Done | Trip details + gear inventory + weather → categorized packing list with progress tracking |
| **Claude API: meal planning + shopping list** | ✅ Done | Full meal plan per trip. Home/camp prep tags. Shopping list by store section. Copy-to-clipboard. |
| **Power budget calculator** | ✅ Done | Planning mode + live mode. Weather-adjusted solar, charge reminders, day-by-day trajectory. (Session 14) |
| **Executive trip prep flow** | ❌ Ready | Single view: weather → packing → meals → checklist |

### Lower Priority (Phase 2 bonus)
| Feature | Status | Notes |
|---------|--------|-------|
| Vehicle profile page | ✅ Done | Hero card, specs, mods CRUD with cost tracking. (Session 6) |
| Personal signal map | ❌ Planned | Log cell + Starlink quality per spot over time |
| Seasonal ratings | ❌ Planned | Rate spots differently by time of year |
| GPX import | ❌ Planned | Import trails from AllTrails/Wikiloc exports |
| Google Maps list import | ❌ Planned | Paste a shared list URL, pull pins into the app |

---

## Phase 3 — Intelligence & Agent Features
*Smarter trip planning, voice features, deeper AI integration*

### Smart Campsite
*Home Assistant as control plane. App adds camping context, setup guidance, and Claude suggestions on top.*

| Feature | Status | Notes |
|---------|--------|-------|
| Smart device fields on gear model | ❌ Ready | Add `isSmartDevice`, `deviceRole`, `connectionType`, `haIntegration`, `appRequired` fields to GearItem. All nullable. |
| Smart device UI in gear inventory | ❌ Ready | Filter/badge for smart devices. Connection type + HA integration status visible in list and detail views. |
| Campsite setup checklist (trip planning) | ❌ Ready | Trip prep step: which smart devices are in your kit, setup order, connection checklist. Pulls from gear inventory. |
| Claude device suggestions | ❌ Planned | Given your smart device inventory, suggest useful automations and gaps in your kit. Uses Context7 for HA docs at build time. |
| HA bridge — status dashboard | ❌ Planned | Connect to local HA instance via REST/WebSocket API. Show simplified campsite-at-a-glance view (sensors, lights, camera). |
| HA automation templates | ❌ Planned | Pre-built camping automations (lights at sunset, motion alerts, temp logging). Generated YAML for HA, not built in the app. |

> **Hardware note:** Will has dedicated HA hardware (official HA device, likely Yellow or Green + USB radio adapter). HA setup starting from scratch. Hardware in Durham — picking up ~mid-April 2026. Build device registry now; bridge later once HA is running.

### Other Phase 3 Features
| Feature | Status | Notes |
|---------|--------|-------|
| AI trip recommendations | ❌ Planned | "Find me a spot within 2 hrs of Asheville this weekend" |
| Voice Ghostwriter / trip debrief | ❌ Planned | Voice-first journaling on the drive home |
| Chat interface | ❌ Planned | Messenger-style interaction with the agent |
| Gear photo identification | ❌ Planned | Snap a photo → Claude identifies brand/type/specs |
| Link/screenshot → gear import | ❌ Planned | Paste Amazon URL → auto-populate gear form |
| Safety float plan | ❌ Planned | Send trip summary to emergency contacts |
| Nearby trails & recreation API | ❌ Planned | OSM, NPS, Recreation.gov near a saved location |
| NC camping knowledge base | ❌ Planned | PDF ingestion + RAG for local area knowledge |
| Wishlist deal finder | ❌ Planned | eBay, Google Shopping, FB Marketplace for wishlist items |
| User guide finder | ❌ Planned | Auto-search for product manuals, save PDF |
| Fuel & last stop planner | ❌ Planned | Route-aware: last gas, grocery, ice before backcountry |
| Permit & registration handling | ❌ Planned | Agent fills out recreation.gov, USFS permits |
| Vehicle pre-trip checklist | ❌ Planned | Tire pressure, oil, coolant — terrain-aware |
| Post-trip auto-review | ❌ Planned | What you forgot, what you didn't use — feeds back |
| Wear planning | ❌ Planned | Weather-based clothing recommendations |
| Agent orchestration layer | ❌ Planned | Route tasks to Haiku/Sonnet/Opus by complexity + cost |

---

## Phase 4 — Polish & Deploy
*Offline support, PWA, deployment*

| Feature | Status | Notes |
|---------|--------|-------|
| Offline-first / PWA | ❌ Planned | Service worker, cached data, offline maps |
| "Download for Offline" pre-trip step | ❌ Planned | Grab maps, plans, recipes before departure |
| Gear manuals available offline | ❌ Planned | PDFs cached locally for no-signal use |
| Deploy to Vercel | ❌ Planned | Switch SQLite → Postgres (one-line Prisma change) |
| Trip timeline view | ❌ Planned | Chronological view of all camping trips |
| Shareable trip reports | ❌ Planned | Journal + photos + route = sendable summary |
| Cost tracking | ❌ Planned | Gas, permits, groceries, gear per trip |
| Gear ROI tracker | ❌ Planned | Cost per trip, justifies purchases |
| Dark sky / sun / moon info | ❌ Planned | Bortle class, sunrise/sunset, moon phase |
| Water source tracking | ❌ Planned | Nearest water, filtration needs |
| Dog planning | ❌ Planned | Pet-friendly sites, packing, trail rules |
| Leave No Trace checklist | ❌ Planned | Location-specific pack-out reminders |
| Buddy trip mode | ❌ Planned | Shared packing list, split gear between cars |
| Gear lending tracker | ❌ Planned | Who borrowed what |

---

## Phase Principles
- **Phase 1** = get the basics working, data in the database
- **Phase 2** = visual/spatial (maps, photos) + trip prep (the core loop)
- **Phase 3** = deeper intelligence and agent features
- **Phase 4** = offline, deploy, sharing
- "Done enough" = Will can plan a trip start-to-finish in the app. See `docs/USER-JOURNEY.md`.
