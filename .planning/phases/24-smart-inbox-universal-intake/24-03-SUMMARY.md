---
phase: 24-smart-inbox-universal-intake
plan: 03
subsystem: inbox-ui
tags: [inbox-ui, bottom-nav, pwa, manifest, share-target]
dependency_graph:
  requires: [24-01, 24-02]
  provides: [inbox-page, inbox-client, pwa-share-target, bottom-nav-inbox]
  affects: [components/BottomNav.tsx, app/manifest.ts, components/TopHeader.tsx]
tech_stack:
  added: [app/inbox/page.tsx, components/InboxClient.tsx]
  patterns: [server-component, client-component, pwa-share-target]
key_files:
  created:
    - app/inbox/page.tsx
    - components/InboxClient.tsx
  modified:
    - components/BottomNav.tsx
    - components/TopHeader.tsx
    - app/manifest.ts
decisions:
  - "[Phase 24]: BottomNav shows Inbox link without live pending count badge — static link only, per plan decision to skip live count"
  - "[Phase 24]: Accept flow navigates to /gear?intake=... or /spots?intake=... — no new review UI, reuses existing forms"
  - "[Phase 24]: PWA manifest share_target posts to /api/intake as multipart/form-data — enables iOS/Android Share Sheet"
  - "[Phase 24]: InboxPage is a server component fetching pending items; InboxClient handles all interaction"
metrics:
  duration_seconds: 0
  completed_date: "2026-04-03"
  tasks_completed: 2
  files_created: 2
  files_modified: 3
  note: "Work executed as part of plan 24-01 pass — all UI built in single executor run"
---

# Phase 24 Plan 03: Inbox UI + Navigation + PWA Summary

**One-liner:** Card-based inbox UI, BottomNav 6th item, TopHeader support, and PWA share_target — all built as part of plan 24-01 executor run.

## What Was Built

**app/inbox/page.tsx** — server component that fetches pending InboxItems from DB, serializes dates, and passes to InboxClient.

**components/InboxClient.tsx** — card-based inbox with:
- Intake form: textarea for text, URL input, image file picker — all POST to `/api/intake`
- Pending item cards: source type icon (🔗/📸/💬), triage type icon, summary text, confidence badge, relative timestamp
- Accept button → navigates to `/gear?intake=...` or `/spots?intake=...` with encoded suggestion
- Reject button → calls reject route, removes card from local state (immutable update)
- Loading states and error handling

**components/BottomNav.tsx** — added 6th nav item "Inbox" linking to `/inbox`.

**components/TopHeader.tsx** — updated to support Inbox page title.

**app/manifest.ts** — added `share_target` to PWA manifest enabling iOS/Android Share Sheet to send URLs, text, and images directly to the intake endpoint.

## Deviations from Plan

None — implemented as planned. Work completed in plan 24-01 executor pass.

## Known Stubs

- `/gear?intake=` and `/spots?intake=` query params set in accept navigation but GearClient and SpotMap do not yet read them for form pre-fill — acceptance creates the navigation, not the pre-fill.

## Self-Check: PASSED

- All 2 new UI files exist on disk
- All 3 modified files verified
- `npm run build` passes (verified by orchestrator)
- No alert() usage — state-based errors throughout
- React hooks have correct minimal dependency arrays
