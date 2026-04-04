# Session 47 — S29 Altitude Awareness Callouts

**Date:** 2026-04-04
**Branch:** claude/infallible-margulis (worktree)

## Summary

S29: Altitude awareness — surfaces Location.altitude in UI with callouts, AltitudeCard in trip prep for high-elevation destinations, altitude in SpotMap popup.

## Changes

### New Files
- `components/AltitudeCard.tsx` — elevation badge, tips list, "bring extra fuel" reminder > 8000ft
- `lib/altitude.ts` — getAltitudeWarning(altitudeFt): pure function, meters→feet, level + tips[]
- `prisma/migrations/20260404230000_add_location_altitude/migration.sql` — altitude column on Location

### Modified Files
- `components/LocationForm.tsx` — altitude display, amber callout panel if > 6000ft
- `components/TripPrepClient.tsx` — AltitudeCard above PreTripAlertCard when altitude > 6000ft
- `app/api/trips/[id]/prep/route.ts` — include location.altitude in prep response
- `app/spots/spots-client.tsx` — altitude shown in spot popup

## Schema Changes

- `altitude Float?` on Location (altitude in meters, from EXIF extraction)

## Key Notes

- Altitude stored in meters (EXIF), converted to feet in lib/altitude.ts

## Commits

- `5a13a0e` feat: altitude awareness callouts and AltitudeCard
