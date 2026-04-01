---
phase: 5
slug: intelligence-features
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 5 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | none — Wave 0 installs (vitest recommended) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npm run lint` (until test framework installed) |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run lint`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 5-W0-01 | setup | 0 | REC-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 5-W0-02 | setup | 0 | VOICE-01 | build | `npm install openai && npm run build` | ❌ W0 | ⬜ pending |
| 5-01-01 | rec | 1 | REC-01 | lint+build | `npm run build` | ❌ W0 | ⬜ pending |
| 5-01-02 | rec | 1 | REC-02 | lint+build | `npm run build` | ❌ W0 | ⬜ pending |
| 5-01-03 | rec | 1 | REC-03 | lint+build | `npm run build` | ❌ W0 | ⬜ pending |
| 5-02-01 | voice | 2 | VOICE-01 | manual | See manual table | N/A | ⬜ pending |
| 5-02-02 | voice | 2 | VOICE-02 | manual | See manual table | N/A | ⬜ pending |
| 5-02-03 | voice | 2 | VOICE-03 | lint+build | `npm run build` | ❌ W0 | ⬜ pending |
| 5-02-04 | voice | 2 | VOICE-04 | manual | See manual table | N/A | ⬜ pending |
| 5-02-05 | voice | 2 | VOICE-05 | lint+build | `npm run build` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install openai` — OpenAI SDK for Whisper transcription
- [ ] `.env.example` updated with `OPENAI_API_KEY=` entry
- [ ] `app/api/voice/` directory created for transcription endpoint

*Existing infrastructure (hybridSearch, AGENT_TOOLS, Prisma models) covers recommendation features — no additional Wave 0 for REC-* requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Voice recording captures audio on iOS Safari | VOICE-01 | Browser microphone permission + AAC format detection | Open app on iOS Safari, tap record, speak, verify audio captured |
| Whisper transcription returns accurate text | VOICE-02 | Requires live OpenAI API call | Record voice memo with known content, verify transcription accuracy |
| Structured insight extraction is correct | VOICE-03 | AI output quality — not mechanically verifiable | Record trip debrief, verify Claude extracts gear/spot/rating fields |
| InsightsReviewSheet updates linked records | VOICE-05 | Requires live DB + UI interaction | Complete insight extraction, accept suggested update, verify record changed |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
