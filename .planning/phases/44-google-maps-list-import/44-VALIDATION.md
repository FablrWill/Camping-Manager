---
phase: 44
slug: google-maps-list-import
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-04
---

# Phase 44 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (existing) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- gmaps-import` |
| **Full suite command** | `npm test` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- gmaps-import`
- **After every plan wave:** Run `npm test`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 44-W0-01 | W0 | 0 | GMAPS-01, GMAPS-02, GMAPS-05 | unit | `npm test -- gmaps-import` | ❌ W0 | ⬜ pending |
| 44-01-01 | 01 | 1 | GMAPS-01 | unit | `npm test -- gmaps-import` | ❌ W0 | ⬜ pending |
| 44-01-02 | 01 | 1 | GMAPS-02 | unit | `npm test -- gmaps-import` | ❌ W0 | ⬜ pending |
| 44-01-03 | 01 | 1 | GMAPS-05 | unit | `npm test -- gmaps-import` | ❌ W0 | ⬜ pending |
| 44-02-01 | 02 | 2 | GMAPS-03, GMAPS-04 | unit (mock) | `npm test -- gmaps-import` | ❌ W0 | ⬜ pending |
| 44-03-01 | 03 | 3 | GMAPS-03, GMAPS-04 | manual | see Manual-Only | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gmaps-import.test.ts` — stubs for GMAPS-01, GMAPS-02, GMAPS-05 (parsing logic with fixture HTML)
- [ ] Fixture HTML snippet — a representative sanitized Google Maps list HTML blob for deterministic parsing tests (inline in test file or `tests/fixtures/gmaps-list.html`)

*All Wave 0 stubs must be created before Wave 1 task execution begins.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Import button opens modal | GMAPS-03 | UI interaction | Open /spots, click "Import from Google Maps", verify modal appears |
| Spot appears on map after import | GMAPS-04 | Map render | Complete import flow with valid URL, verify new pin on Spots map |
| Error message shown for invalid URL | GMAPS-05 | UI error state | Paste a non-maps URL, tap Fetch, verify inline error (no crash) |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
