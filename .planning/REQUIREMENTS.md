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

Requirements for milestone v2.0 "Smarter & Sharper". Each maps to roadmap phases 16-22.

### Dog-Aware Trip Planning (Phase 19)

- [x] **DOG-01**: Trip create/edit form has "Bringing dog?" boolean toggle (defaults false) — UI in 19-02
- [x] **DOG-02**: When `bringingDog = true`, packing list includes a "Dog" section with: food + collapsible bowl, water bowl, leash + backup leash, poop bags (2x), dog first aid (tweezers, wound spray)
- [x] **DOG-03**: Trip card shows 🐕 indicator when `bringingDog` is true — UI in 19-02
- [x] **DOG-04**: When `bringingDog = false`, no dog items appear in packing list (no regression to existing behavior)
- [x] **DOG-05**: Trip edit supports toggling `bringingDog` on existing trips (PUT endpoint accepts + persists)

### Gear Category Expansion (Phase 23)

- [ ] **GEAR-CAT-01**: `lib/gear-categories.ts` is the single source of truth — all category definitions, emojis, groups, and helpers exported from this module
- [ ] **GEAR-CAT-02**: 15 categories in 4 visual groups (Living: shelter/sleep/cook/hydration/clothing; Utility: lighting/tools/safety/furniture; Tech/Power: power/electronics/vehicle; Action: navigation/hiking/dog)
- [ ] **GEAR-CAT-03**: Gear page shows grouped filter chips using the 4 visual groups
- [ ] **GEAR-CAT-04**: GearForm includes 3 new optional fields: modelNumber, connectivity, manualUrl (for tech gear)
- [ ] **GEAR-CAT-05**: Prisma migration adds modelNumber, connectivity, manualUrl to GearItem
- [ ] **GEAR-CAT-06**: Seed data re-categorizes 9 items (fairy lights/wall sconces/flood lights→lighting, camp table/Helinox Chair→furniture, fire extinguisher/first aid kit→safety, Garmin inReach→navigation, water jug pump→hydration)
- [ ] **GEAR-CAT-07**: All local category duplicates removed (GearClient, DashboardClient, claude.ts, power.ts, agent tools) — all import from shared module

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
| DOG-01 | Phase 19 Plan 02 | Pending (UI in 19-02) |
| DOG-02 | Phase 19 Plan 01 | Complete |
| DOG-03 | Phase 19 Plan 02 | Pending (UI in 19-02) |
| DOG-04 | Phase 19 Plan 01 | Complete |
| DOG-05 | Phase 19 Plan 01 | Complete |

| GEAR-CAT-01 | Phase 23 | Pending |
| GEAR-CAT-02 | Phase 23 | Pending |
| GEAR-CAT-03 | Phase 23 | Pending |
| GEAR-CAT-04 | Phase 23 | Pending |
| GEAR-CAT-05 | Phase 23 | Pending |
| GEAR-CAT-06 | Phase 23 | Pending |
| GEAR-CAT-07 | Phase 23 | Pending |

**Coverage:**
- v1.2 requirements: 26 total
- v2.0 requirements: 12 total (5 DOG + 7 GEAR-CAT)
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
