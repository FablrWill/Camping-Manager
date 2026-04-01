# Phase 8: PWA and Offline - Context

**Gathered:** 2026-04-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Install the app to phone home screen as a PWA, cache all trip data offline via a "Leaving Now" tap, and show a clear offline indicator with data age. The offline snapshot covers weather, packing list, meal plan, departure checklist, spots, emergency info, and map tiles. No new features — this makes existing trip data available without cell signal.

**Multi-device:** Will accesses from iPhone (primary), laptop (planning), iPad Mini (field reference), and eventually an Android tablet (HA dashboard + this app). PWA must work across Safari, Chrome, and Android browsers.

</domain>

<decisions>
## Implementation Decisions

### "Leaving Now" Trigger
- **D-01:** Button placement is Claude's discretion — use UI best practices for where it lives (departure page, prep page, or both)
- **D-02:** No confirmation dialog — tap and go. Start caching immediately.
- **D-03:** Full-screen progress overlay showing what's being cached: checkmarks for each data type (weather, packing, meals, checklist, spots, map tiles). Gives confidence everything saved.
- **D-04:** Cache scope is "trip essentials" only: weather snapshot, packing list, meal plan, departure checklist, emergency contact info, spot coordinates + notes, vehicle info. No full gear inventory, chat history, or photos.
- **D-05:** Multiple trips can be cached simultaneously — user may plan more than one trip at a time.

### Offline Experience
- **D-06:** Trip-focused with basic nav — active trip data is the main screen, but other pages still render with whatever browser cache has. Non-cached pages show appropriate empty/offline states.
- **D-07:** Persistent slim banner at top when offline: "📴 Offline — snapshot from 2h ago" (with relative time). Always visible, reappears on page nav.
- **D-08:** AI-dependent features (chat, generate checklist, etc.) offline handling is Claude's discretion per component.
- **D-09:** IndexedDB for offline data storage (not Cache API). Structured JSON, survives service worker updates. Per ROADMAP.md requirement.
- **D-10:** Auto-refresh silently when connectivity returns — update cached data in background, update banner timestamp.
- **D-11:** No post-trip cache cleanup for now — don't worry about storage. If it becomes a problem, build cleanup later.

### Map Tile Caching
- **D-12:** Cache tiles at "Leaving Now" time, not during trip planning.
- **D-13:** Cache the visible viewport plus 2 zoom levels in and 2 out (~200-800 tiles).
- **D-14:** Also cache tiles around saved locations within ~20 miles of the trip destination.
- **D-15:** Missing/uncached tiles show as gray placeholders with message: "Cached area only — connect for more."

### Install + Home Screen
- **D-16:** Custom dismissible install banner on first visit: "Add Outland OS to your home screen for offline access." With Install button. Disappears after install or dismiss. Handles both iOS (Safari Add to Home Screen instructions) and Android (Chrome install prompt) paths.
- **D-17:** Standalone PWA experience — Claude's discretion on theme color, status bar style. Should match the stone/amber design system.
- **D-18:** Generate a placeholder app icon using Outland OS colors (stone/amber). Can be replaced later with a proper design.

### Offline Writes
- **D-19:** Claude's discretion on how to handle writes while offline (e.g., departure checklist check-offs). Queue-and-sync or read-only — pick the approach that's simplest and most reliable for a single-user local-first app.

### Claude's Discretion
- Button placement for "Leaving Now" (D-01)
- Standalone mode styling (D-17)
- AI feature behavior when offline (D-08)
- Offline write strategy for check-offs (D-19)
- Service worker strategy and tooling (next-pwa, Workbox, hand-rolled)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements
- `.planning/REQUIREMENTS.md` — OFF-01 through OFF-04, plus Out of Scope items (no full region tile download, no two-way sync, no real-time offline sync)

### Architecture
- `.planning/codebase/ARCHITECTURE.md` — Layered Next.js pattern, data flow, integration points
- `.planning/codebase/STACK.md` — Current tech stack and dependencies
- `.planning/codebase/CONVENTIONS.md` — Naming, import, and coding conventions

### Prior Phase Context
- `.planning/phases/07-day-of-execution/07-CONTEXT.md` — Departure checklist and float plan decisions (Phase 8 caches this data offline)
- `next.config.ts` — Current Next.js configuration (needs PWA additions)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- No existing PWA infrastructure (no manifest, no service worker, no IndexedDB usage)
- `next.config.ts` exists with `serverExternalPackages` — will need PWA plugin additions
- Leaflet map (`components/SpotMap.tsx`) uses OpenStreetMap tiles — tile caching will hook into Leaflet's tile layer
- TopHeader component — offline banner could slot above or below it
- Design system primitives (Button, Card, Modal) — progress overlay can reuse these

### Established Patterns
- Dark mode via localStorage and CSS custom properties
- Client components with `'use client'` directive, useState/useEffect hooks
- API routes with try-catch error handling
- Data fetching pattern: server components fetch → pass props to client components

### Integration Points
- `app/trips/[id]/depart/page.tsx` — "Leaving Now" button integrates here or on prep page
- `components/TripPrepClient.tsx` — prep sections could show "cached" status
- `lib/prep-sections.ts` — could add an "offline" prep section
- `components/TopHeader.tsx` — offline banner placement
- `public/` directory — manifest.json, icons, service worker files

</code_context>

<specifics>
## Specific Ideas

- Progress overlay during "Leaving Now" should feel like a countdown/launch sequence — checkmarks appearing as each data type caches. Gives the "I'm ready to go" feeling.
- Multi-device support means icon sizes for all densities (iOS, Android, desktop) and splash screens for iOS.
- Future idea (not this phase): live location sharing link in the float plan email (captured in PROJECT.md v2.0+ backlog).

</specifics>

<deferred>
## Deferred Ideas

- Post-trip cache cleanup / storage management — build if storage becomes a problem
- Full region map tile pre-download — out of scope per REQUIREMENTS.md, deep-link to Gaia GPS instead
- Offline chat with cached knowledge base — would require shipping the vector DB to IndexedDB
- Background sync for offline writes — if queue-and-sync is chosen, keep it simple for v1.1

</deferred>

---

*Phase: 08-pwa-and-offline*
*Context gathered: 2026-04-01*
