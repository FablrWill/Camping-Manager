# S24: Siri/Reminders Inbox Bridge — Summary

**Completed:** 2026-04-04
**Session:** S24 (V2 queue)

## What Was Shipped

- **reminders.ts extractor** (`lib/intake/extractors/reminders.ts`) — liberal camping-intent classifier, falls back to 'tip' (not 'unknown') for all ambiguous inputs
- **sourceHint routing** — `lib/intake/triage.ts` accepts `sourceHint?: 'reminder'` and routes to classifyReminder()
- **API update** — `app/api/intake/route.ts` reads optional sourceHint from form data
- **Shortcut setup guide** (`docs/SIRI-SHORTCUT-SETUP.md`) — step-by-step instructions for building and automating the Siri Shortcut

## Schema Changes

None. Reuses existing InboxItem model.

## Key Notes

- No new API routes — reuses /api/intake with backward-compatible sourceHint param
- Shortcut is not in the repo (it's an Apple app configuration) — fully documented in docs/
- Shortcut runs at 9 PM daily (automation trigger) to batch-process reminders
- classifyReminder() is permissive by design — "Outland Inbox" reminder list = camping context assumed

## Follow-On

- Future: photo attachments from Reminders (if Shortcut supports image passthrough)
- Future: location-tagged reminders (if Shortcut provides GPS data)
