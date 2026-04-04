# Phase 21: Permit & Reservation — Summary

**Completed:** 2026-04-03
**Session:** S06 (V2 queue)

## What Was Shipped

- **permitUrl + permitNotes on Trip** — two nullable text fields added to the Trip Prisma model via migration
- **PUT /api/trips/[id] updated** — accepts and persists permitUrl/permitNotes in explicit field mapping
- **Permits & Reservations card in TripPrepClient** — URL input with "View Booking →" link, notes textarea, Save button; appears after Fuel & Last Stops section
- **📋 indicator on TripCard** — shows next to trip name when permitUrl is set; title="Booking confirmed"
- **TripsClient edit form** — Booking URL and Permit Notes fields in trip edit modal

## Schema Changes

- `permitUrl String?` on Trip — Recreation.gov or other booking confirmation URL
- `permitNotes String?` on Trip — site number, check-in time, special instructions

## Key Notes

- No Recreation.gov API integration — manual URL paste is sufficient for a personal tool
- Pattern matches dog indicator (🐕) and float plan notes
- URL field: if set, "View Booking →" link opens in new tab
- cancelation policy reminder shown in the permits card

## Follow-On

- S18 TripPrepStepper uses permitUrl/permitNotes to determine "Permits" step completion
