'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, UtensilsCrossed } from 'lucide-react'
import { Button, Input, Select, Textarea, Modal, ConfirmDialog } from '@/components/ui'
import ChatContextButton from '@/components/ChatContextButton'
import VoiceRecordModal from './VoiceRecordModal'
import TripCard from './TripCard'
import TripPlannerSheet from './TripPlannerSheet'
import type { DayForecast, WeatherAlert } from '@/lib/weather'
import { computeAstro } from '@/lib/astro'
import type { TripAstroData } from '@/lib/astro'

interface TripData {
  id: string
  name: string
  startDate: string
  endDate: string
  notes: string | null
  weatherNotes: string | null
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
  vehicle: { id: string; name: string } | null
  _count: { packingItems: number; photos: number; alternatives: number }
  createdAt: string
  updatedAt: string
  bringingDog: boolean
  permitUrl: string | null
  permitNotes: string | null
  fallbackFor: string | null
  fallbackOrder: number | null
  mealPlanGeneratedAt: string | null  // Phase 34: meal plan status
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
  const [showPlannerSheet, setShowPlannerSheet] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [debriefTrip, setDebriefTrip] = useState<{ id: string; name: string; locationId: string | null } | null>(null)
  const [weatherByTrip, setWeatherByTrip] = useState<Record<string, WeatherData>>({})
  const [weatherLoading, setWeatherLoading] = useState<Record<string, boolean>>({})
  const [weatherErrors, setWeatherErrors] = useState<Record<string, string>>({})
  const [astroByTrip, setAstroByTrip] = useState<Record<string, TripAstroData>>({})
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
  const [editBringingDog, setEditBringingDog] = useState(false)
  const [editPermitUrl, setEditPermitUrl] = useState('')
  const [editPermitNotes, setEditPermitNotes] = useState('')

  // Fallback form state
  const [fallbackForTripId, setFallbackForTripId] = useState<string | null>(null)
  const [fallbackForTripName, setFallbackForTripName] = useState<string | null>(null)
  const [fallbackOrder, setFallbackOrder] = useState<number | null>(null)

  function openEdit(trip: TripData) {
    setEditingTrip(trip)
    setEditName(trip.name)
    setEditStartDate(trip.startDate.split('T')[0])
    setEditEndDate(trip.endDate.split('T')[0])
    setEditLocationId(trip.location?.id ?? '')
    setEditVehicleId(trip.vehicle?.id ?? '')
    setEditNotes(trip.notes ?? '')
    setEditBringingDog(trip.bringingDog ?? false)
    setEditPermitUrl(trip.permitUrl ?? '')
    setEditPermitNotes(trip.permitNotes ?? '')
    setError(null)
  }

  function openAddFallback(trip: TripData) {
    // Calculate next fallback order (2 = Plan B, 3 = Plan C)
    const nextOrder = (trip._count.alternatives || 0) + 2
    if (nextOrder > 3) return // Max 2 fallbacks (soft limit)
    setFallbackForTripId(trip.id)
    setFallbackForTripName(trip.name)
    setFallbackOrder(nextOrder)
    setShowForm(true)
  }

  const handleAddManually = useCallback(() => {
    setShowPlannerSheet(false)
    setShowForm(true)
  }, [])

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
          bringingDog: editBringingDog,
          permitUrl: editPermitUrl || null,
          permitNotes: editPermitNotes || null,
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

