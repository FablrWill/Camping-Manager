# Phase 34: Meal Planning Core - Discussion Log

**Date:** 2026-04-04
**Mode:** discuss-phase (interactive)

---

## Gray Areas Presented

1. Individual meal regen UX
2. Dog in meal planning
3. Trip card status badge

All three selected by user.

---

## Area 1: Individual Meal Regen UX

**Q: Where should the per-meal regenerate trigger live?**
- Options: Button in expanded view / Icon on row / Long-press/swipe
- Selected: **Button in expanded view** (recommended)

**Q: What happens to the meal slot while it's regenerating?**
- Options: Spinner replaces that meal row / Entire plan locks / Optimistic update
- Selected: **Spinner replaces that meal row** (recommended)

**Q: Should per-meal regen skip the ConfirmDialog?**
- Options: Skip confirm — just regenerate / Keep ConfirmDialog
- Selected: **Skip confirm — just regenerate** (recommended)

---

## Area 2: Dog in Meal Planning

**Q: When bringingDog is true, what should Claude know?**
- Options: Context note only / Add dog food to shopping list / Skip dog context
- Selected: **Context note only** (recommended)

**Q: Will's meal prep context — vacuum sealer + sous vide. Add to prompt?**
- Options: Yes — add it / No — leave as-is
- Selected: **Yes — add it** (recommended)

---

## Area 3: Trip Card Status Badge

**Q: Where should the meal plan status appear on the collapsed trip card?**
- Options: Stats row next to packing items / Badge near title / Prepare link area
- Selected: **Stats row next to packing items** (recommended)

---

*All decisions captured in 34-CONTEXT.md*
