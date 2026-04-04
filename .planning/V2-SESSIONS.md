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
| S16 | UX quick wins                        | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S17 | Nav restructure + More sheet         | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S18 | TripPrepStepper                      | —     | ✅ Done 2026-04-04        | Sonnet, normal | S16        |
| S19 | Empty states + skeleton loaders      | —     | ✅ Done 2026-04-04        | Sonnet, normal | S16        |

| S20 | Voice Ghostwriter                    | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S21 | Gear ROI tracker                     | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S22 | Seasonal spot ratings                | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S23 | Fire ban + pre-trip alerts           | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S24 | Siri/Reminders inbox                 | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S25 | LNT pack-out checklist               | —     | ✅ Done 2026-04-04        | Sonnet, normal | —          |
| S26 | Gear lending tracker                 | —     | ⬜ Ready          | Sonnet, normal | —          |
| S27 | Gear maintenance reminders           | —     | 🔄 In Progress 2026-04-04 | Sonnet, normal | —          |
| S28 | Shareable trip reports               | —     | ⬜ Ready          | Sonnet, normal | —          |
| S29 | Altitude awareness callouts          | —     | ⬜ Ready          | Sonnet, normal | —          |
| S30 | Road trip scenic layer               | —     | ⬜ Ready          | Sonnet, normal | —          |

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
- S16 touches `app/page.tsx`, `DashboardClient.tsx`, `TopHeader.tsx`, `app/spots/spots-client.tsx`, new `components/ui/FilterChip.tsx` — no conflict with S17
- S17 touches `BottomNav.tsx`, new `components/MoreSheet.tsx` only — no conflict with S16; **S16 and S17 can run in parallel**
- S18 touches `DashboardClient.tsx` (same as S16) and new `components/TripPrepStepper.tsx` — must wait for S16
- S19 touches `GearClient.tsx`, `TripsClient.tsx`, `app/spots/spots-client.tsx` (same as S16), new `components/ui/Skeleton.tsx` — must wait for S16; **S18 and S19 can run in parallel after S16**
- S20 touches new files only (`components/VoiceGhostwriterModal.tsx`, `app/api/voice/ghostwrite/route.ts`, `lib/voice/ghostwrite.ts`) — **no conflict with any other session**
- S21 touches `GearClient.tsx` (adds ROI tab to gear detail) and new `app/api/gear/[id]/roi/route.ts` — no conflict with S20; **S20 and S21 can run in parallel**
- S22 touches `prisma/schema.prisma` (new `SeasonalRating` model), new `app/api/locations/[id]/seasonal-ratings/route.ts`, `components/LocationForm.tsx` — **S22 must not run in parallel with any session that also touches schema.prisma**
- S23 touches `app/api/agent-jobs/route.ts` (add fire-ban job type) and `components/TripPrepClient.tsx` (surface alert card) — no conflict with S20/S21/S22; **S20, S21, S22, S23 are all independent and can run in any order or in parallel**
- S24 touches `lib/intake/triage.ts`, new `lib/intake/extractors/reminders.ts`, `components/InboxClient.tsx` — no conflict with S25 or S26; **S24, S25, S26 can all run in parallel**
- S25 touches `prisma/schema.prisma` (new `lntChecklistResult` field on Trip), new `app/api/trips/[id]/lnt/route.ts`, new `components/LNTChecklistCard.tsx`, `components/TripPrepClient.tsx` — **S25 must not run in parallel with any session that also touches schema.prisma**
- S26 touches `prisma/schema.prisma` (new `GearLoan` model), new `app/api/gear/[id]/loans/route.ts`, new `components/GearLoanPanel.tsx`, `components/GearClient.tsx` — **S25 and S26 both touch schema.prisma; run them sequentially or accept a merge on that one file**
- S27 touches only `components/GearClient.tsx` (new maintenance tab) and new `components/GearMaintenancePanel.tsx`, `app/api/gear/[id]/maintenance/route.ts` — **no schema change; S27 can run in parallel with S24, S29, S30**
- S28 touches `prisma/schema.prisma` (add `shareToken` to Trip), new `app/trips/[id]/share/[token]/page.tsx`, `app/api/trips/[id]/share/route.ts` — **run after S25 or S26 to avoid schema conflict; otherwise independent**
- S29 touches only `components/LocationForm.tsx` (altitude warning inline) and `components/TripPrepClient.tsx` (altitude callout card) — **no schema change; fully independent, can run in parallel with S24, S27, S30**
- S30 touches `lib/overpass.ts` (new scenic query), new `components/ScenicStopsCard.tsx`, `components/TripPrepClient.tsx` (add card) — **no schema change; S30 must not run in parallel with S29 (both touch TripPrepClient); run sequentially or accept a one-line merge**
- **Maximum parallelism right now: S24 + S27 + S29 can all run simultaneously. S30 runs after S29 merges (or in parallel accepting a small TripPrepClient conflict).**

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

---

### S16 — UX Quick Wins

**What to build:** Four targeted fixes from the UX execution plan — all small effort, no new dependencies.

**User story:** Will opens the app and the dashboard shows real trip data, the header is clean, dark mode works correctly on the spots page, and filter chips look consistent with the design system.

**Tasks (in order):**

