# Roadmap: Outland OS

## Milestones

- ✅ **v1.0 Foundation** — Phases 1-5 (shipped 2026-04-01) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Close the Loop** — Phases 6-11 (shipped 2026-04-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Ship It** — Phases 12-15 (shipped 2026-04-03)
- ✅ **v2.0 Smarter & Sharper** — Phases 16-24 (shipped 2026-04-03)
- 🚧 **v3.0 Gear Intelligence + Day-Of** — Phases 25-32 (in progress)

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

### 🚧 v3.0 Gear Intelligence + Day-Of (In Progress)

**Milestone Goal:** Make gear smarter (docs, research, deals, weather-aware clothing) and nail the departure morning experience (sequenced checklist, vehicle prep, safety contact).

**Wave 1 — Parallel (no dependencies):**
- [ ] **Phase 25: Gear Docs & Manual Finder** - GearDocument model, Claude-powered manual search, PDF download + offline caching
- [ ] **Phase 26: Trip Day Sequencer** - Time-ordered departure checklist pulling from packing/meals/power/route
- [x] **Phase 27: Safety Float Plan** - Replace Claude-composed email with plain-text template, strip gear list (completed 2026-04-03)

**Wave 2 — Depends on Wave 1:**
- [ ] **Phase 28: Weather-Aware Clothing** - Rain/cold/UV-driven clothing suggestions in packing lists, clothing subcategories
- [ ] **Phase 29: Vehicle Pre-Trip Checklist** - Tire pressure, oil, coolant, terrain-aware checks paired with Day Sequencer

**Wave 3 — Depends on Wave 2:**
- [ ] **Phase 30: Gear Product Research** - AI-powered "Research" button, best-in-class comparison, upgrade recommendations
- [ ] **Phase 31: Dark Sky & Astro Info** - Bortle class, moon phase, sunrise/sunset per location and trip dates

**Wave 4 — Depends on Wave 3:**
- [ ] **Phase 32: Deal Monitoring** - Target price on wishlist items, on-demand price check via Claude, deal alerts

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
**Plans**: 0/TBD

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
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 1 — fully parallel with Phases 25 and 27

### Phase 27: Safety Float Plan
**Goal**: Replace Claude-composed float plan email with a deterministic plain-text template, strip gear list and checklist status, keep email-only delivery
**Depends on**: None
**Requirements**: FLOAT-TEMPLATE-01, FLOAT-TEMPLATE-02, FLOAT-TEMPLATE-03
**Success Criteria** (what must be TRUE):
  1. Float plan email uses plain-text template (no Claude API call, no AI token cost)
  2. Email contains only: destination, dates, vehicle, expected return, notes, map link
  3. Gear list, checklist status, and weather notes removed from email body
  4. Dead code (composeFloatPlanEmail, FloatPlanEmailSchema) removed from codebase
  5. `npm run build` passes
**Plans**: 1 plan

Plans:
- [x] 27-01-PLAN.md — Replace Claude call with plain-text template + remove dead code

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
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 2 — can run parallel with Phase 29

### Phase 29: Vehicle Pre-Trip Checklist
**Goal**: Terrain-aware vehicle checklist (tires, oil, coolant, cargo) that surfaces in trip prep alongside the Day Sequencer
**Depends on**: Phase 26 (integrates with departure sequence)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Trip prep has a "Vehicle Check" card with checklist items
  2. Checklist items adapt to trip type (highway vs dirt road vs off-road)
  3. Items can be checked off and state persists
  4. Integrates with vehicle profile (shows relevant specs)
  5. `npm run build` passes
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 2 — can run parallel with Phase 28

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

### Phase 31: Dark Sky & Astro Info
**Goal**: Show Bortle class, moon phase, sunrise/sunset for trip locations and dates — useful for stargazing trips and photography
**Depends on**: None (independent, but lower priority)
**Requirements**: TBD
**Success Criteria** (what must be TRUE):
  1. Trip prep shows sunrise/sunset times for trip dates
  2. Moon phase displayed for each night of the trip
  3. Bortle class (light pollution) shown for trip location
  4. Data sourced from free APIs (no API key required)
  5. `npm run build` passes
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
**Plans**: 0/TBD

**Parallelization notes:**
- Wave 4 — depends on Phase 30 research infrastructure

## Progress

**Execution Order:**
- v1.0-v2.0: Phases 1-24 (complete)
- v3.0 Wave 1: Phases 25, 26, 27 (parallel)
- v3.0 Wave 2: Phases 28, 29 (parallel)
- v3.0 Wave 3: Phases 30, 31 (parallel)
- v3.0 Wave 4: Phase 32

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
| 25. Gear Docs & Manual Finder | v3.0 | 0/TBD | Not started | - |
| 26. Trip Day Sequencer | v3.0 | 1/3 | In Progress|  |
| 27. Safety Float Plan | v3.0 | 1/1 | Complete    | 2026-04-03 |
| 28. Weather-Aware Clothing | v3.0 | 0/TBD | Not started | - |
| 29. Vehicle Pre-Trip Checklist | v3.0 | 0/TBD | Not started | - |
| 30. Gear Product Research | v3.0 | 0/TBD | Not started | - |
| 31. Dark Sky & Astro Info | v3.0 | 0/TBD | Not started | - |
| 32. Deal Monitoring | v3.0 | 0/TBD | Not started | - |

---
*Full phase details for shipped milestones: see archives in `.planning/milestones/`*
