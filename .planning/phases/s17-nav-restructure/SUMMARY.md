# S17: Nav Restructure + More Sheet — Summary

**Completed:** 2026-04-04
**Session:** S17 (V2 queue)

## What Was Shipped

- **5-tab BottomNav** — Home / Trips / Gear / Spots / More (down from 6 tabs)
- **MoreSheet component** (`components/MoreSheet.tsx`) — slide-up sheet with links to Chat (with badge), Inbox (with lazy badge), Vehicle, and Settings
- **Lazy Inbox badge** — Inbox unread count now fetches when MoreSheet opens, not on every nav render

## Schema Changes

None.

## Key Notes

- Inbox badge is now lazy (fetch on MoreSheet open) — reduces background API requests on every page load
- Backdrop overlay dismisses the MoreSheet (same pattern as existing modals)
- Ran in parallel with S16 — no file conflicts (S17 only touched BottomNav.tsx and new MoreSheet.tsx)

## Follow-On

- S18 and S19 both depend on the cleaner nav and layout state from S16+S17
