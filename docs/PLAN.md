# Camp Commander — Project Plan

## Vision
A personal camping assistant that knows my gear, my vehicle, and my favorite spots. Part inventory tracker, part trip planner, part adventure journal — powered by Claude.

## Core Modules

### 1. Gear Tracker
- **Photo-based cataloguing:** Snap a photo of gear, Claude identifies it (brand, type, specs)
- **Inventory management:** What I own, condition, storage location
- **Wish list:** Gear I want, with links and price tracking
- **Packing lists:** Auto-generate based on trip type, duration, weather
- **Categories:** Shelter, sleep, cook, power/tech, clothing, tools, vehicle-specific

### 2. Vehicle Profile
- **Specs:** 2022 Hyundai Santa Fe Hybrid — cargo dimensions, payload, fuel economy, ground clearance
- **Mods log:** Track additions over time (roof rack, storage, etc.)
- **Cargo planning:** How gear fits, weight management
- **Maintenance relevant to camping:** Tire pressure for dirt roads, etc.

### 3. Trip Planner
- **Duration:** 1-4 nights (car camping, remote work capable)
- **Remote work setup:** Starlink Mini, power management, connectivity planning
- **Checklists:** Pre-trip, on-site, pack-out
- **Weather integration:** Basic forecast for trip dates/location
- **Packing optimizer:** What to bring based on trip details

### 4. Location Journal
- **Save spots:** GPS coords, photos, notes, ratings
- **Discovery log:** Places found while exploring (like today's spot)
- **Categories:** Dispersed, established campground, overlook, water access, etc.
- **Photo integration:** Pull from Google Photos, extract EXIF/GPS data
- **Access notes:** Road conditions, clearance needed, cell/Starlink signal quality

### 5. Map & Timeline
- **Map view:** All saved locations on a Google Map with pins and filters
- **Trip timeline:** Chronological view of camping trips
- **Route planning:** Driving directions to saved spots
- **Share view:** Eventually share a map/trip with friends

### 6. Agent / Chat Interface
- **Conversational:** Ask questions about gear, get trip suggestions
- **Gear identification:** Send a photo, get it catalogued
- **Trip recommendations:** "I have Friday-Sunday free, suggest a spot within 2 hours"
- **Smart packing:** "Generate a packing list for a 2-night trip to [location] in October"

## Build Phases

### Phase 1 — Foundation (Current)
- Project scaffolding (Next.js, Prisma, Tailwind)
- Database schema for gear, vehicles, locations, trips
- Basic CRUD for gear inventory
- Vehicle profile page
- Mobile-responsive layout

### Phase 2 — Location & Photos
- Location save/edit with map pin
- Photo upload with EXIF extraction
- Map view of all locations
- Basic trip creation (dates, location, notes)

### Phase 3 — Intelligence
- Claude integration for gear photo identification
- Smart packing list generation
- Trip recommendation engine
- Chat interface

### Phase 4 — Polish & Deploy
- Timeline view
- Weather integration
- Deploy to Vercel
- PWA support (installable on phone)

## Non-Goals (For Now)
- Multi-user / auth
- Social features
- Commercial anything
- Native mobile app
