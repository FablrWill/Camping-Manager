# S17: Nav Restructure + More Sheet — Context

**Session:** S17
**Date:** 2026-04-04
**Status:** Done

## Background

Part of the April 4 UX sprint. BottomNav had grown to 6 tabs (Home, Trips, Gear, Spots, Chat, Inbox) which was cramped on small phone screens. Will primarily uses Home/Trips/Gear/Spots — the others are secondary.

## What This Addressed

- 6 tabs is too many for a phone bottom nav (industry standard is 4-5)
- Chat and Inbox are accessed less frequently — they can be behind one tap in a "More" sheet
- Vehicle and Settings are also secondary and were accessible via deep links only — move them to More sheet for discoverability

## Design Decision

Reduce to 5 tabs: **Home / Trips / Gear / Spots / More**

The More tab opens a slide-up `MoreSheet` containing:
- Chat (with existing unread badge)
- Inbox (with badge that loads on sheet open)
- Vehicle
- Settings

## Scope

Low-risk, no schema changes. New component + BottomNav changes only:
- `components/MoreSheet.tsx` — new slide-up sheet
- `components/BottomNav.tsx` — reduce to 5 tabs, add More tab, remove inline badge fetch for Inbox
- `docs/changelog/session-36b.md` — changelog entry

## Key Decisions

- Inbox badge fetches lazily on MoreSheet open (not on every nav render) — reduces background requests
- Backdrop overlay pattern for sheet (consistent with existing modal pattern)
- S16 and S17 ran in parallel — no file conflicts
