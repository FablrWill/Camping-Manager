# S24: Siri/Reminders Inbox Bridge — Context

**Session:** S24
**Date:** 2026-04-04
**Status:** Done

## Background

Will drives to/from camping spots and has camping-related thoughts while driving — gear ideas, spot notes, "look into X before next trip." He wanted to capture these hands-free via Siri without switching apps.

## What This Addressed

- Outland Inbox required opening the app and typing — not usable while driving
- Siri could capture voice reminders hands-free but they lived in Apple Reminders, not Outland
- Needed a bridge: Reminders → Outland Inbox

## Flow

1. Will says "Hey Siri, remind me in Outland Inbox to look at that stove"
2. Apple Shortcut runs at 9 PM (automated) or on demand
3. Shortcut reads Outland Inbox reminders → POSTs to /api/intake with sourceHint=reminder
4. Items land in Outland Inbox, triaged by Claude as gear/location/tip ideas
5. Reminders cleared from Apple Reminders list

## Key Decisions

- Reuse /api/intake (no new route) — sourceHint is optional backward-compatible param
- `classifyReminder()` in new `reminders.ts` — liberal camping-intent classifier (falls back to 'tip' not 'unknown')
- Shortcut runs automated at 9 PM — not real-time, which is fine for non-urgent capture
- Shortcut setup documented in `docs/SIRI-SHORTCUT-SETUP.md` (Apple Shortcuts aren't text files)
- Uses Tailscale for local network access from phone
