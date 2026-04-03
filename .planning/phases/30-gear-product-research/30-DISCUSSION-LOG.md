# Phase 30: Gear Product Research - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.

**Date:** 2026-04-03
**Phase:** 30 — Gear Product Research

---

## Areas Selected

All four: Storage model, Result format, Where results live, Upgrade surfacing.

---

## Storage Model

**Q: How should research results be stored?**
Options: New GearResearch table / Extend GearDocument
**Selected:** New GearResearch table

**Q: One row per item (overwrite) or keep history?**
Options: One row overwrite / Keep all runs
**Selected:** One row, overwrite on re-research

---

## Result Format

**Q: How many alternatives should Claude find?**
Options: Top 3 / Top 5 / Claude decides
**Selected:** Top 3 alternatives

**Q: Should Claude include an upgrade recommendation?**
Options: Explicit upgrade verdict / Pros/cons only / Upgrade priority score
**Selected:** Yes — explicit upgrade verdict ("Worth upgrading", "Keep what you have", "Only if budget allows")

**Q: Should Claude include price estimates?**
Options: Yes approximate range / No prices
**Selected:** Yes — approximate price range

---

## Where Results Live

**Q: Where does the Research button and results appear?**
Options: New Research tab in detail modal / Inline on gear card / Separate page
**Selected:** New Research tab in gear detail modal (alongside Documents tab)

**Q: What does the Research tab show when stale (>90 days)?**
Options: Show old results with stale warning + Re-research button / Prompt to re-research hide old / Auto-trigger re-research
**Selected:** Show old results with stale warning + Re-research button

---

## Upgrade Surfacing

**Q: Where should upgrade opportunities be surfaced?**
Options: Gear page section / Dashboard card / Badge on gear cards
**Selected:** Gear page section — "Upgrade Opportunities (N)" collapsible

**Q: What does each item show in the Upgrade Opportunities section?**
Options: Gear name + top alternative + verdict / Name + verdict only / Full comparison preview
**Selected:** Gear name + top alternative name + Claude's verdict (e.g. "Big Agnes Copper Spur → Nemo Hornet Elite — Worth upgrading (lighter, similar price)")
