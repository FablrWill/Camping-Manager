---
phase: 6
slug: stabilization
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 6 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js dev server + manual browser verification |
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
| 06-01-01 | 01 | 1 | STAB-01 | build | `npm run build` | ✅ | ⬜ pending |
| 06-02-01 | 02 | 1 | STAB-02 | build + manual | `npm run build` | ✅ | ⬜ pending |
| 06-03-01 | 03 | 2 | STAB-03 | build | `npm run build` | ✅ | ⬜ pending |
| 06-04-01 | 04 | 2 | STAB-04 | build + manual | `npm run build` | ✅ | ⬜ pending |
| 06-05-01 | 05 | 3 | STAB-05 | build | `npm run build` | ✅ | ⬜ pending |
| 06-06-01 | 06 | 3 | STAB-06 | build | `npm run build` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `npm install zod` — required for Claude response validation (STAB-01)
- [ ] Prisma migration for PackingItem usage fields + TripFeedback model (STAB-06)

*Wave 0 installs zod and runs schema migration before any task execution.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Packing list survives navigation | STAB-02 | Requires browser navigation + state check | Generate packing list → navigate to /gear → return to /trips → verify list visible |
| Meal plan survives navigation | STAB-02 | Requires browser navigation + state check | Generate meal plan → navigate away → return → verify plan visible |
| Malformed Claude response shows error | STAB-01 | Requires API mock or intentional bad response | Temporarily break Claude prompt → verify error UI renders without crash |
| Delete photo removes file from disk | STAB-03 | Requires filesystem check | Delete a photo → verify file removed from public/photos/ |
| All forms use design system | STAB-04 | Visual consistency check | Visit each page → verify Button, Input, Card, Modal usage |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
