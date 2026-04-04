---
phase: 25
slug: gear-docs-manual-finder
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-03
updated: 2026-04-03
---

# Phase 25 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run tests/gear-documents.test.ts` |
| **Full suite command** | `npx vitest run` |
| **Estimated runtime** | ~10 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run tests/gear-documents.test.ts`
- **After every plan wave:** Run `npx vitest run`
- **Before `/gsd:verify-work`:** Full suite must be green + `npm run build` passes
- **Max feedback latency:** ~10 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| SC-1 | 01 | 0 | GearDocument model | unit | `npx vitest run tests/gear-documents.test.ts` | Plan 01 Task 0 creates it | ⬜ pending |
| SC-2 | 02 | 1 | Find Manual API | unit | `npx vitest run tests/gear-documents.test.ts` | Plan 01 Task 0 creates it | ⬜ pending |
| SC-3 | 02 | 1 | PDF download + localPath | unit | `npx vitest run tests/gear-documents.test.ts` | Plan 01 Task 0 creates it | ⬜ pending |
| SC-4 | 02 | 1 | GET documents list | unit | `npx vitest run tests/gear-documents.test.ts` | Plan 01 Task 0 creates it | ⬜ pending |
| SC-5 | 01 | 0 | manualUrl migration | integration | manual DB verify | N/A | ⬜ pending |
| SC-6 | 03 | final | npm run build + tsc | smoke | `npx tsc --noEmit && npm run build` | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `tests/gear-documents.test.ts` — unit stubs for SC-1 through SC-4 (mocked Prisma + Claude) — **created by Plan 01 Task 0**
- [x] No test framework install needed — Vitest already in project

*No conftest equivalent needed — Vitest uses `beforeEach`/`vi.mock()` inline.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| manualUrl migration correctness | SC-5 | Requires inspecting live DB state post-migration | Run `npx prisma studio` after migration; verify each previously non-null `manualUrl` gear item has a GearDocument row with matching url and type `support_link` |
| PDF display inline | SC-3 | Browser UX; not automatable | Download a PDF doc in dev; verify it opens in browser tab |
| Service worker caches PDF | SC-6 | Requires DevTools offline simulation | Serve app, load a PDF doc, go offline in DevTools, reload — verify PDF still accessible. Note: `/docs/` URLs fall through to cache-first in existing SW (confirmed no exclusion in public/sw.js) |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references (Plan 01 Task 0)
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
