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
| S01 | Photo auto-import             | 16    | ⬜ Ready  | Sonnet, normal | —          |
| S02 | Feedback-driven packing       | 17    | 🔄 In Progress 2026-04-02 | Sonnet, normal | —          |
| S03 | Fuel & last stop planner      | 18    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S04 | Dog-aware trip planning       | 19    | 🔄 In Progress 2026-04-02 | Sonnet, normal | —          |
| S05 | Live location sharing         | 20    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S06 | Permit & reservation          | 21    | ✅ Done 2026-04-03 | Sonnet, normal | S03, S05   |
| S07 | Plan A/B/C fallback chain     | 22    | ⬜ Ready  | Sonnet, normal | S04, S06   |
| S08 | Gear category expansion       | 23    | ✅ Done 2026-04-03 | Sonnet, normal | —          |
| S09 | Smart inbox / intake          | 24    | ⬜ Ready  | Sonnet, normal | S08        |

**Why this order matters (conflict groups):**

- S01–S05 have no file conflicts with each other and can be done in any order
- S06 touches `TripPrepClient.tsx` (same as S03) and `SpotMap.tsx` (same as S05) — must wait for both
- S07 touches `lib/claude.ts` + Trip model (same as S04) and `TripPrepClient.tsx` (same as S06) — must wait for both
- S08 touches `lib/claude.ts` (same as S02, S04, S07) and `GearClient.tsx` — should ideally run before S02
- S09 depends on S08 (needs 15 categories); touches `BottomNav.tsx` and `schema.prisma` — mostly new files, low conflict

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

## Starter Prompts

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

## Adding More Sessions

When Will has new feature ideas, add them at the bottom of the queue table and write a spec below. Set deps based on the conflict groups above. All new features in v2.0 run on MacBook.
