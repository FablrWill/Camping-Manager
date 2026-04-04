'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TripPrepStepper from '@/components/TripPrepStepper'
import TripPrepSection from '@/components/TripPrepSection'
import WeatherCard from '@/components/WeatherCard'
import PackingList from '@/components/PackingList'
import MedicationManager from '@/components/MedicationManager'
import MealPlanClient from '@/components/MealPlanClient'
import PowerBudget from '@/components/PowerBudget'
import VehicleChecklistCard from '@/components/VehicleChecklistCard'
import { PREP_SECTIONS, PrepState, PrepSection } from '@/lib/prep-sections'
import { formatDateRange, daysUntil, tripNights } from '@/lib/trip-utils'
import type { DayForecast, WeatherAlert } from '@/lib/weather'
import type { LastStopsResult } from '@/lib/overpass'
import type { DepartureChecklistResult } from '@/lib/parse-claude'
import { useOnlineStatus } from '@/lib/use-online-status'
import { getTripSnapshot, type TripSnapshot } from '@/lib/offline-storage'

interface TripPrepStatus {
  tripId: string
  destination: boolean
  weather: boolean
  packing: boolean
  meals: boolean
  departure: boolean
}

interface TripPrepClientProps {
  trip: {
    id: string
    name: string
    startDate: string
    endDate: string
    location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
    vehicle: { id: string; name: string } | null
    permitUrl: string | null
    permitNotes: string | null
    fallbackFor: string | null
    fallbackOrder: number | null
  }
  tripPrepStatus: TripPrepStatus
}

interface AlternativeTrip {
  id: string
  name: string
  startDate: string
  endDate: string
  fallbackOrder: number | null
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
}

interface AlternativeWeather {
  days: DayForecast[]
}

interface WeatherSectionData {
  days: DayForecast[]
  alerts: WeatherAlert[]
  elevation?: number
  locationName?: string
}

interface DepartureChecklistData {
  result: DepartureChecklistResult | null
  generatedAt: string | null
}

function getCountdown(startDate: string, endDate: string): string {
  const now = new Date()
  const start = new Date(startDate)
  const end = new Date(endDate)

  if (now >= start && now <= end) return 'Trip in progress'
  if (now > end) return 'Trip completed'

  const days = daysUntil(startDate)
  return `${days} day${days !== 1 ? 's' : ''} away`
}

function getDefaultExpanded(sections: PrepSection[], key: string): boolean {
  // Auto-expand first section that is not ready
  const firstNotReady = sections.find((s) => s.status !== 'ready')
  return firstNotReady?.key === key
}

