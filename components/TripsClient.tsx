'use client'

import { useState, useEffect } from 'react'
import {
  Plus,
  Calendar,
  MapPin,
  Car,
  Camera,
  Backpack,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { Button, Input, Select, Textarea, Modal, ConfirmDialog } from '@/components/ui'
import ChatContextButton from '@/components/ChatContextButton'
import WeatherCard from '@/components/WeatherCard'
import PackingList from '@/components/PackingList'
import MealPlan from '@/components/MealPlan'
import PowerBudget from '@/components/PowerBudget'
import VoiceDebriefButton from './VoiceDebriefButton'
import VoiceRecordModal from './VoiceRecordModal'
import type { DayForecast, WeatherAlert } from '@/lib/weather'
import { formatDateRange, daysUntil, tripNights } from '@/lib/trip-utils'

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

  function TripCard({ trip }: { trip: TripData }) {
    const nights = tripNights(trip.startDate, trip.endDate)
    const days = daysUntil(trip.startDate)
    const isPast = trip.endDate < now
    const isActive = trip.startDate <= now && trip.endDate >= now
    const isSelected = selectedTripId === trip.id

    return (
      <div
        className={`bg-white dark:bg-stone-900 rounded-xl border overflow-hidden transition-colors cursor-pointer ${isSelected ? 'border-amber-400 dark:border-amber-500' : 'border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500'}`}
        onClick={() => setSelectedTripId(isSelected ? null : trip.id)}
      >
        {/* Status ribbon */}
        {isActive && (
          <div className="bg-emerald-600 dark:bg-emerald-500 text-white dark:text-stone-900 text-xs font-medium px-3 py-1 text-center">
            Currently Active
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-stone-900 dark:text-stone-50 text-base truncate">
                  {trip.name}
                </h3>
                {/* Edit/delete buttons */}
                <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEdit(trip)}
                    aria-label="Edit trip"
                  >
                    <Pencil size={14} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDelete({ id: trip.id, name: trip.name })}
                    aria-label="Delete trip"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>

              {/* Date range */}
              <div className="flex items-center gap-1.5 mt-1.5 text-sm text-stone-500 dark:text-stone-400">
                <Calendar size={14} />
                <span>{formatDateRange(trip.startDate, trip.endDate)}</span>
                <span className="text-stone-300 dark:text-stone-600">·</span>
                <span>{nights} night{nights !== 1 ? 's' : ''}</span>
              </div>

              {/* Location & Vehicle */}
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 text-sm text-stone-500 dark:text-stone-400">
                {trip.location && (
                  <span className="flex items-center gap-1">
                    <MapPin size={13} />
                    {trip.location.name}
                  </span>
                )}
                {trip.vehicle && (
                  <span className="flex items-center gap-1">
                    <Car size={13} />
                    {trip.vehicle.name}
                  </span>
                )}
              </div>

              {/* Stats */}
              <div className="flex gap-3 mt-2 text-xs text-stone-400 dark:text-stone-500">
                {trip._count.packingItems > 0 && (
                  <span className="flex items-center gap-1">
                    <Backpack size={12} />
                    {trip._count.packingItems} packed
                  </span>
                )}
                {trip._count.photos > 0 && (
                  <span className="flex items-center gap-1">
                    <Camera size={12} />
                    {trip._count.photos} photos
                  </span>
                )}
              </div>

              {trip.notes && (
                <p className="text-sm text-stone-400 dark:text-stone-500 mt-2 line-clamp-2">
                  {trip.notes}
                </p>
              )}

              {/* Prepare link for upcoming / active trips */}
              {!isPast && (
                <div className="mt-2">
                  <Link
                    href={`/trips/${trip.id}/prep`}
                    className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300"
                    onClick={(e) => e.stopPropagation()}
                  >
                    Prepare <ChevronRight size={14} />
                  </Link>
                </div>
              )}

              {/* Voice debrief button */}
              <div className="mt-2 flex items-center" onClick={(e) => e.stopPropagation()}>
                <VoiceDebriefButton
                  tripId={trip.id}
                  tripName={trip.name}
                  locationId={trip.location?.id ?? null}
                  onOpen={() => setDebriefTrip({ id: trip.id, name: trip.name, locationId: trip.location?.id ?? null })}
                />
              </div>
            </div>

            {/* Days countdown for upcoming */}
            {!isPast && !isActive && days > 0 && (
              <div className="text-center shrink-0">
                <p className="text-2xl font-bold text-amber-600 dark:text-amber-400">{days}</p>
                <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">
                  day{days !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Chevron for past trips */}
            {isPast && (
              <ChevronRight size={18} className="text-stone-300 dark:text-stone-600 shrink-0 mt-1" />
            )}
          </div>

          {/* Weather card for upcoming trips with location */}
          {!isPast && trip.location?.latitude && (
            <div className="mt-3">
              <WeatherCard
                days={weatherByTrip[trip.id]?.days ?? []}
                alerts={weatherByTrip[trip.id]?.alerts ?? []}
                locationName={trip.location.name}
                dateRange={formatDateRange(trip.startDate, trip.endDate)}
                elevation={weatherByTrip[trip.id]?.elevation}
                loading={weatherLoading[trip.id] ?? false}
                error={weatherErrors[trip.id] ?? null}
              />
            </div>
          )}

          {/* AI prep tools for upcoming trips */}
          {!isPast && (
            <div className="mt-3 space-y-3">
              <PackingList tripId={trip.id} tripName={trip.name} />
              <MealPlan tripId={trip.id} tripName={trip.name} />
              <PowerBudget tripId={trip.id} tripName={trip.name} />
            </div>
          )}
        </div>
      </div>
    )
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
                  <TripCard key={trip.id} trip={trip} />
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
                  <TripCard key={trip.id} trip={trip} />
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
