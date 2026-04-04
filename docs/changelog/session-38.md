# Session 38 — S24 Siri/Reminders Inbox Bridge

**Date:** 2026-04-04
**Session:** S24
**Status:** Complete

## What Was Built

Siri/Reminders inbox bridge: say "Hey Siri, remind me in Outland Inbox to look at that stove" while driving → Shortcut fires that night → item lands in Outland Inbox as a triaged gear/location/tip item.

## Changes

### New Files
- `lib/intake/extractors/reminders.ts` — Reminder-aware triage extractor. Uses a voice-dictation-specific prompt that tells Claude to infer camping intent liberally for terse, imperative text. Falls back to `tip` (not `unknown`) on parse failure.
- `docs/SIRI-SHORTCUT-SETUP.md` — Full Shortcut setup guide: create "Outland Inbox" Reminders list, build the Shortcut step-by-step (Get Reminders → Repeat → POST to Tailscale IP → Mark Complete), automate at 9 PM, Siri dictation tips, troubleshooting.

### Modified Files
- `lib/intake/triage.ts` — Added `sourceHint?: 'reminder'` to `TriageInput` interface. When present, routes text classification through `classifyReminder` instead of `classifyText`.
- `app/api/intake/route.ts` — Reads optional `sourceHint` field from form data (validates to `'reminder' | undefined`) and passes it to `triageInput`.

## Acceptance Criteria

- [x] `sourceHint=reminder` adjusts the triage prompt
- [x] Existing share-sheet intake flow unchanged (sourceHint is optional, defaults undefined)
- [x] Shortcut doc exists and covers end-to-end setup
- [x] No new npm packages
- [x] No new API routes (reuses `/api/intake`)
- [x] No TypeScript errors in S24 files
