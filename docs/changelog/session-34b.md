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

### New: Google Maps List Import (v4.0 backlog)
- `POST /api/import/google-maps` — paste Google Maps saved places URLs or text
- Parses 4 coordinate patterns (URLs, text with lat/lon)
- Deduplicates within ~100m radius, creates Location records
- "G-Maps" button in spots page, textarea for paste input

### New: Personal Signal Map (v4.0 backlog)
- `SignalLog` model — tracks cell bars, cell type, carrier, signal strength (dBm), Starlink quality, speed test results per location
- `GET/POST /api/locations/[id]/signal` — manual signal log CRUD
- `POST /api/signal/auto-log` — HA Companion auto-log endpoint (finds nearest location within ~500m, auto-creates if none)
- `SignalLogPanel` component — log and view signal history per location
- Updated `LocationForm` to include signal log panel

### New: Trip Cost Tracking (v4.0 backlog)
- `TripExpense` model — category-based expense tracking per trip
- `GET/POST /api/trips/[id]/expenses` — list expenses with totals, create new
- `PUT/DELETE /api/trips/[id]/expenses/[expenseId]` — update/delete
- `TripExpenses` component — 7 categories (gas, permits, groceries, food, gear, campsite, other) with emoji indicators, summary card, inline add/edit
- Integrated into TripCard when trip is expanded

## Files Changed
- `lib/gear-categories.ts` — added `activities` category
- `lib/astro.ts` — **new** — moon phase, golden hour, Bortle estimation
- `lib/prep-sections.ts` — added dark-sky section config
- `app/api/trips/[id]/prep/route.ts` — dark-sky section handler
- `app/api/astro/route.ts` — **new** — standalone astro data endpoint
- `lib/agent/trip-planner-system-prompt.ts` — activity gear + dark sky awareness
- `lib/agent/tools/listLocations.ts` — added waterAccess + description to select
- `app/api/import/google-maps/route.ts` — **new** — Google Maps list import
- `app/spots/spots-client.tsx` — added G-Maps import button/panel
- `prisma/schema.prisma` — added SignalLog + TripExpense models
- `prisma/migrations/20260404150000_add_signal_log/` — **new** — SignalLog table
- `prisma/migrations/20260404160000_add_trip_expenses/` — **new** — TripExpense table
- `app/api/locations/[id]/signal/route.ts` — **new** — signal log CRUD
- `app/api/signal/auto-log/route.ts` — **new** — HA Companion auto-log endpoint
- `components/SignalLogPanel.tsx` — **new** — signal log UI
- `components/LocationForm.tsx` — integrated SignalLogPanel
- `app/api/departure-checklist/[id]/check/route.ts` — fixed `tx` type annotation
- `app/api/trips/[id]/expenses/route.ts` — **new** — expense list + create
- `app/api/trips/[id]/expenses/[expenseId]/route.ts` — **new** — expense update/delete
- `components/TripExpenses.tsx` — **new** — expense tracking UI
- `components/TripCard.tsx` — integrated TripExpenses
