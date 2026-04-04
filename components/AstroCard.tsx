'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, Sunrise, Sunset } from 'lucide-react'
import type { NightAstro } from '@/lib/astro'

interface AstroCardProps {
  nights: NightAstro[]
  loading?: boolean
  error?: string | null
  locationName?: string
  dateRange?: string
  bortleLink?: string
}

function NightBlock({ night, expanded }: { night: NightAstro; expanded: boolean }) {
  const dayLabel = new Date(night.date + 'T12:00:00').toLocaleDateString('en-US', {
    weekday: 'short',
  })

  return (
    <div className="text-center space-y-1">
      {/* Day label */}
      <p className="text-xs uppercase font-medium text-stone-500 dark:text-stone-400">
        {dayLabel}
      </p>

      {/* Moon emoji */}
      <p className="text-2xl leading-none">{night.moonEmoji}</p>

      {/* Moon label */}
      <p className="text-xs text-stone-500 dark:text-stone-400">{night.moonLabel}</p>

      {/* Expanded: sunrise/sunset */}
      {expanded && night.sunrise && (
        <p className="text-xs text-stone-600 dark:text-stone-300 flex items-center justify-center gap-1">
          <Sunrise size={12} />
          {night.sunrise}
        </p>
      )}
      {expanded && night.sunset && (
        <p className="text-xs text-stone-600 dark:text-stone-300 flex items-center justify-center gap-1">
          <Sunset size={12} />
          {night.sunset}
        </p>
      )}

      {/* Per-night stars badge (always shown) */}
      {night.goodForStars ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5">
          ★ Good
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-xs font-medium bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 rounded-full px-2 py-0.5">
          Poor
        </span>
      )}
    </div>
  )
}

export default function AstroCard({
  nights,
  loading = false,
  error = null,
  locationName,
  dateRange,
  bortleLink,
}: AstroCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (loading) {
    return (
      <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-indigo-200 dark:bg-indigo-800 rounded w-1/3" />
          <div className="grid grid-cols-3 gap-2">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-16 bg-indigo-200 dark:bg-indigo-800 rounded" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load astro data. Check your connection and try again.
        </p>
      </div>
    )
  }

  if (nights.length === 0) return null

  const goodNights = nights.filter((n) => n.goodForStars).length
  const hasNoLocation = !bortleLink && nights.every((n) => !n.sunrise && !n.sunset)

  return (
    <div className="bg-indigo-50 dark:bg-indigo-950/30 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
            🌙 Night Sky
          </h3>
          {(locationName || dateRange) && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {[locationName, dateRange].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          aria-label={expanded ? 'Hide astro details' : 'Show astro details'}
          className="p-2 -m-2"
        >
          {expanded ? (
            <ChevronUp size={18} className="text-stone-400 dark:text-stone-500" />
          ) : (
            <ChevronDown size={18} className="text-stone-400 dark:text-stone-500" />
          )}
        </button>
      </div>

      {/* Per-night grid */}
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 text-center">
        {nights.map((night) => (
          <NightBlock key={night.date} night={night} expanded={expanded} />
        ))}
      </div>

      {/* Trip-level summary */}
      <p className="text-xs text-stone-400 dark:text-stone-500">
        {goodNights} of {nights.length} nights good for stars
      </p>

      {/* Bortle link */}
      {bortleLink && (
        <a
          href={bortleLink}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400 hover:underline"
        >
          Check light pollution <ExternalLink size={12} />
        </a>
      )}

      {/* No-location note */}
      {hasNoLocation && (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          Add a location to see sunrise/sunset times
        </p>
      )}
    </div>
  )
}
