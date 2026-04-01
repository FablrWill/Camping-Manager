---
phase: 8
slug: pwa-and-offline
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-01
---

# Phase 8 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest (not yet installed — Wave 0) |
| **Config file** | None — Wave 0 installs and creates `vitest.config.ts` |
| **Quick run command** | `npx vitest run` |
| **Full suite command** | `npx vitest run --coverage` |
| **Estimated runtime** | ~5 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run`
- **After every plan wave:** Run `npx vitest run --coverage`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 5 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 08-01-01 | 01 | 0 | OFF-01 | unit | `npx vitest run lib/__tests__/manifest.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-02 | 01 | 0 | OFF-01 | unit | `npx vitest run components/__tests__/InstallBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 08-01-03 | 01 | 0 | OFF-02 | unit | `npx vitest run lib/__tests__/use-online-status.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-04 | 01 | 0 | OFF-02 | unit | `npx vitest run components/__tests__/OfflineBanner.test.tsx` | ❌ W0 | ⬜ pending |
| 08-01-05 | 01 | 0 | OFF-03 | unit | `npx vitest run lib/__tests__/offline-storage.test.ts` | ❌ W0 | ⬜ pending |
| 08-01-06 | 01 | 0 | OFF-03 | unit | `npx vitest run lib/__tests__/cache-trip.test.ts` | ❌ W0 | ⬜ pending |
| 08-xx-xx | xx | x | OFF-04 | manual | Browser DevTools → Application → Cache Storage | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `vitest.config.ts` — framework configuration with jsdom environment
- [ ] `npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom` — framework install
- [ ] `lib/__tests__/offline-storage.test.ts` — stubs for OFF-03 (IndexedDB roundtrip)
- [ ] `lib/__tests__/cache-trip.test.ts` — stubs for OFF-03 (step callbacks)
- [ ] `lib/__tests__/use-online-status.test.ts` — stubs for OFF-02 (online/offline events)
- [ ] `components/__tests__/OfflineBanner.test.tsx` — stubs for OFF-02 (banner rendering)
- [ ] `components/__tests__/InstallBanner.test.tsx` — stubs for OFF-01 (install banner logic)
- [ ] `lib/__tests__/manifest.test.ts` — stubs for OFF-01 (manifest shape validation)

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Service worker intercepts tile fetches and stores them | OFF-04 | Service worker runs in browser context, not testable in jsdom | Open DevTools → Application → Cache Storage → verify `tile-cache` entries after viewing map |
| PWA installs to home screen on iOS | OFF-01 | Requires physical device Safari | Open in Safari → Share → Add to Home Screen → verify standalone launch |
| PWA installs to home screen on Android | OFF-01 | Requires physical device Chrome | Accept install prompt → verify standalone launch from home screen |
| Offline indicator appears when airplane mode toggled | OFF-02 | Requires device-level network toggle | Toggle airplane mode → verify banner appears with correct timestamp |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 5s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
