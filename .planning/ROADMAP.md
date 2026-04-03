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
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Overpass utility + API route with tests (FUEL-01, FUEL-02)
- [ ] 18-02-PLAN.md — TripPrepClient card injection + visual verification (FUEL-03)

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

### 🚧 v2.0 Field Intelligence (In Progress)

**Milestone Goal:** Add smart field features: fuel & last-stop planning, feedback-driven packing, dog-aware trips, live location sharing, permit tracking, and Plan A/B/C fallback chains.

- [ ] **Phase 16: Photo Auto-Import** - Bulk import photos from camera roll with EXIF GPS extraction
- [ ] **Phase 17: Feedback-Driven Packing** - Use trip debrief history to inform Claude packing list
- [ ] **Phase 18: Fuel & Last Stop Planner** - Show last gas/grocery/hardware stop before campsite via Overpass API
- [ ] **Phase 19: Dog-Aware Trip Planning** - Add dog toggle to trips; Claude adds dog gear section to packing list
- [ ] **Phase 20: Live Location Sharing** - Shareable public URL showing Will's last known GPS location
- [ ] **Phase 21: Permit & Reservation** - Store Recreation.gov confirmation URL + notes on trip
- [ ] **Phase 22: Plan A/B/C Fallback Chain** - Link fallback trips to a primary trip; compare in trip prep

### Phase 18: Fuel & Last Stop Planner
**Goal**: Will sees the last gas station, grocery store, and hardware/outdoor store before his campsite, pre-populated from OpenStreetMap Overpass API, so he knows what to stock up on before going off-grid
**Depends on**: Phase 15 (app live on Mac mini)
**Requirements**: FUEL-01, FUEL-02, FUEL-03
**Success Criteria** (what must be TRUE):
  1. A "Fuel & Last Stops" card appears in the Trip Prep section for any trip with destination coordinates
  2. Card shows up to 2 results each for: fuel, grocery (supermarket), and hardware stops within 50km
  3. Each result shows name + approximate distance in miles from destination
  4. If no results found within 50km, card shows "None found nearby — plan ahead"
  5. Loading state shown while fetching from Overpass API
  6. No new npm dependencies added (fetch + JSON only)
**Plans**: 2 plans

Plans:
- [ ] 18-01-PLAN.md — Overpass utility + API route with tests (FUEL-01, FUEL-02)
- [ ] 18-02-PLAN.md — TripPrepClient card injection + visual verification (FUEL-03)

## Progress

**Execution Order:**
Phases execute in numeric order: 12 -> 13 -> 14 -> 15

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

---
*Full phase details for shipped milestones: see archives in `.planning/milestones/`*
