# Milestones

## v4.0 Smarter Feedback Loops (Shipped: 2026-04-04)

**Phases:** 36-44 + S16-S38 (22 sessions)
**Timeline:** 2026-04-04 (1 day, parallel sessions)

**Key accomplishments:**

- Post-trip auto-review modal (gear/meals/spot feedback) feeding the learning loop
- Personal signal map with color-coded map overlay and filter chips
- GPX trail import with map overlay
- Camp kit presets with save-from-packing-list, multi-kit stacking, Claude review
- Trip cost tracking with per-trip expense badges
- Google Maps list import (paste shared URL → pull pins into app)
- Voice ghostwriter, gear ROI tracker, seasonal spot ratings, fire ban alerts
- Siri/Reminders inbox, LNT checklist, gear lending/maintenance tracking
- Shareable trip reports, altitude awareness, scenic stops layer
- Destination discovery, scheduled intelligence, chat agent memory
- UX polish: nav restructure, empty states, skeleton loaders, trip prep stepper

---

## v3.0 Gear Intelligence + Day-Of (Shipped: 2026-04-04)

**Phases:** 25-35 (11 phases)
**Timeline:** 2026-04-03 → 2026-04-04 (2 days)

**Key accomplishments:**

- Gear docs/manual finder with Claude-powered PDF search and offline caching
- Trip day sequencer — time-anchored departure checklist
- Safety float plan email (deterministic, no AI token cost)
- Weather-aware clothing suggestions in packing lists
- Vehicle pre-trip checklist (terrain-aware, check-off state)
- Gear product research with Claude alternatives comparison
- Dark sky/astro info (moon phase, Bortle estimation, sunrise/sunset)
- Deal monitoring (target prices, Claude price checks, deal alerts)
- Conversational trip planner (full-screen chat replaces static trip form)
- Meal planning core + shopping list + prep guide + meal feedback loop
- Agent jobs infrastructure (async queue, Mac mini background processing)

---

## v2.0 Smarter & Sharper (Shipped: 2026-04-03)

**Phases:** 16-24 (9 phases)
**Timeline:** 2026-04-03 (1 day)

**Key accomplishments:**

- Photo bulk import with EXIF GPS extraction
- Feedback-driven packing personalization from trip history
- Fuel & last stop planner via Overpass API
- Dog-aware trip planning (toggle, dog gear section, dog-friendly notes)
- Live location sharing (public URL with GPS)
- Permit & reservation storage
- Plan A/B/C fallback chain for trips
- Gear category expansion (7 → 15 categories)
- Smart inbox / universal intake for phone share-to-app

---

## v1.2 Ship It (Shipped: 2026-04-03)

**Phases:** 12-15 (4 phases)
**Timeline:** 2026-04-02 → 2026-04-03

**Key accomplishments:**

- Production build fixed, Gemini cross-AI review
- Security fixes (path traversal, XSS, JSON.parse hardening)
- Mac mini deployment (PM2, backups, deploy script)
- Tailscale VPN + HTTPS, PWA verified from phone

---

## v1.1 Close the Loop (Shipped: 2026-04-02)

**Phases:** 6-11 (6 phases, 23 plans)
**Timeline:** 2026-04-01 → 2026-04-02 (2 days)
**Requirements:** 15/15 satisfied
**Audit:** tech_debt (11 items accepted, no critical blockers)

**Key accomplishments:**

- Stabilized all AI features with Zod validation (parseClaudeJSON utility), packing list + meal plan persistence that survives navigation, and complete CRUD for trips/vehicles/photos
- Built day-of execution tools: Claude-generated departure checklist with interactive check-off and safety float plan email to emergency contact via Gmail
- Shipped PWA with offline mode: installable app, "Leaving Now" IndexedDB caching, offline app shell, and map tile prefetch for field use without signal
- Created the learning loop: gear usage tracking (used/didn't need/forgot), AI post-trip debrief summary, and voice notes that write back to gear/location records
- Wired full offline read path: components read IndexedDB directly when offline, offline write queue for check-offs, sync on reconnect
- Comprehensive test coverage: 190 test files across all phases with 90+ passing tests

**Known Tech Debt (11 items):**

See `.planning/milestones/v1.1-MILESTONE-AUDIT.md` for full list. Highlights:
- `npm run build` fails due to missing native deps from Phase 3 RAG (pre-existing)
- 6 `it.todo` test stubs remain (DB/API integration tests)
- `tripCoords` not piped to tile prefetch (graceful skip)
- `variant="outline"` invalid ButtonVariant in PostTripReview

---

## v1.0 Foundation (Shipped: 2026-04-01)

**Phases:** 1-5 (5 phases, 14 plans)
**Requirements:** All validated

**Key accomplishments:**

- Executive trip prep dashboard with traffic light status for weather, packing, meals, and power
- SQLite RAG knowledge base with hybrid search (FTS5 + vec0 via RRF)
- Messenger-style chat agent with tool-calling loop, context windowing, and agent memory
- AI-powered spot recommendations and voice capture with structured insight extraction
- Validated all 17 v1.0 requirements across 5 phases

---
