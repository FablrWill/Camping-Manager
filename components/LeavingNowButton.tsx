'use client'

import { useState, useEffect, useCallback } from 'react'
import { Tent, RefreshCw } from 'lucide-react'
import { cacheTripData, CACHE_STEPS, type CacheStep, type StepStatus } from '@/lib/cache-trip'
import { getTripSnapshot, getSnapshotAge } from '@/lib/offline-storage'
import CachingProgressOverlay from './CachingProgressOverlay'

interface LeavingNowButtonProps {
  tripId: string
  tripName: string
  dateRange: string
  emergencyContact: { name: string | null; email: string | null }
  /** Trip destination coordinates for tile prefetch. If undefined, tiles step is skipped gracefully. */
  tripCoords?: { lat: number; lon: number }
}

function initialStatuses(): Record<CacheStep, StepStatus> {
  return Object.fromEntries(CACHE_STEPS.map((s) => [s, 'pending' as StepStatus])) as Record<CacheStep, StepStatus>
}

export default function LeavingNowButton({
  tripId,
  tripName,
  dateRange,
  emergencyContact,
  tripCoords,
}: LeavingNowButtonProps) {
  const [showOverlay, setShowOverlay] = useState(false)
  const [stepStatuses, setStepStatuses] = useState<Record<CacheStep, StepStatus>>(initialStatuses)
  const [cachedAge, setCachedAge] = useState<string | null>(null)

  useEffect(() => {
    async function checkCache() {
      const snapshot = await getTripSnapshot(tripId)
      if (snapshot) {
        setCachedAge(getSnapshotAge(snapshot.cachedAt))
      }
    }
    checkCache()
  }, [tripId])

  const handleLeaveNow = useCallback(async () => {
    setStepStatuses(initialStatuses())
    setShowOverlay(true)
    await cacheTripData(tripId, emergencyContact, (step, status) => {
      setStepStatuses((prev) => ({ ...prev, [step]: status }))
    }, tripCoords)
    const snapshot = await getTripSnapshot(tripId)
    if (snapshot) {
      setCachedAge(getSnapshotAge(snapshot.cachedAt))
    }
  }, [tripId, emergencyContact, tripCoords])

  if (cachedAge) {
    return (
      <>
        <button
          onClick={handleLeaveNow}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-stone-200 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-xl text-sm font-medium hover:bg-stone-300 dark:hover:bg-stone-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Update Cache · {cachedAge}
        </button>
        {showOverlay && (
          <CachingProgressOverlay
            tripName={tripName}
            dateRange={dateRange}
            stepStatuses={stepStatuses}
            onDone={() => setShowOverlay(false)}
          />
        )}
      </>
    )
  }

  return (
    <>
      <button
        onClick={handleLeaveNow}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-xl text-base transition-colors"
      >
        <Tent className="w-5 h-5" />
        Leave Now — Cache Trip Data
      </button>
      {showOverlay && (
        <CachingProgressOverlay
          tripName={tripName}
          dateRange={dateRange}
          stepStatuses={stepStatuses}
          onDone={() => setShowOverlay(false)}
        />
      )}
    </>
  )
}
