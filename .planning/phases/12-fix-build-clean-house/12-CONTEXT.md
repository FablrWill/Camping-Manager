# Phase 12: Fix Build & Clean House - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Get the app to build for production (`npm run build` passes), resolve all known tech debt items (BUILD-03 through BUILD-10), and run a full-codebase cross-AI review via Gemini to identify blind spots before shipping.

</domain>

<decisions>
## Implementation Decisions

### Build Fix (BUILD-01/BUILD-02) — Critical Path
- **D-01:** Fix native SQLite deps leaking into client bundles using `serverExternalPackages` in `next.config.ts`. Add `better-sqlite3` and `sqlite-vec` to the externals list. No dynamic import wrappers needed — keep it simple.
- **D-02:** This is the critical path blocker — must succeed before any tech debt or review work begins.

### Tech Debt (BUILD-03 through BUILD-10) — Parallel Execution
- **D-03:** Run BUILD-03 through BUILD-07 as parallel agents after BUILD-01/02 passes. All are independent 5-15 min fixes with no interdependencies.
- **D-04:** BUILD-08 through BUILD-10 can also run in parallel with BUILD-03-07.

### Test Stubs (BUILD-08/BUILD-09)
- **D-05:** Implement all 6 `it.todo` test stubs with real tests. Ship with actual coverage, not placeholders.
- **D-06:** Remove the low-value `usageStatus` array test (BUILD-09) if it doesn't cover meaningful risk.

### Gemini Cross-Review (REVIEW-01/REVIEW-02)
- **D-07:** Send full codebase (all app/, components/, lib/ files) with a structured review prompt asking for findings categorized by severity (critical/high/medium/low).
- **D-08:** Run the Gemini review concurrently with tech debt fixes (BUILD-03 through BUILD-10). The review reads existing code, not modified code — findings feed into Phase 13 regardless.
- **D-09:** Store the review report as `.planning/phases/12-fix-build-clean-house/GEMINI-REVIEW.md` with findings grouped by severity. Phase 13 reads this directly.

### Build Verification
- **D-10:** After all fixes, run the full verification pipeline: `npm run build` + `npm run lint` + `tsc --noEmit` + `npm test`. All four must pass before the phase is considered complete.

### Claude's Discretion
- Settings placeholder (BUILD-05): Claude decides whether to replace with real content or remove entirely, based on what makes sense for the app's current state.
- Gemini review prompt structure: Claude designs the review prompt to maximize useful findings.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Build & Tech Debt
- `.planning/codebase/CONCERNS.md` — Full catalog of known tech debt with file locations and fix approaches
- `.planning/codebase/STACK.md` — Technology stack details, build configuration, dependency versions
- `.planning/REQUIREMENTS.md` — BUILD-01 through BUILD-10 acceptance criteria

### Codebase Structure
- `.planning/codebase/STRUCTURE.md` — File layout for codebase review scope
- `.planning/codebase/CONVENTIONS.md` — Established patterns to maintain during fixes
- `.planning/codebase/TESTING.md` — Test infrastructure and existing test patterns

### Project Context
- `.planning/ROADMAP.md` — Phase 12 success criteria and parallelization notes

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- Design system Button component exists — use it to replace raw `<button>` elements (BUILD-03/04)
- ConfirmDialog component exists in Modal.tsx — available if needed
- Error handling pattern established in `app/api/gear/route.ts` — copy for consistency

### Established Patterns
- Try-catch + JSON error response pattern for API routes
- State-based inline error messages (no `alert()`)
- Tailwind CSS for all styling (avoid inline styles)
- `it.todo` stubs indicate test structure already scaffolded

### Integration Points
- `next.config.ts` — where serverExternalPackages goes (BUILD-01/02)
- `components/ui/` — design system components for BUILD-03/04
- Test files alongside components — where stub implementations go (BUILD-08)
- Service worker `SHELL_ASSETS` list — needs dynamic trip route entries (BUILD-06)

</code_context>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches. The requirements (BUILD-01 through BUILD-10, REVIEW-01/02) are prescriptive enough to guide implementation.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 12-fix-build-clean-house*
*Context gathered: 2026-04-02*
