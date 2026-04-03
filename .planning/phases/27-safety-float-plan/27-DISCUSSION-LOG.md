# Phase 27: Safety Float Plan - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-03
**Phase:** 27 — Safety Float Plan

---

## Pre-Discussion: Existing Implementation

Before presenting gray areas, codebase scout revealed:
- `app/api/float-plan/route.ts` — full email send with Claude composition already exists (v1.1)
- `FloatPlanLog` model tracking all sends
- "Send Float Plan" button in `DepartureChecklistClient.tsx`
- Settings UI with name + email

Phase 27 is therefore a refinement, not a greenfield build.

---

## Area: SMS vs Email

**Question:** Email via Gmail SMTP works today. Does Phase 27 add iMessage via osascript?

**Options presented:**
1. Email only (Recommended)
2. Add SMS via iMessage
3. Both — send to both

**Selected:** Email only

---

## Area: Float Plan Placement

**Question:** Where should the "Send Float Plan" button live?

**Options presented:**
1. Departure Checklist only (Recommended)
2. Add to Trip detail page too
3. Move it to Trips page

**Selected:** Departure Checklist only

---

## Area: Message Content

**Question:** Current message includes gear by category, checklist progress, weather notes, trip notes. What should change?

**User response:** "I don't think they need to know my gear"

**Follow-up — what to keep:**
- Destination + coordinates/map link ✓
- Trip dates (start / end) ✓
- Vehicle description ✓
- Trip notes / any other context ✓

**Removed:** packed gear list, departure checklist status, weather notes

---

## Area: Message Composition

**Question:** Claude-composed prose vs plain text template?

**Options presented:**
1. Plain text template (Recommended)
2. Keep Claude-composed

**Selected:** Plain text template

**Implication:** Remove `composeFloatPlanEmail` Claude call from the API route; replace with a deterministic template string.

---

*Discussion completed 2026-04-03*
