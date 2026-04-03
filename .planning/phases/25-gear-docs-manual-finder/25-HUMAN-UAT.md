---
status: partial
phase: 25-gear-docs-manual-finder
source: [25-VERIFICATION.md]
started: 2026-04-03T14:15:00Z
updated: 2026-04-03T14:15:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Documents Tab Renders in Gear Edit Modal
expected: Open gear inventory, tap Edit on any gear item, scroll to the bottom — a "Documents" section appears inside the modal with a "Find Manual" button and empty state message
result: [pending]

### 2. Find Manual Flow End-to-End
expected: Edit a gear item with a known brand (e.g., MSR, Garmin), tap "Find Manual" — loading state shows, then Claude-predicted URLs appear with type badges and Save buttons
result: [pending]

### 3. PDF Download + Local Access
expected: For a gear item with a PDF document URL, tap "Download PDF" — button shows loading, then updates to a "View PDF" link that opens the cached file at /docs/filename.pdf
result: [pending]

### 4. 422 Handling in UI
expected: Add a non-PDF URL as type=manual_pdf, then tap Download PDF — inline error "URL did not return a valid PDF" appears without crashing
result: [pending]

## Summary

total: 4
passed: 0
issues: 0
pending: 4
skipped: 0
blocked: 0

## Gaps
