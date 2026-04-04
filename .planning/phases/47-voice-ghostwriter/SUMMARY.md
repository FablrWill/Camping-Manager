# S20: Voice Ghostwriter — Summary

**Completed:** 2026-04-04
**Session:** S20 (V2 queue)

## What Was Shipped

- **ghostwriteJournal()** (`lib/voice/ghostwrite.ts`) — claude-sonnet-4-6 prose ghostwriter with first-person narrative prompt
- **POST /api/voice/ghostwrite** — accepts tripId + transcription, calls Claude, saves to Trip.journalEntry
- **VoiceGhostwriterModal** (`components/VoiceGhostwriterModal.tsx`) — full state machine: idle → recording → transcribing → writing → review → saving → error
- **Schema migration** — `journalEntry String?` and `journalEntryAt DateTime?` added to Trip model
- **TripCard journal UI** — "Write journal" / "Update journal" button, journal text displayed in expanded trip detail

## Schema Changes

- `journalEntry String?` on Trip — the Claude-written prose narrative
- `journalEntryAt DateTime?` on Trip — when the journal was last written/updated

## Key Notes

- Uses claude-sonnet-4-6 (not Haiku) — prose quality requires the stronger model
- Reuses existing /api/voice/transcribe Whisper endpoint — no new transcription infrastructure
- State machine in modal: idle → recording → transcribing → writing → review → saving → error

## Follow-On

- Future: "Share journal" feature (could reuse Phase 20 SharedLocation pattern or S28 shareable reports)
