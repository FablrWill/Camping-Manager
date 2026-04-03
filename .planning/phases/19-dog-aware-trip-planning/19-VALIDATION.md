---
phase: 19
slug: dog-aware-trip-planning
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 19 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Jest + React Testing Library (existing) |
| **Config file** | `jest.config.js` (project root) |
| **Quick run command** | `npm test -- --testPathPattern="trips\|claude\|TripCard" --passWithNoTests` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --testPathPattern="trips\|claude\|TripCard" --passWithNoTests`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 19-01-01 | 01 | 1 | DOG-01 | integration | `npm run db:migrate && npx prisma validate` | ✅ | ⬜ pending |
| 19-01-02 | 01 | 1 | DOG-01, DOG-05 | integration | `npm run build` | ✅ | ⬜ pending |
| 19-01-03 | 01 | 1 | DOG-02 | unit | `npm test -- --testPathPattern="claude"` | ✅ | ⬜ pending |
| 19-01-04 | 01 | 2 | DOG-01, DOG-04, DOG-05 | integration | `npm test -- --testPathPattern="trips"` | ✅ | ⬜ pending |
| 19-01-05 | 01 | 2 | DOG-03 | unit | `npm test -- --testPathPattern="TripCard"` | ✅ | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements — no new test framework needed.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Dog section in packing list | DOG-02 | Claude API call; cannot unit-test output | Create trip with bringingDog=true, generate packing list, verify "Dog" section appears with all 5 gear items |
| No dog section when false | DOG-04 | Claude API call regression | Create trip with bringingDog=false, generate packing list, verify no dog items appear |
| 🐕 indicator visible | DOG-03 | UI rendering | Open trips page, verify 🐕 emoji shows on cards with bringingDog=true, not on others |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
