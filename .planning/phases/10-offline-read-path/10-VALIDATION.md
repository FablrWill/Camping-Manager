---
phase: 10
slug: offline-read-path
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 10 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 + jsdom + @testing-library/react |
| **Config file** | vitest.config.ts |
| **Quick run command** | `npx vitest run --reporter=verbose` |
| **Full suite command** | `npx vitest run --reporter=verbose --coverage` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run --reporter=verbose`
- **After every plan wave:** Run `npx vitest run --reporter=verbose --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 10-00-01 | 00 | 0 | OFF-01,02,03,04 | unit | `npx vitest run` | ✅ (stubs exist) | ⬜ pending |
| 10-01-01 | 01 | 1 | OFF-01 | unit | `npx vitest run lib/__tests__/offline-storage.test.ts` | ✅ | ⬜ pending |
| 10-01-02 | 01 | 1 | OFF-01 | unit | `npx vitest run lib/__tests__/cache-trip.test.ts` | ✅ | ⬜ pending |
| 10-01-03 | 01 | 1 | OFF-02 | unit | `npx vitest run lib/__tests__/use-online-status.test.ts` | ✅ | ⬜ pending |
| 10-02-01 | 02 | 1 | OFF-01 | unit | `npx vitest run components/__tests__/OfflineBanner.test.tsx` | ✅ | ⬜ pending |
| 10-02-02 | 02 | 1 | OFF-01 | unit | `npx vitest run components/__tests__/InstallBanner.test.tsx` | ✅ | ⬜ pending |
| 10-03-01 | 03 | 2 | OFF-03 | unit | `npx vitest run lib/__tests__/tile-prefetch.test.ts` | ❌ W0 | ⬜ pending |
| 10-04-01 | 04 | 2 | OFF-01,02 | unit | `npx vitest run components/__tests__/offline-trip-render.test.tsx` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] Implement real test bodies for all 32 existing test stubs (offline-storage, cache-trip, use-online-status, manifest, OfflineBanner, InstallBanner)
- [ ] `lib/__tests__/tile-prefetch.test.ts` — stubs for OFF-03 tile prefetch
- [ ] `components/__tests__/offline-trip-render.test.tsx` — stubs for offline trip rendering

*Existing infrastructure (Vitest + jsdom + testing-library) covers all framework needs.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Map tiles render from cache when offline | OFF-03 | Requires actual browser with IndexedDB + tile rendering | 1. Open trip, 2. Tap "Leaving Now", 3. Disable network, 4. Navigate to spots — tiles should display |
| PWA installs to home screen | OFF-01 | Requires real mobile device/Safari | 1. Open app in Safari, 2. Tap Share > Add to Home Screen, 3. Launch from home screen icon |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
