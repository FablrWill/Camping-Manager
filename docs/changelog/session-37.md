# Session 37 — S20 Voice Ghostwriter

**Date:** 2026-04-04
**Branch:** claude/exciting-snyder

## What was built

**Voice Ghostwriter** — a new voice flow that lets Will record a freeform post-trip monologue, then uses Claude to write a polished first-person journal entry saved to the trip.

Different from `VoiceRecordModal` (structured debrief → gear/location updates). This is narrative → journal prose.

## Files created

- `lib/voice/ghostwrite.ts` — `ghostwriteJournal()` function using `claude-sonnet-4-6` at 2048 tokens. System prompt instructs Claude to write a first-person camping narrative in Will's voice (3–5 paragraphs, sensory details, past tense).
- `app/api/voice/ghostwrite/route.ts` — POST `/api/voice/ghostwrite`. Accepts `{ tripId, transcription }`, calls `ghostwriteJournal()`, persists to `Trip.journalEntry` + `journalEntryAt`, returns `{ journalEntry }`.
- `components/VoiceGhostwriterModal.tsx` — New modal component. States: `idle | recording | transcribing | writing | review | saving | error`. Reuses `/api/voice/transcribe` for Whisper step. Review screen shows the written entry with Edit/Preview toggle and Save button.
- `prisma/migrations/20260404220000_add_trip_journal_entry/migration.sql` — Migration for the two new Trip fields.

## Files modified

- `prisma/schema.prisma` — Added `journalEntry String?` and `journalEntryAt DateTime?` to `Trip` model.
- `app/api/trips/[id]/route.ts` — Extended PATCH handler to accept `{ journalEntry }` alongside existing `{ departureTime }`.
- `app/trips/page.tsx` — Added `journalEntry` and `journalEntryAt` to the serialized trip shape passed to `TripsClient`.
- `components/TripsClient.tsx` — Added `VoiceGhostwriterModal` import, `ghostwriterTrip` state, `onGhostwrite` prop on both TripCard renders, `journalEntry`/`journalEntryAt` fields in `TripData` interface.
- `components/TripCard.tsx` — Added `BookOpen` icon, `onGhostwrite` prop, "Write journal" / "Update journal" button next to debrief button (past trips only), journal entry display in expanded trip detail.

## Flow

1. Past trip card → tap "Write journal" → `VoiceGhostwriterModal` opens
2. Record voice memo (same recording UX as debrief modal)
3. Stop → Whisper transcription via `/api/voice/transcribe`
4. Transcription → `/api/voice/ghostwrite` → Claude writes entry + saves to DB
5. Review screen: rendered prose, Edit/Preview toggle, Save button
6. On save → PATCH with (possibly edited) text → `onSaved()` updates trip in local state
7. Expanded trip card shows "Journal" section with the prose
