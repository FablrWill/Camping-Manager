'use client'

import {
  Calendar,
  MapPin,
  Car,
  Camera,
  Backpack,
  ChevronRight,
  Pencil,
  Trash2,
  ClipboardCheck,
  CheckCircle2,
  BookOpen,
} from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui'
import WeatherCard from '@/components/WeatherCard'
import AstroCard from '@/components/AstroCard'
import PackingList from '@/components/PackingList'
import MealPlan from '@/components/MealPlan'
import PowerBudget from '@/components/PowerBudget'
import TripExpenses from '@/components/TripExpenses'
import VoiceDebriefButton from './VoiceDebriefButton'
import PostTripReview from './PostTripReview'
import { formatDateRange, daysUntil, tripNights } from '@/lib/trip-utils'
import type { DayForecast, WeatherAlert } from '@/lib/weather'
import type { TripAstroData } from '@/lib/astro'

interface TripData {
  id: string
  name: string
  startDate: string
  endDate: string
  notes: string | null
  weatherNotes: string | null
  location: { id: string; name: string; latitude: number | null; longitude: number | null } | null
  locationId: string | null
  vehicle: { id: string; name: string } | null
  _count: { packingItems: number; photos: number; alternatives: number }
  packingItems: Array<{ gearId: string; gear: { name: string; category: string } | null; usageStatus: string | null }>
  mealPlan: { id: string; meals: Array<{ id: string; name: string; slot: string; day: number }> } | null
  createdAt: string
  updatedAt: string
  bringingDog: boolean
  permitUrl: string | null
  permitNotes: string | null
  fallbackFor: string | null
  fallbackOrder: number | null
  mealPlanGeneratedAt: string | null  // Phase 34: meal plan status
  reviewedAt: string | null  // Phase 38: post-trip review timestamp
  journalEntry: string | null  // S20: Voice Ghostwriter
  journalEntryAt: string | null  // S20: when journal was last written
}

interface WeatherData {
  days: DayForecast[]
  alerts: WeatherAlert[]
  elevation?: number
}

interface TripCardProps {
  trip: TripData
  isSelected: boolean
  onSelect: (id: string | null) => void
  onEdit: (trip: TripData) => void
  onDelete: (trip: { id: string; name: string }) => void
  weather?: WeatherData
  weatherLoading?: boolean
  weatherError?: string | null
  onDebrief: (trip: { id: string; name: string; locationId: string | null }) => void
  onReview: (tripId: string) => void
  onGhostwrite: (trip: { id: string; name: string }) => void
  astro?: TripAstroData
}

export default function TripCard({
  trip,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  weather,
  weatherLoading,
  weatherError,
  onDebrief,
  onReview,
  onGhostwrite,
  astro,
}: TripCardProps) {
  const now = new Date().toISOString()
  const nights = tripNights(trip.startDate, trip.endDate)
  const days = daysUntil(trip.startDate)
  const isPast = trip.endDate < now
  const isActive = trip.startDate <= now && trip.endDate >= now

  return (
    <div
      className={`bg-white dark:bg-stone-900 rounded-xl border overflow-hidden transition-colors cursor-pointer ${isSelected ? 'border-amber-400 dark:border-amber-500' : 'border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500'}`}
      onClick={() => onSelect(isSelected ? null : trip.id)}
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
              {trip.fallbackFor && (
                <span className="text-xs font-medium text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/30 rounded-full px-1.5 py-0.5 shrink-0">
                  Plan {trip.fallbackOrder === 3 ? 'C' : 'B'}
                </span>
              )}
              {trip.bringingDog && (
                <span title="Bringing dog" aria-label="Bringing dog" className="text-base leading-none shrink-0">
                  🐕
                </span>
              )}
              {trip.permitUrl && (
                <span title="Booking confirmed" aria-label="Booking confirmed" className="text-base leading-none shrink-0">
                  📋
                </span>
              )}
              {trip._count.alternatives > 0 && (
                <span
                  title={`${trip._count.alternatives} fallback plan${trip._count.alternatives !== 1 ? 's' : ''}`}
                  aria-label={`${trip._count.alternatives} fallback plans`}
                  className="text-xs font-medium text-stone-500 dark:text-stone-400 bg-stone-100 dark:bg-stone-800 rounded-full px-1.5 py-0.5 shrink-0"
                >
                  +{trip._count.alternatives}B
                </span>
              )}
              {/* Edit/delete buttons */}
              <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onEdit(trip)}
                  aria-label="Edit trip"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onDelete({ id: trip.id, name: trip.name })}
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
              {trip.mealPlanGeneratedAt && (
                <span className="flex items-center gap-1">
                  <span className="text-xs">🍽️</span>
                  Meal plan
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

            {/* Voice debrief button — only render for past trips */}
            {isPast && (
              <div className="mt-2 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                <VoiceDebriefButton
                  tripId={trip.id}
                  tripName={trip.name}
                  locationId={trip.location?.id ?? null}
                  onOpen={() => onDebrief({ id: trip.id, name: trip.name, locationId: trip.location?.id ?? null })}
                />
                <button
                  onClick={() => onGhostwrite({ id: trip.id, name: trip.name })}
                  aria-label="Write journal entry"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-50 hover:border-stone-300 dark:border-stone-700 dark:bg-stone-800 dark:text-stone-300 dark:hover:bg-stone-700"
                >
                  <BookOpen size={14} />
                  {trip.journalEntry ? 'Update journal' : 'Write journal'}
                </button>
              </div>
            )}

            {/* Review trip button / badge — past trips only */}
            {isPast && (
              <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                {trip.reviewedAt === null ? (
                  <button
                    onClick={() => onReview(trip.id)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-medium text-amber-800 transition-colors hover:bg-amber-100 dark:border-amber-700 dark:bg-amber-900/20 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    <ClipboardCheck size={14} />
                    Review trip
                  </button>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-2.5 py-1 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle2 size={12} />
                    Reviewed
                  </span>
                )}
              </div>
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
              days={weather?.days ?? []}
              alerts={weather?.alerts ?? []}
              locationName={trip.location.name}
              dateRange={formatDateRange(trip.startDate, trip.endDate)}
              elevation={weather?.elevation}
              loading={weatherLoading ?? false}
              error={weatherError ?? null}
            />
          </div>
        )}

        {/* Astro card for upcoming trips */}
        {!isPast && (
          <div className="mt-3">
            <AstroCard
              nights={astro?.nights ?? []}
              locationName={trip.location?.name}
              dateRange={formatDateRange(trip.startDate, trip.endDate)}
              bortleLink={astro?.bortleLink}
            />
          </div>
        )}

        {/* Journal entry — S20: Voice Ghostwriter */}
        {isPast && isSelected && trip.journalEntry && (
          <div
            className="mt-3 border-t border-stone-200 dark:border-stone-700 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <BookOpen size={14} className="text-amber-600 dark:text-amber-400" />
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Journal
              </span>
            </div>
            <p className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed whitespace-pre-wrap">
              {trip.journalEntry}
            </p>
          </div>
        )}

        {/* Post-trip review for past trips (Phase 9 - LEARN-01) */}
        {isPast && isSelected && (
          <div
            className="mt-3 border-t border-stone-200 dark:border-stone-700 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <PostTripReview tripId={trip.id} />
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

        {/* Cost tracking — available for all trips when expanded */}
        {isSelected && (
          <div
            className="mt-3 border-t border-stone-200 dark:border-stone-700 pt-3"
            onClick={(e) => e.stopPropagation()}
          >
            <TripExpenses tripId={trip.id} />
          </div>
        )}
      </div>
    </div>
  )
}
