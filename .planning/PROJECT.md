# Outland OS

## What This Is

A personal second brain for car camping — an AI-powered knowledge system that plans trips, executes day-of logistics, works offline in the field, and learns from every trip. Not a commercial product. It's a personal tool that manages gear, plans trips, tracks spots, and uses Claude as a camping-expert agent. Built as a mobile-first PWA for one user (Will Sink, Asheville NC, Santa Fe Hybrid camper).

## Core Value

**Personal camping second brain** — a closed-loop system that plans, executes, and learns from every trip. Everything lives in one place, the AI layer provides the expertise, and each trip makes the system smarter.

## Context

- **Builder:** Will Sink — 42, ADHD, founder of Fablr.ai, new to coding, learning via Claude Code
- **Vehicle:** 2025 Hyundai Santa Fe Hybrid (car camping, not overlanding)
- **Power:** EcoFlow portable power station + solar panels
- **Upcoming:** Getting a dog soon — will need pet-aware trip planning
- **Sessions completed:** 25+ (foundation → intelligence → stabilization → offline → learning loop → polish)
- **Dev setup:** MacBook for development, Mac mini at home for production hosting
- **Production target:** Mac mini (always-on) — Node.js 20 LTS + PM2 + Tailscale, no Docker
- **Remote access:** Tailscale mesh VPN (private, encrypted, no public exposure)
- **Codebase:** 149 TS/TSX files, ~18K LOC app code, 190 test files (~38K LOC tests)

## Tech Stack

- **Framework:** Next.js 16 (App Router) — mobile-first responsive
- **Language:** TypeScript throughout
- **Styling:** Tailwind CSS + CSS custom properties design system
- **Database:** SQLite via Prisma ORM (13 models including MealPlan, TripFeedback, DepartureChecklist, FloatPlanLog, Settings)
- **Maps:** Leaflet + OpenStreetMap (free, no API key)
- **AI:** Claude API (Anthropic SDK) — packing lists, meal plans, departure checklists, float plans, trip summaries, chat agent
- **Search:** Hybrid RAG — FTS5 + vec0 via Reciprocal Rank Fusion
- **Weather:** Open-Meteo (free, no API key)
- **Email:** Nodemailer + Gmail SMTP for float plan delivery
- **Offline:** PWA with service worker + IndexedDB (idb-keyval)
- **Voice:** Browser MediaRecorder + server-side transcription
- **Testing:** Vitest + React Testing Library
- **Auth:** None (single user)
- **Hosting:** Mac mini (Node.js 20 LTS, PM2 process manager, no Docker/Nginx)
- **Remote Access:** Tailscale (WireGuard mesh VPN, MagicDNS, automatic HTTPS)

## Requirements

### Validated

