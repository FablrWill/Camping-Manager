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

Requirements for milestone v2.0 "Field Intelligence".

### Fuel & Last Stop Planner (Phase 18)

- [x] **FUEL-01**: New API endpoint `app/api/trips/[id]/last-stops/route.ts` — queries Overpass API for fuel, supermarket, hardware stops within 50km of trip destination coordinates; returns sorted-by-distance results
- [x] **FUEL-02**: New utility `lib/overpass.ts` — wraps Overpass API queries for amenity=fuel, shop=supermarket, shop=hardware; calculates distance from destination; returns structured results
- [x] **FUEL-03**: "Fuel & Last Stops" card added to `components/TripPrepClient.tsx` — shows after weather card, before packing list; renders 3 categories with name + distance; shows loading state; shows "None found nearby" fallback

### Gear Category Expansion (Phase 23)

- [x] **GEAR-CAT-01**: `lib/gear-categories.ts` is the single source of truth — all category definitions, emojis, groups, and helpers exported from this module
- [x] **GEAR-CAT-02**: 15 categories in 4 visual groups (Living: shelter/sleep/cook/hydration/clothing; Utility: lighting/tools/safety/furniture; Tech/Power: power/electronics/vehicle; Action: navigation/hiking/dog)
- [x] **GEAR-CAT-03**: Gear page shows grouped filter chips using the 4 visual groups
- [x] **GEAR-CAT-04**: GearForm includes 3 new optional fields: modelNumber, connectivity, manualUrl (for tech gear)
- [x] **GEAR-CAT-05**: Prisma migration adds modelNumber, connectivity, manualUrl to GearItem
- [x] **GEAR-CAT-06**: Seed data re-categorizes 9 items (fairy lights/wall sconces/flood lights→lighting, camp table/Helinox Chair→furniture, fire extinguisher/first aid kit→safety, Garmin inReach→navigation, water jug pump→hydration)
- [x] **GEAR-CAT-07**: All local category duplicates removed (GearClient, DashboardClient, claude.ts, power.ts, agent tools) — all import from shared module

### Dark Sky & Astro Info (Phase 31)

- [ ] **ASTRO-01**: AstroCard component shows moon phase emoji + label per night of trip, with "Good for stars" / "Poor for stars" badge based on moon fraction < 25%
- [ ] **ASTRO-02**: Sunrise/sunset times displayed per night in AstroCard expanded view, sourced from existing DayForecast.sunrise/sunset (no new API call)
- [ ] **ASTRO-03**: Bortle link ("Check light pollution") opens lightpollutionmap.info pre-loaded to trip coordinates; hidden when trip has no location
- [ ] **ASTRO-04**: suncalc used for moon phase computation (client-side, no API key); no new env vars required
- [ ] **ASTRO-05**: npm run build passes with all new files; no type errors

## Future Requirements

Deferred to future release. Tracked but not in current roadmap.

### Hardening (from Cross-AI Review, 2026-04-03)

> Source: `.planning/review/CROSS-AI-REVIEWS.md` — Gemini (gemini-3-flash) + Codex (gpt-5.1-codex-max)

- **HARDEN-01**: Auth middleware — shared-secret header or local-only check on all API routes (Codex HIGH, Gemini LOW)
- **HARDEN-02**: File upload hardening — MIME allowlist + file size cap on photo/intake endpoints (both MEDIUM)
- **HARDEN-03**: LLM tool safety — server-side confirmation for destructive agent tool operations (delete, bulk update) (Codex HIGH)
- **HARDEN-04**: Rate limiting on Claude chat endpoint to prevent runaway API costs (both MEDIUM)
- **HARDEN-05**: E2E smoke tests for critical flows (chat, upload, map, offline cache) (both flagged gap)

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
| FUEL-01 | Phase 18 | Complete |
| FUEL-02 | Phase 18 | Complete |
| FUEL-03 | Phase 18 | Complete |
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

| GEAR-CAT-01 | Phase 23 | Complete |
| GEAR-CAT-02 | Phase 23 | Complete |
| GEAR-CAT-03 | Phase 23 | Complete |
| GEAR-CAT-04 | Phase 23 | Complete |
| GEAR-CAT-05 | Phase 23 | Complete |
| GEAR-CAT-06 | Phase 23 | Complete |
| GEAR-CAT-07 | Phase 23 | Complete |

**Coverage:**
- v1.2 requirements: 26 total
- v2.0 requirements: 12 total (5 DOG + 7 GEAR-CAT)
- Mapped to phases: 38
- Unmapped: 0

---
*Requirements defined: 2026-04-02*
*Last updated: 2026-04-02 after roadmap creation*
