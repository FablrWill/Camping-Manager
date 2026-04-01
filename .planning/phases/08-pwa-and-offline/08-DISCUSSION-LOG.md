# Phase 8: PWA and Offline - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-04-01
**Phase:** 08-pwa-and-offline
**Areas discussed:** Leaving Now trigger flow, Offline experience, Map tile caching, Install + home screen

---

## "Leaving Now" Trigger Flow

| Option | Description | Selected |
|--------|-------------|----------|
| Departure page only | Bottom of /trips/[id]/depart | |
| Both departure + prep page | On both pages | |
| Floating action button | Always-visible FAB on trip pages | |

**User's choice:** "Use UI best practices and your best judgment" — Claude's discretion
**Notes:** User doesn't have a strong preference on placement

---

| Option | Description | Selected |
|--------|-------------|----------|
| Trip essentials | Weather, packing, meals, checklist, emergency, spots, vehicle | ✓ |
| Full gear inventory | All gear items, not just packed | |
| Chat history | Recent conversation cache | |
| Photos for this trip | Cached thumbnails | |

**User's choice:** Trip essentials only

---

| Option | Description | Selected |
|--------|-------------|----------|
| Progress screen | Full-screen overlay with checklist | ✓ |
| Silent with toast | Background cache + toast | |
| You decide | Claude's discretion | |

**User's choice:** Progress screen

---

| Option | Description | Selected |
|--------|-------------|----------|
| Confirmation dialog | "Ready to go offline?" dialog | |
| Tap and go | No confirmation | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Tap and go — no confirmation needed

---

## Offline Experience

| Option | Description | Selected |
|--------|-------------|----------|
| Active trip only | Only cached trip data visible | |
| Full app shell, read-only | All nav works, all pages render | |
| Trip-focused with basic nav | Active trip main, browse other cached pages | ✓ |

**User's choice:** Trip-focused with basic nav

---

| Option | Description | Selected |
|--------|-------------|----------|
| Persistent banner | Slim banner: "📴 Offline — snapshot from 2h ago" | ✓ |
| Status dot in header | Small colored dot | |
| You decide | Claude's discretion | |

**User's choice:** Persistent banner with snapshot age

---

| Option | Description | Selected |
|--------|-------------|----------|
| Disabled with explanation | Buttons disabled + tooltip | |
| Hidden entirely | AI buttons don't render offline | |
| You decide | Claude's discretion | ✓ |

**User's choice:** Claude's discretion per component

---

| Option | Description | Selected |
|--------|-------------|----------|
| Auto-refresh silently | Background update when back online | ✓ |
| Manual refresh button | User controls refresh | |
| Auto with notification | Auto + toast notification | |

**User's choice:** Auto-refresh silently

---

| Option | Description | Selected |
|--------|-------------|----------|
| IndexedDB | Structured data, persistent | ✓ |
| You decide | Claude's discretion | |

**User's choice:** IndexedDB (matches ROADMAP.md requirement)

---

## Map Tile Caching

| Option | Description | Selected |
|--------|-------------|----------|
| At "Leaving Now" time | Cache visible viewport at trigger | ✓ |
| During trip planning | Pre-cache when location set | |
| Both | Pre-cache + refresh at leaving | |

**User's choice:** At "Leaving Now" time

---

| Option | Description | Selected |
|--------|-------------|----------|
| Gray tiles with message | Placeholders + "Cached area only" | ✓ |
| Soft boundary | Map stops panning at edge | |
| You decide | Claude's discretion | |

**User's choice:** Gray tiles with message

---

| Option | Description | Selected |
|--------|-------------|----------|
| Current view +/- 1 level | ~50-200 tiles | |
| Current view +/- 2 levels | ~200-800 tiles | ✓ |
| You decide | Claude's discretion | |

**User's choice:** +/- 2 zoom levels

---

| Option | Description | Selected |
|--------|-------------|----------|
| Trip destination viewport | Just the trip location | |
| Destination + nearby saved spots | Also spots within ~20 miles | ✓ |
| You decide | Claude's discretion | |

**User's choice:** Destination + nearby saved spots

---

## Install + Home Screen

| Option | Description | Selected |
|--------|-------------|----------|
| Custom install banner | Dismissible banner with Install button | ✓ |
| Settings page only | Instructions on /settings | |
| Browser default only | Native browser prompt | |
| You decide | Claude's discretion | |

**User's choice:** Custom install banner

---

| Option | Description | Selected |
|--------|-------------|----------|
| Full standalone, dark status bar | No browser chrome, native feel | |
| Standalone with minimal bar | Keep URL bar | |
| You decide | Claude's discretion | ✓ |

**User's choice:** Claude's discretion

---

| Option | Description | Selected |
|--------|-------------|----------|
| Generate placeholder | Simple icon in stone/amber colors | ✓ |
| I'll provide one | User has icon ready | |
| Text-based icon | "OS" or compass on dark bg | |

**User's choice:** Generate placeholder icon

---

## Follow-up Discussion

**Offline writes:** User was unsure about queue-and-sync vs read-only for check-offs. Deferred to Claude's judgment — pick simplest reliable approach.

**Post-trip cache cleanup:** User said don't worry about it now. Build if storage becomes a problem.

**Multiple trips:** User wants multiple trips cacheable simultaneously. Could be planning more than one at a time.

**Multi-device:** User accesses from iPhone, laptop, iPad Mini, and eventually an Android tablet (HA dashboard). PWA must work cross-platform.

## Claude's Discretion

- "Leaving Now" button placement
- Standalone PWA styling
- AI feature behavior when offline
- Offline write strategy for check-offs
- Service worker tooling choice

## Deferred Ideas

- Post-trip cache cleanup
- Live location sharing in float plan email (captured in PROJECT.md v2.0+)
