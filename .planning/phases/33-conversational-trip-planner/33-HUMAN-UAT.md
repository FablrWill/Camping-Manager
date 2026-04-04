---
status: approved
phase: 33-conversational-trip-planner
source: [33-03-PLAN.md]
started: 2026-04-03
updated: 2026-04-04
---

## Current Test

Approved by Will 2026-04-04 — phase marked complete, browser UAT deferred.

## Tests

### 1. Plan Trip button opens chat sheet
expected: Full-screen chat opens with "Plan a Trip" heading
result: skipped (approved)

### 2. Agent greeting appears immediately
expected: "Where are you thinking of going?" appears on sheet open
result: skipped (approved)

### 3. Add manually escape hatch
expected: Underlined "Add manually" link in header; clicking closes sheet and opens static form
result: skipped (approved)

### 4. Conversational flow + summary card
expected: Agent responds conversationally, eventually presents trip_summary card with amber "Create Trip" button
result: skipped (approved)

### 5. Create Trip navigates to prep
expected: Tapping "Create Trip" creates trip and navigates to /trips/[id]/prep
result: skipped (approved)

### 6. X button and Escape key close sheet
expected: Both X and Escape dismiss the sheet
result: skipped (approved)

### 7. Add Plan B unaffected
expected: "Add Plan B" on existing trips still opens old static form, not chat sheet
result: skipped (approved)

## Summary

total: 7
passed: 0
issues: 0
pending: 0
skipped: 7
blocked: 0

## Gaps
