'use client'

import { useState } from 'react'
import { Droplets, Wind, Sun, ChevronDown, ChevronUp } from 'lucide-react'
import type { DayForecast, WeatherAlert } from '@/lib/weather'

interface WeatherCardProps {
  days: DayForecast[]
  alerts: WeatherAlert[]
  locationName?: string
  dateRange?: string
  elevation?: number
  loading?: boolean
  error?: string | null
}

function AlertStrip({ alert }: { alert: WeatherAlert }) {
  const isWarning = alert.severity === 'warning'
  return (
    <div
      className={`
        border-l-4 px-3 py-2 text-sm rounded-r-lg
        ${isWarning
          ? 'bg-red-50 dark:bg-red-950/30 border-red-500 text-red-800 dark:text-red-200'
          : 'bg-amber-50 dark:bg-amber-950/30 border-amber-500 text-amber-800 dark:text-amber-200'
        }
      `}
    >
      {alert.message}
    </div>
  )
}

function DayBlock({ day, expanded }: { day: DayForecast; expanded: boolean }) {
  return (
    <div className="text-center space-y-1">
      {/* Day label */}
      <p className="text-xs text-stone-500 dark:text-stone-400 uppercase font-medium">
        {day.dayLabel}
      </p>

      {/* Weather emoji */}
      <p className="text-2xl leading-none">{day.weatherEmoji}</p>

      {/* High / Low */}
      <p className="text-base">
        <span className="font-semibold text-stone-900 dark:text-stone-50">
          {day.highF}°
        </span>
        <span className="text-stone-400 dark:text-stone-500 mx-0.5">/</span>
        <span className="text-stone-400 dark:text-stone-500">
          {day.lowF}°
        </span>
      </p>

      {/* Precip (only if >20%) */}
      {day.precipProbability > 20 && (
        <p className="text-xs text-sky-600 dark:text-sky-400 flex items-center justify-center gap-0.5">
          <Droplets size={10} />
          {day.precipProbability}%
        </p>
      )}

      {/* Expanded details */}
      {expanded && (
        <div className="text-xs text-stone-500 dark:text-stone-400 space-y-0.5 pt-1 border-t border-stone-200 dark:border-stone-700">
          <p className="flex items-center justify-center gap-1">
            <Wind size={10} />
            {day.windMaxMph} mph
            {day.windGustMph > day.windMaxMph && (
              <span className="text-stone-400 dark:text-stone-500">
                (g{day.windGustMph})
              </span>
            )}
          </p>
          <p className="flex items-center justify-center gap-1">
            <Sun size={10} />
            UV {day.uvIndexMax}
          </p>
          <p>{day.weatherLabel}</p>
          <p className="text-stone-400 dark:text-stone-500">
            {day.sunrise} – {day.sunset}
          </p>
        </div>
      )}
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 p-4">
      <div className="animate-pulse space-y-3">
        <div className="h-4 bg-sky-200 dark:bg-sky-800 rounded w-32" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="h-3 bg-sky-200 dark:bg-sky-800 rounded w-8 mx-auto" />
              <div className="h-8 bg-sky-200 dark:bg-sky-800 rounded w-8 mx-auto" />
              <div className="h-4 bg-sky-200 dark:bg-sky-800 rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function WeatherCard({
  days,
  alerts,
  locationName,
  dateRange,
  elevation,
  loading = false,
  error = null,
}: WeatherCardProps) {
  const [expanded, setExpanded] = useState(false)

  if (loading) return <LoadingSkeleton />

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">
          Failed to load weather: {error}
        </p>
      </div>
    )
  }

  if (days.length === 0) return null

  return (
    <div className="bg-sky-50 dark:bg-sky-950/30 rounded-xl border border-sky-200 dark:border-sky-800 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50 flex items-center gap-1.5">
            🌤 Weather
          </h3>
          {(locationName || dateRange) && (
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              {[locationName, dateRange].filter(Boolean).join(' · ')}
              {elevation != null && ` · ${Math.round(elevation * 3.281)}ft`}
            </p>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="p-1.5 text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          aria-label={expanded ? 'Show less weather details' : 'Show more weather details'}
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Day grid — responsive: 2 cols on tiny, auto-fit on larger */}
      <div
        className="grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${Math.min(days.length, 7)}, minmax(0, 1fr))`,
        }}
      >
        {days.map((day) => (
          <DayBlock key={day.date} day={day} expanded={expanded} />
        ))}
      </div>

      {/* Alerts */}
      {alerts.length > 0 && (
        <div className="space-y-2 pt-1">
          {alerts.map((alert, i) => (
            <AlertStrip key={i} alert={alert} />
          ))}
        </div>
      )}
    </div>
  )
}