1. **Add trip count to dashboard** — `prisma.trip.count()` in `app/page.tsx` Promise.all, pass as `tripCount` prop to `DashboardClient`. Add a trip stat card (amber, Tent icon) to the stats grid, matching the existing gear/spots/mods card pattern. Also add `upcomingTripCount` (trips with `startDate >= now`) if useful.

2. **Simplify header** — In `components/TopHeader.tsx`, remove the theme toggle button entirely. It already lives in `SettingsClient` — no new work needed there.

3. **Fix dark mode gaps on /spots** — In `app/spots/spots-client.tsx` (or wherever the layer toggle buttons and LocationForm wrapper live), add `dark:` Tailwind variants to match the rest of the app's dark mode tokens: `dark:bg-stone-800`, `dark:border-stone-700`, `dark:text-stone-100` etc. Cross-check with `STYLE-GUIDE.md` for token names.

4. **Add FilterChip to components/ui** — New file `components/ui/FilterChip.tsx`. Props: `label: string`, `active: boolean`, `onClick: () => void`. Active state: `bg-amber-500 text-white`. Inactive: `bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300`. Export from `components/ui/index.ts`. Migrate the gear category filter bar in `GearClient.tsx` to use `FilterChip` instead of ad-hoc classes.

**Key files:**
- `app/page.tsx` — add tripCount to Promise.all
- `components/DashboardClient.tsx` — add tripCount prop + stat card
- `components/TopHeader.tsx` — remove theme toggle
- `app/spots/spots-client.tsx` — dark mode fixes
- `components/ui/FilterChip.tsx` — new component
- `components/ui/index.ts` — export FilterChip
- `components/GearClient.tsx` — migrate filter bar to FilterChip

**Acceptance criteria:**
- Dashboard stat grid shows a live trip count (not 0)
- Header has one utility icon, no theme toggle
- `/spots` layer toggles and LocationForm container look correct in dark mode
- Gear category filter pills use FilterChip component with amber active state
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- Do not add a `SegmentedControl` component — FilterChip only (keep scope tight)
- Do not touch BottomNav — that's S17

---

### S17 — Nav Restructure + More Sheet

**What to build:** Reduce the bottom nav from 6 tabs to 5 tabs (`Home / Trips / Gear / Spots / More`). Move Chat, Inbox, Vehicle, and Settings into a slide-up "More" sheet. Inbox badge moves with it.

**User story:** Will has 5 clean tabs. Everything else is one tap away via "More." No more cramped 6-tab bar.

**Key files:**
- `components/BottomNav.tsx` — reduce to 5 items, add "More" tab that opens MoreSheet
- `components/MoreSheet.tsx` — new slide-up sheet component with Chat, Inbox (badged), Vehicle, Settings items

**Implementation notes:**

`BottomNav.tsx` currently has 6 items: Home, Gear, Spots, Trips, Chat, Inbox. New order: `Home / Trips / Gear / Spots / ··· More`. Remove Chat and Inbox from the tab array. The "More" tab uses `Ellipsis` or `MoreHorizontal` from Lucide. Tapping "More" opens `MoreSheet` (not a route — local state toggle).

`MoreSheet.tsx` — a `fixed inset-0` overlay with a slide-up panel from the bottom. Items: Chat (`/chat`), Inbox (`/inbox`, with pending badge from the same `/api/inbox?status=pending` fetch), Vehicle (`/vehicle`), Settings (`/settings`). Each item is a full-width `Link` row with icon + label. Tap any item to navigate (sheet closes on navigation via `usePathname` effect). Tap outside or a close button to dismiss. Use `dark:bg-stone-900 bg-white border-t border-stone-200 dark:border-stone-700` for the sheet.

Move the pending inbox badge fetch from `BottomNav.tsx` into `MoreSheet.tsx` (or a shared hook if preferred). Badge still shows as a red dot on the Inbox row.

**Acceptance criteria:**
- Bottom nav shows exactly 5 tabs
- Tapping "More" opens the sheet
- All 4 destinations in the More sheet navigate correctly
- Inbox badge visible on the Inbox row in the sheet
- Sheet closes when navigating away or tapping outside
- Dark mode correct on both nav and sheet
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages — use Lucide icons and Tailwind only
- Do not modify any page routes or layouts — nav only
- Do not touch DashboardClient, TripsClient, or any feature components

---

### S18 — TripPrepStepper

**What to build:** A `TripPrepStepper` component that shows the 5-step core journey (Destination → Weather → Packing → Meals → Departure) with completion state for an active trip. Surface it on the Home dashboard and on the trip prep page.

**User story:** Will opens the app. Under the upcoming trip card on the dashboard, he sees a 5-step stepper showing which prep steps are done. Tapping a step opens the relevant section. The app's core value is immediately legible.

**Key files:**
- `components/TripPrepStepper.tsx` — new component
- `components/DashboardClient.tsx` — render stepper below upcoming trip card
- `app/page.tsx` — pass prep completion data for the upcoming trip
- `app/trips/[id]/prep/page.tsx` (or `TripPrepClient.tsx`) — render stepper at top of prep page

**Step definitions:**
```
1. Destination  — complete when trip has a location assigned (trip.locationId != null)
2. Weather      — always available (weather loads from location); mark complete if trip has location
3. Packing      — complete when packingListResult is not null on the trip
4. Meals        — complete when trip.mealPlan exists
5. Departure    — complete when trip.departureChecklistResult is not null (or departureTime is set)
```

