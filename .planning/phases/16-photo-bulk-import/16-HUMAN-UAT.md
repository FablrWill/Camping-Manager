---
status: partial
phase: 16-photo-bulk-import
source: [16-VERIFICATION.md]
started: 2026-04-03T00:00:00Z
updated: 2026-04-03T00:00:00Z
---

## Current Test

[awaiting human testing]

## Tests

### 1. Multi-file upload with progress counter
expected: Select 3+ photos via the upload UI, see "Importing 1 of 3...", "Importing 2 of 3...", etc. during the upload, photos with GPS appear as pins on the Spots map after completion.
result: [pending]

### 2. Mixed-batch error isolation with corrupt file
expected: Include one corrupt or GPS-less file in a multi-file batch — the bad file is skipped/errored, remaining files import successfully, error is shown in the result summary without aborting the batch.
result: [pending]

## Summary

total: 2
passed: 0
issues: 0
pending: 2
skipped: 0
blocked: 0

## Gaps
