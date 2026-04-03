'use client'

import { useState, useEffect, Fragment } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import TripPrepSection from '@/components/TripPrepSection'
import WeatherCard from '@/components/WeatherCard'
import PackingList from '@/components/PackingList'
import MealPlan from '@/components/MealPlan'
import PowerBudget from '@/components/PowerBudget'
import { PREP_SECTIONS, PrepState, PrepSection } from '@/lib/prep-sections'
import { formatDateRange, daysUntil, tripNights } from '@/lib/trip-utils'
import type { DayForecast, WeatherAlert } from '@/lib/weather'
import type { LastStopsResult } from '@/lib/overpass'
import type { DepartureChecklistResult } from '@/lib/parse-claude'
import { useOnlineStatus } from '@/lib/use-online-status'
import { getTripSnapshot, type TripSnapshot } from '@/lib/offline-storage'

interface TripPrepClientProps {
  trip: {
    id: string
    name: string
    startDate: string
    endDate: string
    location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
    vehicle: { id: string; name: string } | null
  }
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

export default function TripPrepClient({ trip }: TripPrepClientProps) {
  const isOnline = useOnlineStatus()
  const [offlineSnapshot, setOfflineSnapshot] = useState<TripSnapshot | null>(null)
  const [prepState, setPrepState] = useState<PrepState | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [departureChecklist, setDepartureChecklist] = useState<DepartureChecklistData | null>(null)
  const [lastStops, setLastStops] = useState<LastStopsResult | null>(null)
  const [lastStopsLoading, setLastStopsLoading] = useState(false)
  const [lastStopsError, setLastStopsError] = useState<string | null>(null)

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
                  <PackingList
                    tripId={trip.id}
                    tripName={trip.name}
                    offlineData={!isOnline && offlineSnapshot?.packingList ? offlineSnapshot.packingList as import('@/lib/claude').PackingListResult : undefined}
                  />
                )}

                {config.key === 'meals' && (
                  <MealPlan
                    tripId={trip.id}
                    tripName={trip.name}
                    offlineData={!isOnline && offlineSnapshot?.mealPlan ? offlineSnapshot.mealPlan as import('@/lib/claude').MealPlanResult : undefined}
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
