# Feature Ideas — Camp Commander

A running list of ideas. Not committed to the roadmap — just captured so nothing gets lost.

---

### Trip Prep Mode (Home Screen)
**Added:** 2026-03-29
**Context:** Will said the first thing he wants when opening the app is to tell it where he's going and for how long, and have it help him pack.

The default "home" experience should be trip-prep focused:
- "Where are you going?" + "How many nights?"
- Agent generates a packing list based on gear inventory, weather, location type
- Checklist you can tick off as you load the car
- Knows what fits in the Santa Fe and flags if you're overpacking

---

### Voice Trip Debrief
**Added:** 2026-03-29
**Context:** Will was sitting at a campsite and wanted a way to capture the experience on the drive home.

Talk to the agent on the drive home via voice conversation. Describe the spot — where it is, what it was like, what you did, how it felt. The agent listens, asks follow-up questions, and turns it into:
- A structured location entry (GPS, access notes, signal quality, ratings)
- A personal journal entry (the story, the vibe, the memories)
- Tagged photos if you took any

Serves two purposes:
1. **Practical** — catalogues the location with real details while they're fresh
2. **Personal** — a camping diary you build naturally just by talking

This is basically Fablr's core insight (voice-first storytelling) applied to camping. Natural fit.

---

### Messenger-Style Chat Interface
**Added:** 2026-03-29
**Context:** Will wants to interact with the agent the way he'd text a friend — easy photo/screenshot sharing from his phone.

Instead of (or in addition to) a traditional web app UI, interact with the agent through a messaging interface. Could be:
- **Built-in chat UI** in the web app that feels like iMessage/WhatsApp (most control, no dependencies)
- **Telegram bot** (free, great API, easy photo sharing, works on any device)
- **WhatsApp Business API** (familiar but more complex setup)

Key behaviors:
- Send a photo of gear → agent identifies and catalogues it
- Send a screenshot of a campsite from Google Maps → agent saves the location
- Send a voice memo → agent transcribes and processes (ties into Voice Trip Debrief idea)
- Quick text updates: "Just set up camp at [spot], signal is great, 2 bars LTE + Starlink solid"

**Recommendation:** Start with a built-in chat UI in the web app (we control everything), but design the message handling so it could plug into Telegram later. Telegram's bot API is dead simple and free.

---

### Voice Ghostwriter
**Added:** 2026-03-29 (Session 2)
**Context:** Will wants to talk to the app like he's on the phone with a ghostwriter. It interviews him about his adventure, then writes the journal entry for him.

A voice-first journaling feature — you talk, the agent listens, asks great follow-ups, and writes:
1. **You tap a button** and start talking — "Hey, I'm sitting on the south rim of Linville Gorge right now..."
2. **Agent listens and responds with voice** — like a real conversation, not dictation. It asks follow-ups: "What's the view like? What surprised you about the spot? How'd you find it?"
3. **Draws out the good stuff:** Sensory details, mood, the story behind the trip — things you'd never bother typing but will happily say out loud
4. **Context-aware questions:** Knows your location, gear, weather, trip history. "You mentioned weak cell signal — how's Starlink holding up out here?"
5. **Drafts a polished journal entry:** Your voice and story, shaped into something worth reading later
6. **You review and save** — entry attaches to the trip/location in the app

This is the core Fablr insight applied to camping: people have stories worth capturing, they just won't sit down and write them. Make it a conversation and the stories flow naturally.

**Tech considerations:**
- Speech-to-text: Web Speech API (free, browser-native) or Whisper API (better accuracy)
- Text-to-speech for agent responses: Browser native or ElevenLabs/OpenAI TTS
- Claude API for the conversational interview + journal drafting
- Works on phone via the PWA — tap and talk from the campsite

Replaces/absorbs the earlier "Voice Trip Debrief" idea — same concept but better defined. The debrief was "on the drive home," this is anytime — at camp, on a hike, wherever.

---

### AI Trip Planning Agent
**Added:** 2026-03-29 (Session 2)
**Context:** Will wants the agent to actively help plan trips — not just track them, but research and recommend.

