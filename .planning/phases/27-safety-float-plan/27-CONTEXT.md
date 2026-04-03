# Phase 27: Safety Float Plan - Context

**Gathered:** 2026-04-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Refine the existing safety float plan feature: replace the Claude-composed email with a plain-text template, strip gear list from the message, and keep the button in the Departure Checklist. No schema changes, no SMS. The feature is substantially built from v1.1 — Phase 27 is a targeted refinement.

</domain>

<decisions>
## Implementation Decisions

### Delivery Method
- **D-01:** Email only — no SMS/iMessage. Gmail SMTP path stays as-is. No phone number field needed in Settings.

### Float Plan Placement
- **D-02:** Button stays in the Departure Checklist (`DepartureChecklistClient.tsx`). No changes to placement.

### Message Content — Strip the Gear List
- **D-03:** Remove packed gear by category from the email body. Emergency contacts don't need a gear manifest.
- **D-04:** Also remove departure checklist status (`checklistStatus`) from the message — internal operational detail.
- **D-05:** Keep: destination name + Google Maps link, trip dates (start / end), vehicle name, trip notes/freeform.
- **D-06:** Weather notes (`trip.weatherNotes`) can also be dropped — not relevant to safety.

### Message Composition — Plain Text Template
- **D-07:** Replace Claude API call (`composeFloatPlanEmail`) with a plain-text fill-in-the-blank template. No AI token cost, no schema mismatch risk, deterministic output.
- **D-08:** Template shape (Claude handles formatting at implementation time):
  ```
  [Name] is camping at [destination] from [start] to [end].
  Vehicle: [vehicle name].
  Expected return: [end date].
  [If notes exist: Notes: [notes]]
  [If map link: Map: [link]]
  ```
- **D-09:** Subject line should be simple and scannable — e.g., "Float Plan: [trip name] ([start date])"

### Claude's Discretion
- Exact subject line wording and message punctuation/spacing — follow the template intent, keep it terse.
- How to handle missing fields gracefully (e.g., no vehicle, no notes, no coordinates).
- Whether to keep or remove the `composeFloatPlanEmail` function from `lib/claude.ts` (can remove if no other callers).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing Implementation (substantially built in v1.1)
- `app/api/float-plan/route.ts` — Full existing implementation. Replace `composeFloatPlanEmail` with plain text template. Remove gear/checklist sections.
- `lib/claude.ts` — Contains `composeFloatPlanEmail` — remove or deprecate after refactor.
- `lib/email.ts` — `sendFloatPlan()` — keep as-is, no changes needed.
- `components/DepartureChecklistClient.tsx` — Float plan button UI — no changes needed.
- `components/SettingsClient.tsx` — Emergency contact name + email — no changes needed.

### Schema (no changes needed)
- `prisma/schema.prisma` — `FloatPlanLog`, `Settings`, `Trip` models already support this feature. No migration required.

No external specs — requirements fully captured in decisions above.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `lib/email.ts`: `sendFloatPlan({ to, toName, subject, text })` — already handles plain text. Use as-is.
- `FloatPlanLog` model — already logs every send. No changes.
- `Settings.emergencyContactName/Email` + `Trip.emergencyContactName/Email` override pattern — already implemented in route.ts.

### Established Patterns
- All API routes use try-catch + `console.error` + JSON error responses — keep this.
- Float plan route already resolves contact from trip-level override → settings fallback — preserve this logic.

### Integration Points
- The only change is inside `app/api/float-plan/route.ts`: replace the Claude call + gear-building block with a template string. Everything else (email send, log write, error handling) stays.

</code_context>

<specifics>
## Specific Ideas

- Will's framing: "I don't think they need to know my gear" — message should read like a simple human check-in, not a logistics report. Keep it to who, where, when, vehicle, brief notes.

</specifics>

<deferred>
## Deferred Ideas

- SMS/iMessage via osascript — Will chose email-only. Could revisit in a later phase if needed.
- Expected return *time* (not just date) — not requested; end date is sufficient.
- Float plan history UI — `FloatPlanLog` already tracks sent plans but no UI to view them. Future phase if needed.

</deferred>

---

*Phase: 27-safety-float-plan*
*Context gathered: 2026-04-03*
