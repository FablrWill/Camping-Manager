# Phase 42: Trip Cost Tracking — Context

**Gathered:** 2026-04-04
**Status:** Ready for planning
**Source:** PRD Express Path (V2-SESSIONS.md S37 spec)

<domain>
## Phase Boundary

Log expenses per trip (fuel, campsite, food, gear, permits, misc), display category subtotals and a running total in the trip detail modal, and show a cost badge on trip cards. No new pages — expense panel lives inside the existing trip detail modal. Data stored as Float (dollars) — the prior session implemented `amount Float` and this is accepted as-is.

</domain>

<decisions>
## Implementation Decisions

### Data Model
- `TripExpense` Prisma model (ALREADY EXISTS in schema): `id String @id @default(cuid())`, `tripId String`, `category String` (one of: gas | permits | groceries | food | gear | campsite | other), `description String`, `amount Float` (stored as dollars, displayed with toFixed(2)), `paidAt DateTime?`, `notes String?`, `createdAt DateTime @default(now())`
- `expenses TripExpense[]` already on `Trip` model
- `onDelete: Cascade` on tripId foreign key (expenses deleted when trip deleted)
- **NOTE:** Original plan specified `amountCents Int` but prior session implemented `amount Float`. We accept the Float implementation as-is — no migration needed. All plans use `amount Float` throughout.

### API Routes (ALREADY EXIST)
- `GET /api/trips/[id]/expenses` — returns `{ expenses, total, byCategory }` sorted by paidAt desc
- `POST /api/trips/[id]/expenses` — create expense (body: `{ category, description, amount, paidAt?, notes? }`)
- `PUT /api/trips/[id]/expenses/[expenseId]` — update expense
- `DELETE /api/trips/[id]/expenses/[expenseId]` — delete single expense (returns 204)
- Input validation: category + description + amount required; amount must be non-negative number

### TripExpenses Component (ALREADY EXISTS: `components/TripExpenses.tsx`)
- Category icons: gas, permits, groceries, food & drinks, gear, campsite, other
- Expense list: each row = emoji + category + description + formatted amount ($X.XX) + edit/delete buttons
- Inline "Add expense" form: category select, amount input (dollars), description input, date input, optional notes, Save button
- Category subtotals as grouped badges + **Total** in header
- Empty state: "No expenses tracked yet"
- **Touch fix needed:** Edit/delete buttons currently use `opacity-0 group-hover:opacity-100` (unusable on mobile) — must be made always-visible

### Trip Card Cost Badge (modify `components/TripCard.tsx` + `components/TripsClient.tsx`)
- Include `expenses: { select: { amount: true } }` in trip list query
- Client-side sum: `trip.expenses.reduce((sum, e) => sum + e.amount, 0)`
- Show badge only when total > 0 (hidden when no expenses)
- Badge style: small, stone/muted — not amber (amber is reserved for CTA-level elements)
- Format: `$X.XX` using toFixed(2) for simplicity

### Placement
- TripExpenses renders inside the trip detail modal in `TripsClient.tsx` (not a new page)
- Delete buttons must be reachable without hover — use visible icon buttons, not hover-reveal

### Claude's Discretion
- Whether the expense panel appears as a tab or a collapsible section within the modal
- Order of expense rows within the same date (insertion order fine)
- Error/loading state design within the panel (follow existing modal patterns)
- Whether to include a "total nights" or cost-per-night calculation (out of scope for this phase)

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Schema and Migration Patterns
- `prisma/schema.prisma` — current schema, TripExpense model at lines 597-610
- `prisma/migrations/` — existing migration files for migration naming conventions

### Existing Trip API Patterns
- `app/api/trips/[id]/expenses/route.ts` — expense list/create (GET + POST)
- `app/api/trips/[id]/expenses/[expenseId]/route.ts` — expense update/delete (PUT + DELETE)
- `app/api/trips/route.ts` — trip list/create pattern (needs expense aggregate added)

### Existing Component Patterns
- `components/TripExpenses.tsx` — full expense CRUD component (needs touch fix only)
- `components/TripsClient.tsx` — trip list, modal, and trip card patterns
- `components/TripCard.tsx` — individual trip card (needs cost badge)
- `components/ui/index.ts` — UI component exports

### Project Conventions
- `CLAUDE.md` — all coding standards, error handling patterns, no `alert()`, state-based errors

</canonical_refs>

<specifics>
## Specific Implementation Notes

- **Amount handling**: stored as `Float` (dollars), displayed with `toFixed(2)`. No cents conversion needed.
- **Category subtotals**: API already computes `byCategory` in GET response
- **Total**: API already computes and returns `total` in GET response
- **Trip card badge**: requires including expenses in the trip list query — use `include: { expenses: { select: { amount: true } } }` and sum client-side
- **No migration needed**: TripExpense model and all API routes already exist from prior session

</specifics>

<deferred>
## Deferred Ideas

- Cost-per-night calculation (could divide total by trip nights — future phase)
- Cost comparison across trips / average cost per trip type
- Budget target / overage alerts
- CSV export of expenses

</deferred>

---

*Phase: 42-trip-cost-tracking*
*Context gathered: 2026-04-04 via PRD Express Path (V2-SESSIONS.md S37)*
