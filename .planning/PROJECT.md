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
- **Sessions completed:** 20 (foundation through intelligence features, plus project review)
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

## Current Milestone: v1.1 Close the Loop

**Goal:** Stabilize the foundation, add offline capability, and build the learning loop — so the app survives a real camping trip and gets smarter from it.

**Target features:**
- Stabilize: fix critical bugs, add Zod validation, complete CRUD gaps, persist AI-generated data
- Offline mode: PWA with "Leaving Now" trigger that caches trip data for field use
- Learning loop: post-trip debrief that writes back to gear, locations, and packing logic
- Day-of execution: Trip Day Sequencer, safety email, final weather/road check

### Active

**v1.1 — Stabilize:**
- [ ] Fix critical bugs (JSON parsing, missing deps, dashboard stat, LocationForm dark mode)
- [ ] Add Zod validation for all Claude API responses (parseClaudeJSON utility)
- [ ] Complete CRUD gaps (trip edit/delete UI, vehicle edit, mod edit/delete, photo delete)
- [ ] Persist packing list and meal plan results to database
- [ ] Adopt design system UI primitives across existing forms

**v1.1 — Offline / Day-Of:**
- [ ] PWA with service worker for offline trip data
- [ ] "Leaving Now" trigger (cache weather, packing list, meal plan, map pins, emergency info)
- [ ] Trip Day Sequencer (time-sequenced departure checklist from packing + meals + power)
- [ ] Safety email (trip summary to emergency contact on departure)

**v1.1 — Learning Loop:**
- [ ] Gear usage tracking (mark items used/unused post-trip)
- [ ] Post-trip auto-review (packed but didn't use, forgot but needed)
- [ ] Voice debrief → automatic system updates (gear notes, location ratings, packing improvements)
- [ ] Feedback-driven packing list improvements (learn from trip history)

**Future (v2.0+):**
- [ ] Smart campsite / Home Assistant bridge (blocked on hardware)
- [ ] Plan A/B/C fallback chain for trip planning
- [ ] Photo auto-import from iCloud/Google Photos
- [ ] Nearby trails & recreation API
- [ ] Fuel & last stop planner
- [ ] Permit & reservation awareness
- [ ] Dog planning (pet-friendly sites, packing, trail rules)
- [ ] Knowledge base expansion (2500+ chunks)
- [ ] Deploy to Vercel (database migration when ready)

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
| Closed-loop system (Plan→Execute→Learn→Improve) | v2.0 vision — the app gets smarter from every trip | Active — v1.1 builds the foundation |
| Tailscale before Vercel | Access from phone without database migration | Active — deploy to Vercel later |

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
*Last updated: 2026-04-01 — Milestone v1.1 started (Close the Loop)*
