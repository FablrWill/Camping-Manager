# Phase 21: Permit & Reservation — Research

**Completed:** 2026-04-03

## Recreation.gov API

- Requires OAuth 2.0 client credentials for the reservation lookup API
- No public read-only endpoint for confirming a specific reservation by URL or ID without auth
- Developer registration and approval process is involved
- **Decision: do not integrate Recreation.gov API in v1** — complexity is not justified for a personal tool where Will has the confirmation in his email anyway

## Storage Pattern

- Same approach as float plan notes on Settings: nullable text fields on the parent model
- No separate Permit/Reservation model needed — permitUrl and permitNotes on Trip is sufficient
- URL field allows linking directly to the booking confirmation
- Notes field for site number, check-in time, bear canister requirements, etc.

## Alternative: Scraped Confirmation

- Considered reading recreation.gov confirmation email and extracting booking details
- Would require email/IMAP integration — too complex for v1
- Notes field handles the same use case with manual copy-paste

## UI Pattern Reference

- TripCard dog indicator (`🐕` emoji when `bringingDog = true`) → same pattern for 📋 when `permitUrl` set
- Float plan notes pattern → same for permitNotes (freeform text in a card on trip prep page)