  // Compute astro data for upcoming trips (pure computation, no API call)
  useEffect(() => {
    const upcoming = trips.filter((t) => t.endDate >= now)
    if (upcoming.length === 0) return

    setAstroByTrip((prev) => {
      const next: Record<string, TripAstroData> = { ...prev }
      let changed = false

      upcoming.forEach((trip) => {
        const start = trip.startDate.split('T')[0]
        const end = trip.endDate.split('T')[0]
        const weatherData = weatherByTrip[trip.id]
        const hasWeather = !!weatherData?.days?.length
        const existingHasWeather = !!next[trip.id]?.nights[0]?.sunrise
        if (next[trip.id] && (existingHasWeather || !hasWeather)) return

        next[trip.id] = computeAstro({
          startDate: start,
          endDate: end,
          lat: trip.location?.latitude ?? undefined,
          lon: trip.location?.longitude ?? undefined,
          weatherDays: weatherData?.days,
        })
        changed = true
      })

      return changed ? next : prev
    })
  // astroByTrip intentionally excluded to prevent infinite re-render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trips, now, weatherByTrip])

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
      bringingDog: form.get('bringingDog') === 'on',
      fallbackFor: fallbackForTripId,
      fallbackOrder: fallbackOrder,
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
      // Optimistically increment the primary trip's alternatives count
      if (fallbackForTripId) {
        setTrips(prev => prev.map(t =>
          t.id === fallbackForTripId
            ? { ...t, _count: { ...t._count, alternatives: t._count.alternatives + 1 } }
            : t
        ))
      }
      setShowForm(false)
      setFallbackForTripId(null)
      setFallbackForTripName(null)
      setFallbackOrder(null)
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
          onClick={() => setShowPlannerSheet(true)}
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
          {fallbackForTripName && (
            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                Creating as <span className="font-semibold">Plan {fallbackOrder === 3 ? 'C' : 'B'}</span> for {fallbackForTripName}
              </p>
            </div>
          )}
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
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              name="bringingDog"
              className="rounded border-stone-300 dark:border-stone-600"
            />
            Bringing dog?
          </label>
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
              onClick={() => { setShowForm(false); setFormError(null); setFallbackForTripId(null); setFallbackForTripName(null); setFallbackOrder(null) }}
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
              onClick={() => setShowPlannerSheet(true)}
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
                  <div key={trip.id}>
                    <TripCard
                      trip={trip}
                      isSelected={selectedTripId === trip.id}
                      onSelect={setSelectedTripId}
                      onEdit={openEdit}
                      onDelete={setConfirmDelete}
                      weather={weatherByTrip[trip.id]}
                      weatherLoading={weatherLoading[trip.id]}
                      weatherError={weatherErrors[trip.id]}
                      onDebrief={setDebriefTrip}
                      astro={astroByTrip[trip.id]}
                    />
                    {/* Meal plan status badge — Phase 34 */}
                    <div className="flex items-center gap-1.5 px-1 pt-1">
                      {trip.mealPlanGeneratedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <UtensilsCrossed className="h-3 w-3" />
                          Meal plan ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                          <UtensilsCrossed className="h-3 w-3" />
                          No meal plan
                        </span>
                      )}
                    </div>
                    {/* Add Plan B/C button — only for upcoming primary trips without max fallbacks */}
                    {!trip.fallbackFor && trip._count.alternatives < 2 && new Date(trip.startDate) > new Date() && (
                      <button
                        onClick={() => openAddFallback(trip)}
                        className="w-full text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 py-1 transition-colors"
                      >
                        + Add Plan {trip._count.alternatives === 0 ? 'B' : 'C'}
                      </button>
                    )}
                  </div>
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
                  <div key={trip.id}>
                    <TripCard
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
                    {/* Meal plan status badge — Phase 34 */}
                    <div className="flex items-center gap-1.5 px-1 pt-1">
                      {trip.mealPlanGeneratedAt ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <UtensilsCrossed className="h-3 w-3" />
                          Meal plan ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                          <UtensilsCrossed className="h-3 w-3" />
                          No meal plan
                        </span>
                      )}
                    </div>
                  </div>
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
          <label className="flex items-center gap-2 text-sm text-stone-700 dark:text-stone-300 cursor-pointer">
            <input
              type="checkbox"
              checked={editBringingDog}
              onChange={(e) => setEditBringingDog(e.target.checked)}
              className="rounded border-stone-300 dark:border-stone-600"
            />
            Bringing dog?
          </label>
          <Textarea
            label="Notes"
            rows={3}
            placeholder="Trip plans, goals, things to remember..."
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
          />
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Booking URL
            </label>
            <input
              type="url"
              value={editPermitUrl}
              onChange={(e) => setEditPermitUrl(e.target.value)}
              placeholder="https://www.recreation.gov/..."
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 mb-1">
              Permit Notes
            </label>
            <textarea
              value={editPermitNotes}
              onChange={(e) => setEditPermitNotes(e.target.value)}
              placeholder="Site number, check-in time, special instructions..."
              rows={2}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-50 placeholder:text-stone-400 dark:placeholder:text-stone-500 resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>
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

      {/* Conversational trip planner sheet */}
      <TripPlannerSheet
        open={showPlannerSheet}
        onClose={() => setShowPlannerSheet(false)}
        onAddManually={handleAddManually}
      />
    </div>
  )
}
