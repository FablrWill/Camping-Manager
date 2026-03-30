# Outland OS

## What This Is

A personal second brain for car camping — an AI-powered knowledge system that has the camping expertise, local area knowledge, and logistical memory that Will doesn't. Not a commercial product or app for others. It's a personal tool that manages gear, plans trips, tracks spots, and uses Claude as a camping-expert agent. Built as a mobile-first web app for one user (Will Sink, Asheville NC, Santa Fe Hybrid camper).

## Core Value

**Personal camping second brain** — a system that knows more about camping logistics, gear, and the local area than Will does. Everything lives in one place, and the AI layer provides the expertise. The value isn't any single feature — it's having a knowledgeable assistant that remembers everything and thinks ahead.

## Context

- **Builder:** Will Sink — 42, ADHD, founder of Fablr.ai, new to coding, learning via Claude Code
- **Vehicle:** 2025 Hyundai Santa Fe Hybrid (car camping, not overlanding)
- **Power:** EcoFlow portable power station + solar panels
- **Upcoming:** Getting a dog soon — will need pet-aware trip planning
- **Sessions completed:** 14 (foundation, maps, photos, timeline, weather, AI packing, meal plan, power budget)
- **Dev setup:** Local dev, Starlink for remote sessions, Mac mini at home for heavy ops

## Tech Stack

- **Framework:** Next.js 16 (App Router) — mobile-first responsive
- **Language:** TypeScript throughout
- **Styling:** Tailwind CSS + CSS custom properties design system
- **Database:** SQLite via Prisma ORM (9 models)
- **Maps:** Leaflet + OpenStreetMap (free, no API key)
- **AI:** Claude API (Anthropic SDK) — packing lists, meal plans, future agent features
- **Weather:** Open-Meteo (free, no API key)
- **Auth:** None (single user)
- **Python tools:** Google Takeout extraction + AI enrichment scripts

## Requirements

### Validated

- ✓ Project scaffolding (Next.js 16, TS, Tailwind, Prisma, SQLite) — existing
- ✓ Database schema with 9 models — existing
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

### Active

**Phase 2 — Trip Prep (finish the core loop):**
- [ ] Meal planning with shopping list (Claude API, home prep vs camp cooking)
- [ ] Power budget calculator (EcoFlow + solar + devices, weather-adjusted)
- [ ] Executive trip prep flow (single view: weather → packing → meals → power → checklist)
- [ ] Auto-tag photos to trips/locations (GPS proximity + timestamp)

**Phase 3 — Smart Campsite:**
- [ ] Smart device fields on GearItem model
- [ ] Smart device UI in gear inventory
- [ ] Campsite setup checklist in trip planning
- [ ] Claude device suggestions
- [ ] Home Assistant bridge — status dashboard
- [ ] HA automation templates

**Phase 3 — Intelligence & Agent:**
- [ ] AI trip recommendations ("find me a spot within 2hrs")
- [ ] Voice Ghostwriter / trip debrief
- [ ] Chat interface (messenger-style agent)
- [ ] NC camping knowledge base (RAG)
- [ ] Gear photo identification
- [ ] Link/screenshot → gear import
- [ ] Safety float plan
- [ ] Nearby trails & recreation API
- [ ] User guide finder (auto-search product manuals)
- [ ] Fuel & last stop planner
- [ ] Permit & registration handling
- [ ] Vehicle pre-trip checklist
- [ ] Post-trip auto-review
- [ ] Wear planning (weather-based clothing)
- [ ] Wishlist deal finder
- [ ] Agent orchestration layer

**Phase 4 — Polish & Deploy:**
- [ ] Offline-first / PWA
- [ ] Download for offline pre-trip
- [ ] Deploy to Vercel (SQLite → Postgres)
- [ ] Trip timeline view
- [ ] Shareable trip reports
- [ ] Cost tracking per trip
- [ ] Gear ROI tracker
- [ ] Dark sky / sun / moon info
- [ ] Water source tracking
- [ ] Dog planning (pet-friendly sites, packing, trail rules)
- [ ] Leave No Trace checklist
- [ ] Buddy trip mode
- [ ] Gear lending tracker
- [ ] Signal map (cell + Starlink quality per spot)
- [ ] Seasonal ratings
- [ ] GPX import
- [ ] Google Maps list import

### Out of Scope

- Multi-user auth — single user tool, no login needed
- Native mobile app — PWA is sufficient
- Real-time collaboration — solo user
- Commercial deployment — personal project

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| SQLite over Postgres | Simplicity for single user, easy local dev | Working well, migrate at deploy |
| Open-Meteo over paid weather API | Free, no API key, sufficient data | ✓ Validated |
| Claude API for all AI features | Already integrated, Will knows Anthropic ecosystem | ✓ Validated |
| Leaflet over Google Maps | Free, no API key, open source | ✓ Validated |
| No auth system | Single user, personal tool | Active — revisit if sharing |
| Mobile-first design | Will primarily uses from phone | ✓ Validated |

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
*Last updated: 2026-03-30 after initialization*