**Component design:**
- Horizontal row of 5 steps on mobile (icon + label below, or just icon + number)
- Active/complete step: amber fill circle with checkmark or step number
- Incomplete step: stone outline circle
- Connecting line between steps, amber fills left-to-right as steps complete
- Tapping a step navigates to `/trips/[id]/prep` (or scrolls to that section if already on prep page)
- If no active trip: render nothing (null)

**Data flow:**
- `app/page.tsx` already fetches the upcoming trip. Extend the select to include: `packingListResult`, `mealPlan { id }`, `departureChecklistResult`, `locationId`, `departureTime`
- Pass a `tripPrepStatus` object to `DashboardClient`: `{ tripId, destination: bool, weather: bool, packing: bool, meals: bool, departure: bool }`
- `TripPrepStepper` takes `tripId` + `steps: {label, complete}[]` as props — no data fetching, pure display

**Acceptance criteria:**
- Stepper renders below the upcoming trip card on the dashboard
- Correct steps are marked complete based on real trip data
- Tapping a step navigates to the trip prep page
- No stepper renders when there is no upcoming trip
- Stepper also renders at the top of the trip prep page
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- Stepper is display-only — no inline editing
- Do not change the prep page layout beyond adding the stepper at the top
- Depends on S16 (DashboardClient must have tripCount changes landed first to avoid merge conflict)

---

### S19 — Empty States + Skeleton Loaders

**What to build:** Add skeleton loading rows and proper empty states to the three main list screens: Gear, Trips, and Spots. Also add `aria-label` to icon-only buttons flagged in the UX audit.

**User story:** Will opens the app on slow camp WiFi. Instead of a blank white flash, he sees pulse-animated skeleton rows. If a list is genuinely empty, he sees a helpful empty state with an emoji and a CTA instead of nothing.

**Key files:**
- `components/ui/Skeleton.tsx` — new reusable skeleton component
- `components/ui/index.ts` — export Skeleton
- `components/GearClient.tsx` — empty state + skeleton
- `components/TripsClient.tsx` — empty state + skeleton
- `app/spots/spots-client.tsx` — empty state for location list

**Skeleton component:**
```tsx
// components/ui/Skeleton.tsx
// Props: className?: string
// Renders: div with animate-pulse bg-stone-200 dark:bg-stone-700 rounded
```

**Empty state pattern** (already defined in style guide):
```
text-center py-16 + emoji (large) + heading + subtext + optional CTA button
```

- **Gear empty**: 🎒 "No gear yet" / "Add your first item to get started" / [+ Add Gear] button
- **Trips empty**: 🏕️ "No trips yet" / "Plan your first adventure" / [+ New Trip] button
- **Spots empty**: 📍 "No spots saved" / "Drop a pin on the map to save a location" — no CTA (map is the CTA)

**Skeleton rows:**
- Gear list: 4 skeleton rows, each mimicking the gear item card height (~64px) with a short wide bar + narrow bar
- Trips list: 3 skeleton rows mimicking trip card height (~72px)
- Loading trigger: these screens are client components that fetch on mount via `useEffect`. Add an `isLoading` state initialized to `true`, show skeletons while `isLoading`, flip to `false` when fetch resolves.

**a11y aria-labels:**
Audit flagged icon-only buttons missing `aria-label`. Add `aria-label` to:
- All trash/delete icon buttons in `GearClient.tsx`, `TripsClient.tsx`, `LocationForm.tsx`
- All edit/pencil icon buttons in same files
- Search clear button in `GearClient.tsx` if present
- Pattern: `aria-label="Delete [item type]"`, `aria-label="Edit [item type]"`

**Acceptance criteria:**
- Skeleton rows appear on initial load for Gear and Trips screens
- Empty states render (not blank) when lists have no data
- All icon-only buttons have `aria-label` attributes
- Skeleton component exported from `components/ui/index.ts`
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- Do not add loading states to the map itself — Leaflet handles its own loading
- Depends on S16 (spots-client.tsx is also touched by S16 — must be sequential)

---

---

### S20 — Voice Ghostwriter

