# Session 34b — Phase 31: Dark Sky, Astro Info & Activity Gear

**Date:** 2026-04-04
**Phase:** 31 — Dark Sky, Astro Info & Activity Gear Recommendations
**Model:** Opus 4.6

## What Changed

### New: Activities Gear Category
- Added `activities` category to `lib/gear-categories.ts` (emoji: target)
- Covers leisure/entertainment gear: telescope, projector, speakers, kayak, fishing rod, camera, etc.
- Lives in the "Action" group alongside Navigation, Hiking, Dog

### New: Astronomy Utility Library (`lib/astro.ts`)
- **Moon phase calculator** — Synodic month algorithm from known new moon reference. Returns phase name, illumination %, emoji, and dark-sky-friendly flag
- **Golden hour** — Computed from sunrise/sunset (morning and evening windows)
- **Astronomical twilight** — Dusk/dawn times for true darkness (~90 min after sunset)
- **Bortle class estimation** — Infers light pollution from location type, notes, description, and cell signal strength. No new schema fields.
- **Night sky summary** — Combines all above into a stargazing quality rating (excellent/good/fair/poor)

### New: Dark Sky Trip Prep Section
- Added `dark-sky` section to `lib/prep-sections.ts`
- Trip prep API (`/api/trips/[id]/prep`) now returns per-night moon phase, golden hour, astronomical twilight, dark hours, stargazing quality, and Bortle estimate
- Summary shows Bortle class + moon phase at a glance

### New: Astro API Endpoint (`/api/astro`)
- `GET /api/astro?lat=&lon=&startDate=&endDate=` — full astro data for any coordinates + date range
- `POST /api/astro` with `{ date }` — quick moon phase lookup for a single date
- Returns per-night data, Bortle estimate, and best stargazing night

### Updated: Trip Planner Agent
- System prompt now includes activity gear recommendation logic
- Agent suggests relevant activity gear based on location conditions (dark sky, water access, trails)
- Wishlist nudge: mentions relevant wishlist items ("You've been eyeing a telescope — great trip for one")
- Dark sky awareness: factors moon phase into trip timing suggestions

### Updated: listLocations Tool
- Now returns `waterAccess` and `description` fields so the trip planner can reason about activity suitability

## Files Changed
- `lib/gear-categories.ts` — added `activities` category
- `lib/astro.ts` — **new** — moon phase, golden hour, Bortle estimation
- `lib/prep-sections.ts` — added dark-sky section config
- `app/api/trips/[id]/prep/route.ts` — dark-sky section handler
- `app/api/astro/route.ts` — **new** — standalone astro data endpoint
- `lib/agent/trip-planner-system-prompt.ts` — activity gear + dark sky awareness
- `lib/agent/tools/listLocations.ts` — added waterAccess + description to select