A conversational trip planning flow where the agent does the legwork:

**Campsite Discovery:**
- "I have Friday-Sunday free, find me a spot within 2 hours of Asheville"
- Searches dispersed camping databases, public land maps, recreation.gov
- Cross-references with Will's saved spots and preferences
- Factors in vehicle capabilities (ground clearance, AWD, no heavy towing)
- Checks for Starlink viability (open sky, elevation)

**Weather & Conditions:**
- Pulls forecast for trip dates and location
- Flags deal-breakers (heavy rain, freezing temps, high winds)
- Suggests gear adjustments based on conditions ("Pack the extra tarp, rain is likely Saturday afternoon")

**Smart Packing:**
- Generates a packing list from Will's gear inventory based on trip type, duration, weather, and location
- Knows what fits in the Santa Fe and flags overpacking
- Remembers what worked/didn't from past trips ("You forgot the headlamp last time")

**Research Capabilities Needed:**
- Weather API (OpenWeatherMap, NOAA, or similar)
- Campsite databases (recreation.gov API, freecampsites.net, iOverlander, Campendium)
- Road/trail condition sources
- Web search for location-specific info (regulations, fire bans, seasonal closures)
- GPX import from AllTrails/Wikiloc (no public APIs, but both export GPX files)
- Google Maps saved list import (paste a shared list URL, pull all pins + notes into the app)
- OpenStreetMap trail data (free, open, no API restrictions)

