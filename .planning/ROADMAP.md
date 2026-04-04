# Roadmap: Outland OS

## Milestones

- ✅ **v1.0 Foundation** — Phases 1-5 (shipped 2026-04-01) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Close the Loop** — Phases 6-11 (shipped 2026-04-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Ship It** — Phases 12-15 (shipped 2026-04-03)
- ✅ **v2.0 Smarter & Sharper** — Phases 16-24 (shipped 2026-04-03)
- ✅ **v3.0 Gear Intelligence + Day-Of** — Phases 25-35 (shipped 2026-04-04)
- 🚧 **v4.0 Smarter Feedback Loops** — Phases 38+ (in progress)
  - [x] Phase 38: Post-Trip Auto-Review — structured gear/meal/spot review modal with feedback flywheel (completed 2026-04-04)
- 📋 **v4.0 Backlog** — Voice, social, signal map, background agent, and more — see [Backlog section](#backlog-v40) below

## Phases

<details>
<summary>✅ v1.0 Foundation (Phases 1-5) — SHIPPED 2026-04-01</summary>

- [x] Phase 1: Validation — AI feature edge case hardening
- [x] Phase 2: Executive Trip Prep (2/2 plans) — completed 2026-03-30
- [x] Phase 3: Knowledge Base (4/4 plans) — completed 2026-03-31
- [x] Phase 4: Chat Agent (4/4 plans) — completed 2026-03-31
- [x] Phase 5: Intelligence Features (4/4 plans) — completed 2026-04-01

</details>

<details>
<summary>✅ v1.1 Close the Loop (Phases 6-11) — SHIPPED 2026-04-02</summary>

- [x] Phase 6: Stabilization (5/5 plans) — completed 2026-04-01
- [x] Phase 7: Day-Of Execution (3/3 plans) — completed 2026-04-01
- [x] Phase 8: PWA and Offline (5/5 plans) — completed 2026-04-02
- [x] Phase 9: Learning Loop (4/4 plans) — completed 2026-04-02
- [x] Phase 10: Offline Read Path & PWA Completion (4/4 plans) — completed 2026-04-02
- [x] Phase 11: v1.1 Polish (2/2 plans) — completed 2026-04-02

</details>

### ✅ v1.2 Ship It (Shipped 2026-04-03)

**Milestone Goal:** Cross-AI review, fix all tech debt, get production build working, and deploy to Mac mini so Will can use Outland OS from his phone anywhere.

- [x] **Phase 12: Fix Build & Clean House** - Fix broken build, resolve tech debt, run Gemini review in parallel (completed 2026-04-02)
- [x] **Phase 13: Address Review Findings** - Act on actionable Gemini feedback before shipping to production (completed 2026-04-03)
- [x] **Phase 14: Production Deployment** - Configure Mac mini with PM2, persistent data, backups, deploy script (completed 2026-04-03)
- [x] **Phase 15: Remote Access & Go Live** - Tailscale mesh VPN, HTTPS, PWA verification from phone (completed 2026-04-03)

### ✅ v2.0 Smarter & Sharper (Shipped 2026-04-03)

**Milestone Goal:** Deepen the AI utility of Outland OS — smarter packing from trip history, dog-aware planning, live location sharing, fuel/permit prep, and fallback trip chains.

- [x] **Phase 16: Photo Auto-Import** - Bulk import photos from camera roll with EXIF GPS extraction (completed 2026-04-03)
- [x] **Phase 17: Feedback-Driven Packing** - Packing lists personalized by post-trip gear feedback history (completed 2026-04-03)
- [x] **Phase 18: Fuel & Last Stop Planner** - Pre-trip fuel/grocery/hardware stop cards via Overpass API (completed 2026-04-03)
- [x] **Phase 19: Dog-Aware Trip Planning** - Dog toggle on trips, dog gear packing section, dog-friendly notes (completed 2026-04-03)
- [x] **Phase 20: Live Location Sharing** - Shareable public URL showing Will's last known GPS location (completed 2026-04-03)
- [x] **Phase 21: Permit & Reservation** - Store Recreation.gov confirmations with trip, surface reminders (completed 2026-04-03)
- [x] **Phase 22: Plan A/B/C Fallback Chain** - Link fallback trips to primary, compare in trip prep (completed 2026-04-03)
- [x] **Phase 23: Gear Category Expansion** - Expand from 7 to 15 categories with visual grouping, add tech gear fields (completed 2026-04-03)
- [x] **Phase 24: Smart Inbox / Universal Intake** - Single intake endpoint + inbox UI for phone share-to-app workflow (completed 2026-04-03)

### ✅ v3.0 Gear Intelligence + Day-Of (Shipped 2026-04-04)

**Milestone Goal:** Make gear smarter (docs, research, deals, weather-aware clothing) and nail the departure morning experience (sequenced checklist, vehicle prep, safety contact).

**Wave 1 — Parallel (no dependencies):**
- [x] **Phase 25: Gear Docs & Manual Finder** - GearDocument model, Claude-powered manual search, PDF download + offline caching (completed 2026-04-03)
- [x] **Phase 26: Trip Day Sequencer** - Time-ordered departure checklist pulling from packing/meals/power/route (completed 2026-04-03)
- [x] **Phase 27: Safety Float Plan** - SMS/email trip summary to emergency contact before departure (completed 2026-04-03)

**Wave 2 — Depends on Wave 1:**
- [x] **Phase 28: Weather-Aware Clothing** - Rain/cold/UV-driven clothing suggestions in packing lists, clothing subcategories (completed 2026-04-03)
- [x] **Phase 29: Vehicle Pre-Trip Checklist** - Tire pressure, oil, coolant, terrain-aware checks paired with Day Sequencer (completed 2026-04-03)

**Wave 3 — Depends on Wave 2:**
- [x] **Phase 30: Gear Product Research** - AI-powered "Research" button, best-in-class comparison, upgrade recommendations (completed 2026-04-04)
- [x] **Phase 31: Dark Sky, Astro Info & Activity Gear Recommendations** - Bortle/moon/sunrise data + activities gear category + trip planner activity suggestions (completed 2026-04-04)

**Wave 4 — Depends on Wave 3:**
- [x] **Phase 32: Deal Monitoring** - Target price on wishlist items, on-demand price check via Claude, deal alerts (completed 2026-04-04)

## Phase Details

### Phase 12: Fix Build & Clean House
**Goal**: The app builds for production, all known tech debt is resolved, and a cross-AI review has identified any blind spots
**Depends on**: Phase 11 (v1.1 complete)
**Requirements**: BUILD-01, BUILD-02, BUILD-03, BUILD-04, BUILD-05, BUILD-06, BUILD-07, BUILD-08, BUILD-09, BUILD-10, REVIEW-01, REVIEW-02
**Success Criteria** (what must be TRUE):
  1. `npm run build` completes without errors on the project codebase
  2. No native SQLite dependencies (better-sqlite3, sqlite-vec) appear in client-side bundles
  3. All design system components are used consistently (no raw `<button>` or invalid variants)
  4. All test stubs are either implemented or removed (zero `it.todo` remaining)
  5. Gemini review report exists with findings categorized by severity
**Plans:** 5 plans

Plans:
- [x] 12-01-PLAN.md — Component fixes (BUILD-03/04/05) + lint error fixes
- [x] 12-02-PLAN.md — SW runtime cache + tripCoords pipe (BUILD-06/07)
- [x] 12-03-PLAN.md — Test stub implementations (BUILD-08/09)
- [x] 12-04-PLAN.md — Gemini cross-AI review (REVIEW-01/02)
- [x] 12-05-PLAN.md — ROADMAP fix + final D-10 verification gate (BUILD-01/02/04/10)

### Phase 13: Address Review Findings
**Goal**: Actionable issues from the Gemini review are fixed or documented as deferred, so the codebase shipping to production is vetted by two AI models
**Depends on**: Phase 12
**Requirements**: REVIEW-03
**Success Criteria** (what must be TRUE):
  1. Every critical/high finding from the Gemini review is either fixed or has a documented deferral reason
  2. Medium findings are triaged (fix now vs. defer to v2.0)
  3. `npm run build` still passes after all changes
**Plans:** 4/4 plans complete

Plans:
- [x] 13-01-PLAN.md — Path traversal + XSS security fixes (HIGH)
- [x] 13-02-PLAN.md — JSON.parse hardening across LLM output + DB content (HIGH/MEDIUM)
- [x] 13-03-PLAN.md — Input validation: parseFloat/parseInt, dates, email (MEDIUM)
- [x] 13-04-PLAN.md — Build verification + deferral documentation

**Parallelization notes:**
- Plans 13-01, 13-02, 13-03 run in parallel (Wave 1) — independent file sets
- Plan 13-04 runs after all fixes (Wave 2) — build verification + triage doc

### Phase 14: Production Deployment
**Goal**: Outland OS runs as a production service on the Mac mini with persistent data, auto-restart, backups, and a one-command deploy workflow
**Depends on**: Phase 12 (working build)
**Requirements**: DEPLOY-01, DEPLOY-02, DEPLOY-03, DEPLOY-04, DEPLOY-05, DEPLOY-06, DEPLOY-07, DEPLOY-08
**Success Criteria** (what must be TRUE):
  1. The app starts in production mode on the Mac mini and serves pages at `http://localhost:3000`
  2. SQLite database and photos persist across app restarts and redeploys (data lives in `/data/outland/`)
  3. PM2 automatically restarts the app after a crash or Mac mini reboot
  4. A single deploy command (script) pulls latest code, builds, and restarts the service
  5. Daily SQLite backups run automatically via cron
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [x] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

**Parallelization notes:**
- DEPLOY-01/DEPLOY-02/DEPLOY-03 (standalone config, data paths, DATABASE_URL) are sequential setup
- DEPLOY-04/DEPLOY-05 (PM2 config, boot persistence) can run together after data paths are set
- DEPLOY-06 (deploy script) depends on PM2 being configured
- DEPLOY-07 (backup cron) is independent once data paths exist
- DEPLOY-08 (SW cache version) is independent

### Phase 15: Remote Access & Go Live
**Goal**: Will can access Outland OS from his phone anywhere via encrypted private network, with PWA install and offline mode working over the remote connection
**Depends on**: Phase 14 (app running on Mac mini)
**Requirements**: ACCESS-01, ACCESS-02, ACCESS-03, ACCESS-04, ACCESS-05
**Success Criteria** (what must be TRUE):
  1. Tailscale is running on both Mac mini and Will's iPhone
  2. The app is reachable via a stable MagicDNS hostname (no IP addresses to remember)
  3. HTTPS works over Tailscale (required for service worker / PWA functionality)
  4. The app is installable as a PWA from Will's phone over the Tailscale connection
**Plans:** 2/2 plans complete

Plans:
- [ ] 15-01-PLAN.md — Mac mini Tailscale install, MagicDNS + HTTPS setup, tailscale serve
- [ ] 15-02-PLAN.md — iPhone Tailscale install + go-live PWA verification from phone

**Parallelization notes:**
- Plan 15-01 is Wave 1 — Mac mini setup must complete first
- Plan 15-02 is Wave 2 — requires Mac mini serving HTTPS before iPhone can verify

### Phase 16: Photo Auto-Import
**Goal**: Will can select multiple photos at once and bulk-import them with EXIF GPS extraction, so trip photos appear on the map without one-at-a-time uploading
**Depends on**: Phase 15
**Requirements**: PHOTO-BULK-01, PHOTO-BULK-02, PHOTO-BULK-03, PHOTO-BULK-04, PHOTO-BULK-05
**Success Criteria** (what must be TRUE):
  1. User can select multiple files via `<input type=file multiple>` in the Photos section
  2. Each file is processed through EXIF extraction + sharp compression pipeline
  3. Progress indicator shows "Importing N of M..." during batch
  4. Individual file failures don't abort the batch — errors collected and shown at end
  5. Imported photos with GPS EXIF appear as pins on the Spots map
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 17: Feedback-Driven Packing
**Goal**: Packing lists are personalized by post-trip gear feedback history, so Claude accounts for items Will consistently skips or forgets
**Depends on**: Phase 15
**Requirements**: PACK-FEEDBACK-01, PACK-FEEDBACK-02, PACK-FEEDBACK-03
**Success Criteria** (what must be TRUE):
  1. If no trip history, packing list generates identically to current behavior
  2. If history exists, Claude prompt includes gear feedback summary (verifiable in logs)
  3. Packing list output includes at least one feedback-informed note when history available
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 18: Fuel & Last Stop Planner
**Goal**: Trip prep shows the last gas station, grocery, and hardware store before the campsite, so Will can stock up before services run out
**Depends on**: Phase 15
**Requirements**: FUEL-01, FUEL-02, FUEL-03, FUEL-04, FUEL-05
**Success Criteria** (what must be TRUE):
  1. Trip prep section has "Fuel & Last Stops" card with 3 categories: Fuel, Grocery, Hardware/Outdoor
  2. Each entry shows name + approximate distance from destination in miles
  3. Loading state shown while fetching Overpass API results
  4. If no results within 50km, shows "None found nearby — plan ahead"
  5. Uses trip's existing `latitude`/`longitude` fields — no new data entry required
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 19: Dog-Aware Trip Planning
**Goal**: Trips can be marked "bringing dog" and the packing list automatically includes a Dog section with essential gear and dog-friendly destination notes
**Depends on**: Phase 15
**Requirements**: DOG-01, DOG-02, DOG-03, DOG-04, DOG-05
**Success Criteria** (what must be TRUE):
  1. Trip create/edit form has "Bringing dog?" boolean toggle (defaults false)
  2. When `bringingDog = true`, generated packing list includes a "Dog" section with: food + collapsible bowl, water bowl, leash + backup leash, poop bags (2x), dog first aid (tweezers, wound spray)
  3. Trip card shows 🐕 indicator when `bringingDog` is true
  4. When `bringingDog = false`, no dog items appear in packing list (no regression)
  5. Trip edit supports toggling `bringingDog` on existing trips
**Plans:** 2/2 plans complete

Plans:
- [x] 19-01-PLAN.md — Schema migration + API routes + packing list prompt conditioning (completed 2026-04-03)
- [x] 19-02-PLAN.md — Trip form dog toggle + TripCard indicator

**Parallelization notes:**
- Plan 19-01 is Wave 1 — schema and backend must exist before UI can consume
- Plan 19-02 is Wave 2 — depends on schema field and API changes from 19-01

### Phase 20: Live Location Sharing
**Goal**: Will can generate a shareable URL that shows his last known GPS location on a public map page, so family can track him during remote trips
**Depends on**: Phase 15
**Requirements**: SHARE-01, SHARE-02, SHARE-03, SHARE-04, SHARE-05
**Success Criteria** (what must be TRUE):
  1. "Share Location" button generates a URL with a random slug
  2. Shared URL page renders Leaflet map, pin at last location, label, and "Last updated: X ago"
  3. Page works without auth (public route, no login required)
  4. Will can update his location (replaces previous — only most recent stored)
  5. Will can "stop sharing" (deletes the SharedLocation record)
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 21: Permit & Reservation
**Goal**: Will can store Recreation.gov confirmation URLs and notes with a trip, surfacing booking details in trip prep
**Depends on**: Phase 18, Phase 20
**Requirements**: PERMIT-01, PERMIT-02, PERMIT-03, PERMIT-04
**Success Criteria** (what must be TRUE):
  1. Trip edit form has permitUrl and permitNotes fields
  2. Trip prep shows "Permits & Reservations" card with permit info + "View Booking" link
  3. Trip card shows 📋 indicator when permitUrl is set
  4. No Recreation.gov API — manual paste only
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 22: Plan A/B/C Fallback Chain
**Goal**: Will can link fallback trips to a primary trip and compare them side-by-side in trip prep, so he can pick the right destination on the day based on weather
**Depends on**: Phase 19, Phase 21
**Requirements**: FALLBACK-01, FALLBACK-02, FALLBACK-03, FALLBACK-04, FALLBACK-05
**Success Criteria** (what must be TRUE):
  1. Trip can be created as a Plan B or Plan C for any existing trip (`fallbackFor` + `fallbackOrder`)
  2. Trip prep shows "Fallback Plans" card listing alternatives with destination + weather comparison
  3. Trip card shows count of alternatives when fallbacks exist
  4. Fallbacks are first-class trips (own gear, checklists, packing lists)
  5. Deleting primary trip sets `fallbackFor = null` on alternatives (no cascade delete)
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 23: Gear Category Expansion
**Goal**: Expand gear from 7 to 15 categories with visual grouping, add 3 new schema fields for tech gear, and centralize all category definitions in a shared module
**Depends on**: None (independent)
**Requirements**: GEAR-CAT-01, GEAR-CAT-02, GEAR-CAT-03, GEAR-CAT-04, GEAR-CAT-05, GEAR-CAT-06, GEAR-CAT-07
**Success Criteria** (what must be TRUE):
  1. 15 categories render as grouped filter chips in gear page (4 visual groups: Living, Utility, Tech/Power, Action)
  2. Existing items display in correct new categories after seed re-categorization
  3. GearForm has tech detail fields (modelNumber, connectivity, manualUrl)
  4. Packing list generation references all 15 categories
  5. Power budget correctly excludes non-powered categories
  6. All category references use the shared `lib/gear-categories.ts` module (no local duplicates)
  7. `npm run build` passes
**Plans**: 3 plans

Plans:
- [x] 23-01-PLAN.md — Shared categories module + Prisma migration + seed re-categorization + API routes
- [x] 23-02-PLAN.md — Replace category duplicates in DashboardClient, claude.ts, power.ts, agent tools
- [x] 23-03-PLAN.md — GearClient grouped filter chips + GearForm tech detail fields

**Parallelization notes:**
- Plan 23-01 is Wave 1 — shared module and schema must exist before consumers can import
- Plans 23-02 and 23-03 are Wave 2 — parallel, no file overlap

### Phase 24: Smart Inbox / Universal Intake
**Goal**: Single intake endpoint + inbox UI so Will can share anything from his phone (screenshot, URL, text) and AI triages it into the right entity type
**Depends on**: Phase 23 (needs 15 categories for proper triage routing)
**Requirements**: INBOX-01, INBOX-02, INBOX-03, INBOX-04, INBOX-05
**Success Criteria** (what must be TRUE):
  1. POST endpoint accepts FormData with text, url, or file
  2. AI triage classifies input into gear/location/knowledge/tip categories
  3. Inbox page shows pending items with accept/edit/reject actions
  4. Accept creates real entity (gear item, location, etc.) from AI suggestion
  5. `npm run build` passes
**Plans**: 3 plans

Plans:
- [ ] 22-01-PLAN.md — Schema migration + API routes (fallback fields, self-relation, alternatives endpoint)
- [ ] 22-02-PLAN.md — TripCard badges + TripsClient Add Plan B flow
- [ ] 22-03-PLAN.md — TripPrepClient Fallback Plans card with weather comparison

**Parallelization notes:**
- Plan 22-01 is Wave 1 — schema and API must exist before UI can consume
- Plans 22-02 and 22-03 are Wave 2 — parallel, no file overlap

### Phase 25: Gear Docs & Manual Finder
**Goal**: Every gear item can have attached documents (manuals, warranties, support links) that Claude finds automatically and are cached for offline access
**Depends on**: Phase 23 (expanded categories with modelNumber field)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. GearDocument model exists with type (manual_pdf, support_link, warranty, product_page), url, localPath, title
  2. "Find Manual" button on gear detail calls Claude to search for manufacturer support page + PDF
  3. PDFs download to local storage and display inline
  4. Documents tab on gear detail shows all attached docs
  5. Downloaded PDFs cached in service worker for offline access
  6. `npm run build` passes
**Plans**: 3 plans

Plans:
- [x] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [x] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [x] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 1 — fully parallel with Phases 26 and 27

### Phase 26: Trip Day Sequencer
**Goal**: Time-ordered departure checklist for the morning of a trip, pulling tasks from packing list, meal plan, power budget, and route — the ADHD-friendly "just follow the list" screen
**Depends on**: None (uses existing trip prep data)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Trip prep has a "Departure Day" section with time-sequenced tasks
  2. Tasks are generated from existing trip data (packing status, meal prep steps, power charge needs, drive time)
  3. Each task has a suggested time and can be checked off
  4. Sequence adapts to departure time (set by user on trip)
  5. `npm run build` passes
**Plans**: 3 plans

Plans:
- [x] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [x] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 1 — fully parallel with Phases 25 and 27

### Phase 27: Safety Float Plan
**Goal**: Send a trip summary (dates, location, vehicle, expected return) to an emergency contact before departure
**Depends on**: None
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. User can set an emergency contact (name, phone/email) in settings
  2. "Send Float Plan" button on trip prep generates a summary message
  3. Message includes: destination, dates, vehicle, expected return, any notes
  4. Sends via SMS (iMessage on Mac) or email
  5. `npm run build` passes
**Plans**: 3 plans

Plans:
- [x] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [ ] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 1 — fully parallel with Phases 25 and 26

### Phase 28: Weather-Aware Clothing
**Goal**: Packing lists include weather-driven clothing suggestions — rain gear for rain, cold layers for low temps, UV protection for high UV
**Depends on**: Phase 23 (clothing category exists)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Claude packing prompt includes specific clothing guidance based on weather forecast
  2. Rain gear suggested when forecast shows precipitation
  3. Cold layers suggested for temps below threshold
  4. UV protection suggested for high UV index days
  5. Clothing suggestions reference actual owned gear when available
  6. `npm run build` passes
**Plans**: 3 plans

Plans:
- [ ] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [ ] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 2 — can run parallel with Phase 29

### Phase 29: Vehicle Pre-Trip Checklist
**Goal**: Claude-generated vehicle pre-trip checklist (tires, fluids, lights, cargo) that surfaces as 6th section in trip prep, with check-off state persisted as JSON blob on Trip
**Depends on**: Phase 26 (integrates with departure sequence)
**Requirements**: SC-1, SC-2, SC-3, SC-4, SC-5
**Success Criteria** (what must be TRUE):
  1. Trip prep has a "Vehicle Check" card with checklist items
  2. Checklist items adapt to trip type (highway vs dirt road vs off-road)
  3. Items can be checked off and state persists
  4. Integrates with vehicle profile (shows relevant specs)
  5. `npm run build` passes
**Plans**: 3 plans

Plans:
- [ ] 29-PLAN-01-schema-and-tests.md -- Prisma migration + Zod schema + Wave 0 test scaffolds
- [ ] 29-PLAN-02-api-routes.md -- generateVehicleChecklist + GET/POST route + PATCH check-off route
- [ ] 29-PLAN-03-ui-component.md -- VehicleChecklistCard component + PREP_SECTIONS + TripPrepClient wiring

**Parallelization notes:**
- Plan 01 is Wave 1 -- schema and tests
- Plan 02 is Wave 2 -- API routes depend on schema
- Plan 03 is Wave 3 -- UI depends on API routes

### Phase 30: Gear Product Research
**Goal**: AI-powered "Research" button on gear items that finds best-in-class alternatives, compares to current item, and surfaces upgrade recommendations
**Depends on**: Phase 25 (GearDocument model for storing research)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. "Research" button on gear detail triggers Claude research
  2. Results show top alternatives with pros/cons vs current item
  3. Research results stored and dated (staleness tracking >90 days)
  4. Dashboard or gear page surfaces top upgrade opportunities
  5. `npm run build` passes
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 3 — can run parallel with Phase 31

### Phase 31: Dark Sky, Astro Info & Activity Gear Recommendations
**Goal**: Show Bortle class, moon phase, sunrise/sunset per location/trip; add `activities` gear category (kayak, telescope, projector, speakers, etc.); trip planner agent infers location suitability from existing notes and surfaces owned/wishlist activity gear as accept/reject suggestions
**Depends on**: None (independent, but lower priority)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Trip prep shows sunrise/sunset times for trip dates
  2. Moon phase displayed for each night of the trip
  3. Bortle class (light pollution) shown for trip location
  4. Data sourced from free APIs (no API key required)
  5. `activities` category exists in `lib/gear-categories.ts` with leisure/entertainment scope
  6. Trip planner agent suggests relevant activity gear based on inferred location conditions
  7. Wishlist activity items surfaced as nudges ("you've been eyeing a telescope…")
  8. `npm run build` passes
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 3 — can run parallel with Phase 30

### Phase 32: Deal Monitoring
**Goal**: Set target prices on wishlist gear items, check prices on demand via Claude, surface deals
**Depends on**: Phase 30 (research model for storing price data)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Wishlist gear items have optional targetPrice field
  2. "Check Price" button triggers Claude to search current prices
  3. Results show current price vs target price
  4. Dashboard surfaces items currently below target price
  5. `npm run build` passes
**Plans**: 3 plans

Plans:
- [ ] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [ ] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 4 — depends on Phase 30 research infrastructure

### Phase 33: Home Assistant Integration
**Goal**: Connect Outland OS to a campsite Home Assistant instance so Will can see live sensor data (battery, propane, weather, vehicle, dog GPS) on the dashboard and trip prep pages
**Depends on**: Phase 24 (schema stable, nav settled)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Settings page has HA config section with URL, token (write-only), and "Test Connection" button
  2. Test Connection calls HA REST API and shows success ("Connected — N entities found") or error
  3. Entity picker lets Will select up to 10 entities to display
  4. Dashboard shows "Campsite" card with selected entity values when HA is reachable
  5. If HA unreachable, card shows "Offline — last updated X ago" with stale values
  6. Token is never returned from GET /api/ha/config
  7. Trip prep shows HA power/propane/weather snapshot when configured
  8. `npm run build` passes
**Plans**: 3 plans

Plans:
- [ ] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [ ] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 5 — independent of Phases 25–32; depends on Phase 24 schema

### Phase 34: Meal Planning Core
**Goal**: AI-generated meal plans linked to trips — every meal slot for every day, based on trip duration, weather, dog status, and available cooking gear
**Depends on**: Phase 22 (Trip model + claude.ts + TripPrepClient settled), Phase 33 (schema settled)
**Requirements**: MEAL-01, MEAL-02, MEAL-03, MEAL-04, MEAL-05, MEAL-06, MEAL-07
**Success Criteria** (what must be TRUE):
  1. Meal plan generates for any trip with a start/end date
  2. Plan covers every day × every slot (breakfast, lunch, dinner)
  3. Individual meals can be regenerated without replacing the whole plan
  4. Meal plan section visible in trip prep with day-by-day layout
  5. Trip card shows meal plan status ("Meal plan ready" / "No meal plan")
  6. `npm run build` passes
**Plans**: 4 plans

Plans:
- [x] 34-00-PLAN.md — Wave 0 test stubs (meal-plan-route, meal-regenerate-route, meal-plan-schema)
- [ ] 34-01-PLAN.md — Schema migration (normalize MealPlan + create Meal table) + Zod schemas
- [ ] 34-02-PLAN.md — lib/claude.ts updates (bringingDog, regenerateMeal) + all API routes
- [ ] 34-03-PLAN.md — MealPlanClient component + TripPrepClient wiring + TripsClient badge

**Parallelization notes:**
- Wave 6 — depends on Phase 22 (Trip model) and Phase 33 (schema)

### Phase 35: Meal Planning: Shopping List, Prep Guide & Feedback
**Goal**: Extend meal planning with a consolidated shopping list, pre-trip prep guide, and post-trip feedback loop that improves future meal plans
**Depends on**: Phase 34 (MealPlan + Meal models in place)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. "Shopping List" tab shows consolidated ingredient list across all meals, grouped by category
  2. Quantities are summed across recipes (e.g., 3 meals needing olive oil → 1 combined entry)
  3. Pre-trip prep guide lists everything that can be made at home before the trip
  4. Post-trip meal feedback lets Will rate each meal (loved / ok / skip) with a note
  5. Feedback is surfaced to Claude on the next meal plan generation
  6. Dashboard shows meal feedback prompt after a trip ends
  7. `npm run build` passes
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 7 — depends on Phase 34 meal plan core

## Progress

**Execution Order:**
- v1.0-v2.0: Phases 1-24 (complete)
- v3.0 Wave 1: Phases 25, 26, 27 (parallel)
- v3.0 Wave 2: Phases 28, 29 (parallel)
- v3.0 Wave 3: Phases 30, 31 (parallel)
- v3.0 Wave 4: Phase 32
- v3.0 Wave 5: Phase 33 (HA Integration — independent)
- v3.0 Wave 6: Phase 34 (Meal Planning Core — depends on 22, 33)
- v3.0 Wave 7: Phase 35 (Meal Planning: Shopping/Prep/Feedback — depends on 34)

| Phase | Milestone | Plans Complete | Status | Completed |
|-------|-----------|----------------|--------|-----------|
| 1. Validation | v1.0 | 0/TBD | Complete | - |
| 2. Executive Trip Prep | v1.0 | 2/2 | Complete | 2026-03-30 |
| 3. Knowledge Base | v1.0 | 4/4 | Complete | 2026-03-31 |
| 4. Chat Agent | v1.0 | 4/4 | Complete | 2026-03-31 |
| 5. Intelligence Features | v1.0 | 4/4 | Complete | 2026-04-01 |
| 6. Stabilization | v1.1 | 5/5 | Complete | 2026-04-01 |
| 7. Day-Of Execution | v1.1 | 3/3 | Complete | 2026-04-01 |
| 8. PWA and Offline | v1.1 | 5/5 | Complete | 2026-04-02 |
| 9. Learning Loop | v1.1 | 4/4 | Complete | 2026-04-02 |
| 10. Offline Read Path | v1.1 | 4/4 | Complete | 2026-04-02 |
| 11. v1.1 Polish | v1.1 | 2/2 | Complete | 2026-04-02 |
| 12. Fix Build & Clean House | v1.2 | 5/5 | Complete | 2026-04-02 |
| 13. Address Review Findings | v1.2 | 4/4 | Complete    | 2026-04-03 |
| 14. Production Deployment | v1.2 | 3/3 | Complete | 2026-04-03 |
| 15. Remote Access & Go Live | v1.2 | 2/2 | Complete    | 2026-04-03 |
| 16. Photo Auto-Import | v2.0 | 1/1 | Complete | 2026-04-03 |
| 17. Feedback-Driven Packing | v2.0 | 2/2 | Complete | 2026-04-03 |
| 18. Fuel & Last Stop Planner | v2.0 | 2/2 | Complete | 2026-04-03 |
| 19. Dog-Aware Trip Planning | v2.0 | 2/2 | Complete | 2026-04-03 |
| 20. Live Location Sharing | v2.0 | 2/2 | Complete | 2026-04-03 |
| 21. Permit & Reservation | v2.0 | 1/1 | Complete | 2026-04-03 |
| 22. Plan A/B/C Fallback Chain | v2.0 | 3/3 | Complete    | 2026-04-03 |
| 23. Gear Category Expansion | v2.0 | 3/3 | Complete   | 2026-04-03 |
| 24. Smart Inbox / Intake | v2.0 | 3/3 | Complete   | 2026-04-03 |
| 25. Gear Docs & Manual Finder | v3.0 | 3/3 | Complete | 2026-04-03 |
| 26. Trip Day Sequencer | v3.0 | 3/3 | Complete | 2026-04-03 |
| 27. Safety Float Plan | v3.0 | 1/1 | Complete | 2026-04-03 |
| 28. Weather-Aware Clothing | v3.0 | 1/1 | Complete | 2026-04-03 |
| 29. Vehicle Pre-Trip Checklist | v3.0 | 3/3 | Complete    | 2026-04-03 |
| 30. Gear Product Research | v3.0 | 1/1 | Complete | 2026-04-04 |
| 31. Dark Sky, Astro & Activity Gear | v3.0 | 1/1 | Complete | 2026-04-04 |
| 32. Deal Monitoring | v3.0 | 4/4 | Complete    | 2026-04-04 |
| 33. Conversational Trip Planner | v3.0 | 4/4 | Complete    | 2026-04-03 |
| 34. Home Assistant Integration | v3.0 | 4/4 | Complete    | 2026-04-04 |
| 35. Meal Planning Core | v3.0 | 6/6 | Complete    | 2026-04-04 |
| 36. Meal Planning: Shopping/Prep/Feedback | v3.0 | 1/1 | Complete | 2026-04-04 |

### Phase 33: Conversational Trip Planner

**Goal:** Replace the static "Create Trip" form with a multi-turn Claude agent chat that asks dynamic questions, calls gear/weather/web tools, and creates the trip when ready. Chat is the primary creation path; existing edit form stays for post-creation edits. "Add manually" escape hatch preserved.
**Requirements**: TRIP-CHAT-01, TRIP-CHAT-02, TRIP-CHAT-03, TRIP-CHAT-04, TRIP-CHAT-05, TRIP-CHAT-06, TRIP-CHAT-07, TRIP-CHAT-08, TRIP-CHAT-09
**Depends on:** Phase 24
**Success Criteria** (what must be TRUE):
  1. "Plan Trip" button opens a full-screen chat sheet with a conversational agent
  2. Agent asks dynamic questions and uses tools (gear, weather, locations, web search)
  3. Agent presents a summary card with "Create Trip" button when enough info is collected
  4. Confirming creates the trip and navigates to /trips/[id]/prep
  5. "Add manually" escape hatch opens the old static form
  6. Trip-creation conversations are persisted to the database
  7. `npm run build` passes
**Plans:** 6/6 plans complete

Plans:
- [x] 33-00-PLAN.md — Wave 0 test stubs (trip planner tools + ChatBubble extraction)
- [x] 33-01-PLAN.md — Trip planner API route + system prompt + web search tool + tool registry
- [x] 33-02-PLAN.md — ChatClient + ChatBubble modifications (apiEndpoint, fullHeight, trip_summary card)
- [x] 33-03-PLAN.md — TripPlannerSheet component + TripsClient integration

**Parallelization notes:**
- Plan 33-00 is Wave 0 — test stubs, no dependencies
- Plans 33-01 and 33-02 are Wave 1 — parallel, depend on 33-00, no file overlap
- Plan 33-03 is Wave 2 — depends on both 33-01 (API route) and 33-02 (ChatClient props)

---

### Phase 38: Post-Trip Auto-Review

**Goal**: After a trip ends, give Will a structured low-friction way to log what worked and what didn't — gear used/forgotten/unused, meal ratings, spot rating, and free-form notes. Data feeds Phase 17 packing personalization and Phase 35 meal feedback loop.

**Status**: 🚧 In progress
**Requirements:** REV-01, REV-02, REV-03, REV-04, REV-05, REV-06, REV-07, REV-08
**Plans:** 2/3 plans executed

Plans:
- [x] 38-01-PLAN.md — Schema migration (Trip.reviewedAt) + POST /api/trips/[id]/review batch endpoint
- [x] 38-02-PLAN.md — TripReviewModal multi-step component (Gear → Meals → Spot+Notes)
- [ ] 38-03-PLAN.md — TripsClient integration (Review button, Reviewed badge, review-needed count)

**Parallelization notes:**
- Plan 38-01 is Wave 1 — schema + API, no dependencies
- Plan 38-02 is Wave 2 — depends on 38-01 (API contract)
- Plan 38-03 is Wave 3 — depends on 38-01 (schema types) and 38-02 (modal component); has checkpoint

---

### Phase 41: Camp Kit Presets / Loadout Templates

**Goal**: Upgrade the existing kit preset system into a first-class feature — add "save packing list as template," explicit multi-kit stacking, and a Claude review step that flags trip-specific gaps on top of a preset base.

**Status**: 🔲 Not started
**Plans:** 1/3 plans executed

Plans:
- [x] 41-01-PLAN.md — Save-from-packing-list flow + preset picker discoverability
- [ ] 41-02-PLAN.md — Multi-kit stacking UI (applied kits list + remove)
- [ ] 41-03-PLAN.md — Claude augmentation step ("Ask Claude to review" after applying presets)

**Parallelization notes:**
- Plan 41-01 is Wave 1 — no dependencies
- Plan 41-02 is Wave 2 — depends on 41-01 (improved picker surface area)
- Plan 41-03 is Wave 3 — depends on 41-01 and 41-02 (needs applied kits context)

---


## Backlog (v4.0+)

Ideas captured from conversations and planning sessions that haven't been phased yet. These are real intentions, not wishlist noise — each one was explicitly discussed or directly derived from Will's use patterns.

### AI & Voice

| Idea | Source | Notes |
|------|--------|-------|
| **Voice Ghostwriter** | IDEAS.md | Talk to the agent, it interviews you and writes a polished journal entry. Voice-first. Anytime, not just drive home. |
| **Siri/Reminders Inbox** | IDEAS.md | Read Apple Reminders, Claude triages items (gear wishlist, spots, ideas, todos) and routes them into the app. Preserve Siri capture habit. |
| **Post-Trip Auto-Review** | IDEAS.md | After a trip ends: what did you forget, what didn't you use, rate meals/spots. Feeds packing list + meal plan history. |
| **Agent Orchestration Layer** | IDEAS.md | Route tasks to Haiku/Sonnet/Opus by complexity. Logging + cost tracking per feature. Keeps AI costs sustainable at scale. |

### Campsite & Location Intelligence

| Idea | Source | Notes |
|------|--------|-------|
| **Personal Signal Map** | FEATURE-PHASES.md | Log cell (carrier + bars) and Starlink quality at every campsite over time. Builds a real-world signal database. |
| **Seasonal Ratings** | FEATURE-PHASES.md | Rate a spot differently by season. A great fall spot may be terrible in summer. |
| **GPX Import** | FEATURE-PHASES.md | Import trail routes from AllTrails/Wikiloc GPX exports. Overlay on map, attach to location. |
| **Google Maps List Import** | FEATURE-PHASES.md | Paste a shared Google Maps list → pull all pins as draft saved locations. |
| **Fire Ban Alerts** | IDEAS.md | Scrape/monitor fire restriction status for target regions. Alert before trip. |
| **Wildlife & Safety Protocols** | IDEAS.md | Per-location bear country, flash flood risk, snake season warnings. |
| **Altitude Awareness** | IDEAS.md | Flag altitude effects (cooking, sleep, hydration) for high-elevation spots. |
| **Water Sources** | IDEAS.md | Note water availability per location (creek, spring, none). Factor into resupply planning. |
| **Campendium / freecampsites Integration** | IDEAS.md | Pull reviews and ratings from public campsite databases for saved/searched spots. |

### Mac Mini Background Agent

| Idea | Source | Notes |
|------|--------|-------|
| **Async Worker Architecture** | IDEAS.md | Mac mini polls for jobs, executes, writes results back to app. For deals, enrichment, heavy AI, scheduled tasks. |
| **Gear Deal Tracking** | IDEAS.md | Monitor REI/Amazon/Backcountry for price drops on wishlist items. Good first job type to prove the pattern. |
| **Gear Maintenance Reminders** | IDEAS.md | Based on last-used date + interval. Remind to clean stove, reseal tent, charge EcoFlow. |
| **Pre-Trip Fire/Weather Scanning** | IDEAS.md | 7 days out: fire bans, weather windows, trail conditions for planned trip locations. |
| **Photo Enrichment Pipeline** | IDEAS.md | Batch: EXIF → GPS → reverse geocode → AI caption. Heavy, perfect for background. |

### Trip Planning & Prep

| Idea | Source | Notes |
|------|--------|-------|
| **Camp Kit Presets** | IDEAS.md | Save loadout templates (Weekend Warrior, Remote Office, Extended Stay). Generate packing from preset + trip override. |
| **Cost Tracking** | IDEAS.md | Log gas, permits, groceries, gear per trip. Gear ROI (cost per trip used). |
| **Road Trip Layer** | IDEAS.md | Surface scenic stops, food, rest areas, and points of interest along the route to camp. |
| **Leave No Trace Pack-Out Checklist** | IDEAS.md | Location-specific LNT checklist before you drive away. |
| **First Aid & Emergency Info** | IDEAS.md | Nearest hospital, ranger station, SAR contact for each location. |
| **Permit Agent (Auto-Fill)** | IDEAS.md | Agent fills out Recreation.gov / USFS permit forms on Will's behalf. Not just storing confirmations — actually submitting. |

### Gear

| Idea | Source | Notes |
|------|--------|-------|
| **Gear Lending Tracker** | IDEAS.md | Track who borrowed what and when. |
| **Gear ROI Tracker** | IDEAS.md | Cost per trip. Surface underused expensive gear. Help justify or regret purchases. |
| **Telescope / Stargazing Kit** | IDEAS.md | Telescope subcategory, astro conditions forecast, observing log. Pairs with Dark Sky feature. |

### Social & Sharing

| Idea | Source | Notes |
|------|--------|-------|
| **Shareable Trip Reports** | IDEAS.md | Journal + photos + route = a shareable summary or personal archive. |
| **Buddy Trip Mode** | IDEAS.md | Share trip with a friend, split packing list, no duplicate gear between vehicles. |

---
*Full phase details for shipped milestones: see archives in `.planning/milestones/`*
