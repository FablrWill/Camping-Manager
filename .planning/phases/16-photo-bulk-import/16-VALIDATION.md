---
phase: 16
slug: photo-bulk-import
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-04-02
---

# Phase 16 -- Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npx vitest run lib/__tests__/bulk-import.test.ts` |
| **Full suite command** | `npx vitest run && npm run build` |
| **Estimated runtime** | ~30 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run lib/__tests__/bulk-import.test.ts`
- **After every plan wave:** Run `npm run build`
- **Before `/gsd:verify-work`:** Full build + test suite must be green
- **Max feedback latency:** 30 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 16-01-00 | 01 | 0 | PHOTO-02, PHOTO-04 | unit (RED) | `npx vitest run lib/__tests__/bulk-import.test.ts` | lib/__tests__/bulk-import.test.ts | ⬜ pending |
| 16-01-01 | 01 | 1 | PHOTO-01, PHOTO-02, PHOTO-03, PHOTO-04 | unit (GREEN) + tsc | `npx vitest run lib/__tests__/bulk-import.test.ts` | app/api/photos/bulk-import/route.ts | ⬜ pending |
| 16-01-02 | 01 | 2 | PHOTO-01, PHOTO-05 | unit + build | `npx vitest run lib/__tests__/bulk-import.test.ts && npm run build` | components/PhotoUpload.tsx | ⬜ pending |

*Status: ⬜ pending / ✅ green / ❌ red / ⚠️ flaky*

---

## Wave 0 Requirements

- [x] `lib/__tests__/bulk-import.test.ts` -- failing unit tests for endpoint contract (Task 0)
- [ ] `app/api/photos/bulk-import/route.ts` -- new endpoint (created in Task 1, makes tests GREEN)
- [ ] TypeScript types pass: `npm run build` exits 0

*Wave 0 test file covers PHOTO-02 (EXIF + sharp + prisma per file) and PHOTO-04 (per-file error isolation).*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Progress counter updates during import | PHOTO-03 | UI state, not testable via build | Select 5+ files, observe counter increments |
| Corrupt file skipped, valid files saved | PHOTO-04 | Requires real JPEG + corrupt file combo | Upload 1 corrupt + 2 valid, verify 2 saved |
| GPS pins appear on /spots map | PHOTO-05 | Map render requires browser | Import photo with known GPS EXIF, open /spots |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 30s
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** ready
