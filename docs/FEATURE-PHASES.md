# Feature Phases — Camp Commander

Every feature mapped to a build phase. This is the organized version of IDEAS.md.

---

## Phase 1 — Foundation ← CURRENT
*Goal: App skeleton, basic data management, mobile-friendly shell*

| Feature | Status | Notes |
|---------|--------|-------|
| Next.js + TypeScript + Tailwind scaffold | ✅ Done | |
| Prisma + SQLite database | ✅ Done | |
| Database schema (6 models) | ✅ Done | GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem |
| Mobile-responsive layout shell | ✅ Done | Sticky nav, stone/amber theme |
| Home page with module cards | ✅ Done | |
| Seed data (genesis spot + Santa Fe) | ✅ Done | |
| Gear inventory CRUD | ❌ Next | Add, view, edit, delete gear items |
| Vehicle profile page | ❌ Next | Display + edit Santa Fe specs and mods |

---

## Phase 2 — Locations & Photos
*Goal: Save spots, upload photos, see everything on a map*

| Feature | Status | Notes |
|---------|--------|-------|
| Location save/edit with map pin | ❌ | Needs Google Maps API key |
| Photo upload with EXIF extraction | ❌ | Auto-extract GPS, date from photos |
| Auto-tag photos to trips/locations | ❌ | Match via EXIF GPS + date |
| Map view of all saved locations | ❌ | Pins with filters by type, rating, season |
| Basic trip creation | ❌ | Dates, location, vehicle, notes |
| Personal signal map | ❌ | Log cell + Starlink quality per spot over time |
| Seasonal ratings | ❌ | Rate spots differently by time of year |
| GPX import | ❌ | Import trails from AllTrails/Wikiloc exports |
| Google Maps list import | ❌ | Paste a shared list URL, pull all pins + notes into the app |

---

## Phase 3 — Intelligence
*Goal: Claude-powered features — the app gets smart*

| Feature | Status | Notes |
|---------|--------|-------|
| Gear photo identification | ❌ | Snap a photo, Claude identifies brand/type/specs |
| User guide finder | ❌ | Auto-search web for product manuals, save PDF locally |
| AI trip planning agent | ❌ | Campsite discovery, research, recommendations |
| Smart packing lists | ❌ | Based on trip type, duration, weather, gear inventory |
| Camp kit presets | ❌ | Weekend Warrior, Remote Office, Extended Stay |
| Meal planning | ❌ | Recipes, shopping list, home prep vs camp cooking |
| Weather integration | ❌ | Forecasts for trip dates/location, gear suggestions |
| Power budget calculator | ❌ | EcoFlow + solar + devices, weather-adjusted |
| Fuel & last stop planner | ❌ | Route-aware, last gas/grocery/ice |
| Permit & registration handling | ❌ | Agent fills out forms, saves confirmations |
| Safety float plan | ❌ | Trip summary sent to emergency contacts |
| Voice Ghostwriter | ❌ | Voice-first journaling — agent interviews, writes entry |
| Chat interface | ❌ | Messenger-style interaction with the agent |
| Post-trip auto-review | ❌ | What you forgot, what you didn't use — feeds back |
| Wear planning | ❌ | Weather-based clothing recommendations |
| Altitude awareness | ❌ | Cooking, sleep, hydration adjustments |
| Wildlife & safety protocols | ❌ | Location-aware (bear country, flash floods, etc.) |
| Fire ban alerts | ❌ | By region, affects campfire and cooking planning |
| Gear maintenance reminders | ❌ | Clean stove, reseal tent, charge EcoFlow |
| Vehicle pre-trip checklist | ❌ | Tire pressure, oil, coolant — terrain-aware |

---

## Phase 4 — Polish & Deploy
*Goal: Offline support, PWA, deployment, sharing features*

| Feature | Status | Notes |
|---------|--------|-------|
| Offline-first / PWA | ❌ | Service worker, cached data, offline maps |
| Gear manuals available offline | ❌ | PDFs cached locally for no-signal use |
| "Download for Offline" pre-trip step | ❌ | Grab maps, plans, recipes before departure |
| Deploy to Vercel | ❌ | Switch SQLite → Postgres (one-line change) |
| Trip timeline view | ❌ | Chronological view of all camping trips |
| Shareable trip reports | ❌ | Journal + photos + route = sendable summary |
| Road trip layer | ❌ | Scenic stops, food, rest areas along route |
| Buddy trip mode | ❌ | Shared packing list, split gear between cars |
| Cost tracking | ❌ | Gas, permits, groceries, gear per trip |
| Gear ROI tracker | ❌ | Cost per trip, justifies purchases |
| Gear lending tracker | ❌ | Who borrowed what |
| Leave No Trace checklist | ❌ | Location-specific pack-out reminders |
| Dog planning | ❌ | Pet-friendly sites, extra packing, trail rules |
| Dark sky / sun / moon info | ❌ | Bortle class, sunrise/sunset, moon phase |
| Water source tracking | ❌ | Nearest water, filtration needs, how much to bring |
| First aid / emergency info | ❌ | Nearest hospital, emergency contacts by location |
| Campsite setup guide | ❌ | Personal setup checklist with reference photos |

---

## Not Phased Yet
*Ideas we're tracking but haven't placed*

- Trip Prep Mode as home screen (may become the default Phase 3 UX)
- Telegram bot integration (depends on chat interface decisions)
- "I'm back safe" auto-message to contacts
- Overdue check-in alerts for emergency contacts

---

## Phase Principles
- **Phase 1** = get the basics working, data in the database
- **Phase 2** = make it visual and spatial (maps, photos)
- **Phase 3** = make it smart (Claude does the thinking)
- **Phase 4** = make it bulletproof and shareable (offline, deploy, social)
- Features can move between phases as priorities shift
- Each phase should produce a usable app — no phase is "just setup"
