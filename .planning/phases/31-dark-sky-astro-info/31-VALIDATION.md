---
phase: 31
slug: dark-sky-astro-info
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 31 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Next.js build (`npm run build`) + TypeScript compiler |
| **Config file** | `tsconfig.json` / `next.config.ts` |
| **Quick run command** | `npm run build 2>&1 | tail -5` |
| **Full suite command** | `npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npm run build 2>&1 | tail -5`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 31-01-01 | 01 | 1 | suncalc install | build | `npm run build 2>&1 \| tail -5` | ✅ | ⬜ pending |
| 31-01-02 | 01 | 1 | lib/astro.ts unit logic | manual | `npx tsx -e "import('./lib/astro').then(m => console.log(m.getMoonPhase(new Date('2026-04-03'))))"` | ❌ W0 | ⬜ pending |
| 31-01-03 | 01 | 1 | /api/astro route | build | `npm run build 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 31-01-04 | 01 | 2 | AstroCard renders | build | `npm run build 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |
| 31-01-05 | 01 | 2 | TripsClient integration | build | `npm run build 2>&1 \| tail -5` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `lib/astro.ts` — stubs for moon phase, Bortle estimation, phase label
- [ ] `app/api/astro/route.ts` — stub API route returning astro data shape
- [ ] `components/AstroCard.tsx` — stub component with correct prop interface

*If framework install needed: `npm install suncalc && npm install --save-dev @types/suncalc`*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Sunrise/sunset display for trip dates | SC-1 | No E2E tests | Open trip with location + future dates; verify sunrise/sunset shown per day |
| Moon phase emoji correct | SC-2 | Visual check | Verify phase label/emoji matches known moon phase for 2026-04-03 (waxing gibbous) |
| Bortle placeholder link works | SC-3 | External link | Click "Check light pollution" link; verify lightpollutionmap.info opens |
| No data state graceful | SC-4 | Edge case | Open trip with no location; verify astro card shows "location needed" message |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
