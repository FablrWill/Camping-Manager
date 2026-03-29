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