- ✓ Project scaffolding (Next.js 16, TS, Tailwind, Prisma, SQLite) — existing
- ✓ Database schema with 13 models — existing + v1.1
- ✓ Mobile layout shell with bottom tab bar, dark mode — existing
- ✓ Home dashboard with live stats, recent gear, quick actions — existing
- ✓ Gear inventory CRUD with categories, search, wishlist — existing
- ✓ Vehicle profile with specs, cargo dimensions, mods CRUD — existing
- ✓ Design system / style guide (Button, Card, Badge, Input, Modal, etc.) — existing
- ✓ Interactive map with location/photo pins (Leaflet/OSM) — existing
- ✓ Photo upload with EXIF GPS extraction, auto-compress — existing
- ✓ Marker clustering + layer toggles — existing
- ✓ Google Takeout import (Python tools) — existing
- ✓ Timeline: GPS paths, place visits, day picker, path animation — existing
- ✓ Location save/edit with pin drop — existing
- ✓ Trip creation UI with date range, destination, countdown — existing
- ✓ Weather integration (Open-Meteo, camping alerts) — existing
- ✓ Claude API packing list generator — existing
- ✓ Seed data for dev (gear, locations, trips, mods) — existing
- ✓ AI output validation (Zod parseClaudeJSON utility) — v1.1
- ✓ AI output persistence (packing list + meal plan survive navigation) — v1.1
- ✓ Complete CRUD (trip edit/delete, vehicle edit, mod delete, photo delete) — v1.1
- ✓ Design system adoption across all existing forms — v1.1
- ✓ PWA installable with offline app shell — v1.1
- ✓ "Leaving Now" offline data caching (weather, packing, meals, spots, emergency) — v1.1
- ✓ Offline map tile caching — v1.1
- ✓ Departure checklist (time-ordered, from actual trip data) — v1.1
- ✓ Safety float plan email to emergency contact — v1.1
- ✓ Gear usage tracking (used/didn't need/forgot) — v1.1
- ✓ Post-trip AI summary (what to drop, what was missing, location rating) — v1.1
- ✓ Voice debrief with automatic gear/location updates — v1.1

### Validated in Phase 25 (gear-docs-manual-finder)

- ✓ GearDocument model with cascade delete and indexed gearItemId — Phase 25
- ✓ Migration: manualUrl data preserved → GearDocument rows, column dropped — Phase 25
- ✓ Claude-powered manual finder (no auto-save, user confirms) — Phase 25
- ✓ PDF download with content-type validation and local caching — Phase 25
- ✓ GearDocumentsTab UI: find/list/add/download/delete within gear modal — Phase 25

### Validated in Phase 34 (meal-planning-core)

- ✓ generateMealPlan accepts bringingDog — dog-safe food guidance injected when true — Phase 34
- ✓ Meal prep context (vacuum sealer, sous vide) present in Claude prompt — Phase 34
- ✓ PATCH /api/meal-plan regenerates a single meal slot without touching shopping list or prep timeline — Phase 34
- ✓ MealPlan.tsx per-meal regen: expand slot → "Regenerate this meal" button → spinner → "Meal updated" inline feedback — Phase 34
- ✓ TripCard shows 🍽️ Meal plan badge in stats row when a plan exists; silent when absent — Phase 34

### Active

None — v1.2 Ship It complete as of 2026-04-03.

### Validated in Phase 16 (photo-bulk-import)

- ✓ Bulk photo import with per-file EXIF GPS extraction + sharp compression — Phase 16
- ✓ Real-time "Importing X of Y..." progress counter in PhotoUpload UI — Phase 16
- ✓ Per-file error isolation (corrupt/GPS-less files skip without aborting batch) — Phase 16
- ✓ Imported photos with GPS appear as map pins after import — Phase 16

### Validated in v1.2 Ship It (Phases 12–15)

- ✓ Cross-AI review (Gemini full-project audit) — Phase 12
- ✓ Fixed broken npm run build (RAG native deps) — Phase 12
- ✓ Resolved all v1.1 tech debt items — Phase 12
- ✓ Addressed actionable Gemini feedback — Phase 13
- ✓ Production deployment on Mac mini (PM2 + launchd, `/data/outland/`) — Phase 14
- ✓ Remote access via Tailscale (`lisa-mini.tailfd6d06.ts.net`) — Phase 15
- ✓ PWA installed on iPhone, works offline over Tailscale — Phase 15

## Current State

Phase 34 complete (2026-04-04) — Meal Planning Core: generateMealPlan now accepts bringingDog (dog-safe food guidance injected into Claude prompt), per-meal regeneration via PATCH /api/meal-plan updates only the target slot, and TripCard shows a 🍽️ Meal plan badge in the stats row when a plan exists. Phase 33 also complete: Conversational Trip Planner. Human UAT approved for both.

## Current Milestone: ✅ v1.2 Ship It — COMPLETE (2026-04-03)

**Shipped:** Outland OS is live on the Mac mini, accessible from Will's iPhone anywhere via Tailscale HTTPS, installable as a PWA, and verified working offline.

### Out of Scope

- Multi-user auth — single user tool, no login needed
- Native mobile app — PWA is sufficient
- Real-time collaboration — solo user
- Commercial deployment — personal project
- Full region map tile download — 100MB-2GB per region; cache in-viewport tiles only, deep-link Gaia GPS
- Background check-in timer / dead man's switch — requires persistent server process
- Two-way offline sync / conflict resolution — single user, local SQLite
- Reservation / permit API integration — recreation.gov API is brittle; paste confirmation URL
- Rich text debrief editor — voice is the input modality, not keyboard
- Real-time offline sync — single-user local-first app; offline snapshot is read-only
- Docker containerization — single app on owned hardware, native deps are simpler without containers
- Nginx / reverse proxy — Tailscale provides encrypted access directly, no proxy needed
- CI/CD pipeline — single developer, deploy via git pull + pm2 restart

## Future (v2.0+)

- [x] Feedback-driven packing improvement — Validated in Phase 17 (infrastructure complete; improves automatically as trip history accumulates)
- [ ] Dead man's switch safety check-in (needs persistent server infrastructure)
- [ ] Dog-aware trip planning (waiting for dog arrival + needs assessment)
- [ ] Knowledge base expansion (2500+ chunks)
- [ ] Deploy to Vercel (if Mac mini hosting proves insufficient)
- [ ] Smart campsite / Home Assistant bridge (blocked on hardware)
- [x] Plan A/B/C fallback chain for trip planning — Validated in Phase 22
- [ ] Photo auto-import from iCloud/Google Photos
- [ ] Nearby trails & recreation API
- [ ] Fuel & last stop planner
- [ ] Permit & reservation awareness
- [ ] Live location sharing — shareable public map link

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite over Postgres | Simplicity for single user, easy local dev | ✓ Working well, migrate at deploy |
| Open-Meteo over paid weather API | Free, no API key, sufficient data | ✓ Validated |
| Claude API for all AI features | Already integrated, Will knows Anthropic ecosystem | ✓ Validated |
| Leaflet over Google Maps | Free, no API key, open source | ✓ Validated |
| No auth system | Single user, personal tool | ✓ Active — revisit if sharing |
| Mobile-first design | Will primarily uses from phone | ✓ Validated |
| Closed-loop system (Plan→Execute→Learn→Improve) | v1.1 vision — the app gets smarter from every trip | ✓ Validated v1.1 |
| IndexedDB for offline (not SW cache) | Structured data needs queryable storage, not response cache | ✓ Validated v1.1 |
| Manual sw.js over Serwist | Avoids Webpack/Turbopack conflict with Next.js 16 | ✓ Validated v1.1 |
| TripFeedback append-only (not @unique) | Multiple debriefs per trip; never mutate GearItem source records | ✓ Validated v1.1 |
| Zod .safeParse() not .parse() | Return 422 for schema mismatches, not 500 crashes | ✓ Validated v1.1 |
| safeJsonParse for DB-stored JSON | Never throw on corrupt DB content — return null, not 500 | ✓ Validated Phase 13 |
| escHtml() for Leaflet popups | DB-sourced strings in innerHTML must be escaped — XSS risk | ✓ Validated Phase 13 |
| Path guard before fs ops | Resolve + startsWith check prevents path traversal on imagePath | ✓ Validated Phase 13 |
| Plain text float plan email | HTML rendering varies across email clients; text is universal | ✓ Validated v1.1 |
| Settings singleton via hardcoded id | Enforces one row, upsert always targets same record | ✓ Validated v1.1 |
| Mac mini self-hosting over Vercel | Free, SQLite stays local, photos on disk, no cloud costs | — Pending v1.2 |
| No Docker | Single app, single user, native deps on Apple Silicon, Docker adds complexity with no benefit | — Pending v1.2 |
| Tailscale over Cloudflare Tunnel | Private mesh VPN, no public exposure, simpler for single-user | — Pending v1.2 |
| PM2 over systemd/launchd scripts | Auto-restart, log rotation, boot persistence, ecosystem config | — Pending v1.2 |

## Constraints

- **Single user** — no auth, no multi-tenancy complexity
- **Budget-conscious** — free APIs where possible (Open-Meteo, OSM)
- **ADHD-friendly dev** — small tasks, clear progress, scannable outputs
- **Mobile-first** — phone is primary device
- **Learning project** — Will is learning to code; explain decisions
- **HA hardware not available yet** — device registry now, bridge later (~mid-April 2026)

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd:transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd:complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-04-04 after Phase 31 complete — Dark Sky Astro Info shipped*
