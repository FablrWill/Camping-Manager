# User Journey — Camp Commander

> **Source:** Voice interview with Will, 2026-03-30 (Session 7)
> **Purpose:** Defines what the app actually needs to do. Use this to prioritize features.

---

## The Primary Loop

### Before the Trip (Wednesday → Saturday morning)
The most important moment. Will wants the app to act like an executive assistant:
1. **Destination** — suggest where to go based on distance and weather
2. **Weather check** — forecast for trip dates and location
3. **Packing list** — generated from gear inventory, trip type, weather, duration
4. **Meal plan** — with a shopping list organized by store section
5. **Full prep checklist** — a single "am I ready to go?" view

This is the core value of the app. Everything else supports this moment.

### During the Trip (at camp)
Lower-intensity use:
- Take photos → auto-geotagged to the map
- Save a new campsite if discovered
- Jot notes or journal entries
- Use as a reference guide (gear manuals, area info, first aid basics)

### After the Trip (drive home + later)
- **Drive home:** Voice-style interview to capture memories and trip details while fresh
- **Later at home:** App auto-pulls photos, tags them to the map, prompts for a rating or review

---

## Must-Have Features

These define "done enough." Build these before anything else.

| Feature | Why |
|---------|-----|
| **Trip creation UI** | The spine. Everything — packing, meals, weather — attaches to a trip |
| **Smart packing list generator** | Claude API, uses gear inventory + trip details |
| **Meal planning with shopping list** | Full meal plan per trip, organized shopping list |
| **Power budget calculator** | EcoFlow + solar math, weather-adjusted |
| **Weather integration** | Forecasts for trip location and dates |
| **Executive trip prep flow** | Single view that ties destination → weather → packing → meals → checklist |

---

## Nice-to-Haves

Good ideas, lower priority. Build after the must-haves are solid.

- Voice journaling at camp
- Cell/Starlink signal tracker per location
- AI trip recommendations (agent suggests where to go)
- Safety float plan (send trip summary to family)
- GPX trail import for mapping routes

---

## Probably Skip (for now)

Nothing was a hard "never" — everything had some value. Revisit after must-haves are done.

---

## Definition of Done Enough

The app is "done enough" when Will can:

1. Open the app on a Wednesday
2. Tell it where he's going and for how long
3. Get a packing list, meal plan, and shopping list back
4. Check off items as he loads the car
5. Come home and have his photos auto-tagged to the map

That's the bar. Build to that, then improve.

---

## Implications for the Roadmap

- **Trip creation UI** must come before any AI features — it's the anchor
- **Claude API integration** moves to Phase 2 completion, not Phase 3
- **Weather API** is a Phase 2 must-have, not a "nice someday"
- **Timeline/path animation** was Phase 2 but is not a must-have — do not spend more time here
- **Vehicle profile page** is low priority — the data exists, the page can wait
- **Phase 3 as originally planned** was too far away — pull the key AI features forward
