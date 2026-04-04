# S20: Voice Ghostwriter — Plan

## Goal

Allow Will to record a trip monologue and have Claude write a polished journal entry, saved to the trip.

## Files Created

- `lib/voice/ghostwrite.ts` — `ghostwriteJournal()` function using claude-sonnet-4-6, first-person narrative prompt, ~2048 tokens
- `app/api/voice/ghostwrite/route.ts` — POST endpoint: accepts tripId + transcription, calls ghostwriteJournal(), saves to Trip.journalEntry
- `components/VoiceGhostwriterModal.tsx` — full state machine: idle → recording → transcribing → writing → review → saving → error
- `prisma/migrations/20260404220000_add_trip_journal_entry/migration.sql` — adds journalEntry + journalEntryAt to Trip

## Files Modified

- `prisma/schema.prisma` — add `journalEntry String?` and `journalEntryAt DateTime?` to Trip model
- `app/api/trips/[id]/route.ts` — PATCH accepts journalEntry field
- `app/trips/page.tsx` — serialize journalEntry/journalEntryAt in server component
- `components/TripsClient.tsx` — add ghostwriterTrip state, pass onGhostwrite prop
- `components/TripCard.tsx` — add "Write journal" / "Update journal" button, display journal text in expanded detail

## Key Decisions

- claude-sonnet-4-6 (not Haiku) — prose quality requires the stronger model
- Reuses existing /api/voice/transcribe Whisper endpoint — no new transcription route
- journalEntry stored as plain text on Trip — not a separate model
- State machine in modal prevents double-submissions and handles all error cases

## Verification

- `npm run build` passes
- No TypeScript errors
