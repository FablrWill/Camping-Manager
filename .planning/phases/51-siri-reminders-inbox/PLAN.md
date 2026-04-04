# S24: Siri/Reminders Inbox Bridge — Plan

## Goal

Bridge Apple Reminders to the Outland Inbox via Siri + Apple Shortcuts + sourceHint routing.

## Files Created

- `lib/intake/extractors/reminders.ts` — `classifyReminder()`: voice-dictation-specific Claude classifier; infers camping intent liberally, falls back to 'tip' not 'unknown'
- `docs/SIRI-SHORTCUT-SETUP.md` — full step-by-step Shortcut build guide: Tailscale setup, 9 PM automation trigger, Siri tips, sample reminder phrasing

## Files Modified

- `lib/intake/triage.ts` — add `sourceHint?: 'reminder'` to TriageInput interface; route to `classifyReminder()` when sourceHint='reminder'
- `app/api/intake/route.ts` — read optional `sourceHint` from form data, pass to triageInput

## Key Decisions

- Reuse /api/intake (no new route) — sourceHint is optional and backward-compatible
- classifyReminder() is permissive — assumes camping context from "Outland Inbox" reminder list name
- Shortcut is not in the codebase (Apple Shortcuts = app, not text files) — documented in docs/
- 9 PM automation: Shortcut runs daily, batches reminders from the day

## Verification

- `npm run build` passes
- No TypeScript errors
- No schema changes
