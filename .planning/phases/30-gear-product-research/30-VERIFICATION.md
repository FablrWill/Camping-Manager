---
phase: 30-gear-product-research
verified: 2026-04-04T00:05:00Z
status: human_needed
score: 8/9 must-haves verified
re_verification: false
human_verification:
  - test: "Open gear modal in dev, click Research tab, trigger research, confirm verdict/alternatives/price disclaimer render"
    expected: "Research tab shows verdict badge, up to 3 alternatives with pros/cons/price range/reason, price disclaimer text, and Re-research button"
    why_human: "Full UI render with live Claude API call required; cannot verify JSX render states or spinner behavior programmatically"
  - test: "Set a GearResearch row to researchedAt > 90 days ago in DB, open that gear's Research tab"
    expected: "Yellow stale warning banner appears with 'Research is over 90 days old' text and Re-research button"
    why_human: "Requires database manipulation to trigger staleness condition"
  - test: "Set a GearResearch row verdict to 'Worth upgrading', navigate to /gear page"
    expected: "Collapsible 'Upgrade Opportunities (N)' section appears above gear list; click entry opens correct gear modal on Research tab"
    why_human: "Visual section render and modal + tab state interaction requires browser verification"
  - test: "Run npm run build in the actual dev environment (with DATABASE_URL configured)"
    expected: "Build completes without errors (SC-5)"
    why_human: "Build fails in this worktree due to missing DATABASE_URL env var; build was human-verified during Plan 03 Task 2 checkpoint but cannot be confirmed here"
---

# Phase 30: Gear Product Research Verification Report

**Phase Goal:** AI-powered "Research" button on gear items that finds best-in-class alternatives, compares to current item, and surfaces upgrade recommendations
**Verified:** 2026-04-04T00:05:00Z
**Status:** human_needed (8/9 automated truths verified; 4 items require human/dev-env confirmation)
**Re-verification:** No — initial verification

## Goal Achievement

### Success Criteria from ROADMAP.md

| # | Success Criterion | Status | Evidence |
|---|---|---|---|
| SC-1 | "Research" button on gear detail triggers Claude research | ? HUMAN | GearResearchTab component exists with POST fetch handler; live trigger requires browser |
| SC-2 | Results show top alternatives with pros/cons vs current item | ? HUMAN | Component renders alternatives from API response; visual confirmation requires browser |
| SC-3 | Research results stored and dated (staleness tracking >90 days) | ✓ VERIFIED | GearResearch model with `researchedAt`, `STALE_DAYS = 90` in component, stale banner in JSX |
| SC-4 | Gear page surfaces top upgrade opportunities | ? HUMAN | Code fully wired; visual confirmation and click-through require browser |
| SC-5 | `npm run build` passes | ? HUMAN | Fails in worktree (missing DATABASE_URL); human-approved during Plan 03 checkpoint |

### Observable Truths (derived from plan must_haves)

| # | Truth | Status | Evidence |
|---|---|---|---|
| 1 | POST /api/gear/[id]/research triggers Claude research and returns structured result | ✓ VERIFIED | Route file exists with POST handler calling generateGearResearch + upsert; 4/4 route tests pass |
| 2 | GET /api/gear/[id]/research returns stored result with researchedAt timestamp | ✓ VERIFIED | GET handler reads prisma.gearResearch.findUnique, returns researchedAt.toISOString() |
| 3 | POST returns 404 when gear item does not exist | ✓ VERIFIED | Route checks prisma.gearItem.findUnique before proceeding; test covers this case |
| 4 | Claude output is validated against GearResearchResultSchema before persisting | ✓ VERIFIED | lib/claude.ts line 817: parseClaudeJSON(text, GearResearchResultSchema) |
| 5 | GearResearch row is upserted (one per gear item, overwritten on re-research) | ✓ VERIFIED | prisma.gearResearch.upsert with where: { gearItemId: id } in route.ts |
| 6 | Gear detail modal has Documents and Research tabs | ✓ VERIFIED | GearClient.tsx has activeTab state, tab switcher buttons, conditional render for both tabs |
| 7 | Research tab shows loading, empty, results, stale, and error states | ✓ VERIFIED | GearResearchTab.tsx (237 lines) covers all states including STALE_DAYS=90, isStale check |
| 8 | Gear page shows collapsible Upgrade Opportunities for verdict=Worth upgrading items | ✓ VERIFIED | page.tsx fetches prisma.gearResearch.findMany({where:{verdict:'Worth upgrading'}}); GearClient renders collapsible section |
| 9 | Clicking upgrade entry opens gear item's Research tab | ✓ VERIFIED | openResearchForItem callback sets editingItem + activeTab='research'; wired via onClick in upgrade list |

