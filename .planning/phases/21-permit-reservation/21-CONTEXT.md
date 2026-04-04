# Phase 21: Permit & Reservation — Context

**Phase:** 21
**Session:** S06
**Status:** Done

## Goal

Store Recreation.gov confirmation links and permit details with trips. Surface permit reminders in Trip Prep. Add permitUrl + permitNotes fields to the Trip model.

## Background

Will often books Recreation.gov campsites in advance (especially for popular spots like Davidson River, Linville Gorge). The booking confirmation URL and site details (site number, check-in time) lived in email — not connected to the trip in Outland OS.

## Research Finding

Recreation.gov API requires OAuth for reservation lookup — complex to integrate for a personal tool. Decision: store the confirmation URL + notes manually. Will pastes the booking URL and types site number/notes. Same pattern as how float plan notes are stored.

## Key Decisions

- No Recreation.gov API integration in v1 — manual URL paste is sufficient
- Two nullable fields on Trip (no new model) — lightweight, matches the float plan notes pattern
- TripCard shows 📋 emoji next to trip name when permit URL is set — visible signal at a glance
- Permits card in TripPrepClient allows editing URL + notes from prep page (not just trip edit form)

## Files Changed

- `prisma/schema.prisma` — permitUrl, permitNotes on Trip
- `prisma/migrations/*_add_permit_fields/` — migration applied
- `app/api/trips/[id]/route.ts` — PUT accepts permitUrl/permitNotes
- `components/TripPrepClient.tsx` — Permits & Reservations card (7th section)
- `components/TripCard.tsx` — 📋 indicator on card header
- `components/TripsClient.tsx` — permit fields in edit form
- `app/trips/[id]/prep/page.tsx` — passes permit fields to TripPrepClient
