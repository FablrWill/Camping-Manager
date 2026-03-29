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
