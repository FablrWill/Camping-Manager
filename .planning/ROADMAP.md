# Roadmap: Outland OS

## Milestones

- ✅ **v1.0 Foundation** — Phases 1-5 (shipped 2026-04-01) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Close the Loop** — Phases 6-11 (shipped 2026-04-02) — [archive](milestones/v1.1-ROADMAP.md)
- 🚧 **v1.2 Ship It** — Phases 12-15 (in progress)

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

### 🚧 v1.2 Ship It (In Progress)

**Milestone Goal:** Cross-AI review, fix all tech debt, get production build working, and deploy to Mac mini so Will can use Outland OS from his phone anywhere.

- [ ] **Phase 12: Fix Build & Clean House** - Fix broken build, resolve tech debt, run Gemini review in parallel
- [x] **Phase 13: Address Review Findings** - Act on actionable Gemini feedback before shipping to production (completed 2026-04-03)
- [ ] **Phase 14: Production Deployment** - Configure Mac mini with PM2, persistent data, backups, deploy script
- [x] **Phase 15: Remote Access & Go Live** - Tailscale mesh VPN, HTTPS, PWA verification from phone (completed 2026-04-03)

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
**Plans**: TBD

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

## v2.0 Phases

### Phase 16: Photo Auto-Import
**Goal**: Will can bulk-import photos from his device camera roll or a local folder; each photo is auto-processed through EXIF extraction, GPS pinning, and compression without manual one-by-one upload
**Depends on**: Phase 15 (app live)
**Requirements**: PHOTO-IMPORT-01, PHOTO-IMPORT-02, PHOTO-IMPORT-03, PHOTO-IMPORT-04, PHOTO-IMPORT-05
**Success Criteria** (what must be TRUE):
  1. User can select multiple files at once via `<input type=file multiple>`
  2. Each file is processed through the same EXIF + compress pipeline as single upload
  3. Progress is shown during import (e.g., "Importing 12 of 50...")
  4. Failures on individual files don't abort the whole batch — errors collected and reported at end
  5. Imported photos with EXIF GPS appear on the Spots map with pins
**Plans**: TBD

**Parallelization notes:**
- New `bulk-import` API route is independent of UI changes
- `PhotoUpload.tsx` button addition is independent of API work

### Phase 17: Feedback-Driven Packing
**Goal**: Packing list generation uses past trip debrief data so Claude knows Will's gear history ("never uses camp chair", "always forgets headlamp") and reflects it in recommendations
**Depends on**: Phase 15 (app live)
**Requirements**: PACKING-FEEDBACK-01, PACKING-FEEDBACK-02, PACKING-FEEDBACK-03
**Success Criteria** (what must be TRUE):
  1. If no trip history exists, packing list generates same as before (graceful degradation)
  2. If TripFeedback records exist, Claude prompt includes gear feedback summary (visible in server logs)
  3. Packing list output includes at least one feedback-informed note when history is available
**Plans**: TBD

**Parallelization notes:**
- TripFeedback query + aggregation logic is backend-only; no schema changes needed

### Phase 18: Fuel & Last Stop Planner
**Goal**: Trip Prep section shows the last gas station, grocery store, and hardware/outdoor store before the campsite, pre-populated from OpenStreetMap Overpass API based on the trip's destination coordinates
**Depends on**: Phase 15 (app live)
**Requirements**: FUEL-STOP-01, FUEL-STOP-02, FUEL-STOP-03, FUEL-STOP-04
**Success Criteria** (what must be TRUE):
  1. "Fuel & Last Stops" card appears in Trip Prep section with 3 categories: Fuel, Grocery, Hardware/Outdoor
  2. Each category shows name + approximate distance from destination in miles
  3. Loading state shown while fetching
  4. If no results within 50km, shows "None found nearby — plan ahead"
  5. Uses trip's existing `latitude`/`longitude` fields; no new dependencies added
**Plans**: TBD

**Parallelization notes:**
- `lib/overpass.ts` utility and `app/api/trips/[id]/last-stops/route.ts` can be built before UI card

### Phase 19: Dog-Aware Trip Planning
**Goal**: When a trip is marked "bringing dog", the packing list includes a dedicated Dog section and the AI notes dog-friendly camping considerations
**Depends on**: Phase 15 (app live)
**Requirements**: DOG-TRIP-01, DOG-TRIP-02, DOG-TRIP-03, DOG-TRIP-04
**Success Criteria** (what must be TRUE):
  1. Trip form has a "Bringing dog?" toggle (boolean, defaults false)
  2. When true, packing list includes a dedicated "Dog" section with essential dog gear
  3. Dog indicator (🐕) visible on trip card when bringingDog is true
  4. Trip edit supports toggling bringingDog
  5. No dog gear added when bringingDog is false (no regression)
