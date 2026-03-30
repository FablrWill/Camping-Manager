## 2026-03-30 — Session 5a: Location Pin Drop + Gear CRUD

### Created
- `components/LocationForm.tsx` — mobile slide-up form for creating/editing locations
- `app/api/locations/route.ts` — GET all, POST create
- `app/api/locations/[id]/route.ts` — GET single, PUT update, DELETE
- Prisma migration: `add_visited_at_to_location`
- Gear inventory CRUD (built in parallel session) — list, add, edit, delete gear items

### Decisions Made
- **visitedAt field** — record when you visited, not just when you saved
- **Slide-up panel** over modal — better mobile UX, doesn't obscure map
