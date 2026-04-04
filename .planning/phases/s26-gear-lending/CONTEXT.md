# S26: Gear Lending Tracker — Context

**Session:** S26
**Date:** 2026-04-04
**Status:** Done

## Background

Will regularly lends gear to friends — tent to a friend for a weekend, headlamps to family visiting, etc. He consistently forgets who has what and when they borrowed it. Gear ends up "lost" because there's no tracking.

## What This Addressed

- No way to know which gear is currently out on loan
- No record of who borrowed what or when it's expected back
- Gear page showed all items as "owned" even if they were with someone else

## Design Decision

- **GearLoan model** — tracks borrower name, loan date, return date (nullable = still on loan), notes
- **Loans tab in gear detail** — CRUD for that item's loan history
- **Active loans banner** on Gear page — "N item(s) currently on loan" when any loans are unreturned
- **Badge on Loans tab button** — shows count of active loans for that specific item

## Key Decisions

- GearLoan model (not AgentJob or a notes field) — queryable data, important for "who has it?" lookup
- Cascade delete on GearItem delete (loan history gone when item deleted — intentional)
- @@index on [gearItemId, returnedAt] for efficient "active loans" query
- Active loans = `returnedAt IS NULL`
- Gear page banner counts active loans server-side for performance
