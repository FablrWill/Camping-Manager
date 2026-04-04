# S20: Voice Ghostwriter — Context

**Session:** S20
**Date:** 2026-04-04
**Status:** Done

## Background

Will wanted a way to capture the narrative of a camping trip without having to type it out — dictate a freeform story and have Claude write a polished journal entry that sounds like Will's voice.

This is distinct from the existing VoiceRecordModal (structured post-trip debrief with gear/location feedback extraction). The Ghostwriter is for narrative prose: what happened, the feel of the trip, memorable moments.

## What This Addressed

- Trip cards had no journal/narrative field — only structured data
- Voice debrief produced structured extractions, not narrative prose
- Will wanted something to share with friends / remember the trip by

## Flow

1. Tap "Write journal" on a TripCard
2. VoiceGhostwriterModal opens
3. Record a freeform monologue about the trip (30s–3min)
4. POST to /api/voice/transcribe (existing Whisper endpoint) → transcription
5. POST to /api/voice/ghostwrite → Claude claude-sonnet-4-6 writes first-person narrative prose
6. Review the draft — accept, edit, or retry
7. Save → stored in Trip.journalEntry

## Key Decisions

- Uses claude-sonnet-4-6 (not Haiku) — prose quality requires the stronger model
- Reuses existing /api/voice/transcribe Whisper endpoint (no new transcription route)
- journalEntry stored as a plain text field on Trip (not a separate model)
- Modal has a proper state machine: idle → recording → transcribing → writing → review → saving → error
