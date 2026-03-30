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
} from 'lucide-react'
import WeatherCard from '@/components/WeatherCard'
import PackingList from '@/components/PackingList'
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

function formatDateRange(start: string, end: string): string {
  const s = new Date(start)
  const e = new Date(end)
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }

  if (s.getFullYear() !== e.getFullYear()) {
    return `${s.toLocaleDateString('en-US', { ...opts, year: 'numeric' })} – ${e.toLocaleDateString('en-US', { ...opts, year: 'numeric' })}`
  }
  if (s.getMonth() === e.getMonth()) {
    return `${s.toLocaleDateString('en-US', opts)} – ${e.getDate()}, ${s.getFullYear()}`
  }
  return `${s.toLocaleDateString('en-US', opts)} – ${e.toLocaleDateString('en-US', opts)}, ${s.getFullYear()}`
}

function daysUntil(dateStr: string): number {
  const now = new Date()
  const target = new Date(dateStr)
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
}

function tripNights(start: string, end: string): number {
  const s = new Date(start)
  const e = new Date(end)
  return Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24))
}

type TripCategory = 'upcoming' | 'past'

export default function TripsClient({ initialTrips, locations, vehicles }: TripsClientProps) {
  const [trips, setTrips] = useState(initialTrips)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [weatherByTrip, setWeatherByTrip] = useState<Record<string, WeatherData>>({})
  const [weatherLoading, setWeatherLoading] = useState<Record<string, boolean>>({})
  const [weatherErrors, setWeatherErrors] = useState<Record<string, string>>({})
  const [fetchedTrips] = useState<Set<string>>(new Set())

  const now = new Date().toISOString()

  // Fetch weather for upcoming trips that have a location with GPS
  useEffect(() => {
    const upcoming = trips.filter(t => t.endDate >= now)

    upcoming.forEach(async (trip) => {
      if (!trip.location?.latitude || !trip.location?.longitude) return
      if (fetchedTrips.has(trip.id)) return

      // Only fetch for trips within 16 days (Open-Meteo forecast limit)
      const daysOut = Math.ceil((new Date(trip.startDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      if (daysOut > 16 || new Date(trip.endDate) < new Date()) return

      fetchedTrips.add(trip.id)
      setWeatherLoading(prev => ({ ...prev, [trip.id]: true }))

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
        setWeatherByTrip(prev => ({ ...prev, [trip.id]: data }))
      } catch {
        setWeatherErrors(prev => ({ ...prev, [trip.id]: 'Could not load forecast' }))
      } finally {
        setWeatherLoading(prev => ({ ...prev, [trip.id]: false }))
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

    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden hover:border-amber-400 dark:hover:border-amber-500 transition-colors">
        {/* Status ribbon */}
        {isActive && (
          <div className="bg-emerald-600 dark:bg-emerald-500 text-white dark:text-stone-900 text-xs font-medium px-3 py-1 text-center">
            Currently Active
          </div>
        )}

        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-stone-900 dark:text-stone-50 text-base truncate">
                {trip.name}
              </h3>

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

          {/* Packing list for upcoming trips */}
          {!isPast && (
            <div className="mt-3">
              <PackingList tripId={trip.id} tripName={trip.name} />
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
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-1.5"
        >
          <Plus size={16} />
          Plan Trip
        </button>
      </div>

      {/* Create trip form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 space-y-3"
        >
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Trip Name *
            </label>
            <input
              name="name"
              required
              placeholder="e.g. Linville Gorge Weekend"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Start Date *
              </label>
              <input
                name="startDate"
                type="date"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                End Date *
              </label>
              <input
                name="endDate"
                type="date"
                required
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
          </div>
          {locations.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Location
              </label>
              <select
                name="locationId"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              >
                <option value="">Select a location</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {vehicles.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Vehicle
              </label>
              <select
                name="vehicleId"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              >
                <option value="">Select a vehicle</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Notes
            </label>
            <textarea
              name="notes"
              rows={3}
              placeholder="Trip plans, goals, things to remember..."
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 resize-none"
            />
          </div>
          {formError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {formError}
            </p>
          )}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={() => { setShowForm(false); setFormError(null) }}
              className="flex-1 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Creating...' : 'Create Trip'}
            </button>
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
    </div>
  )
}
