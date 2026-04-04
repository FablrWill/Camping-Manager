---
quick_task: 260404-jnc
title: S31 Destination Discovery
subsystem: intelligence
tags: [discovery, scoring, weather, dashboard, agent-tool]
dependency_graph:
  requires: [lib/weather.ts, prisma Location model]
  provides: [GET /api/destinations/suggest, suggest_destination agent tool, DestinationDiscoverySheet]
  affects: [DashboardClient, lib/agent/tools/index.ts]
tech_stack:
  patterns: [scoring-engine, promise-allsettled-concurrent-fetch, haversine-distance]
key_files:
  created:
    - lib/destination-discovery.ts
    - app/api/destinations/suggest/route.ts
    - lib/agent/tools/suggest-destination.ts
    - components/DestinationDiscoverySheet.tsx
  modified:
    - components/DashboardClient.tsx
    - lib/agent/tools/index.ts
decisions:
  - Haversine approx using degree-to-km constants (not full spherical formula) — sufficient accuracy for 0-5hr drives
  - Neutral scores for missing coords (weather=20, distance=10) so unlocated spots still surface
  - Max raw score 105 (40+15+30+15+5) normalized to 0-100
  - Dog boost +5 only when notes contain "dog" (case-insensitive), not type field
metrics:
  duration_seconds: 300
  completed_date: "2026-04-04"
  tasks_completed: 5
  files_created: 4
  files_modified: 2
---

# Quick Task 260404-jnc: S31 Destination Discovery Summary

**One-liner:** Weather-scored destination ranking engine with dashboard "Where should I go?" sheet and Claude agent tool, using Open-Meteo + haversine distance from Asheville.

## What Was Built

S31 destination discovery feature: given a date range, scores all of Will's saved locations using weather forecast, recency, stored rating, driving distance from Asheville (35.5N, 82.5W), and optional dog-friendliness to recommend the best camping spots.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | `lib/destination-discovery.ts` — scoring engine | f651059 |
| 2 | `GET /api/destinations/suggest` — REST endpoint | ac3cf52 |
| 3 | `lib/agent/tools/suggest-destination.ts` — agent tool | 4356dbb |
| 4 | Wire tool into AGENT_TOOLS + dispatcher | 4356dbb |
| 5 | Dashboard button + `DestinationDiscoverySheet` | 3bf2e4c |

## Scoring System

| Component | Points | Logic |
|-----------|--------|-------|
| Weather | 0-40 | Ideal 65-80°F high, <20% rain = 40pts; penalties for heat/cold/rain |
| Seasonal/Rating | 6-30 | stored rating × 6 (unrated = 12) |
| Recency | 0-15 | Never visited = 15; <3mo = 0; >12mo = 15 |
| Distance | 0-15 | Sweet spot 1-3hr drive = 15; >5hr = 0 |
| Dog boost | 0-5 | +5 if bringingDog AND notes mention "dog" |
| **Max raw** | **105** | Normalized to 0-100 |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None — all data is sourced from the live DB and Open-Meteo API.

## Self-Check: PASSED

- FOUND: lib/destination-discovery.ts
- FOUND: app/api/destinations/suggest/route.ts
- FOUND: lib/agent/tools/suggest-destination.ts
- FOUND: components/DestinationDiscoverySheet.tsx
- Commit f651059 verified
- Commit ac3cf52 verified
- Commit 4356dbb verified
- Commit 3bf2e4c verified
- TypeScript: zero errors in new files (pre-existing bulk-import.test.ts error unrelated)
- Next.js build: "Compiled successfully" + "Finished TypeScript" — prerender error is pre-existing DATABASE_URL absence in CI
