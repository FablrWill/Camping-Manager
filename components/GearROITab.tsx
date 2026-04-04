'use client'

import { useState, useEffect } from 'react'

interface TripSummary {
  id: string
  name: string
  startDate: string | null
}

interface ROIData {
  price: number | null
  tripCount: number
  costPerTrip: number | null
  trips: TripSummary[]
}

interface GearROITabProps {
  gearItemId: string
  gearName: string
}

function formatDate(iso: string | null): string {
  if (!iso) return 'No date'
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    year: 'numeric',
  })
}

export default function GearROITab({ gearItemId, gearName }: GearROITabProps) {
  const [data, setData] = useState<ROIData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/gear/${gearItemId}/roi`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load ROI data')
        return res.json() as Promise<ROIData>
      })
      .then((result) => {
        setData(result)
      })
      .catch(() => {
        setError('Could not load ROI data')
      })
      .finally(() => {
        setIsLoading(false)
      })
  }, [gearItemId])

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-14 bg-stone-100 dark:bg-stone-800 rounded-lg" />
        <div className="h-8 bg-stone-100 dark:bg-stone-800 rounded-lg w-2/3" />
        <div className="h-24 bg-stone-100 dark:bg-stone-800 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return (
      <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
    )
  }

  if (!data) return null

  // No price set — prompt user to add one
  if (data.price === null) {
    return (
      <div className="rounded-lg bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 p-4 text-center">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Add a purchase price to track ROI for{' '}
          <span className="font-medium text-stone-700 dark:text-stone-300">{gearName}</span>.
        </p>
      </div>
    )
  }

  const showUnderwhelming = data.tripCount < 3 && data.price > 100

  return (
    <div className="space-y-4">
      {/* Hero metric */}
      <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4">
        {data.costPerTrip !== null ? (
          <>
            <p className="text-3xl font-bold text-amber-700 dark:text-amber-400">
              ${data.costPerTrip.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              <span className="text-base font-normal text-amber-600 dark:text-amber-500"> / trip</span>
            </p>
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-400">
              Used on{' '}
              <span className="font-semibold">
                {data.tripCount} {data.tripCount === 1 ? 'trip' : 'trips'}
              </span>
              {' '}— paid ${data.price.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} total
            </p>
          </>
        ) : (
          <>
            <p className="text-3xl font-bold text-stone-400 dark:text-stone-500">—</p>
            <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
              Not packed on any trip yet
            </p>
          </>
        )}
      </div>

      {/* Low-use nudge */}
      {showUnderwhelming && (
        <p className="text-sm text-stone-500 dark:text-stone-400 bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700 px-3 py-2">
          💡 Used on fewer than 3 trips — consider selling or replacing.
        </p>
      )}

      {/* Trip list */}
      {data.trips.length > 0 ? (
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
            Trips packed for
          </p>
          <ul className="space-y-1">
            {data.trips.map((trip) => (
              <li
                key={trip.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-stone-100 dark:border-stone-800 last:border-0"
              >
                <span className="text-stone-800 dark:text-stone-200 font-medium">{trip.name}</span>
                <span className="text-stone-400 dark:text-stone-500 text-xs">{formatDate(trip.startDate)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <p className="text-sm text-stone-400 dark:text-stone-500">
          Not packed on any trips yet.
        </p>
      )}
    </div>
  )
}
