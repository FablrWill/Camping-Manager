# Session 12 — Meal Planning Implementation Plan

**Date:** 2026-03-30
**Type:** Planning session (no code written)

## What Happened

Produced a detailed implementation plan for the meal planning feature — the next item on the "Up Next" list after packing list. The plan is designed so a Sonnet session can execute it without making any design decisions.

## Plan Written

`docs/plans/meal-planning.md` — covers:

- **Data model:** No new Prisma models needed. Meal plan is ephemeral (component state), matching packing list pattern.
- **Claude prompt:** Full prompt template with sous vide/vacuum seal meal prep strategy, weather-adjusted meals, home vs camp prep tags, shopping list by store section, prep timeline.
- **API route:** `POST /api/meal-plan` — fetches trip + cooking gear + weather, calls Claude, returns structured JSON.
- **UI component:** `MealPlan.tsx` — day sections, expandable meal cards with ingredients, prep tags (At Home / At Camp), collapsible prep timeline, shopping list with checkboxes grouped by store section, copy-to-clipboard.
- **Integration:** Renders below PackingList in upcoming trip cards.
- **Edge cases:** No gear, no weather, Day 1 breakfast null, long trips, regeneration.
- **Future enhancements:** Recipe library with post-trip ratings, ebook/PDF upload via RAG (not in scope for implementation session).

## Files Changed

| File | Action |
|------|--------|
| `docs/plans/meal-planning.md` | Created — full implementation plan |

## What's Next

A Sonnet session executes the plan: 4 files to create/edit, no schema changes, no new dependencies.
