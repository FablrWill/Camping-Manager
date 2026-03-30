# Project Status — Camp Commander

## Quick Pickup
> **Last session:** 2026-03-30 (Session 3)
> **Current phase:** Phase 2 — Locations & Photos (in progress)
> **Next step:** Build gear inventory CRUD (Phase 1 still pending) OR continue Phase 2 with location save/edit

## What's Done
- [x] Project structure created
- [x] CLAUDE.md written
- [x] Project plan documented (docs/PLAN.md)
- [x] Vehicle profile documented (docs/vehicle-profile.md)
- [x] Tracking docs set up (CHANGELOG, STATUS, GOALS)
- [x] Next.js 16 scaffolded with TypeScript + Tailwind
- [x] Prisma + SQLite set up with initial migration
- [x] Database schema defined (GearItem, Vehicle, VehicleMod, Location, Trip, PackingItem)
- [x] Mobile-responsive layout shell with nav
- [x] Home page with module cards
- [x] Database seeded — genesis spot (Linville Gorge) + Santa Fe vehicle
- [x] Genesis spot photos/videos saved to 00_Context/photos/genesis-spot/
- [x] GPS coordinates confirmed via EXIF extraction (35.8783, -81.9094)
- [x] GPT scouting notes saved (linville_gorge_car_camping_scouting_notes.md)
- [x] New feature ideas captured: User Guide Finder, Voice Ghostwriter
- [x] Photo model added to schema (latitude, longitude, altitude, takenAt, imagePath)
- [x] /spots page — full-screen Leaflet/OpenStreetMap map (no API key required)
- [x] Photo upload with EXIF GPS extraction — compressed to ~100KB, saved locally
- [x] Map pins for photos (amber) and saved locations (green) with click popups
- [x] Marker clustering for large photo sets
- [x] Filter bar: All / Photos / Spots toggle

## What's Next
### Phase 1 (still pending)
- [ ] Gear inventory CRUD (add, view, edit, delete)
- [ ] Vehicle profile page

### Phase 2 (continue)
- [ ] Location save/edit with map pin drop
- [ ] Auto-tag photos to trips/locations via GPS proximity + date
- [ ] Basic trip creation
- [ ] Personal signal map

## Open Questions
- Google Photos integration — decided: direct upload from phone, no Takeout pipeline needed
- Claude API key — Will needs one for Phase 3 (gear identification, chat, Voice Ghostwriter)
- Speech API choice for Voice Ghostwriter — Web Speech API (free) vs Whisper (better)

## Known Blockers
- None currently