**Plans**: TBD

**Parallelization notes:**
- Schema migration (`bringingDog` field on Trip) must land before UI and claude.ts changes
- UI toggle and packing list prompt update are independent once schema is in place

### Phase 20: Live Location Sharing
**Goal**: Will can generate a shareable public URL that shows his most recent GPS location on a Leaflet map, which family can open in a browser without login or Tailscale
**Depends on**: Phase 15 (app live)
**Requirements**: LOCATION-SHARE-01, LOCATION-SHARE-02, LOCATION-SHARE-03, LOCATION-SHARE-04, LOCATION-SHARE-05
**Success Criteria** (what must be TRUE):
  1. Will can tap "Share Location" and receive a shareable URL
  2. The shared page works in a plain browser (no auth required)
  3. Shared page shows Leaflet map with a pin at last location, label, and "Last updated: X ago"
  4. Will can update his location (new lat/lon replaces old)
  5. Will can stop sharing (deletes the SharedLocation record)
**Plans:** 2/2 plans complete

Plans:
- [x] 20-01-PLAN.md — SharedLocation schema migration + API routes (backend only)
- [x] 20-02-PLAN.md — Public share page + ShareLocationButton + Cloudflare Tunnel setup

**Parallelization notes:**
- Plan 20-01 is Wave 1 — backend must exist before UI
- Plan 20-02 is Wave 2 — depends on 20-01

### Phase 21: Permit & Reservation Awareness
**Goal**: Will can attach a Recreation.gov confirmation URL and permit notes to any trip; the trip card shows a permit indicator and trip prep surfaces the booking details
**Depends on**: Phase 18 (TripPrepClient.tsx), Phase 20 (SpotMap.tsx)
**Requirements**: PERMIT-01, PERMIT-02, PERMIT-03, PERMIT-04
**Success Criteria** (what must be TRUE):
  1. Can add `permitUrl` and `permitNotes` to any trip via trip edit form
  2. Trip card shows 📋 indicator when permitUrl is set
  3. Trip prep card renders permit info with "View Booking" link (opens in new tab)
  4. No Recreation.gov API — manual paste only; no new dependencies
**Plans**: TBD

**Parallelization notes:**
- Schema migration + API patch can land before UI changes
- TripCard indicator and TripPrepClient card are independent UI tasks

### Phase 22: Plan A/B/C Fallback Chain
**Goal**: Will can link Plan B and Plan C trips to a primary trip; trip prep shows all alternatives with weather comparison so he can pick the right destination on the day
**Depends on**: Phase 19 (Trip model + claude.ts), Phase 21 (TripPrepClient.tsx)
**Requirements**: FALLBACK-01, FALLBACK-02, FALLBACK-03, FALLBACK-04, FALLBACK-05
**Success Criteria** (what must be TRUE):
  1. Can create a trip as a Plan B or Plan C for any existing trip
  2. Trip prep shows all alternatives with destination + weather comparison
  3. Trip card shows how many alternatives exist
  4. Alternatives are first-class trips with their own gear/checklists, just with a `fallbackFor` link
  5. Deleting the primary trip does not cascade-delete alternatives (sets `fallbackFor = null`)
**Plans**: TBD

**Parallelization notes:**
- Schema migration (self-relation on Trip) must land first
- "Add Plan B" UI and TripPrepClient "Fallback Plans" card are independent once schema is in place

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15, then v2.0: 16-20 (parallel) -> 21 (needs 18+20) -> 22 (needs 19+21)

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
| 14. Production Deployment | v1.2 | 0/TBD | Not started | - |
| 15. Remote Access & Go Live | v1.2 | 0/2 | Complete    | 2026-04-03 |
| 16. Photo Auto-Import | v2.0 | 0/TBD | Not started | - |
| 17. Feedback-Driven Packing | v2.0 | 0/TBD | Not started | - |
| 18. Fuel & Last Stop Planner | v2.0 | 0/TBD | Not started | - |
| 19. Dog-Aware Trip Planning | v2.0 | 0/TBD | Not started | - |
| 20. Live Location Sharing | v2.0 | 2/2 | Complete    | 2026-04-03 |
| 21. Permit & Reservation | v2.0 | 0/TBD | Not started | - |
| 22. Plan A/B/C Fallback Chain | v2.0 | 0/TBD | Not started | - |

---
*Full phase details for shipped milestones: see archives in `.planning/milestones/`*