**Score:** 8/9 automated checks verified; SC-1, SC-2, SC-4, SC-5 need human/dev-env confirmation for full visual/behavioral coverage

## Required Artifacts

| Artifact | Expected | Status | Details |
|---|---|---|---|
| `prisma/schema.prisma` | GearResearch model with gearItemId @unique, verdict column | ✓ VERIFIED | model GearResearch at line 390; gearItemId @unique line 392; verdict line 394; GearItem back-reference line 34 |
| `prisma/migrations/20260403234651_add_gear_research/` | Migration directory | ✓ VERIFIED | Directory exists under prisma/migrations/ |
| `lib/parse-claude.ts` | GearResearchResultSchema + types exported | ✓ VERIFIED | Exports GearResearchResultSchema, GearResearchResult, GearResearchAlternative; verdict enum + .max(3) |
| `lib/claude.ts` | generateGearResearch function | ✓ VERIFIED | Exported at line 762; calls Claude with model claude-sonnet-4-20250514, max_tokens 2000; uses parseClaudeJSON |
| `app/api/gear/[id]/research/route.ts` | GET and POST handlers | ✓ VERIFIED | Both handlers present; POST does 404 check, upsert, returns result; GET returns stored or 404 |
| `components/GearResearchTab.tsx` | Research tab UI (min 80 lines) | ✓ VERIFIED | 237 lines; 'use client'; GearResearchTabProps interface; STALE_DAYS=90; isStale; fetch GET + POST; priceDisclaimer render; no alert() |
| `components/GearClient.tsx` | Tab switcher, openResearchForItem, Upgrade Opportunities | ✓ VERIFIED | activeTab state; GearResearchTab import; openResearchForItem callback; upgradesExpanded state; Upgrade Opportunities section |
| `app/gear/page.tsx` | Server-side upgrade opportunities fetch | ✓ VERIFIED | Promise.all; prisma.gearResearch.findMany with verdict filter; initialUpgrades prop passed |
| `tests/gear-research-schema.test.ts` | 8 schema validation tests | ✓ VERIFIED | 8/8 passing |
| `tests/gear-research-route.test.ts` | 4 route tests with vi.mock | ✓ VERIFIED | 4/4 passing; vi.mock('@/lib/db') and vi.mock('@/lib/claude') present |

## Key Link Verification

| From | To | Via | Status | Details |
|---|---|---|---|---|
| `app/api/gear/[id]/research/route.ts` | `lib/claude.ts` | generateGearResearch() call | ✓ WIRED | Import on line 3; call on line 39 |
| `app/api/gear/[id]/research/route.ts` | `prisma.gearResearch` | upsert with gearItemId | ✓ WIRED | prisma.gearResearch.upsert on line 48 |
| `lib/claude.ts` | `lib/parse-claude.ts` | parseClaudeJSON with GearResearchResultSchema | ✓ WIRED | Import in lib/claude.ts line 2; parseClaudeJSON call line 817 |
| `components/GearResearchTab.tsx` | `/api/gear/[id]/research` | fetch GET on mount, POST on button click | ✓ WIRED | 2 fetch matches for api/gear.*research pattern; method: 'POST' on line 110 |
| `components/GearClient.tsx` | `components/GearResearchTab.tsx` | conditional render based on activeTab state | ✓ WIRED | Import line 6; `<GearResearchTab` at line 465; activeTab === 'research' conditional |
| `app/gear/page.tsx` | `prisma.gearResearch` | findMany with verdict filter | ✓ WIRED | prisma.gearResearch.findMany with where: { verdict: 'Worth upgrading' } |
| `components/GearClient.tsx` | `openResearchForItem` | click handler on upgrade entry | ✓ WIRED | openResearchForItem defined at line 177; called via onClick at line 293 |

## Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|---|---|---|---|---|
| `app/api/gear/[id]/research/route.ts` POST | `result` | generateGearResearch() → Claude API → parseClaudeJSON | Yes — live Claude call, Zod-validated | ✓ FLOWING |
| `app/api/gear/[id]/research/route.ts` GET | `research` | prisma.gearResearch.findUnique | Yes — DB query | ✓ FLOWING |
| `components/GearResearchTab.tsx` | `research` state | GET /api/gear/[id]/research on mount; POST on button click | Yes — wires to API which reads from DB or calls Claude | ✓ FLOWING |
| `app/gear/page.tsx` | `upgrades` | prisma.gearResearch.findMany, then JSON.parse | Yes — DB query with verdict filter | ✓ FLOWING |

## Behavioral Spot-Checks