export default function TripPrepClient({ trip, tripPrepStatus }: TripPrepClientProps) {
  const isOnline = useOnlineStatus()
  const [offlineSnapshot, setOfflineSnapshot] = useState<TripSnapshot | null>(null)
  const [prepState, setPrepState] = useState<PrepState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureChecklist, setDepartureChecklist] = useState<DepartureChecklistData | null>(null)
  const [lastStops, setLastStops] = useState<LastStopsResult | null>(null)
  const [lastStopsLoading, setLastStopsLoading] = useState(false)
  const [lastStopsError, setLastStopsError] = useState<string | null>(null)
  const [permitUrl, setPermitUrl] = useState<string>(trip.permitUrl ?? '')
  const [permitNotes, setPermitNotes] = useState<string>(trip.permitNotes ?? '')
  const [permitSaving, setPermitSaving] = useState(false)
  const [permitError, setPermitError] = useState<string | null>(null)
  const [permitSaved, setPermitSaved] = useState(false)
  const [alternatives, setAlternatives] = useState<AlternativeTrip[]>([])
  const [alternativesLoading, setAlternativesLoading] = useState(false)
  const [alternativeWeather, setAlternativeWeather] = useState<Record<string, AlternativeWeather>>({})

  // Load offline snapshot when device goes offline
  useEffect(() => {
    if (isOnline) {
      setOfflineSnapshot(null)
      return
    }
    let cancelled = false
    async function loadSnapshot() {
      const snap = await getTripSnapshot(trip.id)
      if (!cancelled) setOfflineSnapshot(snap ?? null)
    }
    loadSnapshot()
    return () => { cancelled = true }
  }, [isOnline, trip.id])

  async function fetchPrepState() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${trip.id}/prep`)
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to load prep status')
      }
      const data: PrepState = await res.json()
      setPrepState(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load prep status')
    } finally {
      setLoading(false)
    }
  }

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

  useEffect(() => {
    fetchPrepState()
    // Fetch departure checklist data independently for departure section status
    async function fetchDepartureChecklist() {
      try {
        const res = await fetch(`/api/departure-checklist?tripId=${trip.id}`)
        if (res.ok) {
          const data = await res.json()
          setDepartureChecklist({ result: data.result ?? null, generatedAt: data.generatedAt ?? null })
        }
      } catch {
        // Silent fail — departure section will show not_started
      }
    }
    fetchDepartureChecklist()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id])

  useEffect(() => {
    if (!trip.location?.latitude || !trip.location?.longitude) return
    setLastStopsLoading(true)
    setLastStopsError(null)
    fetch(`/api/trips/${trip.id}/last-stops`)
      .then(r => {
        if (!r.ok) throw new Error('Failed to fetch')
        return r.json()
      })
      .then((data: LastStopsResult) => {
        setLastStops(data)
        setLastStopsLoading(false)
      })
      .catch(() => {
        setLastStopsError('Could not load nearby stops')
        setLastStopsLoading(false)
      })
  }, [trip.id, trip.location?.latitude, trip.location?.longitude])

  // Fetch alternatives for this trip (Phase 22)
  useEffect(() => {
    setAlternativesLoading(true)
    fetch(`/api/trips/${trip.id}/alternatives`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: AlternativeTrip[]) => {
        setAlternatives(data)
        setAlternativesLoading(false)
        // Fetch weather for each alternative with coordinates
        data.forEach(alt => {
          if (!alt.location?.latitude || !alt.location?.longitude) return
          fetch(`/api/weather?lat=${alt.location.latitude}&lon=${alt.location.longitude}`)
            .then(r => r.ok ? r.json() : null)
            .then(weather => {
              if (weather) {
                setAlternativeWeather(prev => ({ ...prev, [alt.id]: weather }))
              }
            })
            .catch(() => {}) // silently skip weather errors for alternatives
        })
      })
      .catch(() => setAlternativesLoading(false))
  }, [trip.id])

  const nights = tripNights(trip.startDate, trip.endDate)
  const countdown = getCountdown(trip.startDate, trip.endDate)
  const dateRange = formatDateRange(trip.startDate, trip.endDate)

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-4">
      {/* Back navigation */}
      <Link
        href="/trips"
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to Trips
      </Link>

      {/* Trip header card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <h1 className="text-xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
          {trip.name}
        </h1>
        <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">
          {trip.location?.name || 'No location set'}
        </p>
        <div className="flex items-center gap-3 mt-2 text-sm text-stone-500 dark:text-stone-400">
          <span>{dateRange}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span>{nights} night{nights !== 1 ? 's' : ''}</span>
          <span className="text-stone-300 dark:text-stone-600">·</span>
          <span className="text-amber-600 dark:text-amber-400 font-medium">{countdown}</span>
        </div>
      </div>

      {/* Prep progress stepper */}
      <TripPrepStepper
        tripId={trip.id}
        steps={[
          { label: 'Destination', complete: tripPrepStatus.destination },
          { label: 'Weather', complete: tripPrepStatus.weather },
          { label: 'Packing', complete: tripPrepStatus.packing },
          { label: 'Meals', complete: tripPrepStatus.meals },
          { label: 'Departure', complete: tripPrepStatus.departure },
        ]}
      />

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={fetchPrepState}
            className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            Tap to retry
          </button>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && !error && (
        <div className="space-y-3">
          {PREP_SECTIONS.map((section) => (
            <div
              key={section.key}
              className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
                  <div className="h-4 animate-pulse bg-stone-200 dark:bg-stone-700 rounded w-24" />
                  <div className="h-5 animate-pulse bg-stone-200 dark:bg-stone-700 rounded-full w-16" />
                </div>
                <div className="h-4 animate-pulse bg-stone-200 dark:bg-stone-700 rounded w-4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Prep sections */}
      {!loading && prepState && (
        <>
          {PREP_SECTIONS.map((config) => {
            const section: PrepSection | undefined = prepState.sections.find(
              (s) => s.key === config.key
            )

            // Departure section: derive status from fetched checklist data
            let status = section?.status ?? 'not_started'
            let summary = section?.summary ?? ''

            if (config.key === 'departure') {
              if (!departureChecklist || !departureChecklist.result) {
                status = 'not_started'
                summary = 'Not generated'
              } else {
                const allItems = departureChecklist.result.slots.flatMap((s) => s.items)
                const checkedCount = allItems.filter((i) => i.checked).length
                if (checkedCount === allItems.length && allItems.length > 0) {
                  status = 'ready'
                  summary = 'All tasks done'
                } else {
                  status = 'in_progress'
                  summary = `${checkedCount} of ${allItems.length} tasks done`
                }
              }
            }

            if (config.key === 'vehicle-check') {
              if (!trip.vehicle) {
                status = 'not_started'
                summary = 'No vehicle assigned'
              } else {
                status = 'not_started'
                summary = 'Not generated'
              }
            }

            const defaultExpanded = getDefaultExpanded(prepState.sections, config.key)

            return (
              <Fragment key={config.key}>
              <TripPrepSection
                key={`section-${config.key}`}
                title={config.label}
                emoji={config.emoji}
                status={status}
                summary={summary}
                defaultExpanded={defaultExpanded}
              >
                {config.key === 'weather' && (
                  <>
                    {(section?.data && trip.location) || (!isOnline && offlineSnapshot?.weather) ? (
                      <WeatherCard
                        days={(section?.data as WeatherSectionData)?.days ?? []}
                        alerts={(section?.data as WeatherSectionData)?.alerts ?? []}
                        locationName={(section?.data as WeatherSectionData)?.locationName ?? trip.location?.name}
                        elevation={(section?.data as WeatherSectionData)?.elevation}
                        offlineData={!isOnline && offlineSnapshot?.weather ? offlineSnapshot.weather as { days?: import('@/lib/weather').DayForecast[]; alerts?: import('@/lib/weather').WeatherAlert[]; locationName?: string; elevation?: number } : undefined}
                      />
                    ) : (
                      <p className="text-sm text-stone-400 dark:text-stone-500 py-2">
                        Set a trip location to see weather.
                      </p>
                    )}
                  </>
                )}

                {config.key === 'packing' && (
                  <div className="space-y-3">
                    <MedicationManager />
                    <PackingList
                      tripId={trip.id}
                      tripName={trip.name}
                      offlineData={!isOnline && offlineSnapshot?.packingList ? offlineSnapshot.packingList as import('@/lib/claude').PackingListResult : undefined}
                    />
                  </div>
                )}

                {config.key === 'meals' && (
                  <MealPlanClient
                    tripId={trip.id}
                    tripName={trip.name}
                  />
                )}

                {config.key === 'power' && (
                  <PowerBudget tripId={trip.id} tripName={trip.name} />
                )}

                {config.key === 'departure' && (
                  <div className="py-2 space-y-3">
                    {departureChecklist?.result ? (
                      <>
                        {/* Preview first slot items (up to 3) */}
                        <div className="space-y-1">
                          {departureChecklist.result.slots[0]?.items.slice(0, 3).map((item) => (
                            <div key={item.id} className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
                              <span className={item.checked ? 'text-stone-400 line-through' : ''}>
                                {item.checked ? '✓' : '○'} {item.text}
                              </span>
                            </div>
                          ))}
                        </div>
                        <Link
                          href={`/trips/${trip.id}/depart`}
                          className="text-sm font-medium text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
                        >
                          Open full checklist →
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-stone-400 dark:text-stone-500">
                        Generate your departure checklist on the{' '}
                        <Link
                          href={`/trips/${trip.id}/depart`}
                          className="text-amber-600 dark:text-amber-400 hover:underline"
                        >
                          departure page
                        </Link>
                        .
                      </p>
                    )}
                  </div>
                )}

                {config.key === 'vehicle-check' && (
                  <VehicleChecklistCard
                    tripId={trip.id}
                    hasVehicle={!!trip.vehicle}
                  />
                )}
              </TripPrepSection>

              {/* Fuel & Last Stops card — after weather, before packing (D-09) */}
              {config.key === 'weather' && trip.location?.latitude && trip.location?.longitude && (
                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">Fuel & Last Stops</h3>

                  {lastStopsLoading && (
                    <div role="status" aria-label="Loading nearby stops" className="space-y-3">
                      {['Fuel', 'Grocery', 'Outdoor / Gear'].map(label => (
                        <div key={label}>
                          <div className="h-3 w-20 animate-pulse bg-stone-200 dark:bg-stone-700 rounded mb-1" />
                          <div className="h-4 w-48 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
                        </div>
                      ))}
                    </div>
                  )}

                  {lastStopsError && (
                    <div role="alert" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
                      <p className="text-sm font-semibold text-red-600 dark:text-red-400">Could not load nearby stops</p>
                      <p className="text-xs text-red-600 dark:text-red-400 mt-1">Check your connection and reload the page.</p>
                    </div>
                  )}

                  {lastStops && !lastStopsLoading && !lastStopsError && (
                    <div className="space-y-3">
                      {([
                        { key: 'fuel' as const, emoji: '\u26FD', label: 'Fuel' },
                        { key: 'grocery' as const, emoji: '\uD83D\uDED2', label: 'Grocery' },
                        { key: 'outdoor' as const, emoji: '\uD83C\uDFD5\uFE0F', label: 'Outdoor / Gear' },
                      ]).map(({ key, emoji, label }) => (
                        <div key={key}>
                          <p className="text-xs font-semibold uppercase text-stone-500 dark:text-stone-400 mb-1">{emoji} {label}</p>
                          {lastStops[key].length === 0 ? (
                            <p className="text-sm text-stone-500 dark:text-stone-400 italic">None found nearby — plan ahead</p>
                          ) : (
                            <div className="space-y-0.5">
                              {lastStops[key].map((stop, i) => (
                                <p key={i} className="text-sm text-stone-900 dark:text-stone-50">
                                  {stop.name} <span className="text-xs text-stone-500 dark:text-stone-400">— {stop.distanceMiles.toFixed(1)} mi</span>
                                </p>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
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
              {/* Fallback Plans card — after Permits (Phase 22) */}
              {config.key === 'weather' && (
                <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
                  <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">Fallback Plans</h3>

                  {alternativesLoading && (
                    <div className="space-y-2">
                      <div className="h-4 w-32 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
                      <div className="h-4 w-48 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
                    </div>
                  )}

                  {!alternativesLoading && alternatives.length === 0 && (
                    <p className="text-sm text-stone-400 dark:text-stone-500">
                      No fallback plans yet.{' '}
                      <Link
                        href="/trips"
                        className="text-amber-600 dark:text-amber-400 hover:underline"
                      >
                        Add a Plan B
                      </Link>
                    </p>
                  )}

                  {!alternativesLoading && alternatives.length > 0 && (
                    <div className="space-y-3">
                      {alternatives.map(alt => {
                        const weather = alternativeWeather[alt.id]
                        return (
                          <div key={alt.id} className="border border-stone-100 dark:border-stone-800 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-full px-1.5 py-0.5">
                                Plan {alt.fallbackOrder === 3 ? 'C' : 'B'}
                              </span>
                              <span className="text-sm font-semibold text-stone-900 dark:text-stone-50 truncate">
                                {alt.name}
                              </span>
                            </div>
                            {alt.location ? (
                              <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
                                📍 {alt.location.name}
                              </p>
                            ) : (
                              <p className="text-xs text-stone-400 dark:text-stone-500 italic mb-1">
                                No location set
                              </p>
                            )}
                            {weather && weather.days.length > 0 && (
                              <div className="flex gap-2 mt-2 overflow-x-auto">
                                {weather.days.slice(0, 3).map(day => (
                                  <div key={day.date} className="text-center min-w-[4rem] shrink-0">
                                    <p className="text-[10px] text-stone-400 dark:text-stone-500">
                                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                                    </p>
                                    <p className="text-xs font-medium text-stone-700 dark:text-stone-300">
                                      {Math.round(day.highF)}° / {Math.round(day.lowF)}°
                                    </p>
                                    <p className="text-[10px] text-stone-500 dark:text-stone-400">
                                      {day.precipProbability}% rain
                                    </p>
                                  </div>
                                ))}
                              </div>
                            )}
                            <Link
                              href={`/trips/${alt.id}/prep`}
                              className="mt-2 inline-block text-xs text-amber-600 dark:text-amber-400 hover:underline"
                            >
                              View prep →
                            </Link>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}
              </Fragment>
            )
          })}

          {/* Ready Checklist section — derived from prep sections */}
          <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
            <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
              Ready Checklist
            </h2>
            <div className="space-y-2">
              {prepState.sections.map((section) => {
                const config = PREP_SECTIONS.find((c) => c.key === section.key)
                const isReady = section.status === 'ready'
                return (
                  <div key={section.key} className="flex items-center gap-3">
                    <div
                      className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs ${
                        isReady
                          ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400'
                          : 'bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500'
                      }`}
                    >
                      {isReady ? '✓' : '○'}
                    </div>
                    <span className="text-sm text-stone-700 dark:text-stone-300">
                      {config?.emoji} {section.label}
                    </span>
                    {!isReady && (
                      <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
                        {section.summary}
                      </span>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}

      {/* Sticky CTA */}
      <div className="sticky bottom-0 pb-[calc(env(safe-area-inset-bottom,0px)+80px)] pt-2 bg-gradient-to-t from-stone-50 dark:from-stone-950">
        <button
          disabled={!prepState?.overallReady}
          className={`w-full py-4 rounded-xl font-semibold text-base transition-colors ${
            prepState?.overallReady
              ? 'bg-emerald-600 text-white active:bg-emerald-700'
              : 'bg-stone-200 dark:bg-stone-800 text-stone-400 dark:text-stone-600 cursor-not-allowed'
          }`}
        >
          I&apos;m Ready to Go
        </button>
      </div>
    </div>
  )
}
