# S29: Altitude Awareness Callouts — Context

**Session:** S29
**Date:** 2026-04-04
**Status:** Done

## Background

Will camps in the Southern Appalachians — many spots are at 4,000–6,000+ ft elevation. High altitude affects cooking (boiling point lower), physical exertion, sleep quality, and fuel consumption. The Location model already stored altitude from EXIF extraction but it was never surfaced to the user.

## What This Addressed

- Location.altitude existed (populated from photo EXIF data) but was invisible in the UI
- No warnings or tips when planning a trip to a high-elevation spot
- No reminder to bring extra fuel (boiling takes longer at altitude) or acclimate

## Design Decision

- **lib/altitude.ts** — pure function `getAltitudeWarning(altitudeFt)` returns `{level, tips[]}`
- **AltitudeCard** in trip prep — shown when destination location is above 6,000ft
- **LocationForm inline callout** — altitude display line + amber warning panel for spots above 6,000ft
- **SpotMap popup** — show altitude in the popup when available

## Thresholds

- < 6,000ft: no callout
- 6,000–9,000ft: moderate callout ("High elevation — boiling point is lower, bring extra fuel")
- > 9,000ft: stronger warning ("Very high elevation — acclimate slowly, watch for AMS symptoms")

## Key Decisions

- Altitude stored in meters in DB (from EXIF), converted to feet in lib/altitude.ts
- Pure function — no state, easy to test
- Schema migration added for altitude column on Location (if not already present)
- No external API — altitude is already in the DB from EXIF or needs a one-time migration
