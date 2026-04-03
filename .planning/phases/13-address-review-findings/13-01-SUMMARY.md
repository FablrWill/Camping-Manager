---
phase: 13-address-review-findings
plan: "01"
subsystem: security
tags: [security, xss, path-traversal, input-validation, llm-safety]
dependency_graph:
  requires: [12-05]
  provides: [REVIEW-03]
  affects: [app/api/import/photos, app/api/photos, components/SpotMap, lib/voice, lib/agent, lib/parse-claude]
tech_stack:
  added: []
  patterns: [zod-schema-validation, html-escaping, path-traversal-guard]
key_files:
  created: []
  modified:
    - app/api/import/photos/route.ts
    - app/api/photos/[id]/route.ts
    - components/SpotMap.tsx
    - lib/agent/memory.ts
    - lib/parse-claude.ts
    - lib/voice/extract.ts
decisions:
  - Path traversal guard uses resolve()+startsWith() pattern — validates after full resolution, not string prefix matching
  - escHtml() placed at module level in SpotMap.tsx — reusable within file, no new dependency needed
  - InsightPayloadSchema added to parse-claude.ts — co-locates all Claude/LLM schemas in one file
  - MemoryArraySchema added to parse-claude.ts — agent memory and voice insight schemas in one place
  - ChatBubble.tsx already had try/catch (lines 29, 47) — no change needed, finding was already addressed
metrics:
  duration_seconds: 239
  completed_date: "2026-04-03"
  tasks_completed: 4
  files_modified: 6
---

# Phase 13 Plan 01: Fix High-Severity Review Findings Summary

**One-liner:** Path traversal guards, HTML escaping for Leaflet popups, and Zod validation for LLM JSON output — fixing all 6 HIGH findings from the Gemini cross-AI review.

## What Was Done

Fixed all 6 HIGH-severity findings from the Gemini cross-AI review (Phase 12-04). The HIGH findings fell into three categories:

1. **Path traversal (2 findings)** — Photo import and delete routes accepted user-supplied file paths without validation
2. **LLM JSON.parse safety (3 findings)** — Voice extraction, agent memory, and ChatBubble parsed LLM/AI output without schema validation
3. **XSS in Leaflet popups (1 finding)** — DB-sourced strings embedded directly in popup HTML without escaping

## Fixes Applied

### Path Traversal — `app/api/import/photos/route.ts`
- Used `path.resolve()` on both `takeoutRoot` and the candidate `sourcePath`
- Verified resolved path starts with resolved root before file access
- Photos with paths outside the root are skipped with an error entry

### Path Traversal — `app/api/photos/[id]/route.ts`
- Computed resolved `filePath` and verified it starts with `/public/photos/`
- If path escapes photos dir, skip file delete (record still deleted from DB — non-fatal)

### XSS in Leaflet popups — `components/SpotMap.tsx`
- Added `escHtml()` utility at module level (escapes `&`, `<`, `>`, `"`, `'`)
- Applied to: `photo.title`, `photo.imagePath`, `photo.locationDescription`, `photo.googleUrl`, `loc.name`, `loc.description`, `pv.name`, `pv.address`
- System-generated values (ratings, durations, type labels from enums) not escaped (not user-controlled)

### LLM JSON safety — `lib/voice/extract.ts`
- Replaced `JSON.parse(text) as InsightPayload` with `parseClaudeJSON(text, InsightPayloadSchema)`
- On validation failure, throws a typed error — API route returns 500 with message

### LLM JSON safety — `lib/agent/memory.ts`
- Added inline `try/catch` around `JSON.parse(text)`
- Added `MemoryArraySchema.safeParse()` validation
- Both failures return early silently (memory extraction is fire-and-forget)

### Schema additions — `lib/parse-claude.ts`
- Added `InsightPayloadSchema` (mirrors `InsightPayload` from `lib/voice/types.ts`)
- Added `MemoryArraySchema` (`z.array(z.object({ key: z.string(), value: z.string() }))`)

### ChatBubble.tsx (Finding 5)
- Reviewed the existing code at lines 29 and 47 — both `extractDeleteConfirm` and `extractRecommendations` already wrap `JSON.parse` in try/catch blocks
- Gemini flagged these as missing try/catch but they already had it; no change needed

## D-10 Verification

| Command | Result |
|---------|--------|
| `npm run build` | Pass — 32/32 static pages |
| `npm run lint` | Pass — 0 errors, 18 warnings (pre-existing) |
| `npx tsc --noEmit` | Pass — 0 type errors |
| `npm test` | Pass — 95 tests, 0 failures |

## Deviations from Plan

None — plan executed exactly as written.

## Known Stubs

None.

## Self-Check: PASSED

- [x] `app/api/import/photos/route.ts` — modified (path traversal guard added)
- [x] `app/api/photos/[id]/route.ts` — modified (path traversal guard added)
- [x] `components/SpotMap.tsx` — modified (escHtml applied to popups)
- [x] `lib/voice/extract.ts` — modified (parseClaudeJSON + InsightPayloadSchema)
- [x] `lib/agent/memory.ts` — modified (MemoryArraySchema validation)
- [x] `lib/parse-claude.ts` — modified (InsightPayloadSchema + MemoryArraySchema added)
- [x] Commit `aa657cf` exists
- [x] All 6 HIGH findings addressed
- [x] D-10 verification passes
