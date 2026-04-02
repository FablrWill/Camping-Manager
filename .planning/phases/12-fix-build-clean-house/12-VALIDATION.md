---
phase: 12
slug: fix-build-clean-house
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 12 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run build && npm test && npx tsc --noEmit` |
| **Estimated runtime** | ~15 seconds (test: 2s, build: 10s, tsc: 3s) |

---

## Sampling Rate

- **After every task commit:** Run `npm test`
- **After every plan wave:** Run `npm run build && npm test && npx tsc --noEmit`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 12-01-01 | 01 | 1 | BUILD-01 | smoke | `npm run build` | — (command) | ⬜ pending |
| 12-01-02 | 01 | 1 | BUILD-02 | smoke | `npm run build` (no bundle error) | — (command) | ⬜ pending |
| 12-02-01 | 02 | 2 | BUILD-03 | code review | `grep "<button" components/PackingList.tsx` (0 results) | code review | ⬜ pending |
| 12-02-02 | 02 | 2 | BUILD-04 | code review | `grep 'variant="outline"'` (0 results) | code review | ⬜ pending |
| 12-02-03 | 02 | 2 | BUILD-05 | code review | `grep "coming in future" components/SettingsClient.tsx` (0 results) | code review | ⬜ pending |
| 12-02-04 | 02 | 2 | BUILD-06 | code review | `grep "SHELL_ASSETS" public/sw.js` | code review | ⬜ pending |
| 12-02-05 | 02 | 2 | BUILD-07 | code review | `grep "tripCoords" components/DepartureChecklistClient.tsx` | code review | ⬜ pending |
| 12-03-01 | 03 | 2 | BUILD-08 | unit | `npm test` (0 `todo` in output) | ✅ tests exist | ⬜ pending |
| 12-03-02 | 03 | 2 | BUILD-09 | unit | `npm test` (suite passes) | ✅ tests exist | ⬜ pending |
| 12-04-01 | 04 | 2 | BUILD-10 | doc review | `head -3 .planning/ROADMAP.md` shows v1.2 | ✅ file exists | ⬜ pending |
| 12-05-01 | 05 | 2 | REVIEW-01 | manual | `npx gemini -p "..."` | file to create | ⬜ pending |
| 12-05-02 | 05 | 2 | REVIEW-02 | doc review | GEMINI-REVIEW.md has severity sections | file to create | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements:
- Vitest installed and configured
- Test files scaffolded with todo stubs
- Build pipeline functional
- Gemini CLI available globally

*No Wave 0 setup needed.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Gemini review quality | REVIEW-01/02 | AI output quality is subjective | Read GEMINI-REVIEW.md, verify findings are categorized by severity and actionable |
| Button visual correctness | BUILD-03 | Visual appearance needs human judgment | Open PackingList and MealPlan pages, verify buttons match design system |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
