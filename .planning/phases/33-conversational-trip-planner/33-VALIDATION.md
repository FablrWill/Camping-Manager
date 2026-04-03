---
phase: 33
slug: conversational-trip-planner
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-03
---

# Phase 33 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run build && npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 60 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 33-00-01 | 00 | 0 | TRIP-CHAT-05/06 | unit stubs | `npm test -- --run lib/__tests__/trip-planner-tools.test.ts lib/__tests__/chat-bubble-extraction.test.ts` | Created in W0 | ⬜ pending |
| 33-01-01 | 01 | 1 | TRIP-CHAT-04/05 | unit + build | `npm test -- --run lib/__tests__/trip-planner-tools.test.ts && npm run build` | ✅ W0 | ⬜ pending |
| 33-01-02 | 01 | 1 | TRIP-CHAT-09 | build | `npm run build` | N/A | ⬜ pending |
| 33-02-01 | 02 | 1 | TRIP-CHAT-06/07/08 | unit + build | `npm test -- --run lib/__tests__/chat-bubble-extraction.test.ts && npm run build` | ✅ W0 | ⬜ pending |
| 33-03-01 | 03 | 2 | TRIP-CHAT-01/02/03 | build | `npm run build` | N/A | ⬜ pending |
| 33-03-02 | 03 | 2 | TRIP-CHAT-07 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/__tests__/trip-planner-tools.test.ts` — failing test stubs for tool registry + web search (Plan 33-00)
- [x] `lib/__tests__/chat-bubble-extraction.test.ts` — failing test stubs for extractTripSummary (Plan 33-00)

*Existing infrastructure (ChatClient, streaming pattern) covers most of phase requirements.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Agent opens with greeting question | D-03 | Requires live Claude API call | Open trip planner sheet, verify first message appears automatically |
| Summary card renders with Create Trip button | D-04 | Requires multi-turn conversation | Complete a trip creation conversation, verify summary card appears |
| Navigate to /trips/[id]/prep after creation | D-05 | Requires DB + navigation | Confirm trip creation, verify URL changes to prep page |
| Web search returns campsite results | D-09 | Requires live API | Ask agent about an unknown destination, verify web results appear |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 60s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
