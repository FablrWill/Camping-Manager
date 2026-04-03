---
phase: 15
slug: remote-access-go-live
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-02
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest (existing project test suite) |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test -- --run` |
| **Full suite command** | `npm test -- --run` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm test -- --run`
- **After every plan wave:** Run `npm test -- --run`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | ACCESS-01 | manual | n/a — CLI output | N/A | ⬜ pending |
| 15-01-02 | 01 | 1 | ACCESS-03 | manual | n/a — MagicDNS hostname check | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | ACCESS-04 | manual | n/a — HTTPS browser check | N/A | ⬜ pending |
| 15-02-01 | 02 | 2 | ACCESS-02 | manual | n/a — iPhone device check | N/A | ⬜ pending |
| 15-02-02 | 02 | 2 | ACCESS-05 | manual | n/a — PWA install from phone | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

Existing infrastructure covers all phase requirements. No new test files needed — Phase 15 is 100% infrastructure with no app code changes.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Tailscale running on Mac mini | ACCESS-01 | Requires real hardware; `tailscale status` CLI output | SSH to Mac mini, run `tailscale status`, confirm node appears in tailnet |
| Tailscale running on iPhone | ACCESS-02 | iOS device required | Open Tailscale app on iPhone, confirm connected to tailnet |
| MagicDNS hostname resolves | ACCESS-03 | Network-level check | From iPhone on Tailscale, browse to `https://[hostname].ts.net`, confirm page loads |
| HTTPS works (no cert errors) | ACCESS-04 | Browser SSL check | Load the MagicDNS URL in Safari — no certificate warning |
| PWA installs from phone | ACCESS-05 | iOS Safari required | Open URL in Safari, use Share → Add to Home Screen, confirm install |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
