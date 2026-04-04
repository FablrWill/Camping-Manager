# v2.0 Session Queue — Outland OS

A self-coordinating work queue for v2.0 features. Each Claude Code session claims one item, works it end-to-end, marks it done, and pushes. The next session picks up the next available item.

---

## Claiming Protocol

**Start of every session — do these steps first:**

1. Pull latest main: `git pull origin main`
2. Read this file
3. Find the **first row** where Status = `⬜ Ready` **and** every item in "Depends On" is `✅ Done`
4. Update that row's Status cell to: `🔄 In Progress YYYY-MM-DD` (today's date)
5. Commit the claim immediately:
   ```
   git add .planning/V2-SESSIONS.md
   git commit -m "claim: S0X [feature name]"
   git push origin main
   ```
6. This prevents a second session from picking up the same work

**End of every session — do these steps last:**

1. Update this file's Status to: `✅ Done YYYY-MM-DD`
2. Commit and push:
   ```
   git add .planning/V2-SESSIONS.md
   git commit -m "complete: S0X [feature name]"
   git push origin main
   ```

**Where to run:** All sessions run on the **MacBook** (development environment). Mac mini is for production ops only.

---

## Queue

| ID  | Feature                       | Phase | Status    | Model          | Depends On |
|-----|-------------------------------|-------|-----------|----------------|------------|
| S01 | Photo auto-import             | 16    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S02 | Feedback-driven packing       | 17    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S03 | Fuel & last stop planner      | 18    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S04 | Dog-aware trip planning       | 19    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S05 | Live location sharing         | 20    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S06 | Permit & reservation          | 21    | ✅ Done 2026-04-03 | Sonnet, normal | S03, S05   |
| S07 | Plan A/B/C fallback chain     | 22    | ✅ Done 2026-04-03 | Sonnet, normal | S04, S06   |
| S08 | Gear category expansion       | 23    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S09 | Smart inbox / intake          | 24    | ✅ Done 2026-04-03 | Sonnet, normal | S08        |
| S10 | Home Assistant integration    | 33    | ⏸ Blocked (hardware ~mid-Apr) | Sonnet, normal | S09        |
| S11 | Meal planning core            | 34    | ✅ Done 2026-04-03 | Sonnet, normal | S07        |
| S12 | Meal planning: shopping, prep & feedback | 35 | ✅ Done 2026-04-04 | Sonnet, normal | S11 |
| S13 | Mac mini agent jobs infrastructure    | 36    | ✅ Done 2026-04-04 | Sonnet, normal | —          |
| S14 | Gear product research                | 30    | ✅ Done 2026-04-04 | Opus, normal | —          |
| S15 | Post-trip auto-review                | 38    | ✅ Done 2026-04-04 | Sonnet, normal | S11, S12   |

**Why this order matters (conflict groups):**

