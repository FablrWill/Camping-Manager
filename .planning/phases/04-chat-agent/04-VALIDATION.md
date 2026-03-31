---
phase: 4
slug: chat-agent
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-31
---

# Phase 4 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Manual verification + curl/fetch testing |
| **Config file** | none — no test framework installed yet |
| **Quick run command** | `npm run build` |
| **Full suite command** | `npm run build && npm run lint` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build`
- **After every plan wave:** Run `npm run build && npm run lint`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 04-01-01 | 01 | 0 | CHAT-03 | manual | `curl -X PUT localhost:3000/api/trips/1` | ❌ W0 | ⬜ pending |
| 04-01-02 | 01 | 0 | CHAT-03 | manual | `curl -X PATCH localhost:3000/api/packing-list/items` | ❌ W0 | ⬜ pending |
| 04-02-01 | 02 | 1 | CHAT-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 04-02-02 | 02 | 1 | CHAT-02,CHAT-03 | manual | `curl -X POST localhost:3000/api/chat -d '{}'` | ❌ W0 | ⬜ pending |
| 04-03-01 | 03 | 2 | CHAT-01 | build | `npm run build` | ❌ W0 | ⬜ pending |
| 04-03-02 | 03 | 2 | CHAT-04 | manual | verify iteration cap in streaming response | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Bug fix: `app/api/trips/[id]/route.ts` — PUT/DELETE handlers (D-11)
- [ ] Bug fix: `app/api/packing-list/items/route.ts` — upsert instead of update (D-10)

*These are pre-requisite fixes that unblock agent tool functionality.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Streaming feels responsive on mobile | CHAT-01 | Subjective UX quality | Open /chat on phone, send message, verify skeleton bubble appears < 500ms and text streams visibly |
| Agent references actual gear inventory | CHAT-02 | Requires real data + Claude API | Ask "what do I need for cold weather?" — verify response mentions specific owned gear items |
| Multi-tool chaining in single response | CHAT-03 | Requires Claude API + multiple data sources | Ask trip question that needs weather + gear + knowledge — verify all three queried |
| Tool iteration cap prevents runaway cost | CHAT-04 | Requires observing API behavior | Trigger multi-tool query, verify max 5-10 iterations in server logs |
| Conversation history persists across refresh | CHAT-01 | Browser state test | Send message, refresh page, verify history loads |
| Context-aware shortcut passes page context | CHAT-01 | Navigation + state test | Open chat from trip page, verify agent knows which trip |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
