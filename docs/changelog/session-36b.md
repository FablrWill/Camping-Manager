# Session 36b — S17 Nav Restructure + More Sheet

**Date:** 2026-04-04
**Branch:** claude/kind-curran

## Summary

Reduced bottom nav from 6 tabs to 5 (`Home / Trips / Gear / Spots / More`). Chat, Inbox, Vehicle, and Settings now live in a slide-up `MoreSheet` component.

## Changes

### `components/BottomNav.tsx`
- Removed Chat and Inbox from the nav array
- Added `MoreHorizontal` tab (5th slot) that opens `MoreSheet` via local state
- Removed inline inbox badge fetch (moved to `MoreSheet`)
- Reordered tabs: Home / Trips / Gear / Spots / More

### `components/MoreSheet.tsx` (new)
- Slide-up sheet with backdrop overlay
- Items: Chat, Inbox (badged), Vehicle, Settings
- Fetches `/api/inbox?status=pending` when opened — shows red dot + count badge on Inbox row
- Closes on backdrop tap, close button, or after navigation
- Dark mode: `bg-stone-900`, `border-stone-700`, `text-stone-100`
- No new npm packages — Lucide + Tailwind only
