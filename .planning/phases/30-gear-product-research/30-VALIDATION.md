---
phase: 30
slug: gear-product-research
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-03
---

# Phase 30 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 3.2.4 |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/gear-research-route.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/gear-research-route.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` passes
- **Max feedback latency:** ~15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 30-W0-01 | 01 | 0 | SC-1, SC-2, SC-4 | unit | `npx vitest run tests/gear-research-route.test.ts` | ❌ W0 | ⬜ pending |
| 30-W0-02 | 01 | 0 | SC-3 | unit | `npx vitest run tests/gear-research-schema.test.ts` | ❌ W0 | ⬜ pending |
| 30-schema | 01 | 1 | SC-1 | unit | `npx vitest run tests/gear-research-route.test.ts` | ❌ W0 | ⬜ pending |
| 30-api | 01 | 2 | SC-1, SC-2 | unit | `npx vitest run tests/gear-research-route.test.ts` | ❌ W0 | ⬜ pending |
| 30-ui | 01 | 3 | SC-2 | manual | Open gear modal → Research tab present | N/A | ⬜ pending |
| 30-upgrade | 01 | 3 | SC-4 | manual | Gear page → Upgrade Opportunities section | N/A | ⬜ pending |
| 30-build | 01 | 4 | SC-5 | build | `npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tests/gear-research-route.test.ts` — stubs for SC-1 (POST triggers research + persists), SC-2 (GET returns stored), SC-4 (404 on missing gear)
- [ ] `tests/gear-research-schema.test.ts` — stubs for SC-3 (Zod GearResearchResultSchema validates good/bad Claude output)

*Wave 0 must create these test files before any implementation tasks run.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Research tab visible in gear detail modal | SC-1 | UI tab render | Open gear modal → confirm "Research" tab button present |
| Research button triggers loading state | SC-1 | Loading UX | Click Research button → spinner/progress message visible |
| Stale warning banner (>90 days) | SC-3 | Date manipulation required | Set `researchedAt` to 91 days ago in DB → open Research tab → stale banner visible |
| Upgrade Opportunities collapsible | SC-4 | Visual section | Set verdict="Worth upgrading" on a GearResearch row → gear page → "Upgrade Opportunities" section visible |
| Clicking upgrade entry opens Research tab | SC-4 | Modal + tab state | Click entry in Upgrade Opportunities → gear modal opens on Research tab |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 20s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
