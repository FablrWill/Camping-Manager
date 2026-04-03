---
wave: 1
depends_on: []
files_modified:
  - prisma/schema.prisma
  - prisma/migrations/
  - app/api/trips/[id]/route.ts
autonomous: true
---

# Phase 21: Permit & Reservation — Plan

## Goal
Add `permitUrl` and `permitNotes` fields to trips. Surface a Permits card in Trip Prep. Show 📋 indicator on trip cards when a booking is recorded.

## must_haves
- `permitUrl` and `permitNotes` columns exist in DB (migration applied)
- PUT /api/trips/[id] accepts and persists permit fields
- TripPrepClient shows a "Permits & Reservations" card after the Fuel & Last Stops card
- TripCard shows 📋 emoji next to trip name when `permitUrl` is set
- TripsClient edit form has URL input + notes textarea for permit fields
- `npm run build` passes

---

## Wave 1 — Schema + API

### Task 1: Add permit fields to Prisma schema and migrate

<read_first>
- `prisma/schema.prisma` — current Trip model (read to find correct insertion point after bringingDog field)
</read_first>

<action>
In `prisma/schema.prisma`, add two optional fields to the `Trip` model after the `bringingDog` line:

```prisma
permitUrl   String?   // Phase 21: Recreation.gov or other booking confirmation URL
permitNotes String?   // Phase 21: site number, check-in time, special instructions
```

Then run the migration:
```bash
npx prisma migrate dev --name add_permit_fields
```

This generates a new file under `prisma/migrations/` and updates the Prisma client.
</action>

<acceptance_criteria>
- `prisma/schema.prisma` contains `permitUrl   String?` in the Trip model
- `prisma/schema.prisma` contains `permitNotes String?` in the Trip model
- `prisma/migrations/` contains a new directory named `*_add_permit_fields` with a `migration.sql` file
- `migration.sql` contains `ALTER TABLE "Trip" ADD COLUMN "permitUrl" TEXT` and `ADD COLUMN "permitNotes" TEXT`
</acceptance_criteria>

---

### Task 2: Accept permit fields in PUT /api/trips/[id]/route.ts

<read_first>
- `app/api/trips/[id]/route.ts` — current PUT handler, specifically the `prisma.trip.update` data block
</read_first>

<action>
In the `PUT` handler in `app/api/trips/[id]/route.ts`, add `permitUrl` and `permitNotes` to the `data` object passed to `prisma.trip.update`:

```typescript
data: {
  name: data.name,
  startDate,
  endDate,
  locationId: data.locationId ?? null,
  vehicleId: data.vehicleId ?? null,
  notes: data.notes ?? null,
  weatherNotes: data.weatherNotes ?? null,
  bringingDog: data.bringingDog === true,
  permitUrl: data.permitUrl ?? null,        // ADD
  permitNotes: data.permitNotes ?? null,    // ADD
},
```

No validation needed — both fields are optional strings.
</action>

<acceptance_criteria>
- `app/api/trips/[id]/route.ts` PUT handler data block contains `permitUrl: data.permitUrl ?? null`
- `app/api/trips/[id]/route.ts` PUT handler data block contains `permitNotes: data.permitNotes ?? null`
</acceptance_criteria>

---

## Wave 2 — UI

### Task 3: Add Permits card to TripPrepClient

<read_first>
- `components/TripPrepClient.tsx` — read fully; specifically the `TripPrepClientProps` interface and the Fuel & Last Stops card block (around line 323) to understand exact insertion point
</read_first>

<action>
1. Extend `TripPrepClientProps` interface — add permit fields to the `trip` prop:
```typescript
interface TripPrepClientProps {
  trip: {
    id: string
    name: string
    startDate: string
    endDate: string
    location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
    vehicle: { id: string; name: string } | null
    permitUrl: string | null      // ADD
    permitNotes: string | null    // ADD
  }
}
```

2. Add permit state variables after the existing `lastStops` state vars:
```typescript
const [permitUrl, setPermitUrl] = useState<string>(trip.permitUrl ?? '')
const [permitNotes, setPermitNotes] = useState<string>(trip.permitNotes ?? '')
const [permitSaving, setPermitSaving] = useState(false)
const [permitError, setPermitError] = useState<string | null>(null)
const [permitSaved, setPermitSaved] = useState(false)
```

