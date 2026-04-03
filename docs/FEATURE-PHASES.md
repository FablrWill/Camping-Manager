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
| Wishlist deal finder | ❌ Planned | eBay, Google Shopping, FB Marketplace for wishlist items → expanded in v2.0 Phase B |
| User guide finder | ❌ Planned | Auto-search for product manuals, save PDF → expanded in v2.0 Phase A |
| Fuel & last stop planner | ❌ Planned | Route-aware: last gas, grocery, ice before backcountry |
| Permit & registration handling | ❌ Planned | Agent fills out recreation.gov, USFS permits |
| Vehicle pre-trip checklist | ❌ Planned | Tire pressure, oil, coolant — terrain-aware |
| Post-trip auto-review | ❌ Planned | What you forgot, what you didn't use — feeds back |
| Wear planning | ❌ Planned | Weather-based clothing recommendations → part of v2.0 Phase A category expansion |
| Agent orchestration layer | ❌ Planned | Route tasks to Haiku/Sonnet/Opus by complexity + cost |

---

## Phase 4 — Polish & Deploy
*Offline support, PWA, deployment*

| Feature | Status | Notes |
|---------|--------|-------|
| Offline-first / PWA | ✅ Done | Phase 8 — installable PWA, service worker with app shell + tile caching |
| "Download for Offline" pre-trip step | ✅ Done | Phase 8 — "Leaving Now" caches weather, packing, meals, checklist, spots, vehicle to IndexedDB |
| Gear manuals available offline | ❌ Planned | PDFs cached locally for no-signal use → depends on v2.0 Phase A (GearDocument model) |
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

## v2.0 — Gear Intelligence (After v1.2 deployment)
*Smarter gear management: expanded categories, support docs, product research, deal monitoring*

> **Planned 2026-04-03** based on brainstorm session. Build after v1.2 (deploy + remote access) ships.
> Consolidates scattered Phase 3/4 features (user guide finder, wishlist deal finder, wear planning, offline manuals) into a cohesive gear intelligence system.

### Phase A — Category Expansion + Weather-Aware Clothing
*More granular gear categories, clothing subcategories, and weather-driven packing suggestions*

| Feature | Status | Notes |
|---------|--------|-------|
| Expand gear categories | ❌ Planned | Add: hygiene, safety, water, lighting, navigation, food-storage. Packing list generator can match owned gear in these categories instead of suggesting generic items. |
| Subcategory / product-type field | ❌ Planned | Add `productType` to GearItem (e.g. category=clothing, productType=rain_jacket). Enables smarter matching and research. |
| Weather-aware clothing in packing lists | ❌ Planned | Rain gear suggested when forecast shows rain. Cold layers suggested for low temps. UV protection for high UV index. Builds on existing weather integration. |
| Category migration | ❌ Planned | Re-categorize existing gear items that belong in new categories. Update seed data. |

### Phase B — Support Documentation
*Find, save, and access product manuals and support links for owned gear*

| Feature | Status | Notes |
|---------|--------|-------|
| GearDocument model | ❌ Planned | New model: type (manual_pdf, support_link, warranty, product_page), url, localPath, title, linked to GearItem |
| Manual finder (Claude + web search) | ❌ Planned | "Find Manual" button on gear items. Claude searches for manufacturer support page + PDF manual, saves links. |
| PDF download + local storage | ❌ Planned | Download PDFs to public/docs/, store localPath on GearDocument. View inline or download. |
| Docs tab on gear detail | ❌ Planned | UI to view/manage all documents for a gear item. Quick access to manuals in the field. |
| Offline manual caching | ❌ Planned | Cache downloaded PDFs in service worker for no-signal access. Extends Phase 8 PWA offline support. |

### Phase C — Best-in-Class Research
*AI-powered product research to help identify upgrade opportunities*

| Feature | Status | Notes |
|---------|--------|-------|
| Product research via Claude | ❌ Planned | "Research" button on gear items. Claude researches best-in-class for that product type, how current item compares, upgrade path, price ranges. |
| GearResearch model or JSON field | ❌ Planned | Store research results: product category, research date, top picks with reasons, upgrade recommendation. |
| Research staleness tracking | ❌ Planned | "Last researched" date. Flag items with stale research (>90 days). |
| Upgrade recommendations on dashboard | ❌ Planned | Surface top upgrade opportunities on home page or gear page. |

### Phase D — Deal Monitoring
*Track prices on wishlist/upgrade items, surface deals*

| Feature | Status | Notes |
|---------|--------|-------|
| Target price field on gear items | ❌ Planned | Add `targetPrice` and `upgradeToProduct` fields. Used for wishlist items and owned items with upgrade recommendations. |
| On-demand price check via Claude | ❌ Planned | "Check Price" button or chat command. Claude searches current prices, compares to target. |
| Deal check in conversational agent | ❌ Planned | Ask the chat agent "any deals on my wishlist?" — searches all wishlist items with target prices. |
| Periodic background price check | ❌ Planned | Optional scheduled job that checks prices and flags deals. Show "price dropped" indicators in gear list. |

---

## Phase Principles
- **Phase 1** = get the basics working, data in the database
- **Phase 2** = visual/spatial (maps, photos) + trip prep (the core loop)
- **Phase 3** = deeper intelligence and agent features
- **Phase 4** = offline, deploy, sharing
- **v2.0** = gear intelligence — expanded categories, docs, research, deals
- "Done enough" = Will can plan a trip start-to-finish in the app. See `docs/USER-JOURNEY.md`.
