# Phase 18: Fuel & Last Stop Planner - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-03
**Phase:** 18-fuel-last-stop-planner
**Areas discussed:** No-location fallback, Caching vs. re-fetch, Stop categories & OSM tags

---

## No-Location Fallback

| Option | Description | Selected |
|--------|-------------|----------|
| Hide the card entirely | Card doesn't render when trip has no destination lat/lon. Same pattern as WeatherCard. | ✓ |
| Show a prompt | Card renders but says "Add a destination to see nearby stops" with link. | |

**User's choice:** Hide card entirely
**Notes:** Consistent with WeatherCard's silent-omit pattern. Trips without a pinned location simply don't show the card.

---

## Caching vs. Re-fetch

| Option | Description | Selected |
|--------|-------------|----------|
| Re-fetch every load | Simple, no schema change, stays fresh. Same as WeatherCard approach. | ✓ |
| Cache in DB as JSON field | Store in Trip.lastStopsData. Faster repeat loads, works offline. Requires Prisma migration. | |

**User's choice:** Re-fetch every load
**Notes:** Simplicity wins for a personal tool. Overpass is fast (~200ms). No schema changes needed.

---

## Stop Categories & OSM Tags

| Option | Description | Selected |
|--------|-------------|----------|
| Outdoor/sporting goods only | shop=outdoor + shop=sports | |
| Hardware only | shop=hardware | |
| Both outdoor + hardware | Query both; show outdoor first, fall back to hardware | ✓ |

**Revisited:** Yes — user revisited this area to refine label and add new ideas.

**Additional user input (free text):**
> "I also want it to pull any business that are open 24 hours within a reasonable distance of locations. You never know when you might need something. Also all emergency services like urgent care or hospitals and police."

**Handling of new ideas:**
- **24-hour filtering:** Deferred — Overpass `opening_hours` data is unreliable in rural areas (explicitly called out in V2-SESSIONS.md spec)
- **Emergency services:** Deferred to a future phase — strong safety use case but a separate card concept (urgent care, hospital, police)

**Final label choice:**

| Option | Description | Selected |
|--------|-------------|----------|
| Outdoor / Gear | shop=outdoor + shop=sports first, fall back to shop=hardware. Label "Outdoor / Gear" | ✓ |
| Hardware / Outdoor | shop=hardware first, outdoor as bonus | |

**User's choice:** "Outdoor / Gear"
**Notes:** Camping-app appropriate branding. Queries outdoor/sports first, hardware as fallback for rural areas.

---

## Claude's Discretion

- Loading state design (animate-pulse skeleton)
- Error state messaging if Overpass fails
- Haversine distance calculation implementation in lib/overpass.ts
- TypeScript interface names for Overpass API response types