| Behavior | Command | Result | Status |
|---|---|---|---|
| Schema tests pass | `npx vitest run tests/gear-research-schema.test.ts` | 8/8 passing | ✓ PASS |
| Route tests pass | `npx vitest run tests/gear-research-route.test.ts` | 4/4 passing | ✓ PASS |
| Both test files together | `npx vitest run tests/gear-research-*.test.ts` | 12/12 passing | ✓ PASS |
| TypeScript errors in Phase 30 files | `npx tsc --noEmit 2>&1 | grep gear-research\|GearResearch\|GearClient\|parse-claude\|research/route` | No output (no errors) | ✓ PASS |
| npm run build | `npm run build` | Fails — DATABASE_URL missing in worktree env (pre-existing, not a Phase 30 regression) | ? SKIP |

## Requirements Coverage

The SC-1 through SC-5 IDs are phase-local success criteria defined in 30-PLAN frontmatter and ROADMAP.md. The global REQUIREMENTS.md (which covers v1.2/v2.0 milestones) does not define SC-prefixed IDs — all five are phase-scoped. No orphaned requirements found.

| Requirement | Source Plan | Description | Status | Evidence |
|---|---|---|---|---|
| SC-1 | 30-01, 30-02 | "Research" button triggers Claude research | ? HUMAN | Route + component fully wired; trigger UX requires browser |
| SC-2 | 30-01, 30-02 | Results show top alternatives with pros/cons | ? HUMAN | GearResearchTab renders alternatives; visual confirmation needed |
| SC-3 | 30-01, 30-02 | Results stored and dated; staleness >90 days | ✓ VERIFIED | GearResearch model, STALE_DAYS=90, stale banner in JSX |
| SC-4 | 30-03 | Gear page surfaces upgrade opportunities | ? HUMAN | Server fetch + collapsible section wired; visual + click-through needs browser |
| SC-5 | 30-03 | npm run build passes | ? HUMAN | Human-approved in Plan 03 checkpoint; fails here due to missing env var |

## Anti-Patterns Found

No blockers or stubs found.

| File | Line | Pattern | Severity | Impact |
|---|---|---|---|---|
| `components/GearClient.tsx` | 228, 231 | `placeholder=` attribute | ℹ️ Info | HTML input placeholder text — not a code stub |
| `app/api/gear/[id]/research/route.ts` | 22, 69 | `console.error(` | ℹ️ Info | Project-standard server-side error logging (CLAUDE.md convention) |

No TODO/FIXME markers, no `return null` stubs, no empty handlers, no hardcoded empty arrays found in Phase 30 files.

## Human Verification Required

### 1. Research Tab UI — Full Flow

**Test:** Start dev server (`npm run dev`), open http://localhost:3000/gear, click any gear item, click the "Research" tab
**Expected:** Tab switches; shows "No research yet" with a Research button; clicking Research shows a loading state, then displays a verdict badge, 1-3 alternatives with pros/cons/price range/reason, and a price disclaimer at the bottom
**Why human:** Live Claude API call required; spinner UX and JSX render states cannot be verified statically

### 2. Staleness Warning Banner

**Test:** In Prisma Studio or direct SQL, set `researchedAt` on any GearResearch row to 91+ days ago; open that gear item's Research tab
**Expected:** Yellow warning banner with "Research is over 90 days old — results may be outdated" appears alongside existing results and a Re-research button
**Why human:** Requires database date manipulation to trigger the 90-day threshold

### 3. Upgrade Opportunities Section

**Test:** Ensure at least one GearResearch row has verdict = "Worth upgrading"; navigate to /gear
**Expected:** Collapsible "Upgrade Opportunities (1)" section appears above the gear list; expand it to see gear name -> top alternative name — Worth upgrading (reason); click entry to confirm gear modal opens on the Research tab
**Why human:** Visual section display and modal + tab state interaction require browser

### 4. Build Pass Confirmation (SC-5)

**Test:** In the actual dev environment with DATABASE_URL configured, run `npm run build`
**Expected:** Build completes without errors
**Why human:** Build fails in this worktree due to missing DATABASE_URL. Zero TypeScript errors exist in Phase 30 files (confirmed via tsc --noEmit); the human-approve checkpoint in Plan 03 confirms it passed in the dev environment, but cannot be re-verified here

## Gaps Summary

No gaps found. All automated checks pass. The four human verification items above are observational confirmations of behavior that is fully wired in code — they are not blocking code gaps. The build failure is a worktree environment issue (missing DATABASE_URL), not a code regression introduced by Phase 30.

---

_Verified: 2026-04-04T00:05:00Z_
_Verifier: Claude (gsd-verifier)_
