# Requirements: Outland OS

**Defined:** 2026-04-02
**Core Value:** Personal camping second brain — a closed-loop system that plans, executes, and learns from every trip

## v1.2 Requirements

Requirements for milestone v1.2 "Ship It". Each maps to roadmap phases.

### Build & Tech Debt

- [ ] **BUILD-01**: Production build (`npm run build`) completes without errors
- [ ] **BUILD-02**: Native SQLite deps (better-sqlite3, sqlite-vec) don't leak into client bundles
- [ ] **BUILD-03**: Raw `<button>` elements in PackingList/MealPlan replaced with design system Button
- [ ] **BUILD-04**: `variant="outline"` fix in PostTripReview Retry button
- [ ] **BUILD-05**: SettingsClient placeholder card replaced with actual content or removed
- [ ] **BUILD-06**: SW SHELL_ASSETS updated with dynamic trip routes
- [ ] **BUILD-07**: `tripCoords` piped to LeavingNowButton for tile prefetch
- [ ] **BUILD-08**: 6 `it.todo` test stubs implemented or removed
- [ ] **BUILD-09**: Low-value `usageStatus` array test rewritten or removed
- [ ] **BUILD-10**: ROADMAP.md consistency fixes (header + unchecked boxes)

### Cross-AI Review

- [ ] **REVIEW-01**: Gemini receives full codebase with structured review prompt
- [ ] **REVIEW-02**: Findings categorized by severity (critical/high/medium/low)
- [x] **REVIEW-03**: Actionable findings addressed or documented as deferred

### Production Deployment

- [ ] **DEPLOY-01**: `output: 'standalone'` configured in next.config.ts
- [ ] **DEPLOY-02**: Persistent data directory (`/data/outland/` for DB + photos)
- [ ] **DEPLOY-03**: `DATABASE_URL` uses absolute path in production env
- [ ] **DEPLOY-04**: PM2 ecosystem config with fork mode, log rotation
- [ ] **DEPLOY-05**: `pm2 startup` persists across Mac mini reboots
- [ ] **DEPLOY-06**: Deploy script (git pull → npm install → build → pm2 restart)
- [ ] **DEPLOY-07**: SQLite backup cron (daily .backup to timestamped file)
- [ ] **DEPLOY-08**: Service worker cache version bumps on deploy

### Remote Access

- [ ] **ACCESS-01**: Tailscale installed and running on Mac mini
- [ ] **ACCESS-02**: Tailscale installed on Will's iPhone
- [ ] **ACCESS-03**: MagicDNS provides stable hostname for the app
- [ ] **ACCESS-04**: HTTPS works via Tailscale (required for PWA service worker)
- [ ] **ACCESS-05**: App is installable as PWA from phone over Tailscale

## v2.0 Requirements

Requirements for milestone v2.0 "Personal Second Brain". Each maps to v2.0 roadmap phases.

### Photo Auto-Import (Phase 16)

- [ ] **PHOTO-01**: Bulk file upload endpoint (`POST /api/photos/bulk-import`) accepts multipart array of files
- [ ] **PHOTO-02**: Each file processed through existing EXIF extraction + sharp compression pipeline
- [ ] **PHOTO-03**: Progress feedback shown during import; individual failures don't abort batch
- [ ] **PHOTO-04**: Imported photos with GPS data appear as pins on Spots map

### Feedback-Driven Packing (Phase 17)

- [x] **PACK-01**: `generatePackingList()` in `lib/claude.ts` accepts feedback context parameter
- [x] **PACK-02**: `/api/packing-list` queries last 3-5 `TripFeedback` records and aggregates per-item status
- [x] **PACK-03**: Graceful degradation — no trip history produces identical output to current behavior
- [x] **PACK-04**: Claude prompt includes gear feedback summary; output contains feedback-informed notes when history exists

### Fuel & Last Stop Planner (Phase 18)

