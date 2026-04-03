# Phase 26: Trip Day Sequencer — Discussion Log

**Session:** 2026-04-03
**Areas discussed:** Departure time input, Scope vs. Phase 7's checklist, Route task generation, Task granularity from meals/power, Checklist schema changes

---

## Area: Departure Time Input

**Q: Where does the user set departure time?**
Options: On the trip itself / On the depart page only / You decide
**Selected:** On the trip itself

**Q: What granularity is needed for departure time?**
Options: Date + time / Just the date / Time only
**Selected:** Date + time (e.g., 7:00 AM)

---

## Area: Scope vs. Phase 7's Checklist

**Q: What does Phase 26 change about the existing depart page?**
Options: Enhance existing depart page / New section on prep page / Both
**Selected:** Enhance the existing depart page

**Q: Should old checklists regenerate automatically when departure time is set?**
Options: Only on explicit regen / Auto-regen / You decide
**Selected:** Only on explicit regen

---

## Area: Route Task Generation

**Q: What does "route" contribute to the departure sequence?**
Options: Drive time reminder only / Origin-aware drive time / Just destination name
**Selected:** Drive time reminder only

**Q: Does Phase 18's fuel/last-stop planner feed into the sequence?**
Options: Yes — as a reminder task / No — out of scope / You decide
**Selected:** Yes — as a reminder task

---

## Area: Task Granularity from Meals/Power

**Q: How specific should meal prep tasks be in the sequence?**
Options: Phase-level reminders / Step-by-step / You decide
**Selected:** Phase-level reminders

**Q: How specific should the EcoFlow charge task be?**
Options: "Charge EcoFlow to 100%" / Target % from power budget / You decide
**Selected:** "Charge EcoFlow to 100%"

---

## Area: Checklist Schema Changes

**Q: How should Phase 26 store time data in DepartureChecklist?**
Options: Add suggestedTime to each item / New schema with typed time slots / Keep schema as-is
**Selected:** Add suggestedTime to each item
