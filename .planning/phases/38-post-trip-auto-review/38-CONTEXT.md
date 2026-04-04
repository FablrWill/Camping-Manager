---
phase: 38-post-trip-auto-review
title: Post-Trip Auto-Review
milestone: v4.0
status: planning
created: 2026-04-04
---

# Phase 38: Post-Trip Auto-Review

## Goal

After a trip ends, give Will a structured, low-friction way to log what worked and what didn't. The review captures: gear used/forgotten/unused, meal ratings, spot ratings, and free-form notes. This data feeds directly into Phase 17's feedback-driven packing lists and Phase 35's meal plan feedback loop — making future trips smarter automatically.

## Why This Now

v3.0 built the intelligence layer (packing feedback, meal feedback, gear research, deals). But those systems are only as smart as the feedback data they have. Post-trip review is the data flywheel that makes all of them better over time. Without this, packing lists and meal plans stay generic. With this, they personalize to Will's actual use patterns.

## User Story

Will returns from a weekend trip. He opens the app, sees a "Review this trip" banner on the completed trip card. He taps it, works through a quick checklist:
- Packed items: ✅ Used / ❌ Didn't use / ⚠️ Forgot to pack
- Meals: ⭐ 1-5 stars + optional note
- Spot: ⭐ 1-5 stars + conditions note
- Free-form: "Next time bring the camp chair, skip the hammock"

He submits. The app thanks him and the next packing list for a similar trip will reflect what he actually used.

## Success Criteria

1. A "Review Trip" button appears on trips where `endDate` has passed
2. Gear review: user can mark each packed item as Used / Unused / Forgotten
3. Meal review: user can rate each meal plan day (or skip)
4. Spot review: user can rate the location (1-5) with a note
5. Free-form notes field for anything else
6. On submit: gear feedback is saved (feeds Phase 17 packing personalization), meal feedback saved (feeds Phase 35)
7. Reviewed trips show a "✓ Reviewed" badge — no re-review prompt
8. The trip list shows a "Review needed" callout for unreviewed completed trips

## Scope Constraints

- No new DB models if avoidable — use existing `PackingItem.feedback`, `MealPlan`/`Meal` fields, and `Trip` fields
- No AI generation step in the review itself — it's data capture only (AI uses the data later)
- Mobile-first modal/sheet UI, quick to complete (< 2 min target)
- No email/push notifications — in-app prompt only

## Key Files

**Existing infrastructure to build on:**
- `prisma/schema.prisma` — PackingItem has `feedback String?`, Trip has `notes String?`, Location has `rating Int?`
- `components/TripsClient.tsx` — trip cards, modal system
- `app/api/trips/[id]/route.ts` — PATCH handler
- `app/api/packing-list/[id]/route.ts` — packing item PATCH
- `lib/claude.ts` — `generatePackingList` uses gear feedback history

**New files expected:**
- `components/TripReviewModal.tsx` — the review flow (gear, meals, spot, notes)
- `app/api/trips/[id]/review/route.ts` — POST endpoint to save all review data atomically

## Dependencies

- Phase 17: Feedback-Driven Packing (complete) — PackingItem.feedback field exists
- Phase 34/35: Meal Planning (complete) — MealPlan/Meal models exist
- Phase 33: Conversational Trip Planner (complete) — Trip model stable

## Out of Scope

- Push notifications for review prompts
- Sharing reviews publicly
- AI-generated trip summaries (v4.0+ stretch)
