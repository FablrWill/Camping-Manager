# Phase 11: v1.1 Polish - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-02
**Mode:** Interactive (discuss)

## Gray Areas Identified

1. Test fix approach — how to fix the circular gearId validation test
2. Doc sync scope — how thorough the documentation cleanup should be

## Discussion

### Test Fix Approach

**Q: How should we fix the circular gearId validation test?**

Options presented:
1. Rewrite as real API test — Hit PATCH /api/trips/[id]/usage with body missing gearId, assert 400. Tests actual validation. Needs test DB setup.
2. Fix as unit test — Extract validation logic from route, test directly. No DB needed.
3. Delete and backlog — Remove circular test, rely on it.todo stubs for future.

**Selected:** Rewrite as real API test

### Doc Sync Scope

**Q: How thorough should the documentation cleanup be?**

Options presented:
1. Audit items only — Fix the 3 specific inconsistencies the audit flagged.
2. Full consistency pass — Read through all docs end-to-end, fix all stale markers.
3. Full pass + PROJECT.md — Same as above plus update PROJECT.md for v1.1 final state.

**Selected:** Full pass + PROJECT.md

## Additional Notes

- User wants to run a cross-AI review (Gemini) of the full project after Phase 11 is complete
- Captured as deferred idea in CONTEXT.md
