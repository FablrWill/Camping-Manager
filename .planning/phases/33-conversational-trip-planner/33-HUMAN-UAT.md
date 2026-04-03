---
status: partial
phase: 33-conversational-trip-planner
source: [33-03-PLAN.md]
started: 2026-04-03
updated: 2026-04-03
---

## Current Test

[awaiting human testing]

## Tests

### 1. Plan Trip button opens chat sheet
expected: Full-screen chat opens with "Plan a Trip" heading
result: [pending]

### 2. Agent greeting appears immediately
expected: "Where are you thinking of going?" appears on sheet open
result: [pending]

### 3. Add manually escape hatch
expected: Underlined "Add manually" link in header; clicking closes sheet and opens static form
result: [pending]

### 4. Conversational flow + summary card
expected: Agent responds conversationally, eventually presents trip_summary card with amber "Create Trip" button
result: [pending]

### 5. Create Trip navigates to prep
expected: Tapping "Create Trip" creates trip and navigates to /trips/[id]/prep
result: [pending]

### 6. X button and Escape key close sheet
expected: Both X and Escape dismiss the sheet
result: [pending]

### 7. Add Plan B unaffected
expected: "Add Plan B" on existing trips still opens old static form, not chat sheet
result: [pending]

## Summary

total: 7
passed: 0
issues: 0
pending: 7
skipped: 0
blocked: 0

## Gaps
