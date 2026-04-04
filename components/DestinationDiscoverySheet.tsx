'use client'

import { useState, useCallback } from 'react'
import { X, Compass, Dog, Loader2 } from 'lucide-react'

interface SuggestionBreakdown {
  weather: number
  recency: number
  seasonal: number
  distance: number
  dogBoost: number
}

interface DestinationSuggestion {
  locationId: string
  name: string
  score: number
  scoreBreakdown: SuggestionBreakdown
  driveHours: number | null
  weatherSummary: string
  weatherEmoji: string
  avgHighF: number | null
  avgPrecipPct: number | null
  reason: string
}

interface Props {
  onClose: () => void
}

function getNextWeekend(): { startDate: string; endDate: string } {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sun, 6 = Sat
  const daysUntilFri = dayOfWeek <= 5 ? 5 - dayOfWeek : 6
  const fri = new Date(today)
  fri.setDate(today.getDate() + daysUntilFri)
  const sun = new Date(fri)
  sun.setDate(fri.getDate() + 2)
  const fmt = (d: Date) => d.toISOString().slice(0, 10)
  return { startDate: fmt(fri), endDate: fmt(sun) }
}

function formatDateRange(startDate: string, endDate: string): string {
  const start = new Date(startDate + 'T12:00:00')
  const end = new Date(endDate + 'T12:00:00')
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' }
  return `${start.toLocaleDateString('en-US', opts)} – ${end.toLocaleDateString('en-US', opts)}`
}

export default function DestinationDiscoverySheet({ onClose }: Props) {
  const defaultDates = getNextWeekend()
  const [startDate, setStartDate] = useState(defaultDates.startDate)
  const [endDate, setEndDate] = useState(defaultDates.endDate)
  const [bringingDog, setBringingDog] = useState(false)
  const [loading, setLoading] = useState(false)
  const [suggestions, setSuggestions] = useState<DestinationSuggestion[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleSearch = useCallback(async () => {
    setLoading(true)
    setError(null)
    setSuggestions(null)

    try {
      const params = new URLSearchParams({
        startDate,
        endDate,
        bringingDog: bringingDog.toString(),
        maxResults: '5',
      })
      const res = await fetch(`/api/destinations/suggest?${params}`)
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        setError((body as { error?: string }).error ?? 'Something went wrong.')
        return
      }
      const data = await res.json() as { suggestions: DestinationSuggestion[] }
      setSuggestions(data.suggestions)
    } catch {
      setError('Failed to fetch suggestions. Check your connection.')
    } finally {
      setLoading(false)
    }
  }, [startDate, endDate, bringingDog])

  const scoreColor = (score: number) => {
    if (score >= 75) return 'text-emerald-600 dark:text-emerald-400'
    if (score >= 50) return 'text-amber-600 dark:text-amber-400'
    return 'text-stone-500 dark:text-stone-400'
  }

  const scoreBg = (score: number) => {
    if (score >= 75) return 'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800'
    if (score >= 50) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800'
    return 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700'
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-stone-900">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <Compass size={20} className="text-amber-600 dark:text-amber-400" />
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
            Where Should I Go?
          </h2>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-lg text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
          aria-label="Close"
        >
          <X size={20} />
        </button>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Date pickers */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-1">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              min={startDate}
              className="w-full rounded-lg border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 px-3 py-2 text-sm"
            />
          </div>
        </div>

        {/* Dog toggle */}
        <button
          onClick={() => setBringingDog((prev) => !prev)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
            bringingDog
              ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-200'
              : 'bg-stone-50 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-600 dark:text-stone-400'
          }`}
        >
          <Dog size={16} />
          Bringing the dog
        </button>

        {/* Search button */}
        <button
          onClick={handleSearch}
          disabled={loading || !startDate || !endDate}
          className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 text-sm transition-colors"
        >
          {loading ? (
            <>
              <Loader2 size={16} className="animate-spin" />
              Scoring your spots...
            </>
          ) : (
            <>
              <Compass size={16} />
              Find Best Spots
            </>
          )}
        </button>

        {/* Error */}
        {error && (
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {/* Results */}
        {suggestions !== null && (
          <div className="space-y-3">
            {suggestions.length === 0 ? (
              <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-4">
                No saved locations found. Add some spots to get recommendations.
              </p>
            ) : (
              <>
                <p className="text-xs text-stone-400 dark:text-stone-500">
                  Best spots for {formatDateRange(startDate, endDate)}
                </p>
                {suggestions.map((suggestion, idx) => (
                  <div
                    key={suggestion.locationId}
                    className={`rounded-xl border p-4 space-y-2 ${scoreBg(suggestion.score)}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className="text-lg shrink-0">{suggestion.weatherEmoji}</span>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {idx === 0 && (
                              <span className="text-xs font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                                Top Pick
                              </span>
                            )}
                            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                              {suggestion.name}
                            </p>
                          </div>
                          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                            {suggestion.weatherSummary}
                            {suggestion.driveHours !== null && ` · ${suggestion.driveHours}h drive`}
                          </p>
                        </div>
                      </div>
                      <span className={`text-lg font-bold shrink-0 ${scoreColor(suggestion.score)}`}>
                        {suggestion.score}
                      </span>
                    </div>
                    <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed">
                      {suggestion.reason}
                    </p>
                    {/* Score breakdown pills */}
                    <div className="flex flex-wrap gap-1.5">
                      <ScorePill label="Weather" value={suggestion.scoreBreakdown.weather} max={40} />
                      <ScorePill label="Rating" value={suggestion.scoreBreakdown.seasonal} max={30} />
                      <ScorePill label="Recency" value={suggestion.scoreBreakdown.recency} max={15} />
                      <ScorePill label="Distance" value={suggestion.scoreBreakdown.distance} max={15} />
                      {suggestion.scoreBreakdown.dogBoost > 0 && (
                        <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                          Dog-friendly
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ScorePill({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = Math.round((value / max) * 100)
  const color =
    pct >= 75
      ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
      : pct >= 40
        ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300'
        : 'bg-stone-100 dark:bg-stone-700 text-stone-500 dark:text-stone-400'
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${color}`}>
      {label} {value}/{max}
    </span>
  )
}
