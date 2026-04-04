'use client'

import { useState, useEffect } from 'react'
import type { ScenicStop, ScenicStopType } from '@/lib/overpass'

interface ScenicStopsCardProps {
  tripId: string
}

const TYPE_EMOJI: Record<ScenicStopType, string> = {
  viewpoint: '🏞️',
  waterfall: '💧',
  attraction: '⭐',
  historic: '🏛️',
  nature: '🌿',
}

const TYPE_LABEL: Record<ScenicStopType, string> = {
  viewpoint: 'Viewpoint',
  waterfall: 'Waterfall',
  attraction: 'Attraction',
  historic: 'Historic',
  nature: 'Nature Reserve',
}

function osmUrl(lat: number, lon: number): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}&zoom=15`
}

export default function ScenicStopsCard({ tripId }: ScenicStopsCardProps) {
  const [stops, setStops] = useState<ScenicStop[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetch(`/api/trips/${tripId}/scenic-stops`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.json()
      })
      .then((data: { stops: ScenicStop[] }) => {
        setStops(data.stops)
      })
      .catch(() => {
        setError('Could not load scenic stops')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [tripId])

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-50 mb-3">🏞️ Scenic &amp; POI Nearby</h3>

      {loading && (
        <div role="status" aria-label="Loading scenic stops" className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="h-4 w-4 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-4 w-40 animate-pulse bg-stone-200 dark:bg-stone-700 rounded" />
              <div className="h-3 w-12 animate-pulse bg-stone-200 dark:bg-stone-700 rounded ml-auto" />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <div role="alert" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-sm font-semibold text-red-600 dark:text-red-400">Could not load scenic stops</p>
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Check your connection and reload the page.</p>
        </div>
      )}

      {!loading && !error && stops.length === 0 && (
        <p className="text-sm text-stone-500 dark:text-stone-400 italic">No scenic stops found nearby</p>
      )}

      {!loading && !error && stops.length > 0 && (
        <div className="space-y-1.5">
          {stops.map((stop, i) => (
            <a
              key={i}
              href={osmUrl(stop.lat, stop.lon)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 rounded-lg px-1 py-0.5 -mx-1 hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors group"
            >
              <span className="text-base leading-none" title={TYPE_LABEL[stop.type]}>{TYPE_EMOJI[stop.type]}</span>
              <span className="text-sm text-stone-900 dark:text-stone-50 flex-1 truncate group-hover:text-amber-600 dark:group-hover:text-amber-400">
                {stop.name}
              </span>
              <span className="text-xs text-stone-500 dark:text-stone-400 shrink-0">
                {stop.distanceMiles.toFixed(1)} mi
              </span>
            </a>
          ))}
        </div>
      )}
    </div>
  )
}
