---
phase: 05-intelligence-features
plan: 02
subsystem: voice
tags: [voice, whisper, transcription, insight-extraction, api-routes]
dependency_graph:
  requires: [openai SDK, ANTHROPIC_API_KEY, prisma GearItem/Location/Trip]
  provides: [POST /api/voice/transcribe, POST /api/voice/extract, POST /api/voice/apply, lib/voice/* modules]
  affects: [trip notes, gear notes, location ratings]
tech_stack:
  added: [openai@6.33.0]
  patterns: [FormData upload, Whisper API, Claude Haiku structured extraction, append-not-overwrite notes pattern]
key_files:
  created:
    - lib/voice/types.ts
    - lib/voice/transcribe.ts
    - lib/voice/extract.ts
    - app/api/voice/transcribe/route.ts
    - app/api/voice/extract/route.ts
    - app/api/voice/apply/route.ts
  modified:
    - .env.example
    - package.json
    - package-lock.json
decisions:
  - "Use OpenAI Whisper API (server-side) instead of Web Speech API — iOS Safari reliability confirmed unreliable in CONTEXT.md research"
  - "MIME-based extension detection in transcribeAudio — handles iOS Safari AAC/MP4 vs Android WebM format differences"
  - "Claude Haiku for insight extraction — structured JSON extraction is a simple task, Haiku is faster and cheaper than Sonnet"
  - "Gear notes use append pattern with date-stamped prefix — never overwrite existing notes, per CONTEXT.md D-06 confirm before overwrite"
  - "OPENAI_API_KEY absence returns 503 with setup instructions — clearer than generic 500 for missing configuration"
metrics:
  duration: 15 minutes
  completed: 2026-04-01
  tasks_completed: 2
  files_created: 6
  files_modified: 3
---

# Phase 5 Plan 2: Voice Debrief Backend Summary

Voice debrief backend: OpenAI Whisper transcription + Claude Haiku insight extraction with three API routes covering the full server-side pipeline.

## What Was Built

**Library Modules (`lib/voice/`):**
- `types.ts` — Shared types: `InsightPayload`, `InsightItem`, `GearFeedbackItem`, `SpotRating`, `ApplyInsightRequest`
- `transcribe.ts` — Whisper API wrapper with MIME-type extension detection (mp4/ogg/webm) for iOS Safari compatibility
- `extract.ts` — Claude Haiku structured extraction with JSON schema prompt for trip debrief analysis

**API Routes (`app/api/voice/`):**
- `transcribe/route.ts` — `POST`: accepts `FormData` with `audio` blob + `mimeType`, returns `{ transcription }`. Returns 503 if `OPENAI_API_KEY` missing.
- `extract/route.ts` — `POST`: accepts `{ transcription }`, returns `InsightPayload` with `whatWorked`, `whatDidnt`, `gearFeedback`, `spotRating`
- `apply/route.ts` — `POST`: accepts `ApplyInsightRequest`, writes to DB: appends gear notes (date-stamped, never overwrites), replaces location rating, appends dated debrief section to trip notes

## Decisions Made

| Decision | Rationale |
|----------|-----------|
| Whisper API (server-side) over Web Speech API | iOS Safari Web Speech API unreliable; MediaRecorder + server Whisper is robust across platforms |
| MIME-based extension detection | iOS Safari records AAC/MP4, Android records WebM — extension must match MIME to avoid Whisper format rejection |
| Claude Haiku for extraction | Structured JSON extraction is a simple task; Haiku is 3x faster and 10x cheaper than Sonnet for this use case |
| Append-not-overwrite for gear/trip notes | User-generated notes are authoritative; debrief insights are additive context with date prefix for traceability |
| 503 for missing OPENAI_API_KEY | Clear setup error vs cryptic 500; guides user to add key in .env |

## Deviations from Plan

**1. [Rule 1 - Bug] Fixed named vs default export for prisma import**
- **Found during:** Task 2 TypeScript check
- **Issue:** Plan template showed `import prisma from '@/lib/db'` (default import) but `lib/db.ts` exports `const prisma` as named export
- **Fix:** Changed to `import { prisma } from '@/lib/db'` matching all other API routes in the codebase
- **Files modified:** `app/api/voice/apply/route.ts`
- **Commit:** c286ccc (included in Task 2 commit)

## Known Stubs

None — all three routes are fully wired to their library modules and Prisma client.

## Self-Check: PASSED

Files verified present:
- lib/voice/types.ts: FOUND
- lib/voice/transcribe.ts: FOUND
- lib/voice/extract.ts: FOUND
- app/api/voice/transcribe/route.ts: FOUND
- app/api/voice/extract/route.ts: FOUND
- app/api/voice/apply/route.ts: FOUND

Commits verified:
- 8a3d3bd (Task 1: SDK + library modules): FOUND
- c286ccc (Task 2: API routes): FOUND