- S01–S05 have no file conflicts with each other and can be done in any order
- S06 touches `TripPrepClient.tsx` (same as S03) and `SpotMap.tsx` (same as S05) — must wait for both
- S07 touches `lib/claude.ts` + Trip model (same as S04) and `TripPrepClient.tsx` (same as S06) — must wait for both
- S08 touches `lib/claude.ts` (same as S02, S04, S07) and `GearClient.tsx` — should ideally run before S02
- S09 depends on S08 (needs 15 categories); touches `BottomNav.tsx` and `schema.prisma` — mostly new files, low conflict
- S10 depends on S09 (schema settled, nav stable); touches `SettingsClient.tsx`, `DashboardClient.tsx`, `schema.prisma` — new files dominate, low conflict with prior sessions
- S11 touches `schema.prisma`, `lib/claude.ts` (same as S07), `TripsClient.tsx` (same as S07), `TripPrepClient.tsx` (same as S07) — S10 dependency removed (meal planning doesn't need HA; was a merge-conflict precaution only, no longer relevant with sequential execution)
- S12 touches same files as S11 plus `DashboardClient.tsx` — must wait for S11
- S13 is mostly new files (`agent_jobs` migration, new API routes, new UI component) — no conflicts with prior sessions

---

## Session Specs

### S01 — Photo Auto-Import (Phase 16)

**What to build:** Add a button in the Photos section to import photos from the device camera roll or a local folder. Currently photos must be manually uploaded one at a time. This session adds a "bulk import" flow that accepts multiple files at once, auto-extracts GPS from EXIF, compresses, and saves.

**User story:** Will takes 50 photos on a trip. Instead of uploading one by one, he taps "Import Photos", selects all, and they all appear on the map with GPS pins.

**Key files:**
- `app/api/photos/bulk-import/route.ts` — new endpoint (POST, multipart, array of files)
- `components/PhotoUpload.tsx` — add "Import Multiple" button alongside existing upload
- Reuse existing `lib/exif.ts` for GPS extraction and `sharp` for compression

**Acceptance criteria:**
- User can select multiple files at once (HTML `multiple` attribute)
- Each file is processed through the same EXIF + compress pipeline as single upload
- Progress shown during import (e.g., "Importing 12 of 50...")
- Failures on individual files don't abort the whole batch — collect errors, report at end
- Imported photos appear on the Spots map with GPS pins if EXIF present
- No new dependencies needed — reuse existing sharp + exif-parser

**Constraints:**
- Out of scope: iCloud API, Google Photos API — file picker only (browser `<input type=file multiple>`)
- Out of scope: deduplication — if same file uploaded twice, just creates duplicate (acceptable for personal tool)

---

### S02 — Feedback-Driven Packing (Phase 17)

**What to build:** After 1+ trips with post-trip debriefs, the system has gear feedback data (used / didn't need / forgot). Use this history when generating packing lists — Claude should know "Will never uses the camp chair" or "Will always forgets a headlamp" and reflect that in the packing list.

**User story:** Will has completed 3 trips and debriefed each. When generating a packing list for trip 4, the AI says "Skipping camp chair (marked 'didn't need' on last 2 trips)" and "Adding extra headlamp reminder (forgotten twice)".

**Key files:**
- `app/api/packing-list/route.ts` — inject gear feedback history into the Claude prompt
- `lib/claude.ts` — update `generatePackingList()` to accept and use feedback context
- `prisma/schema.prisma` — no schema changes needed; `TripFeedback` model already exists with `gearFeedback` JSON field

**Data flow:**
1. Query `TripFeedback` records (last 3-5 trips)
2. Parse `gearFeedback` JSON — each record has `gearItemId`, `status` (used/didn't_need/forgot)
3. Aggregate per gear item — if item marked "didn't need" 2+ times, flag as "low priority"
4. Pass aggregated feedback as context to Claude prompt: "Gear history: [item] was [used/skipped/forgotten] on past [N] trips"
5. Claude uses this to adjust recommendations and add notes

**Acceptance criteria:**
- If no trip history, packing list generates same as before (graceful degradation)
- If history exists, Claude prompt includes gear feedback summary (visible in logs)
- Packing list output includes at least one feedback-informed note when history is available
- No new dependencies needed

**Constraints:**
- Works with the existing `TripFeedback` append-only model — no schema changes
- Out of scope: UI to show why items were included/excluded (future)
- Requires at least 1 completed trip with a debrief in the DB to observe the behavior

---

### S03 — Fuel & Last Stop Planner (Phase 18)

**What to build:** Add a "Fuel & Last Stop" card to the Trip Prep section. Before a trip, Will needs to know: the last gas station, grocery store, and hardware/outdoor store before the campsite. This section pre-populates using OpenStreetMap Overpass API (free, no key) based on the trip's destination coordinates.

**User story:** Will is planning a trip to Pisgah National Forest. The app shows: "Last gas: Murphy Express (18 mi from camp), Last grocery: Ingles Markets (22 mi), Last hardware: ACE Hardware (24 mi). Stock up before Mile 34 — no services past."

**Key files:**
- `app/api/trips/[id]/last-stops/route.ts` — new endpoint, queries Overpass API for POIs near destination
- `components/TripPrepClient.tsx` — add "Fuel & Last Stops" section card (after weather, before packing)
- `lib/overpass.ts` — new utility for Overpass API queries (amenity=fuel, shop=supermarket, shop=hardware)

**Overpass query pattern:**
```
[out:json];
(
  node["amenity"="fuel"](around:50000,{lat},{lon});
  node["shop"="supermarket"](around:50000,{lat},{lon});
  node["shop"="hardware"](around:50000,{lat},{lon});
);
out body;
```
Sort results by distance from campsite coordinates. Show closest 1-2 of each type.

**Acceptance criteria:**
- Card shows 3 categories: Fuel, Grocery, Hardware/Outdoor
- Each shows name + approximate distance from destination (in miles)
- Loading state while fetching
- If no results within 50km, shows "None found nearby — plan ahead"
- Uses trip's destination coordinates (already on the Trip model as `latitude`/`longitude`)
- No new dependencies (fetch + JSON parsing only)

**Constraints:**
- Out of scope: driving directions or routing
- Out of scope: live hours or "open now" — Overpass data is community-maintained and unreliable for hours
- Overpass rate limits: 1 req/sec — cache results in the DB on first load (`Trip.lastStopsData` JSON field, or just re-fetch each time since data rarely changes)

---

### S04 — Dog-Aware Trip Planning (Phase 19)

**What to build:** Add dog awareness to the packing list and trip planning AI. Will is getting a dog. When a trip is marked as "bringing dog", Claude should add dog-specific gear (food, water bowl, leash, poop bags, dog first aid) to the packing list and note dog-friendly trail/camping considerations.

**Note:** Only start this session AFTER the dog has arrived and Will confirms what dog-specific gear he has. The spec here is complete — just note that the "dog gear" seed data should reflect the actual gear Will owns.

**User story:** Will creates a trip and checks "Bringing dog". The packing list includes a "Dog" section: food + bowl, collapsible water bowl, leash, 2x poop bags, dog first aid kit. The AI notes "Check if campsite allows dogs on leash."

**Key files:**
- `prisma/schema.prisma` — add `bringingDog Boolean @default(false)` to `Trip` model
- `prisma/migrations/` — new migration for the field
- `app/api/trips/route.ts` — accept `bringingDog` in POST/PATCH
- `components/TripsClient.tsx` — add "Bringing dog?" toggle to trip create/edit form
- `lib/claude.ts` — update `generatePackingList()` to include dog context when `bringingDog: true`
- `components/TripCard.tsx` — show dog indicator (🐕) when bringingDog is true

**Packing list prompt addition (when bringingDog = true):**
```
Will is bringing his dog on this trip. Add a "Dog" section to the packing list with essential dog gear: food + collapsible bowl, water bowl, leash + backup leash, poop bags (2x expected amount), dog-specific first aid supplies (tweezers for ticks, wound spray). Note any dog-friendly considerations for the destination.
```

**Acceptance criteria:**
- Trip form has "Bringing dog?" toggle (boolean, defaults false)
- When true, packing list includes a dedicated Dog section
- Dog indicator visible on trip card
- Trip edit also supports toggling bringingDog
- No dog gear added when bringingDog is false (no regression)

**Constraints:**
- Out of scope: specific dog breed/size adjustments
- Out of scope: fetching dog-friendly campsite data from an API
- The dog gear categories should inform the packing list prompt, not require specific GearItems to exist in the DB

---

### S05 — Live Location Sharing (Phase 20)

**What to build:** Generate a shareable public URL that shows Will's most recent GPS location on a map. Will sends the URL to family before a trip. They open it in a browser (no app, no login) and see a Leaflet map with his last known location and when it was updated.

**User story:** Will is heading to a remote campsite. He opens the app, taps "Share Location", gets a URL like `https://lisa-mini.tailfd6d06.ts.net/share/abc123`. He texts it to his wife. She opens it, sees a map with his pin at the trailhead parking lot and "Last updated: 3 hours ago."

**Implementation approach:**
- Will updates his location manually (tap "Update location") rather than GPS polling — simpler and privacy-respecting
- Location is stored in DB as a `SharedLocation` record with a random slug
- Public route `/share/[slug]` renders a minimal HTML page (no auth required, works without Tailscale)
- Location updates via the app's authenticated side

**Key files:**
- `prisma/schema.prisma` — new `SharedLocation` model (id, slug, lat, lon, label, updatedAt)
- `app/api/share/location/route.ts` — POST to update location, GET to fetch current
- `app/share/[slug]/page.tsx` — public static-ish page with Leaflet map (no auth)
- `components/SpotMap.tsx` or new `components/ShareLocationButton.tsx` — "Share my location" button that opens a modal to update + copy link
- `app/api/share/location/[slug]/route.ts` — public endpoint to read a share record

**Acceptance criteria:**
- Will can tap "Share Location" and get a shareable URL
- The URL works in a browser without Tailscale (if ever hosted on a public URL — acceptable that it's Tailscale-only for now)
- Shared page shows Leaflet map, a pin at last location, label, and "Last updated: X ago"
- Will can update his location (new lat/lon replaces old — only stores most recent)
- Will can "stop sharing" (delete the SharedLocation record)

**Constraints:**
- Out of scope: real-time GPS tracking / background location
- Out of scope: multiple share links per user
- The public page should be minimal — no nav, no auth, just a map

---

### S06 — Permit & Reservation Awareness (Phase 21)

**Depends on:** S03 (TripPrepClient.tsx), S05 (SpotMap.tsx)

**What to build:** Add a "Permits & Reservations" card to the Trip Prep section where Will can paste a Recreation.gov confirmation URL or enter a permit confirmation number. The app stores it with the trip and surfaces reminders. No API integration — Will manually enters his booking info.

**User story:** Will books a campsite on Recreation.gov. He pastes the confirmation URL into the app. The trip card shows "📋 Site booked — Linville Falls Loop A" and the trip prep section shows check-in date, site number, and a link to the confirmation.

**Key files:**
- `prisma/schema.prisma` — add `permitUrl String?`, `permitNotes String?` to `Trip` model
- `prisma/migrations/` — migration for new fields
- `app/api/trips/[id]/route.ts` — accept permit fields in PATCH
- `components/TripPrepClient.tsx` — add "Permits & Reservations" card (after Fuel & Last Stop from S03)
- `components/TripCard.tsx` — show permit indicator (📋) when permitUrl is set
- `components/TripsClient.tsx` — add permit fields to trip edit form

**Card behavior:**
- Shows paste target for Recreation.gov URL
- Shows text area for permit notes (site number, check-in time, special instructions)
- If URL set, shows a "View Booking" link that opens in new tab
- Reminder note: "Check cancelation policy before departure"

**Acceptance criteria:**
- Can add permitUrl + permitNotes to any trip
- Trip card shows 📋 indicator when permit data is set
- Trip prep card renders permit info cleanly
- No Recreation.gov API — manual paste only
- No new dependencies

---

### S07 — Plan A/B/C Fallback Chain (Phase 22)

**Depends on:** S04 (Trip model + claude.ts), S06 (TripPrepClient.tsx)

**What to build:** Add Plan B and Plan C to any trip. Will often has a primary destination and 1-2 fallbacks if the weather is bad or the site is full. This session lets Will define alternative trips that are linked to the main trip, and adds a "Plan B/C" card to trip prep.

**User story:** Will's Plan A is Linville Gorge (requires permit, exposed to weather). Plan B is Black Balsam (no permit, more sheltered). Plan C is Tsali (lower elevation, drier). He enters all three. Trip prep shows the alternatives with a quick weather compare. On the day, he picks the right one based on the forecast.

**Key files:**
- `prisma/schema.prisma` — add self-relation: `fallbackFor String?`, `fallbackOrder Int?` fields on `Trip`. A Plan B trip has `fallbackFor = [Plan A trip id]` and `fallbackOrder = 2`
- `prisma/migrations/` — migration for self-relation fields
- `app/api/trips/route.ts` — support creating a trip as a fallback for another trip
- `app/api/trips/[id]/alternatives/route.ts` — GET to fetch alternatives for a trip
- `components/TripsClient.tsx` — "Add Plan B" button on trip cards, links to create trip flow with `fallbackFor` pre-set
- `components/TripPrepClient.tsx` — "Fallback Plans" card showing Plan B / Plan C with weather and key differences
- `components/TripCard.tsx` — show "Plan B available" badge when alternatives exist

**Acceptance criteria:**
- Can create a trip as a Plan B or Plan C for any existing trip
- Trip prep shows all alternatives with destination + weather comparison
- Trip card shows how many alternatives exist
- Alternatives are first-class trips (have their own gear, checklists, etc.) just with a `fallbackFor` link
- Deleting the primary trip does not cascade-delete alternatives (set `fallbackFor = null`)

**Constraints:**
- Out of scope: AI to suggest which plan to pick (just present the options)
- Out of scope: more than 2 fallback levels (Plan D etc.)
- Max 2 fallbacks per primary trip is a soft limit — not enforced in DB, just in UI

---

### S08 — Gear Category Expansion (Phase 23)

**What to build:** Expand gear from 7 to 15 categories with visual grouping. Add 3 new schema fields for tech gear. Re-categorize existing items. Centralize category definitions in a shared module.

**User story:** Will has HA sensors, solar panels, a dog crate, camp furniture, and safety gear — none of which fit cleanly into the current 7 categories. He opens the gear page and sees 15 categories organized into 4 visual groups. Adding an ESP32 board, he picks "electronics" and fills in model number and connectivity type.

**15 categories (4 visual groups):**
- **Living:** shelter (⛺), sleep (🛏️), cook (🍳), hydration (💧), clothing (🧥)
- **Utility:** lighting (💡), tools (🔧), safety (🛟), furniture (🪑)
- **Tech/Power:** power (🔋), electronics (📡), vehicle (🚙)
- **Action:** navigation (🧭), hiking (🥾), dog (🐕)

**Key files:**
- `lib/gear-categories.ts` — NEW: single source of truth for all categories, groups, emojis, helpers
- `components/GearClient.tsx` — replace local CATEGORIES with import, add grouped filter chips
- `components/GearForm.tsx` — add modelNumber, connectivity, manualUrl fields
- `components/DashboardClient.tsx` — replace local CATEGORY_EMOJI with import
- `lib/claude.ts` — replace local CATEGORY_EMOJIS, update packing prompt
- `lib/power.ts` — update exclusion list + CATEGORY_FALLBACK
- `lib/agent/tools/gear.ts` + `listGear.ts` — update category description strings
- `prisma/schema.prisma` — add modelNumber, connectivity, manualUrl to GearItem
- `prisma/seed.ts` — re-categorize 9 items (fairy lights→lighting, chair→furniture, etc.)
- `app/api/gear/route.ts` + `[id]/route.ts` — handle 3 new fields

**Re-categorizations for existing seed data:**
- fairy lights, wall sconces, flood lights → `lighting`
- camp table, Helinox Chair → `furniture`
- fire extinguisher, first aid kit → `safety`
- Garmin inReach → `navigation`
- water jug pump → `hydration`

**Acceptance criteria:**
- 15 categories render as grouped filter chips in gear page
- Existing items display in correct new categories after seed
- GearForm has tech detail fields (modelNumber, connectivity, manualUrl)
- Packing list generation references all 15 categories
- Power budget correctly excludes non-powered categories
- All category references use the shared `lib/gear-categories.ts` module (no local duplicates)
- `npm run build` passes

**Constraints:**
- Category field is already a free `String` in Prisma — no enum migration needed for categories
- The 3 new fields (modelNumber, connectivity, manualUrl) DO require a migration
- Out of scope: changing gear card visual design beyond adding category group headers

---

### S09 — Smart Inbox / Universal Intake (Phase 24)

**Depends on:** S08 (needs 15 categories for proper triage routing)

**What to build:** Single intake endpoint + inbox UI. Share anything from phone (screenshot, URL, text) → AI triages → user reviews in inbox → accept creates real entity.

**User story:** Will finds a cool headlamp on Amazon. He shares the link from his phone to Outland OS. The app scrapes the page, identifies it as gear, and creates an inbox card: "Black Diamond Spot 400 — Headlamp, $35, 🔋 power category". Will taps Accept, the GearForm opens pre-filled, he saves it to his gear inventory.

**Content types:**
1. Screenshot of gear → Claude Vision extracts product info → gear draft
2. Amazon/product URL → scrape page → wishlist item draft
3. Camping article URL → existing RAG pipeline → knowledge base
4. Photo of campsite → EXIF + Claude Vision → location draft
5. Plain text tip/note → classify → knowledge or tip

**Key files (all new unless noted):**
- `prisma/schema.prisma` — add InboxItem model (id, sourceType, rawContent, status, triageType, suggestion, summary, confidence, imagePath, createdAt, processedAt)
- `lib/intake/triage.ts` — core routing: detect input type → call extractor → return TriageResult
- `lib/intake/extractors/gear-from-url.ts` — Cheerio scrape product pages
- `lib/intake/extractors/gear-from-image.ts` — Claude Vision → gear fields
- `lib/intake/extractors/location-from-image.ts` — EXIF + Claude Vision
- `lib/intake/extractors/classify-text.ts` — Claude Haiku text classification
- `lib/parse-claude.ts` — add Zod schemas for triage/extraction (MODIFY existing)
- `app/api/intake/route.ts` — single POST endpoint (FormData: text, url, file)
- `app/api/inbox/route.ts` — GET list with filters
- `app/api/inbox/[id]/route.ts` — GET, PUT, DELETE
- `app/api/inbox/[id]/accept/route.ts` — POST: create entity from suggestion
- `app/api/inbox/[id]/reject/route.ts` — POST: mark rejected
- `app/inbox/page.tsx` — server component
- `components/InboxClient.tsx` — card-based inbox UI with accept/edit/reject
- `components/BottomNav.tsx` — add 6th nav item "Inbox" (MODIFY existing)
- `components/TopHeader.tsx` — add page title (MODIFY existing)
- `app/manifest.ts` — add share_target for PWA (MODIFY existing)

**Architecture:**
- Inline processing (no background jobs) — 2-5s acceptable for single user
- InboxItem stores raw input + extracted suggestion separately (JSON field)
- Accept flow pre-fills existing GearForm/LocationForm rather than new review UI
- Knowledge/tip types pipe through existing RAG ingest pipeline
- Use existing `lib/parse-claude.ts` `parseClaudeJSON()` pattern with Zod schemas for structured AI responses

**Acceptance criteria:**
- POST /api/intake with text, URL, and image each return triaged InboxItem
- Inbox page shows pending items as triage cards with source type, summary, and confidence
- Accept on gear opens pre-filled GearForm, creates GearItem on save
- Accept on knowledge pipes through RAG, appears in agent search
- Reject removes item from inbox view
- BottomNav shows Inbox with pending count badge
- PWA share target sends shared content to intake endpoint
- `npm run build` passes

**Constraints:**
- Out of scope: async processing queue — all inline
- Out of scope: batch intake (one item at a time via share sheet)
- Out of scope: auto-accept — Will always reviews before accepting
- Cheerio already available via RAG pipeline dependencies

---

### S10 — Home Assistant Integration (Phase 33)

**Depends on:** S09 (schema stable, nav settled). Also requires: HA server running at camp with a long-lived access token ready.

**What to build:** Connect Outland OS to a Home Assistant instance running at the campsite. Will can configure the HA URL + token in Settings, pick which entities to surface, and see live sensor data on the dashboard and trip prep pages. The integration reads data from HA (it does not write back).

**User story:** Will arrives at camp, opens the app. The dashboard shows a "Campsite" section: battery bank at 87%, propane at 62%, outside temp 58°F, Santa Fe fuel level 3/4, dog GPS last seen at tent. He taps a card and sees the full entity history for the day.

**Sensor categories to surface (from prior research):**
- **Power:** Victron SmartShunt — battery SOC %, voltage, amps (BLE → HA)
- **Propane:** Mopeka Pro Check — tank level % (BLE → HA)
- **Weather:** Ecowitt WS90 — temp, humidity, wind, rain (WiFi → HA)
- **Vehicle:** WiCAN Pro OBD-II — fuel level, engine temp, 12V voltage (WiFi → HA)
- **Dog:** Tractive DOG 6 — GPS location, battery, activity (cloud → HA)
- **Environment:** ESP32/ESPHome sensors — soil moisture, presence, custom (WiFi → HA)

**Key files:**
- `prisma/schema.prisma` — add `HaConfig` model (id, url, token, enabled, createdAt) and `HaEntity` model (id, entityId, friendlyName, unit, group, displayOrder, enabled)
- `prisma/migrations/` — migration for new models
- `app/api/ha/config/route.ts` — GET/POST HA config (URL + token); never returns token in GET response
- `app/api/ha/test/route.ts` — POST: ping HA REST API to verify connectivity, return entity count
- `app/api/ha/entities/route.ts` — GET: fetch all HA states via `GET /api/states`; POST: save selected entity list
- `app/api/ha/states/route.ts` — GET: return current state values for saved entities (proxies to HA REST API)
- `lib/ha.ts` — HA REST API client: `getStates()`, `getState(entityId)`, `testConnection(url, token)`
- `components/SettingsClient.tsx` — add "Home Assistant" section: URL input, token input (write-only), Test Connection button, entity picker (MODIFY existing)
- `components/HaCampsiteCard.tsx` — new dashboard card showing live HA sensor groups with last-updated timestamps
- `components/DashboardClient.tsx` — add `HaCampsiteCard` when HA is configured and reachable (MODIFY existing)
- `components/TripPrepClient.tsx` — add HA sensor snapshot to trip prep (power, propane, weather at destination) (MODIFY existing)

**HA REST API pattern (no npm package needed — plain fetch):**
```
GET {haUrl}/api/states          → array of all entity states
GET {haUrl}/api/states/{entity} → single entity state
Headers: Authorization: Bearer {token}
```

**Entity picker UX:**
- Settings page fetches all HA states after successful test
- Groups them by domain (sensor, binary_sensor, device_tracker, etc.)
- Will checks which to show in the app (max ~10 for clean UI)
- Selections saved as `HaEntity` rows

**Acceptance criteria:**
- Settings has HA config section with URL, token (masked), and "Test Connection" button
- Test Connection calls HA and shows success ("Connected — 47 entities found") or error
- Entity picker lets Will select up to 10 entities to display
- Dashboard shows "Campsite" card with selected entity values when HA is reachable
- If HA unreachable (offline, no internet), card shows "Offline — last updated X ago" with stale values
- Token is never returned from GET /api/ha/config — write-only after save
- Trip prep shows HA power/propane/weather snapshot when configured
- No WebSocket in this session — polling only (refresh on page load)
- `npm run build` passes

**Constraints:**
- HA server is on Tailscale — URL will be a Tailscale hostname; app must work when both devices are on Tailscale
- Out of scope: WebSocket real-time updates (polling is enough for v1; add in a follow-up)
- Out of scope: writing state back to HA (controlling lights, switches, etc.) — read-only
- Out of scope: HA authentication flow / OAuth — long-lived access tokens only
- Out of scope: Nabu Casa / cloud relay — local/Tailscale URL only
- Token stored in DB (same as other secrets in this single-user app); note in code that production use should use env vars

**Pre-session checklist (human):**
- [ ] HA server running and reachable via Tailscale
- [ ] Long-lived access token generated in HA (Profile → Security → Long-Lived Access Tokens)
- [ ] At least one sensor visible in HA (even just a phone companion app sensor is fine for testing)

---

### S11 — Meal Planning Core (Phase 34)

**Depends on:** S07 (Trip model + claude.ts + TripPrepClient.tsx settled), S10 (schema.prisma settled)

**What to build:** A meal planning system linked to trips. Given a trip, Claude generates a full meal plan — every meal slot for every day — based on trip duration, headcount, destination/weather, dog status, and Will's preference history. The meal plan lives inside the trip but has its own dedicated view.

**User story:** Will creates a 3-day trip. He opens the Meal Plan tab and taps "Generate Meal Plan". Claude produces 9 meals (3 breakfasts, 3 lunches, 3 dinners) with recipes, ingredient lists, and brief cook notes tailored to car camping. He can regenerate individual meals he doesn't like, or regenerate the whole plan.

**New data models:**
- `MealPlan` — id, tripId (unique: one plan per trip), generatedAt, notes
- `Meal` — id, mealPlanId, day (1-based int), slot (breakfast/lunch/dinner/snack), name, description, ingredients (JSON array of `{item, quantity, unit}`), cookInstructions, prepNotes, estimatedMinutes

**Key files:**
- `prisma/schema.prisma` — add MealPlan + Meal models
- `prisma/migrations/` — migration for new models
- `app/api/trips/[id]/meal-plan/route.ts` — GET (fetch plan + meals), DELETE (clear plan)
- `app/api/trips/[id]/meal-plan/generate/route.ts` — POST: call Claude, persist MealPlan + Meals, return full plan
- `app/api/trips/[id]/meal-plan/meals/[mealId]/route.ts` — PATCH (regenerate single meal), DELETE
- `lib/claude.ts` — add `generateMealPlan()` and `regenerateMeal()` functions
- `components/MealPlanClient.tsx` — NEW: full meal plan view. Days as collapsible sections, meal cards with recipe details. "Generate" / "Regenerate" buttons.
- `components/TripPrepClient.tsx` — add Meal Plan tab/section that renders MealPlanClient (MODIFY)
- `components/TripsClient.tsx` — add meal plan status indicator on trip cards (MODIFY)

**Claude prompt context for generation:**
- Trip: name, start/end dates, destination name + coordinates
- Duration in days + number of campers (default 1 until headcount field added)
- Weather forecast if available (pulls from existing weather API)
- Dog: whether bringingDog is true
- Gear context: cooking gear available (from gear inventory — filter by category "cook")
- Will's preference history: summary of past MealFeedback records (added in S12; graceful no-op if none yet)
- Constraints to inject: "Car camping — full cooler available. Will has a vacuum sealer and sous vide at home for pre-trip prep. Prefer one-pot or simple multi-component meals. Minimize dishes."

**Acceptance criteria:**
- Meal plan generates for any trip with a start/end date
- Plan covers every day × every slot (breakfast, lunch, dinner) — snack optional
- Individual meals can be regenerated without replacing the whole plan
- Meal plan section visible in trip prep with day-by-day layout
- Trip card shows meal plan status ("Meal plan ready" / "No meal plan")
- If no trip weather data, Claude still generates (just without weather context)
- `npm run build` passes

**Constraints:**
- Out of scope: shopping list, prep guide, feedback UI (all in S12)
- Out of scope: headcount field on Trip model — assume 1 camper for now; add in a later session
- Out of scope: dietary restrictions / preferences field — Will's preferences come through feedback history only in this version
- One meal plan per trip (unique constraint) — regenerating replaces the existing plan

---

### S12 — Meal Planning: Shopping List, Prep Guide & Feedback (Phase 35)

**Depends on:** S11 (MealPlan + Meal models in place)

**What to build:** Three additions to the meal planning system built in S11: (1) a shopping list auto-generated from all meal ingredients, with checkboxes to tick off while shopping; (2) a prep guide showing what to do at home vs at camp; (3) a feedback UI to rate recipes and the overall plan, with that history feeding future generations.

**User story — shopping:** Will's meal plan is set. He taps "Shopping List" and sees all ingredients aggregated and grouped by category (produce, proteins, dry goods, dairy, other). He's at the store, checking items off as he goes. Items he already has (marked in gear) are pre-checked or de-emphasized.

**User story — prep:** Will taps "Prep Guide". He sees a two-section view: "Before you leave" (vacuum-seal the chicken, make the trail mix, freeze the water jug) and "At camp" (per-meal cook steps). Each step is actionable and in order.

**User story — feedback:** Trip is over. Will opens the meal plan and taps the ★ icon on each meal: thumbs up on the chili, thumbs down on the scrambled eggs with a note "too much cleanup for camp". Next time he generates a plan, Claude knows to avoid egg dishes that require cleanup and to include chili-style one-pots.

**New data models:**
- `ShoppingListItem` — id, mealPlanId, item, quantity, unit, category (produce/protein/dairy/dry/other), checked (bool), notes
- `MealFeedback` — id, mealId (nullable), mealPlanId, rating (liked/disliked/neutral), notes, createdAt. When mealId is null, it's a whole-plan rating.

**Key files:**
- `prisma/schema.prisma` — add ShoppingListItem + MealFeedback models
- `prisma/migrations/` — migration for new models
- `app/api/trips/[id]/meal-plan/shopping-list/route.ts` — GET (fetch list), POST (generate/regenerate from meal ingredients), PATCH bulk (update checked states)
- `app/api/trips/[id]/meal-plan/shopping-list/[itemId]/route.ts` — PATCH (toggle checked), DELETE
- `app/api/trips/[id]/meal-plan/feedback/route.ts` — POST (save feedback for meal or whole plan), GET (fetch all feedback for plan)
- `lib/claude.ts` — update `generateMealPlan()` to accept + inject feedback history summary; add `generateShoppingList()` that aggregates + categorizes ingredients; add `generatePrepGuide()` that produces before/at-camp steps
- `components/ShoppingListClient.tsx` — NEW: grouped ingredient list with checkboxes, category headers, check-all-in-category shortcut
- `components/PrepGuideClient.tsx` — NEW: two-column or tabbed view (Before You Leave / At Camp) with ordered steps
- `components/MealFeedbackButton.tsx` — NEW: small inline rating component (👍/👎 + optional note textarea). Used on each meal card and once for whole plan.
- `components/MealPlanClient.tsx` — add tabs: Plan / Shopping / Prep. Add feedback buttons to each meal card. (MODIFY from S11)
- `components/DashboardClient.tsx` — add meal plan dashboard card: shows active/upcoming trip meal plan status. "Camping in 5 days — shopping list not done" style nudge. (MODIFY)

**Shopping list generation approach:**
- Aggregate all `Meal.ingredients` JSON arrays across the plan
- Merge duplicates (e.g., two meals need olive oil → combine quantities)
- Categorize using Claude (one call to classify items into produce/protein/dairy/dry/other)
- Persist as `ShoppingListItem` rows so checked state survives page reloads

**Feedback injection into future generations:**
- On plan generation, query last 10 `MealFeedback` records (any trip)
- Summarize: "Previously liked: [names]. Previously disliked: [names] — reason: [notes]. Avoid: [patterns from dislike notes]."
- Inject summary into `generateMealPlan()` prompt as a "Will's meal history" block

**Prep guide approach:**
- Claude call with all meals + ingredients → returns structured JSON: `{ beforeLeave: [{step, meals}], atCamp: [{day, mealSlot, steps}] }`
- Leverages Will's vacuum sealer / sous vide context (already in S11 prompt constraints)
- Persisted in a `prepGuide JSON` field on MealPlan (add via migration)

**Acceptance criteria:**
- Shopping list generates from any complete meal plan
- Items grouped by category with section headers
- Checkboxes persist across page reloads
- Prep guide shows before/at-camp steps clearly
- Feedback buttons on each meal card + whole-plan rating at bottom of plan view
- Feedback stored and summarized in future generation prompts
- Dashboard card shows meal plan completeness for upcoming trips
- `npm run build` passes

**Constraints:**
- Out of scope: syncing shopping list to a third-party app (Instacart, AnyList, etc.)
- Out of scope: "I already have this" pre-checking from gear inventory — too complex for now; just let Will manually check
- Out of scope: sharing the shopping list — copy-to-clipboard is enough for now
- Feedback influences future generations via prompt injection only — no ML, no embedding search

---

### S13 — Mac Mini Agent Jobs Infrastructure (Phase 36)

**What to build:** The plumbing that lets the Mac mini run background tasks and feed results back into the app. This is pure infrastructure — no job logic yet, just the job queue, API, and UI hooks. One job type (gear data enrichment) proves it end-to-end.

**User story:** Will adds a new gear item. The app queues an enrichment job. The Mac mini picks it up, fetches product specs via Claude, and writes them back. Next time Will loads the gear page, the specs are there — no waiting, no manual lookup.

**Key files:**
- `prisma/schema.prisma` — add `AgentJob` model
- `prisma/migrations/` — migration for the new table
- `app/api/agent/jobs/route.ts` — GET (poll pending jobs) + POST (create job)
- `app/api/agent/results/route.ts` — POST endpoint Mac mini writes completed results to
- `components/AgentJobsBadge.tsx` — small badge component showing pending/new result count
- `components/DashboardClient.tsx` — surface new results inline (deal alert, enriched data)
- `components/GearClient.tsx` — trigger enrichment job when gear is added

**Schema:**
```prisma
model AgentJob {
  id          String   @id @default(cuid())
  type        String   // "gear_enrichment" | "weather_analysis" | "deal_check" | etc.
  status      String   @default("pending") // pending | running | done | failed
  triggeredBy String   @default("manual") // manual | schedule
  payload     String   // JSON input
  result      String?  // JSON output (null until done)
  createdAt   DateTime @default(now())
  completedAt DateTime?
}
```

**API contract:**
- `GET /api/agent/jobs?status=pending` — Mac mini polls this to find work
- `POST /api/agent/jobs` — app creates a job `{ type, payload, triggeredBy }`
- `POST /api/agent/results` — Mac mini writes back `{ jobId, result }`, sets status=done

**First job type — gear_enrichment:**
- Triggered when a gear item is saved without a brand/notes
- Payload: `{ gearItemId, name, category }`
- Mac mini Claude fetches product specs, returns `{ brand, notes, weight }`
- App writes the enriched fields back to the GearItem

**Acceptance criteria:**
- `AgentJob` table exists and migrations pass
- App can create a pending job via POST
- Mac mini can poll GET and get pending jobs
- Mac mini can write results via POST, status flips to done
- Dashboard shows a badge when there are new (done, unread) results
- Gear enrichment job triggers on gear save and result appears in gear detail
- `npm run build` passes

**Constraints:**
- Out of scope: the actual Mac mini runner script (that's a separate session or manual setup)
- Out of scope: job scheduling/cron (S13 is manual/triggered only — scheduling comes later)
- Out of scope: deal tracking, weather jobs — those are future job types that slot into this infrastructure
- No auth on the results endpoint for now — it's LAN-only behind Tailscale, same as the app

---

### S14 — Gear Product Research (Phase 30)

**What to build:** An AI-powered "Research" button on gear items that calls Claude to find best-in-class alternatives, compare specs, and store results. Results are dated so Will can see when research is stale (>90 days). Dashboard surfaces top upgrade opportunities from wishlist.

**User story:** Will opens his headlamp in gear detail and taps "Research". Claude searches for the top 3 headlamps in that category, compares lumens/weight/price, and shows "Your Petzl Actik Core vs. alternatives". The result is saved and shown next time without re-running.

**Key files:**
- `prisma/schema.prisma` — add `researchResult` (JSON), `researchedAt` (DateTime) fields to GearItem
- `app/api/gear/[id]/research/route.ts` — new POST endpoint that calls Claude to research alternatives
- `lib/claude.ts` — new `researchGearItem()` function with structured output
- `components/GearResearchCard.tsx` — new component showing research results (alternatives table, pros/cons)
- `components/GearClient.tsx` — add "Research" button in gear detail, show GearResearchCard when results exist
- `components/DashboardClient.tsx` — optional: surface "N items have upgrade suggestions" callout

**Schema changes:**
```prisma
// Add to existing GearItem model:
researchResult   String?   // JSON: { alternatives: [{ name, brand, price, weight, pros, cons }], summary }
researchedAt     DateTime? // when research was last run — stale after 90 days
```

**API contract:**
- `POST /api/gear/[id]/research` — triggers Claude research, stores result on GearItem, returns updated item
  - Claude prompt: given item name, brand, category, price, weight — find 3 best alternatives, compare, recommend
  - Returns structured JSON with alternatives array and summary text

**Research result shape:**
```typescript
interface GearResearch {
  alternatives: {
    name: string
    brand: string
    price: string      // "$XX" or "unknown"
    weight: string     // "X.X oz" or "unknown"
    pros: string[]
    cons: string[]
    url?: string       // product page if found
  }[]
  summary: string      // "Your X is solid for the price. The Y is lighter but $30 more..."
  recommendation: 'keep' | 'consider_upgrade' | 'upgrade'
}
```

**Acceptance criteria:**
- GearItem has researchResult and researchedAt fields, migration passes
- "Research" button appears on gear detail for owned (non-wishlist) items
- Clicking it calls Claude, shows loading state, stores result
- Result displays as a card with alternatives table and summary
- Stale indicator shows when research is >90 days old with "Re-research" option
- Wishlist items show "Research" too (helps with purchase decisions)
- `npm run build` passes

**Constraints:**
- Out of scope: deal price tracking (that's Phase 32)
- Out of scope: auto-research via agent jobs (could add later as a job type, but this is on-demand only)
- Out of scope: actual purchase links or affiliate tracking
- Claude may not find real prices — result should handle "unknown" gracefully

---

Copy-paste one of these to begin each session. All use **claude-sonnet-4-6**, normal effort (no special flags needed).

---

**S01 — Photo auto-import**
```
Pull origin main, then claim S01 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 16 to plan the photo bulk-import feature — the full spec is in V2-SESSIONS.md under S01. After planning is approved, run /gsd:execute-phase 16. When done, mark S01 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S02 — Feedback-driven packing**
```
Pull origin main, then claim S02 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 17 to plan the feedback-driven packing feature — the full spec is in V2-SESSIONS.md under S02. After planning is approved, run /gsd:execute-phase 17. When done, mark S02 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S03 — Fuel & last stop planner**
```
Pull origin main, then claim S03 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 18 to plan the fuel & last stop feature — the full spec is in V2-SESSIONS.md under S03. After planning is approved, run /gsd:execute-phase 18. When done, mark S03 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S04 — Dog-aware trip planning**
```
Pull origin main, then claim S04 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 19 to plan the dog-aware trip planning feature — the full spec is in V2-SESSIONS.md under S04. After planning is approved, run /gsd:execute-phase 19. When done, mark S04 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S05 — Live location sharing**
```
Pull origin main, then claim S05 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 20 to plan the live location sharing feature — the full spec is in V2-SESSIONS.md under S05. After planning is approved, run /gsd:execute-phase 20. When done, mark S05 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S06 — Permit & reservation** *(start only after S03 and S05 are both ✅ Done)*
```
Pull origin main, then claim S06 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 21 to plan the permit & reservation feature — the full spec is in V2-SESSIONS.md under S06. After planning is approved, run /gsd:execute-phase 21. When done, mark S06 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S07 — Plan A/B/C fallback chain** *(start only after S04 and S06 are both ✅ Done)*
```
Pull origin main, then claim S07 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 22 to plan the Plan A/B/C fallback feature — the full spec is in V2-SESSIONS.md under S07. After planning is approved, run /gsd:execute-phase 22. When done, mark S07 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S08 — Gear category expansion**
```
Pull origin main, then claim S08 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 23 to plan the gear category expansion — the full spec is in V2-SESSIONS.md under S08. After planning is approved, run /gsd:execute-phase 23. When done, mark S08 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S09 — Smart inbox / intake** *(start only after S08 is ✅ Done)*
```
Pull origin main, then claim S09 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 24 to plan the smart inbox / intake feature — the full spec is in V2-SESSIONS.md under S09. After planning is approved, run /gsd:execute-phase 24. When done, mark S09 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S10 — Home Assistant integration** *(start only after S09 is ✅ Done AND HA hardware is set up at camp)*
```
Pull origin main, then claim S10 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 25 to plan the Home Assistant integration — the full spec is in V2-SESSIONS.md under S10. After planning is approved, run /gsd:execute-phase 25. When done, mark S10 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S11 — Meal planning core** *(start only after S07 and S10 are both ✅ Done)*
```
Pull origin main, then claim S11 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 26 to plan the meal planning core feature — the full spec is in V2-SESSIONS.md under S11. After planning is approved, run /gsd:execute-phase 26. When done, mark S11 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S12 — Meal planning: shopping, prep & feedback** *(start only after S11 is ✅ Done)*
```
Pull origin main, then claim S12 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 27 to plan the meal shopping/prep/feedback feature — the full spec is in V2-SESSIONS.md under S12. After planning is approved, run /gsd:execute-phase 27. When done, mark S12 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

**S13 — Mac mini agent jobs infrastructure**
```
Pull origin main, then claim S13 in .planning/V2-SESSIONS.md (mark it 🔄 In Progress, commit + push the claim). Then run /gsd:plan-phase 36 to plan the Mac mini background agent infrastructure — the full spec is in V2-SESSIONS.md under S13. After planning is approved, run /gsd:execute-phase 36. When done, mark S13 ✅ Done in V2-SESSIONS.md, commit, and push.
```

---

## Adding More Sessions

When Will has new feature ideas, add them at the bottom of the queue table and write a spec below. Set deps based on the conflict groups above. All new features in v2.0 run on MacBook.