3. Add a save handler after the existing `fetchPrepState` function:
```typescript
async function savePermit() {
  setPermitSaving(true)
  setPermitError(null)
  setPermitSaved(false)
  try {
    const res = await fetch(`/api/trips/${trip.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: trip.name,
        startDate: trip.startDate,
        endDate: trip.endDate,
        locationId: trip.location?.id ?? null,
        vehicleId: trip.vehicle?.id ?? null,
        permitUrl: permitUrl || null,
        permitNotes: permitNotes || null,
      }),
    })
    if (!res.ok) throw new Error('Failed to save')
    setPermitSaved(true)
    setTimeout(() => setPermitSaved(false), 2000)
  } catch {
    setPermitError('Could not save — try again.')
  } finally {
    setPermitSaving(false)
  }
}
```

4. Insert the Permits card JSX immediately after the closing `</div>` of the Fuel & Last Stops card (the block that ends with `{config.key === 'weather' && trip.location?.latitude && ...}`). Add it inside the same Fragment, after the fuel card:

```tsx
{/* Permits & Reservations card — after Fuel & Last Stops (Phase 21) */}
{config.key === 'weather' && (
  <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
    <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">📋 Permits & Reservations</h3>
    <div className="space-y-3">
      <div>
        <label className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400 mb-1 block">
          Booking URL
        </label>
        <input
          type="url"
          value={permitUrl}
          onChange={(e) => setPermitUrl(e.target.value)}
          placeholder="https://www.recreation.gov/camping/..."
          className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
        />
        {permitUrl && (
          <a
            href={permitUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
          >
            View Booking →
          </a>
        )}
      </div>
      <div>
        <label className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400 mb-1 block">
          Notes
        </label>
        <textarea
          value={permitNotes}
          onChange={(e) => setPermitNotes(e.target.value)}
          placeholder="Site number, check-in time, special instructions..."
          rows={3}
          className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 resize-none"
        />
      </div>
      <p className="text-xs text-stone-400 dark:text-stone-500 italic">
        Check cancelation policy before departure.
      </p>
      {permitError && (
        <p className="text-xs text-red-500 dark:text-red-400">{permitError}</p>
      )}
      <button
        onClick={savePermit}
        disabled={permitSaving}
        className="w-full py-2 rounded-lg bg-amber-500 dark:bg-amber-600 text-white text-sm font-medium hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 transition-colors"
      >
        {permitSaving ? 'Saving…' : permitSaved ? 'Saved ✓' : 'Save'}
      </button>
    </div>
  </div>
)}
```
</action>

<acceptance_criteria>
- `components/TripPrepClient.tsx` TripPrepClientProps interface contains `permitUrl: string | null`
- `components/TripPrepClient.tsx` TripPrepClientProps interface contains `permitNotes: string | null`
- `components/TripPrepClient.tsx` contains `Permits & Reservations` heading text
- `components/TripPrepClient.tsx` contains `permitSaving` state variable
- `components/TripPrepClient.tsx` contains `savePermit` function with fetch call to `/api/trips/${trip.id}`
- `components/TripPrepClient.tsx` contains `View Booking →` link
- `components/TripPrepClient.tsx` contains `Check cancelation policy before departure`
</acceptance_criteria>

---

### Task 4: Show 📋 indicator on TripCard

<read_first>
- `components/TripCard.tsx` — read the TripData interface and the name/emoji row (around line 85 where the 🐕 emoji is rendered)
</read_first>

<action>
1. Add `permitUrl` to the `TripData` interface:
```typescript
interface TripData {
  // ... existing fields ...
  bringingDog: boolean
  permitUrl: string | null   // ADD
}
```

2. In the trip name row (next to the existing 🐕 dog indicator), add the permit indicator:
```tsx
{trip.permitUrl && (
  <span title="Booking confirmed" aria-label="Booking confirmed" className="text-base leading-none shrink-0">
    📋
  </span>
)}
```
Place it immediately after the `{trip.bringingDog && ...}` span.
</action>

<acceptance_criteria>
- `components/TripCard.tsx` TripData interface contains `permitUrl: string | null`
- `components/TripCard.tsx` contains `Booking confirmed` as a title/aria-label string
- `components/TripCard.tsx` contains `📋` emoji render conditional on `trip.permitUrl`
</acceptance_criteria>

---

### Task 5: Add permit fields to TripsClient edit form

<read_first>
- `components/TripsClient.tsx` — read fully; specifically: TripData interface, edit form state variables (lines 62-69), `openEdit` function (line 71), `handleEditSave` function (line 83), and the edit form JSX (around line 411)
</read_first>

<action>
1. Add `permitUrl` and `permitNotes` to the `TripData` interface in TripsClient.tsx:
```typescript
interface TripData {
  // ... existing fields ...
  bringingDog: boolean
  permitUrl: string | null    // ADD
  permitNotes: string | null  // ADD
}
```

2. Add edit state variables after `editBringingDog`:
```typescript
const [editPermitUrl, setEditPermitUrl] = useState('')
const [editPermitNotes, setEditPermitNotes] = useState('')
```

3. In `openEdit`, initialize the new state after the `setEditBringingDog` line:
```typescript
setEditPermitUrl(trip.permitUrl ?? '')
setEditPermitNotes(trip.permitNotes ?? '')
```

4. In `handleEditSave`, add permit fields to the JSON body alongside `bringingDog`:
```typescript
permitUrl: editPermitUrl || null,
permitNotes: editPermitNotes || null,
```

5. In the edit form JSX (inside the modal form, after the "Bringing dog?" toggle section), add:
```tsx
{/* Permit URL */}
<div>
  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
    Booking URL
  </label>
  <input
    type="url"
    value={editPermitUrl}
    onChange={(e) => setEditPermitUrl(e.target.value)}
    placeholder="https://www.recreation.gov/..."
    className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
</div>

{/* Permit Notes */}
<div>
  <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
    Permit Notes
  </label>
  <textarea
    value={editPermitNotes}
    onChange={(e) => setEditPermitNotes(e.target.value)}
    placeholder="Site number, check-in time, special instructions..."
    rows={2}
    className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
  />
</div>
```
</action>

<acceptance_criteria>
- `components/TripsClient.tsx` TripData interface contains `permitUrl: string | null`
- `components/TripsClient.tsx` TripData interface contains `permitNotes: string | null`
- `components/TripsClient.tsx` contains `editPermitUrl` state variable
- `components/TripsClient.tsx` contains `editPermitNotes` state variable
- `components/TripsClient.tsx` handleEditSave body JSON contains `permitUrl: editPermitUrl || null`
- `components/TripsClient.tsx` edit form JSX contains `Booking URL` label text
- `components/TripsClient.tsx` edit form JSX contains `Permit Notes` label text
</acceptance_criteria>

---

### Task 6: Update trip page to pass permit fields to TripPrepClient

<read_first>
- `app/trips/[id]/prep/page.tsx` — read to see how trip data is fetched and passed to TripPrepClient
</read_first>

<action>
In the trip prep server page, ensure the Prisma query selects `permitUrl` and `permitNotes` and passes them to TripPrepClient.

If the page uses `prisma.trip.findUnique`, add `permitUrl: true, permitNotes: true` to the select block (or they will be included automatically if using findUnique without select).

If the page maps trip data to props, ensure `permitUrl` and `permitNotes` are included in the passed props object.
</action>

<acceptance_criteria>
- `app/trips/[id]/prep/page.tsx` passes `permitUrl` and `permitNotes` to TripPrepClient (either via spread or explicit props)
</acceptance_criteria>

---

## Verification Criteria

```bash
# Schema fields exist
grep "permitUrl" prisma/schema.prisma
grep "permitNotes" prisma/schema.prisma

# Migration exists
ls prisma/migrations/ | grep permit

# API handler updated
grep "permitUrl" app/api/trips/\[id\]/route.ts

# TripPrepClient updated
grep "Permits" components/TripPrepClient.tsx
grep "permitSaving" components/TripPrepClient.tsx

# TripCard updated
grep "Booking confirmed" components/TripCard.tsx

# TripsClient updated
grep "editPermitUrl" components/TripsClient.tsx

# Build passes
npm run build
```