**Not yet covered — worth adding later:**
- Fire ban alerts by region
- Water sources and how much to bring per day
- First aid / nearest hospital / emergency info per location
- Campsite setup checklist with photos of past setups
- Gear maintenance reminders (clean stove, reseal tent, charge EcoFlow before trip)
- Cost tracking per trip (gas, permits, groceries, gear)
- Dog planning (getting one soon — changes packing, campsite rules, trail access)
- Power budget calculator (see detailed breakdown below)
- Fuel & last stop planner (see detailed breakdown below)
- Sun/moon/dark sky info (sunrise/sunset, golden hour, moon phase, Bortle class)
- Wildlife & safety protocols by location (bear country, flash flood risk, snake season)
- Camp kit presets (Weekend Warrior, Remote Office, Extended Stay — customize once, reuse)
- Shareable trip reports (journal + photos + route = sendable summary or personal archive)
- Personal signal map (logs cell + Starlink quality at every campsite over time)
- Seasonal ratings (a spot can be 5 stars in fall, 2 stars in summer)
- Wear planning (weather-based clothing recommendations)
- Gear lending tracker (who borrowed what and when)
- Buddy trip mode (share trip, split packing list, no duplicate gear between cars)
- Road trip layer (scenic stops, food, rest areas along the route to camp)
- Vehicle pre-trip checklist (tire pressure, oil, coolant — terrain-aware)
- Auto-tag photos to trips via EXIF GPS + date matching
- Leave No Trace pack-out checklist (location-specific, before you drive away)
- Altitude awareness (affects cooking, sleep, hydration at higher elevations)
- Gear ROI tracker (cost per trip, helps justify purchases)
- Post-trip auto-review (what you forgot, what you didn't use, campsite rating — feeds back into future trips)

**How it works:**
1. Will says "Plan me a trip" or "What's good this weekend?"
2. Agent asks a few questions (dates, distance, vibe — remote vs established, etc.)
3. Agent researches options and presents 2-3 recommendations with reasoning
4. Will picks one, agent generates the full trip plan + packing list
5. Trip saves to the app with all details

**Permit & Registration Handling:**
- Agent checks if the spot requires a permit, pass, or registration
- Fills out online forms on Will's behalf (recreation.gov, USFS permits, state park reservations)
- Handles the submission so Will doesn't have to navigate bureaucratic websites
- Saves confirmation/permit details to the trip record
- Knows Will's info (name, vehicle, group size) so he never re-enters it
- Alerts for time-sensitive permits ("Linville Gorge wilderness permits open 30 days out — want me to grab one?")

**Meal Planning:**
- Agent builds a full meal plan for the trip (breakfast, lunch, dinner, snacks) based on duration and group size
- Generates a consolidated shopping list — no duplicates, organized by store section
- Provides recipes tailored to Will's cooking gear (knows if he has a camp stove, skillet, pot, cooler, etc.)
- Separates prep into **at-home** (marinate, chop, pre-cook) vs **at-camp** (assemble, heat, cook)
- Factors in practical constraints: no refrigeration after day 2, one-burner stove, limited water, cleanup difficulty
- Suggests meals that get better over a fire vs ones that work on a camp stove
- Learns preferences over time ("Will doesn't do freeze-dried meals" or "always wants coffee first thing")
- Packing integration: cooking gear from the gear inventory gets added to the trip packing list automatically

**Safety Float Plan:**
- Once a trip is planned, agent generates a trip summary: where you're going, GPS coordinates, route, expected arrival, expected return date/time
- Send it to predetermined emergency contacts (text, email, or both) with one tap
- Contacts are saved in the app — family, friends, whoever should know where you are
- Includes practical details: nearest town, ranger station, cell coverage expectations
- Optional: "I'm back safe" message to contacts when you return
- Optional: if Will doesn't check in by expected return time, contacts get an alert
- The kind of thing you'd scribble on a note and leave on the kitchen counter — but automated and with GPS coordinates

**Offline-First Design:**
- The app must work without cell or internet — trip plans, packing lists, meal plans, recipes, maps, and permits all available offline
- PWA with service worker caching — everything downloaded before you leave
- Trip data synced locally: GPS coordinates, directions, campsite notes, recipes, gear checklists
- Offline maps for the trip area (download the region before departure)
- When connection returns, sync any new data (journal entries, photos, location logs) back to the server
- Pre-trip "Download for Offline" step that grabs everything you'll need
- Gear manuals and user guides (PDFs) cached locally — if the User Guide Finder saved it, it's available offline
- This isn't a nice-to-have — it's a hard requirement. No signal = no app is a dealbreaker.

**Power Budget Calculator:**
- Tracks all power sources: EcoFlow Delta 2 (1,024Wh), solar panels, vehicle 12V system
- Tracks all power consumers: Starlink Mini, laptop, phone, lights, speaker, etc.
- Each device in gear inventory gets a wattage rating and typical hours/day of use
- Agent calculates per-trip: "3 nights × your usage = 2,800Wh needed. You have 1,024Wh + 400W solar panel generating ~1,600Wh over 3 days (weather-adjusted) = you're good" or "you'll need to recharge via car once"
- Weather-aware: cloudy forecast = less solar, adjusts the math automatically
- Solar input estimates based on panel wattage, location latitude, time of year, and forecast cloud cover
- Canopy/shade factor: "Your campsite is heavily wooded — expect 40% solar efficiency"
- Suggests power management: "Run Starlink only during work hours to stretch the battery"
- Tracks actual usage over time to improve estimates ("You actually use 15% less than rated")
- Pre-trip reminder: "Charge your EcoFlow — last charge was 12 days ago"

**Fuel & Last Stop Planner:**
- Route-aware: knows the drive to your campsite and what's along the way
- Flags last gas station, grocery store, ice, hardware store, cell coverage point before the backcountry
- Fuel calculator: trip distance vs Santa Fe's fuel economy vs tank size
- "You'll use ~6 gallons getting there. Fill up at the Shell in Marion (23 mi from camp) — next gas is 45 miles past camp"
- Grocery integration: if the meal planner generates a shopping list, suggests the best store on your route
- Ice strategy: "Nearest ice is Ingles in Old Fort, 35 min from camp. Buy 2 bags — your cooler holds ice ~36 hours"
- Return trip planning: "You'll have enough fuel to get home without stopping"

This is the "killer feature" — the thing that makes Camp Commander more than an inventory tracker. It's a camping concierge that handles the annoying stuff too.

---