**What to build:** A new voice mode that interviews Will after a trip and writes a polished journal entry — not a structured debrief (that's `VoiceRecordModal`), but a freeform story. Will talks, Claude listens, then produces a readable narrative he can keep.

**User story:** Will gets back from a weekend in the Smokies, still in the parking lot. He taps "Write Journal Entry", rambles for 90 seconds about the campsite, the fire, the hike. The app produces a polished 3-paragraph journal entry saved to the trip.

**How it differs from VoiceRecordModal:**
- `VoiceRecordModal` → structured extraction (gear feedback, spot ratings, what worked/didn't) → `InsightsReviewSheet` applies updates to gear/location/trip records
- `VoiceGhostwriterModal` → freeform narrative → Claude writes a journal entry → saved as `Trip.journalEntry` (new field)

**Key files:**
- `prisma/schema.prisma` — add `journalEntry String?` and `journalEntryAt DateTime?` to `Trip` model; run migration
- `lib/voice/ghostwrite.ts` — new function `ghostwriteJournal(transcription: string, context: { tripName, locationName, dates }): Promise<string>`. System prompt instructs Claude to write a first-person narrative journal entry (3–5 paragraphs, past tense, sensory details, Will's voice). Uses `claude-sonnet-4-6` at 2048 tokens.
- `app/api/voice/ghostwrite/route.ts` — POST endpoint: accepts `{ tripId, transcription }`, calls `ghostwriteJournal`, persists to `Trip.journalEntry` + `journalEntryAt`, returns `{ journalEntry }`.
- `components/VoiceGhostwriterModal.tsx` — new modal, mirrors `VoiceRecordModal` structure: record → transcribe (`/api/voice/transcribe`, same as debrief) → ghostwrite (`/api/voice/ghostwrite`) → review screen showing the written entry with Edit/Save/Discard. States: `idle | recording | transcribing | writing | review | error`.
- `components/TripsClient.tsx` — add "Write Journal" button to trip cards (alongside the existing mic/debrief button). Conditionally show a "Journal" section in trip detail if `trip.journalEntry` is set.

**Acceptance criteria:**
- User can record voice → transcribe → produce journal entry in one flow
- Journal entry persists to the trip and is visible in trip detail
- Edit screen allows tweaking the text before saving
- Works with same OPENAI_API_KEY guard as debrief (graceful error if not set)
- Build passes, no TypeScript errors

**Constraints:**
- Reuse `/api/voice/transcribe` — do not duplicate Whisper call logic
- Do not merge with `VoiceRecordModal` — keep them separate flows with separate entry points
- No new npm packages

---

### S21 — Gear ROI Tracker

**What to build:** A "ROI" tab in the gear detail view that shows cost-per-trip for each item, using `GearItem.price` as the purchase cost and `PackingItem` records to count how many trips each piece of gear has been packed for.

**User story:** Will opens his $400 tent in gear detail, taps the ROI tab, and sees "Used on 4 trips — $100 per trip." He opens his $200 rain jacket: "Used on 1 trip — $200 per trip. Consider using it more." Over time this surfaces underused expensive gear.

**Key files:**
- `app/api/gear/[id]/roi/route.ts` — new GET endpoint. Queries `PackingItem` where `gearId = id` (with `packed = true` filter), counts distinct `tripId`s, calculates `costPerTrip = price / tripCount`. Returns `{ price, tripCount, costPerTrip, trips: [{ id, name, startDate }] }`. Returns `{ tripCount: 0, costPerTrip: null }` if no price set.
- `components/GearClient.tsx` — add `'roi'` to the `detailTab` union type (currently `'research' | 'documents' | 'deals'`). Add "ROI" tab button. Render `GearROITab` component in the tab panel.
- `components/GearROITab.tsx` — new component. Fetches from `/api/gear/[id]/roi` on mount. Shows: big cost-per-trip number (amber, `text-3xl`), trip count subtitle, a list of the trips it was packed for (name + date), and a line like "💡 Used on fewer than 3 trips — consider selling or replacing." if `tripCount < 3 && price > 100`. Empty state if no price set: "Add a purchase price to track ROI."

**Acceptance criteria:**
- ROI tab renders in gear detail for any item
- `costPerTrip` is correct — only counts trips where the item was actually packed (`packed: true`)
- If no price set on the item, shows a prompt to add one (not an error)
- Trip list links are readable (name + date)
- Build passes, no TypeScript errors

**Constraints:**
- No schema changes — uses existing `GearItem.price` and `PackingItem` records
- No new npm packages
- Do not modify the existing research/documents/deals tabs

---

### S22 — Seasonal Spot Ratings

**What to build:** Let Will rate a saved location per season (Spring/Summer/Fall/Winter) with a 1–5 score and an optional note. Over time this builds a personal "best season" index for each spot, which feeds into trip recommendations.

**User story:** Will visits Rough Ridge in October and thinks it's a 5/5 in fall but would be brutal in summer. He opens the location, taps "Seasonal Ratings", sets Fall: ⭐⭐⭐⭐⭐, Summer: ⭐⭐. Next time he's planning a July trip, the spot shows its summer rating prominently.

**Key files:**
- `prisma/schema.prisma` — add `SeasonalRating` model:
  ```
  model SeasonalRating {
    id         String   @id @default(cuid())
    locationId String
    season     String   // "spring" | "summer" | "fall" | "winter"
    rating     Int      // 1-5
    notes      String?
    createdAt  DateTime @default(now())
    updatedAt  DateTime @updatedAt
    location   Location @relation(fields: [locationId], references: [id], onDelete: Cascade)
    @@unique([locationId, season])
    @@index([locationId])
  }
  ```
  Add `seasonalRatings SeasonalRating[]` to `Location` model. Run migration.
- `app/api/locations/[id]/seasonal-ratings/route.ts` — GET returns all ratings for the location; POST/PUT upserts a rating for a given season (using `@@unique` constraint). Body: `{ season, rating, notes? }`.
- `components/LocationForm.tsx` — add a "Seasonal Ratings" section below the existing signal panel (only when editing an existing location, same guard as `SignalLogPanel`). Shows a 2×2 grid of season cards (Spring 🌸 / Summer ☀️ / Fall 🍂 / Winter ❄️), each with a 1–5 star tap picker and optional notes field. Saves on change (optimistic, fire-and-forget PUT).
- `components/SpotMap.tsx` / location popup — show the best seasonal rating badge on the location popup if any ratings exist (e.g., "🍂 Best in Fall").

**Acceptance criteria:**
- All 4 seasons can be rated independently
- Ratings persist and reload correctly when reopening a location
- Duplicate season ratings upsert (not create duplicate rows)
- Location popup shows "Best in [season]" if one season has a clearly higher rating (≥4 and highest)
- Build passes, no TypeScript errors

**Constraints:**
- Do not change the overall location form layout — add the section at the bottom
- `@@unique([locationId, season])` enforces one rating per season per location at the DB level

---

### S23 — Fire Ban + Pre-Trip Alerts

**What to build:** A Mac mini agent job that runs ~7 days before a trip and checks for fire restrictions, weather windows, and any other pre-departure conditions for the trip's location. Results surface as an alert card on the trip prep page.

**User story:** Will has a trip to Shining Rock planned for next weekend. Seven days out, the Mac mini agent runs, finds an active fire restriction for the Pisgah National Forest area, and surfaces it on the trip prep page: "⚠️ Active fire ban — campfires prohibited. Check FS-1200-9B permit requirements."

**Key files:**
- `app/api/agent-jobs/route.ts` — add `"pre_trip_alert"` as a valid job type. The job `payload` JSON shape: `{ tripId, tripName, locationName, latitude, longitude, startDate }`.
- `lib/agents/pre-trip-alert.ts` — new agent function `runPreTripAlert(payload)`. Uses Claude (Sonnet) with web search context to check: (1) fire restriction status for the region, (2) 7-day weather window summary, (3) any trail/road closures. Returns structured JSON: `{ alerts: [{ severity: 'warning'|'info', title, body }], checkedAt }`. Persist result to `AgentJob.result`.
- `app/api/agent-jobs/trigger/pre-trip/route.ts` — new POST endpoint to manually trigger a pre-trip alert job for a given trip. Body: `{ tripId }`. Looks up trip + location, creates the `AgentJob` record, kicks off `runPreTripAlert` in the background (non-blocking response).
- `components/PreTripAlertCard.tsx` — new card component. Fetches the latest `pre_trip_alert` job for the trip from `/api/agent-jobs?type=pre_trip_alert&tripId=X`. States: no-job (show "Run Pre-Trip Check" button), running/pending (spinner), done (render alert list with severity-colored badges), failed (retry button). Warning alerts: amber. Info alerts: stone.
- `components/TripPrepClient.tsx` — add `PreTripAlertCard` as the first card in trip prep (above vehicle checklist), wired with `tripId`.
- Mac mini runner script (`scripts/agent-runner.ts` or equivalent) — add handler for `"pre_trip_alert"` job type. The script already handles `gear_enrichment` and `deal_check` — add the new branch.

**Acceptance criteria:**
- "Run Pre-Trip Check" button triggers the job and shows a spinner
- When complete, alert cards render with severity-appropriate styling
- Fire restriction info is surfaced when present (Claude uses its knowledge + any available web context)
- Job result persists — re-opening prep page shows cached result with `checkedAt` timestamp
- Build passes, no TypeScript errors

**Constraints:**
- The agent uses Claude's built-in knowledge for fire/weather — no external scraping APIs needed
- Non-blocking: job creation returns immediately, result polled by the client
- Automatic scheduling (cron 7 days before trip) is out of scope for this session — manual trigger only
- Depends on existing `AgentJob` infrastructure (S13) — do not rewrite, only extend

---

---

### S24 — Siri/Reminders Inbox

**What to build:** An iOS Shortcut that reads unprocessed Apple Reminders from a designated list ("Outland Inbox") and POSTs each one to the existing `/api/intake` endpoint. Claude triages them (gear, location, tip, etc.) and they land in the Inbox just like share-sheet captures. Will can say "Hey Siri, add to Outland" while driving and it routes into the app automatically.

**User story:** Will is driving and says "Hey Siri, remind me in Outland to look at the MSR Whisperlite stove." It lands in the Reminders list. That night the Shortcut runs, sends it to `/api/intake`, Claude classifies it as `gear`, and it appears in the Inbox as a gear draft ready to accept or discard.

**Why the intake endpoint is already perfect for this:** `POST /api/intake` accepts `text`, classifies via Claude, creates an `InboxItem`, and surfaces it in `InboxClient`. The Siri Reminders flow just needs a new delivery mechanism — no new backend logic needed.

**Key files:**
- `lib/intake/extractors/reminders.ts` — new extractor specifically for Reminders-style plain text (short, imperative, often missing context). Adds a hint to the triage prompt: "This came from a voice Reminder — it may be terse. Infer gear/location intent liberally."
- `lib/intake/triage.ts` — add a `sourceHint?: 'reminder'` param; when present, use the reminders extractor's enriched prompt instead of the default classify-text path.
- `app/api/intake/route.ts` — accept an optional `sourceHint` field in the form data and pass it through to `triageInput`.
- `docs/SIRI-SHORTCUT-SETUP.md` — new doc explaining: (1) create an Apple Reminders list called "Outland Inbox", (2) install the Shortcut (link or manual steps), (3) Shortcut logic: Get Reminders from "Outland Inbox" where completed=false → for each, POST to `http://[mac-mini-tailscale-ip]/api/intake` with `text` + `sourceHint=reminder` → mark Reminder complete. Include the Shortcut JSON/URL to import.

**Acceptance criteria:**
- Shortcut doc exists and is accurate enough to follow
- A Reminder posted via the Shortcut appears in the Inbox as a triaged item
- `sourceHint=reminder` adjusts the triage prompt (less strict about terse/vague text)
- Existing share-sheet intake flow unchanged
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- Shortcut calls the Mac mini directly over Tailscale — no new public endpoint needed
- The Shortcut itself is documented, not committed as code (Apple Shortcuts aren't text files)
- Do not add a new intake route — reuse `/api/intake` with the sourceHint param

---

### S25 — LNT Pack-Out Checklist

**What to build:** A Leave No Trace checklist that appears in trip prep and again as the final step before Will drives away from camp. It's location-aware (bear country, fire rings, etc.) and Claude-generated based on the trip's location type and notes.

**User story:** Will is breaking down camp at Shining Rock Wilderness. He opens the app, taps "Pack-Out Checklist", and sees 8 items: "Pack out all food scraps", "Scatter grey water 200ft from water source", "Drown and disperse campfire ash", etc. He checks each one. The app won't let him mark departure complete until LNT is checked off.

**Key files:**
- `prisma/schema.prisma` — add `lntChecklistResult String?` and `lntChecklistGeneratedAt DateTime?` to `Trip` model. Run migration. Same JSON-blob pattern as `packingListResult` and `vehicleChecklistResult`.
- `lib/claude.ts` — add `generateLNTChecklist(params: { locationName, locationType, locationNotes, tripNotes })`. Prompt: generate a concise location-specific LNT checklist (5–10 items). Use `claude-haiku-4-5` (fast, cheap — this is deterministic, not creative). Returns `{ items: [{ id, text, checked }] }`.
- `app/api/trips/[id]/lnt/route.ts` — GET retrieves stored blob; POST generates via Claude and persists; PATCH `/[tripId]/check` toggles item checked state. Same pattern as `/api/vehicle-checklist`.
- `components/LNTChecklistCard.tsx` — new card. States: no-checklist (generate button), loading skeleton, loaded list with progress bar + checkboxes, error + retry. Amber progress bar, green checkmark on completion ("Camp left clean ✓"). Fire-and-forget PATCH on checkbox tap.
- `lib/prep-sections.ts` — add `lnt` as the 7th PREP_SECTIONS entry: `{ key: 'lnt', label: 'Pack Out', emoji: '🌿' }`.
- `components/TripPrepClient.tsx` — render `LNTChecklistCard` in the `lnt` section block.

**Acceptance criteria:**
- "Pack Out" section appears in trip prep
- Generate button calls Claude and renders a location-specific checklist
- Checkboxes persist via PATCH
- Progress bar fills as items are checked
- Build passes, no TypeScript errors

**Constraints:**
- Use `claude-haiku-4-5` not Sonnet — this is a short deterministic list, not a creative task
- No new npm packages
- Do not add a departure gate (blocking departure until LNT is complete) in this session — that's a follow-on

---

### S26 — Gear Lending Tracker

**What to build:** Track which gear items Will has lent to friends, when, and whether they've been returned. Surfaces as a "Loans" tab in gear detail and a "Currently Out" section on the Gear page.

**User story:** Will lends his Jetboil to his friend Marcus before a solo trip. He opens the Jetboil in gear detail, taps "Loans", adds "Marcus — lent 2026-04-10". Two weeks later, Marcus returns it. Will marks it returned. If he forgets, the gear page shows a "1 item out on loan" banner.

**Key files:**
- `prisma/schema.prisma` — add `GearLoan` model:
  ```
  model GearLoan {
    id          String    @id @default(cuid())
    gearItemId  String
    borrowerName String
    lentAt      DateTime  @default(now())
    returnedAt  DateTime?
    notes       String?
    createdAt   DateTime  @default(now())

    gearItem GearItem @relation(fields: [gearItemId], references: [id], onDelete: Cascade)
    @@index([gearItemId])
    @@index([returnedAt])
  }
  ```
  Add `loans GearLoan[]` to `GearItem`. Run migration.
- `app/api/gear/[id]/loans/route.ts` — GET lists all loans for the item; POST creates a new loan. Body: `{ borrowerName, lentAt?, notes? }`.
- `app/api/gear/[id]/loans/[loanId]/route.ts` — PATCH to mark returned (`returnedAt = now()`); DELETE to remove a loan record.
- `components/GearLoanPanel.tsx` — new component. Lists active loans (no `returnedAt`) and past loans (collapsible). "Add Loan" inline form: borrower name + optional date + notes. "Mark Returned" button on active loans. Past loans show the return date.
- `components/GearClient.tsx` — add `'loans'` to the `detailTab` union (`'research' | 'documents' | 'deals' | 'roi' | 'loans'`). Add "Loans" tab button. Render `GearLoanPanel` in the tab panel. Add a small badge on the tab if any active loans exist.
- `app/api/gear/route.ts` (or `app/page.tsx` / `app/gear/page.tsx`) — include a count of items with active loans in the gear page server fetch. Pass to `GearClient` as `activeLoanCount`. Show a `"1 item currently on loan"` banner at the top of the gear list when `activeLoanCount > 0`.

**Acceptance criteria:**
- Loans tab visible in gear detail
- Can add a loan with borrower name and see it listed
- "Mark Returned" button works and moves the loan to history
- "Currently on loan" banner appears on gear page when any items are out
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- No borrower contact lookup — just a plain name string
- S25 and S26 both add to `prisma/schema.prisma` — if run in parallel, the session that finishes second must rebase/merge the migration from the first. Safer to run sequentially, or accept a one-line merge conflict on schema.prisma.

---

---

### S27 — Gear Maintenance Reminders

**What to build:** A "Maintenance" tab in gear detail that lets Will log maintenance events (cleaned, resealed, serviced, charged, inspected) and set a reminder interval. Surfaces overdue items as a badge on the gear page and as an agent job the Mac mini can ping about.

**User story:** Will reseals his tent fly in March. He opens the tent in gear detail, taps "Maintenance", logs "Resealed fly" with interval "12 months". Next March, a badge appears on the gear page: "2 items due for maintenance." He taps it, sees the tent and his camp chair, handles them before the season.

**No schema change needed.** Store maintenance log as a JSON blob on `GearItem.notes` extension? No — use a dedicated lightweight approach: store as an `AgentJob` with `type: "maintenance_log"` and `payload: { gearId, event, intervalDays, loggedAt }`. The Mac mini runner already queries `AgentJob` — it can surface overdue items.

Actually, simpler: add two nullable fields via a **new migration** — `lastMaintenanceAt DateTime?` and `maintenanceIntervalDays Int?` on `GearItem`. Maintenance log entries go in a new `GearMaintenanceLog` model (id, gearItemId, event, loggedAt, notes). This is cleaner than blob storage and queryable.

**Key files:**
- `prisma/schema.prisma` — add `lastMaintenanceAt DateTime?` and `maintenanceIntervalDays Int?` to `GearItem`. Add new model:
  ```
  model GearMaintenanceLog {
    id         String   @id @default(cuid())
    gearItemId String
    event      String   // "cleaned" | "resealed" | "serviced" | "charged" | "inspected" | "repaired" | other
    notes      String?
    loggedAt   DateTime @default(now())
    gearItem   GearItem @relation(fields: [gearItemId], references: [id], onDelete: Cascade)
    @@index([gearItemId])
  }
  ```
  Add `maintenanceLogs GearMaintenanceLog[]` to `GearItem`. Run migration.
- `app/api/gear/[id]/maintenance/route.ts` — GET returns all log entries + current interval settings; POST logs a new event (updates `lastMaintenanceAt` on `GearItem`); PATCH updates `maintenanceIntervalDays`.
- `components/GearMaintenancePanel.tsx` — new component. Shows: next due date (amber if overdue, green if current), interval picker (None / 3mo / 6mo / 12mo / 24mo), "Log Maintenance" inline form (event type dropdown + optional notes), scrollable log history (event + date).
- `components/GearClient.tsx` — add `'maintenance'` to the detailTab union. Add "Maintenance" tab button with a red dot badge if `lastMaintenanceAt + intervalDays < today`. Render `GearMaintenancePanel` in the tab panel.
- `app/gear/page.tsx` (server component) — query for gear items where `maintenanceIntervalDays` is set and `lastMaintenanceAt + interval < now`. Pass `overdueMaintenanceCount` to `GearClient`. Show a banner: "🔧 2 items due for maintenance" at the top of the gear list.

**Acceptance criteria:**
- Can log a maintenance event and see it in history
- Interval picker sets the reminder cadence
- Overdue badge appears on the tab when maintenance is past due
- Banner appears on gear page when any items are overdue
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- **S27 touches schema.prisma** — do not run in parallel with S25, S26, or S28

---

### S28 — Shareable Trip Reports

**What to build:** A public read-only page for a trip — journal entry, key stats (dates, location, distance), gear highlights, and a map thumbnail. Will gets a shareable URL he can send to friends or save for himself.

**User story:** Will finishes a 3-day trip to the Black Balsam area. He opens the trip, taps "Share Trip", gets a URL like `https://outland.local/trips/share/abc123def`. He texts it to his hiking buddy. The buddy opens it and sees Will's journal entry, the campsite name, the gear list highlights, and a map.

**Key files:**
- `prisma/schema.prisma` — add `shareToken String? @unique` to `Trip`. Run migration.
- `app/api/trips/[id]/share/route.ts` — POST generates a `shareToken` (reuse `generateSlug()` from `lib/share-location.ts`) and saves it to the trip. Returns `{ shareUrl }`. DELETE clears the token (unshares).
- `app/trips/share/[token]/page.tsx` — new **public** server-rendered page (no auth). Fetches trip by `shareToken`. Renders: trip name, dates, location name, journal entry (if set), gear packed count, meal plan summary (if set), and a static map image via OSM tile (or a simple lat/lon link to OpenStreetMap). Shows "This trip hasn't been shared" if token not found.
- `components/TripsClient.tsx` — add "Share" button to past trip cards. Opens a small share sheet modal showing the URL + copy button + unshare option.

**Acceptance criteria:**
- Tapping "Share Trip" generates a URL and shows it in a copy-able sheet
- Public page renders without authentication
- Page shows graceful "not found" if token is invalid or cleared
- Unshare clears the token and invalidates the URL
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages — use `generateSlug()` from the existing `lib/share-location.ts`
- Public page must not expose any private data beyond what's explicitly shown (no gear prices, no signal logs, no expense data)
- **Touches schema.prisma** — run after S25/S26/S27 to avoid conflicts, or accept a merge

---

### S29 — Altitude Awareness Callouts

**What to build:** Surface altitude information in two places: (1) a callout in `LocationForm` when a spot is above 6,000ft warning about cooking time adjustments, hydration, and sleep effects, and (2) an altitude card in trip prep when the destination is high-elevation.

**User story:** Will saves a new spot at 8,400ft. The location form shows: "⛰️ High altitude — expect longer boil times, drink extra water, and allow a night to acclimatize." In trip prep, a card reminds him to bring extra fuel and adjust his backpacking stove settings.

**`Location.altitude` already exists** — populated from EXIF on photo import. But it's not surfaced in the UI anywhere. This session wires it up.

**Key files:**
- `components/LocationForm.tsx` — after the coordinates fields, add an altitude display line when `altitude` is set (e.g. "📍 8,400 ft"). If altitude > 6000ft, show an inline callout panel: amber background, ⛰️ icon, 3-bullet list (cooking: add 1–2 min boil time per 1000ft above 5000ft; hydration: drink an extra litre/day; sleep: first night may feel rough, symptoms resolve by day 2). Thresholds: > 6000ft = mild callout, > 9000ft = stronger warning.
- `lib/altitude.ts` — new small utility. `getAltitudeWarning(altitudeFt: number): { level: 'none' | 'moderate' | 'high', tips: string[] } | null`. Keeps the logic out of the component.
- `components/TripPrepClient.tsx` — if the trip's location has altitude > 6000ft, render a compact `AltitudeCard` at the top of prep (above the PreTripAlertCard). Card shows elevation, level badge, and the 3 tips.
- `components/AltitudeCard.tsx` — new small component. Props: `altitudeFt: number`. Uses `getAltitudeWarning()`. Renders: elevation badge (stone), tips list, a "Bring extra fuel" reminder if > 8000ft.
- `app/api/trips/[id]/prep/route.ts` — include `location.altitude` in the prep API response so `TripPrepClient` has it without a second fetch.

**Acceptance criteria:**
- Altitude callout appears in LocationForm for any saved location above 6000ft
- Callout does not appear below 6000ft
- Trip prep altitude card appears when destination is high-elevation
- `getAltitudeWarning()` unit-testable pure function
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages
- No schema changes — `Location.altitude` already exists
- Altitude values in the DB are in **meters** (from EXIF) — convert to feet in `lib/altitude.ts` (`ft = meters * 3.28084`). Threshold for callout is 1828m (6000ft).
- Do not add altitude input to LocationForm — it's derived from EXIF only, not user-entered

---

### S30 — Road Trip Scenic Layer

**What to build:** Extend the existing last-stops card in trip prep with a "Scenic & POI" section — waterfalls, viewpoints, historic sites, and parks within 30 miles of the destination. Uses the same Overpass API already in `lib/overpass.ts`.

**User story:** Will is planning a trip to Shining Rock. In trip prep, below the fuel/grocery stops, he sees: "🏞️ Nearby — Looking Glass Falls (4.2 mi), Sliding Rock (6.1 mi), Blue Ridge Parkway Overlook (8.3 mi)." He didn't know about Sliding Rock — now it's on his list.

**Key files:**
- `lib/overpass.ts` — add `fetchScenicStops(lat, lon): Promise<ScenicStop[]>`. New Overpass query targeting `tourism=viewpoint`, `tourism=waterfall`, `tourism=attraction`, `historic=*`, `leisure=nature_reserve` within 50km. Returns up to 6 results sorted by distance. New interface: `ScenicStop { name: string, type: 'viewpoint' | 'waterfall' | 'attraction' | 'historic' | 'nature', distanceMiles: number }`.
- `app/api/trips/[id]/scenic-stops/route.ts` — new GET endpoint. Reads trip location coords, calls `fetchScenicStops`, returns the list. Returns `{ stops: [] }` if no location coords.
- `components/ScenicStopsCard.tsx` — new card. Fetches on mount from `/api/trips/[id]/scenic-stops`. States: loading skeleton (3 rows), empty ("No scenic stops found nearby"), loaded list. Each row: emoji for type (🏞️ viewpoint, 💧 waterfall, 🏛️ historic, 🌿 nature) + name + distance. Tapping a row opens an OSM link for the location.
- `components/TripPrepClient.tsx` — render `ScenicStopsCard` in the route/last-stops section (below the existing `LastStopsCard`, above the departure checklist).

**Acceptance criteria:**
- Scenic stops card appears in trip prep for trips with a location that has coordinates
- Returns real OSM data (waterfalls, viewpoints, etc.) — not just fuel and grocery
- Empty state when no POIs found nearby
- Tapping a stop opens a map link
- Build passes, no TypeScript errors

**Constraints:**
- No new npm packages — extends existing `lib/overpass.ts`
- No schema changes
- Cap results at 6 stops — Overpass can return a lot of noise, keep it scannable
- OSM data quality varies — if a result has no name, skip it (filter in `fetchScenicStops`)
- **S30 touches `TripPrepClient.tsx` (same as S29)** — run after S29 merges, or accept a one-section merge conflict

---

## Adding More Sessions

When Will has new feature ideas, add them at the bottom of the queue table and write a spec below. Set deps based on the conflict groups above. All new features in v2.0 run on MacBook.
