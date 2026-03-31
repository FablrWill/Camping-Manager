---
phase: 3
slug: knowledge-base
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-03-30
---

# Phase 3 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Node.js test scripts (tsx) |
| **Config file** | none — Wave 0 installs |
| **Quick run command** | `npx tsx tools/ingest/validate-retrieval.ts --quick` |
| **Full suite command** | `npx tsx tools/ingest/validate-retrieval.ts` |
| **Estimated runtime** | ~15 seconds |

---

## Sampling Rate

- **After every task commit:** Run `npx tsx tools/ingest/validate-retrieval.ts --quick`
- **After every plan wave:** Run `npx tsx tools/ingest/validate-retrieval.ts`
- **Before `/gsd:verify-work`:** Full suite must be green
- **Max feedback latency:** 15 seconds

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 03-01-01 | 01 | 1 | RAG-01 | integration | `npx tsx tools/ingest/validate-retrieval.ts --quick` | ❌ W0 | ⬜ pending |
| 03-01-02 | 01 | 1 | RAG-01 | integration | `npx tsx tools/ingest/validate-retrieval.ts --quick` | ❌ W0 | ⬜ pending |
| 03-02-01 | 02 | 2 | RAG-02 | integration | `npx tsx tools/ingest/validate-retrieval.ts` | ❌ W0 | ⬜ pending |
| 03-02-02 | 02 | 2 | RAG-03 | integration | `npx tsx tools/ingest/validate-retrieval.ts` | ❌ W0 | ⬜ pending |
| 03-03-01 | 03 | 3 | RAG-04 | manual+auto | `npx tsx tools/ingest/validate-retrieval.ts` | ❌ W0 | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

- [ ] `tools/ingest/validate-retrieval.ts` — test harness for 10 representative queries
- [ ] `better-sqlite3` + `sqlite-vec` installed and loadable
- [ ] `voyageai` SDK installed and API key validated

*Framework installation handled in Wave 1 plan tasks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Retrieval relevance | RAG-04 | Human judgment on chunk quality | Run 10 queries, inspect top-5 chunks per query, mark relevant/irrelevant |
| Hybrid vs vector-only comparison | RAG-03 | Requires human assessment of "noticeably better" | Compare results side-by-side for same 10 queries |

---

## Validation Sign-Off

- [ ] All tasks have `<automated>` verify or Wave 0 dependencies
- [ ] Sampling continuity: no 3 consecutive tasks without automated verify
- [ ] Wave 0 covers all MISSING references
- [ ] No watch-mode flags
- [ ] Feedback latency < 15s
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
