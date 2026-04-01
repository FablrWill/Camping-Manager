'use client'

import { useState, useEffect } from 'react'
import { Plus } from 'lucide-react'
import { Button, Input, Select, Textarea, Modal, ConfirmDialog } from '@/components/ui'
import ChatContextButton from '@/components/ChatContextButton'
import VoiceRecordModal from './VoiceRecordModal'
import TripCard from './TripCard'
import type { DayForecast, WeatherAlert } from '@/lib/weather'

interface TripData {
  id: string
  name: string
  startDate: string
  endDate: string
  notes: string | null
  weatherNotes: string | null
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
  vehicle: { id: string; name: string } | null
  _count: { packingItems: number; photos: number }
  createdAt: string
  updatedAt: string
}

interface WeatherData {
  days: DayForecast[]
  alerts: WeatherAlert[]
  elevation?: number
}

interface TripsClientProps {
  initialTrips: TripData[]
  locations: { id: string; name: string }[]
  vehicles: { id: string; name: string }[]
}

type TripCategory = 'upcoming' | 'past'

// Suppress unused variable warning — kept for future filtering
void (null as unknown as TripCategory)

export default function TripsClient({ initialTrips, locations, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState(initialTrips)
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [debriefTrip, setDebriefTrip] = useState<{ id: string; name: string; locationId: string | null } | null>(null)
  const [weatherByTrip, setWeatherByTrip] = useState<Record<string, WeatherData>>({})
  const [weatherLoading, setWeatherLoading] = useState<Record<string, boolean>>({})
  const [weatherErrors, setWeatherErrors] = useState<Record<string, string>>({})
  const [fetchedTrips] = useState<Set<string>>(new Set())

  // Edit/delete state
  const [editingTrip, setEditingTrip] = useState<TripData | null>(null)
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Edit form state
  const [editName, setEditName] = useState('')
  const [editStartDate, setEditStartDate] = useState('')
  const [editEndDate, setEditEndDate] = useState('')
  const [editLocationId, setEditLocationId] = useState('')
  const [editVehicleId, setEditVehicleId] = useState('')
  const [editNotes, setEditNotes] = useState('')

  function openEdit(trip: TripData) {
    setEditingTrip(trip)
    setEditName(trip.name)
    setEditStartDate(trip.startDate.split('T')[0])
    setEditEndDate(trip.endDate.split('T')[0])
    setEditLocationId(trip.location?.id ?? '')
    setEditVehicleId(trip.vehicle?.id ?? '')
    setEditNotes(trip.notes ?? '')
    setError(null)
  }

  async function handleEditSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editingTrip) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${editingTrip.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          startDate: editStartDate,
          endDate: editEndDate,
          locationId: editLocationId || null,
          vehicleId: editVehicleId || null,
          notes: editNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setTrips((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
      setEditingTrip(null)
    } catch {
      setError("Couldn't save — check your connection and try again.")
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDelete(id: string) {
    setIsDeleting(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setTrips((prev) => prev.filter((t) => t.id !== id))
      setConfirmDelete(null)
    } catch {
      setError("Couldn't delete — try again or reload the page.")
    } finally {
      setIsDeleting(false)
    }
  }

  const now = new Date().toISOString()

  // Fetch weather for upcoming trips that have a location with GPS
  useEffect(() => {
    const upcoming = trips.filter((t) => t.endDate >= now)

    upcoming.forEach(async (trip) => {
      if (!trip.location?.latitude || !trip.location?.longitude) return
      if (fetchedTrips.has(trip.id)) return

      // Only fetch for trips within 16 days (Open-Meteo forecast limit)
      const daysOut = Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysOut > 16 || new Date(trip.endDate) < new Date()) return

      fetchedTrips.add(trip.id)
      setWeatherLoading((prev) => ({ ...prev, [trip.id]: true }))

      try {
        const start = trip.startDate.split('T')[0]
        const end = trip.endDate.split('T')[0]
        const params = new URLSearchParams({
          lat: trip.location.latitude.toString(),
          lon: trip.location.longitude.toString(),
          start,
          end,
        })
        const res = await fetch(`/api/weather?${params}`)
        if (!res.ok) throw new Error('Failed to fetch')
        const data = await res.json()
        setWeatherByTrip((prev) => ({ ...prev, [trip.id]: data }))
      } catch {
        setWeatherErrors((prev) => ({ ...prev, [trip.id]: 'Could not load forecast' }))
      } finally {
        setWeatherLoading((prev) => ({ ...prev, [trip.id]: false }))
      }
    })
  }, [trips, now, fetchedTrips])

  const upcoming = trips.filter((t) => t.endDate >= now)
  const past = trips.filter((t) => t.endDate < now)

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name') as string,
      startDate: form.get('startDate') as string,
      endDate: form.get('endDate') as string,
      locationId: (form.get('locationId') as string) || null,
      vehicleId: (form.get('vehicleId') as string) || null,
      notes: (form.get('notes') as string) || null,
    }

    setFormError(null)
    try {
      const res = await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to create trip')
      const saved = await res.json()
      setTrips((prev) => [
        {
          ...saved,
          startDate: saved.startDate,
          endDate: saved.endDate,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        },
        ...prev,
      ])
      setShowForm(false)
    } catch {
      setFormError('Failed to create trip. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
          Trips
        </h1>
        <Button
          variant="primary"
          onClick={() => setShowForm(!showForm)}
          icon={<Plus size={16} />}
        >
          Plan Trip
        </Button>
      </div>

      {/* Inline error */}
      {error && (
        <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-2">
          {error}
        </div>
      )}

      {/* Create trip form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 space-y-3"
        >
          <Input
            label="Trip Name *"
            name="name"
            required
            placeholder="e.g. Linville Gorge Weekend"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date *"
              name="startDate"
              type="date"
              required
            />
            <Input
              label="End Date *"
              name="endDate"
              type="date"
              required
            />
          </div>
          {locations.length > 0 && (
            <Select
              label="Location"
              name="locationId"
              options={[
                { value: '', label: 'Select a location' },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
            />
          )}
          {vehicles.length > 0 && (
            <Select
              label="Vehicle"
              name="vehicleId"
              options={[
                { value: '', label: 'Select a vehicle' },
                ...vehicles.map((v) => ({ value: v.id, label: v.name })),
              ]}
            />
          )}
          <Textarea
            label="Notes"
            name="notes"
            rows={3}
            placeholder="Trip plans, goals, things to remember..."
          />
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setShowForm(false); setFormError(null) }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={saving}
            >
              Add Trip
            </Button>
          </div>
        </form>
      )}

      {/* Trips list */}
      {trips.length === 0 && !showForm ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">🏕️</p>
          <p className="text-lg font-medium text-stone-400 dark:text-stone-500">
            No trips planned yet
          </p>
          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
            <button
              onClick={() => setShowForm(true)}
              className="text-amber-600 dark:text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 font-medium"
            >
              Plan your first trip
            </button>
          </p>
        </div>
      ) : (
        <>
          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                Upcoming
              </h2>
              <div className="space-y-3">
                {upcoming.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isSelected={selectedTripId === trip.id}
                    onSelect={setSelectedTripId}
                    onEdit={openEdit}
                    onDelete={setConfirmDelete}
                    weather={weatherByTrip[trip.id]}
                    weatherLoading={weatherLoading[trip.id]}
                    weatherError={weatherErrors[trip.id]}
                    onDebrief={setDebriefTrip}
                  />
                ))}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
                Past Trips
              </h2>
              <div className="space-y-3">
                {past.map((trip) => (
                  <TripCard
                    key={trip.id}
                    trip={trip}
                    isSelected={selectedTripId === trip.id}
                    onSelect={setSelectedTripId}
                    onEdit={openEdit}
                    onDelete={setConfirmDelete}
                    weather={weatherByTrip[trip.id]}
                    weatherLoading={weatherLoading[trip.id]}
                    weatherError={weatherErrors[trip.id]}
                    onDebrief={setDebriefTrip}
                  />
                ))}
              </div>
            </section>
          )}
        </>
      )}

      {/* Context-aware FAB — show when a trip is selected */}
      {selectedTripId && (
        <ChatContextButton contextType="trip" contextId={selectedTripId} />
      )}

      {/* Voice debrief modal */}
      {debriefTrip && (
        <VoiceRecordModal
          tripId={debriefTrip.id}
          tripName={debriefTrip.name}
          locationId={debriefTrip.locationId}
          onClose={() => setDebriefTrip(null)}
        />
      )}

      {/* Edit trip modal */}
      <Modal
        open={!!editingTrip}
        onClose={() => setEditingTrip(null)}
        title="Edit Trip"
      >
        <form onSubmit={handleEditSave} className="p-4 space-y-3">
          <Input
            label="Trip Name *"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Linville Gorge Weekend"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Start Date *"
              type="date"
              required
              value={editStartDate}
              onChange={(e) => setEditStartDate(e.target.value)}
            />
            <Input
              label="End Date *"
              type="date"
              required
              value={editEndDate}
              onChange={(e) => setEditEndDate(e.target.value)}
            />
          </div>
          {locations.length > 0 && (
            <Select
              label="Location"
              value={editLocationId}
              onChange={(e) => setEditLocationId(e.target.value)}
              options={[
                { value: '', label: 'Select a location' },
                ...locations.map((loc) => ({ value: loc.id, label: loc.name })),
              ]}
            />
          )}
          {vehicles.length > 0 && (
            <Select
              label="Vehicle"
              value={editVehicleId}
              onChange={(e) => setEditVehicleId(e.target.value)}
              options={[
                { value: '', label: 'Select a vehicle' },
                ...vehicles.map((v) => ({ value: v.id, label: v.name })),
              ]}
            />
          )}
          <Textarea
            label="Notes"
            rows={3}
            placeholder="Trip plans, goals, things to remember..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {error}
            </p>
          )}
          <div className="flex gap-3 pt-1 pb-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditingTrip(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isSaving}
            >
              Save Trip
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete trip confirm dialog */}
      <ConfirmDialog
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && handleDelete(confirmDelete.id)}
        title="Delete trip?"
        message="This will permanently remove the trip and all its packing items. This can't be undone."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