- [x] **FUEL-01**: New `lib/overpass.ts` utility queries Overpass API for fuel/grocery/hardware POIs
- [x] **FUEL-02**: New endpoint `GET /api/trips/[id]/last-stops` returns closest 1-2 of each POI type
- [ ] **FUEL-03**: "Fuel & Last Stops" card in TripPrepClient shows name + distance; handles no-results case

### Dog-Aware Trip Planning (Phase 19)

- [ ] **DOG-01**: `bringingDog Boolean @default(false)` field on `Trip` model with migration
- [ ] **DOG-02**: Trip create/edit form has "Bringing dog?" toggle
- [ ] **DOG-03**: When `bringingDog` is true, packing list prompt includes dog gear section
- [ ] **DOG-04**: Trip card shows 🐕 indicator when `bringingDog` is true

### Live Location Sharing (Phase 20)

- [ ] **LOC-01**: `SharedLocation` model with slug, lat, lon, label, updatedAt
- [ ] **LOC-02**: Public route `/share/[slug]` renders Leaflet map with last-known pin + timestamp
- [ ] **LOC-03**: Will can update location and copy shareable URL from within the app

### Permit & Reservation (Phase 21)

- [ ] **PERMIT-01**: `permitUrl` and `permitNotes` fields on `Trip` model with migration
- [ ] **PERMIT-02**: "Permits & Reservations" card in TripPrepClient
- [ ] **PERMIT-03**: Trip card shows 📋 indicator when `permitUrl` is set

### Plan A/B/C Fallback Chain (Phase 22)

- [ ] **ALT-01**: `fallbackFor` and `fallbackOrder` self-relation fields on `Trip` model with migration
- [ ] **ALT-02**: "Add Plan B" flow in TripsClient; alternatives listed in TripPrepClient
- [ ] **ALT-03**: Trip card shows badge when alternatives exist; deleting primary sets `fallbackFor = null`

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Infrastructure

- **INFRA-01**: Coolify or similar PaaS dashboard for visual management
- **INFRA-02**: CI/CD pipeline for automated deploy on git push
- **INFRA-03**: Litestream replication for real-time SQLite backup

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| Docker containerization | Single app on owned hardware; native deps simpler without containers |
| Nginx / reverse proxy | Tailscale provides encrypted access directly |
| Public internet exposure | Private Tailscale mesh only; no need for public URLs |
| CI/CD pipeline | Single developer; manual deploy via script is sufficient |
| Cloudflare Tunnel | Tailscale is simpler and more secure for private single-user access |
| Cluster mode (PM2) | SQLite requires single process; cluster mode causes locking |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| BUILD-01 | Phase 12 | Pending |
| BUILD-02 | Phase 12 | Pending |
| BUILD-03 | Phase 12 | Pending |
| BUILD-04 | Phase 12 | Pending |
| BUILD-05 | Phase 12 | Pending |
| BUILD-06 | Phase 12 | Pending |
| BUILD-07 | Phase 12 | Pending |
| BUILD-08 | Phase 12 | Pending |
| BUILD-09 | Phase 12 | Pending |
| BUILD-10 | Phase 12 | Pending |
| REVIEW-01 | Phase 12 | Pending |
| REVIEW-02 | Phase 12 | Pending |
| REVIEW-03 | Phase 13 | Complete |
| DEPLOY-01 | Phase 14 | Pending |
| DEPLOY-02 | Phase 14 | Pending |
| DEPLOY-03 | Phase 14 | Pending |
| DEPLOY-04 | Phase 14 | Pending |
| DEPLOY-05 | Phase 14 | Pending |
| DEPLOY-06 | Phase 14 | Pending |
| DEPLOY-07 | Phase 14 | Pending |
| DEPLOY-08 | Phase 14 | Pending |
| ACCESS-01 | Phase 15 | Pending |
| ACCESS-02 | Phase 15 | Pending |
| ACCESS-03 | Phase 15 | Pending |
| ACCESS-04 | Phase 15 | Pending |
| ACCESS-05 | Phase 15 | Pending |

**Coverage:**
- v1.2 requirements: 26 total
- Mapped to phases: 26
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
