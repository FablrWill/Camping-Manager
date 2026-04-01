---
phase: 7
slug: day-of-execution
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — no automated test infrastructure in project |
| **Config file** | None |
| **Quick run command** | `npm run build` (type-check + compile) |
| **Full suite command** | Manual browser verification flow |
| **Estimated runtime** | ~30 seconds (build), ~5 min (manual flow) |

---

## Sampling Rate

- **After every task commit:** Run `npm run build` — confirms no type errors
- **After every plan wave:** Full manual verification: generate checklist → check items → reload → verify persistence → send float plan → verify Gmail
- **Before `/gsd:verify-work`:** Full manual flow must be green
- **Max feedback latency:** 30 seconds (build check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | EXEC-01 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-02 | 01 | 1 | EXEC-01 | build | `npm run build` | ✅ | ⬜ pending |
| 07-01-03 | 01 | 1 | EXEC-02 | build | `npm run build` | ✅ | ⬜ pending |
| 07-02-01 | 02 | 2 | EXEC-01 | manual | Browser: generate checklist | N/A | ⬜ pending |
| 07-02-02 | 02 | 2 | EXEC-01 | manual | Browser: check-off + reload | N/A | ⬜ pending |
| 07-03-01 | 03 | 2 | EXEC-02 | manual | Browser: send float plan email | N/A | ⬜ pending |
| 07-03-02 | 03 | 2 | EXEC-02 | manual | Check Gmail sent folder | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers build-time verification. No automated test framework to install.*

- [ ] `npm run build` passes before phase execution begins

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Checklist generates from real trip data | EXEC-01 | Requires Claude API call + browser rendering | Open trip → generate checklist → verify items reference actual packing/meal/power data |
| Check-off state persists | EXEC-01 | UI interaction + navigation | Check off items → navigate away → return → verify checked state retained |
| Unpacked items show amber warnings | EXEC-01 | Visual verification | Leave packing items unchecked → generate checklist → verify amber highlight rows |
| Float plan email delivers to Gmail | EXEC-02 | Requires real SMTP delivery | Configure Gmail App Password → send float plan → check recipient inbox |
| Float plan send logs to DB | EXEC-02 | DB state inspection | Send float plan → check Prisma Studio for FloatPlanLog record |
| Settings page saves emergency contact | EXEC-02 | Form interaction | Navigate to /settings → enter contact → save → reload → verify persisted |

---

## Validation Sign-Off

- [ ] All tasks have build-check or manual verify
- [ ] Sampling continuity: build check after every task commit
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (build check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
