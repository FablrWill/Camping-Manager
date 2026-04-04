# S17: Nav Restructure + More Sheet — Plan

## Goal

Reduce BottomNav to 5 tabs and move secondary destinations (Chat, Inbox, Vehicle, Settings) into a new MoreSheet slide-up component.

## Files Created

- `components/MoreSheet.tsx` — slide-up sheet with Chat/Inbox (badged)/Vehicle/Settings links
- `docs/changelog/session-36b.md` — changelog entry for S17

## Files Modified

- `components/BottomNav.tsx` — remove Chat/Inbox tabs, add More tab that opens MoreSheet, move inbox badge fetch to MoreSheet (lazy on open)
- `docs/CHANGELOG.md` — add session-36b row

## Key Decisions

- BottomNav reduced to 5 tabs to fit small phones
- Inbox badge moved to MoreSheet (fetches on open, not on every nav render)
- Backdrop overlay pattern for sheet dismissal
- No schema changes

## Verification

- `npm run build` passes
- No TypeScript errors
