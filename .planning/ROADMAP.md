# Roadmap: Outland OS

## Milestones

- ✅ **v1.0 Foundation** — Phases 1-5 (shipped 2026-04-01) — [archive](milestones/v1.0-ROADMAP.md)
- ✅ **v1.1 Close the Loop** — Phases 6-11 (shipped 2026-04-02) — [archive](milestones/v1.1-ROADMAP.md)
- ✅ **v1.2 Ship It** — Phases 12-15 (shipped 2026-04-03)
- 🚧 **v2.0 Personal Second Brain** — Phases 16-22 (in progress)

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

### 🚧 v2.0 Personal Second Brain (In Progress)

**Milestone Goal:** Turn Outland OS into a true camping second brain — AI that remembers, learns from past trips, and plans smarter over time. Each phase adds a self-contained v2.0 capability.

- [ ] **Phase 16: Photo Auto-Import** - Bulk import from device camera roll; EXIF GPS extraction; progress tracking
- [ ] **Phase 17: Feedback-Driven Packing** - Use post-trip gear feedback history to improve future packing list AI recommendations
- [ ] **Phase 18: Fuel & Last Stop Planner** - Pre-trip last gas/grocery/hardware finder via OpenStreetMap Overpass API
- [ ] **Phase 19: Dog-Aware Trip Planning** - Dog toggle on trips; dog gear section in packing list; dog-friendly notes
- [ ] **Phase 20: Live Location Sharing** - Shareable public URL showing Will's last known location on a Leaflet map
- [ ] **Phase 21: Permit & Reservation Awareness** - Store Recreation.gov confirmation URL + notes on trips; permit card in trip prep
- [ ] **Phase 22: Plan A/B/C Fallback Chain** - Link trips as fallback alternatives; fallback card in trip prep with weather compare

## Feature Specs

### Phase 16: Photo Auto-Import (Phase 16)
**Goal**: Will can select multiple photos at once and bulk-import them — EXIF GPS is extracted automatically and photos appear on the Spots map
**Depends on**: Phase 15 (production app running)
**Requirements**: PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04
**Success Criteria** (what must be TRUE):
  1. User can select multiple files via `<input type=file multiple>` in the Photos section
  2. Each file is processed through the existing EXIF + sharp compress pipeline
  3. Progress feedback shown during import (e.g., "Importing 12 of 50...")
  4. Individual file failures don't abort the batch — errors collected and reported at end
  5. Imported photos with GPS EXIF appear as pins on the Spots map

### Phase 17: Feedback-Driven Packing
**Goal**: Packing list generation uses gear feedback from past trips — items marked "didn't need" are deprioritized, forgotten items are flagged
**Depends on**: Phase 15 (production app running)
**Requirements**: PACK-01, PACK-02, PACK-03, PACK-04
**Success Criteria** (what must be TRUE):
  1. `generatePackingList()` in `lib/claude.ts` accepts and injects gear feedback history into the Claude prompt
  2. Feedback is aggregated from last 3-5 `TripFeedback` records (existing model, no schema change)
  3. When no trip history exists, packing list generates identically to current behavior
  4. When history exists, Claude prompt includes a gear feedback summary (visible in server logs)
  5. Packing list output contains at least one feedback-informed note when history is available
**Plans:** 2 plans

Plans:
- [ ] 17-01-PLAN.md — GearFeedbackSummary interface + buildFeedbackSection() + tests (PACK-01, PACK-03, PACK-04)
- [ ] 17-02-PLAN.md — API route feedback aggregation query + wiring (PACK-02)

**Parallelization notes:**
- Plan 17-01 is Wave 1 — pure function additions to lib/claude.ts
- Plan 17-02 is Wave 2 — depends on Plan 01 exports for API route wiring

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
