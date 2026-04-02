'use client'

import { useState, useEffect, useMemo } from 'react'
import { WifiOff } from 'lucide-react'
import { useOnlineStatus } from '@/lib/use-online-status'
import { getCachedTripIds, getTripSnapshot, getSnapshotAge } from '@/lib/offline-storage'
import { getPendingWrites } from '@/lib/offline-write-queue'

export default function OfflineBanner() {
  const isOnline = useOnlineStatus()
  const [snapshotAge, setSnapshotAge] = useState<string | null>(null)
  const [snapshotTimestamp, setSnapshotTimestamp] = useState<string | null>(null)
  const [pendingCount, setPendingCount] = useState(0)

  useEffect(() => {
    if (isOnline) {
      setPendingCount(0)
      return
    }

    async function checkSnapshots() {
      const ids = await getCachedTripIds()
      if (ids.length > 0) {
        const snapshot = await getTripSnapshot(ids[0])
        if (snapshot) {
          setSnapshotAge(getSnapshotAge(snapshot.cachedAt))
          setSnapshotTimestamp(snapshot.cachedAt)
        }
      }
    }

    async function checkQueue() {
      const pending = await getPendingWrites()
      setPendingCount(pending.length)
    }

    checkSnapshots()
    checkQueue()

    // Re-check queue every 5 seconds while offline (cheap IndexedDB read)
    const interval = setInterval(checkQueue, 5000)
    return () => clearInterval(interval)
  }, [isOnline])

  // Computed outside render body to avoid impure Date.now() call during render
  const isStale = useMemo(() => {
    if (!snapshotTimestamp) return false
    return Date.now() - new Date(snapshotTimestamp).getTime() > 24 * 60 * 60 * 1000
  }, [snapshotTimestamp])

  if (isOnline) return null

  return (
    <div className={`border-l-3 border-amber-500 px-3 py-2 flex items-center gap-2 text-sm text-stone-200 transition-all duration-200 ${isStale ? 'bg-stone-800 dark:bg-amber-900/10' : 'bg-stone-800 dark:bg-stone-900'}`}>
      <WifiOff className={`w-3.5 h-3.5 flex-shrink-0 ${isStale ? 'text-amber-400' : ''}`} />
      <span>
        <span className="font-medium">Offline</span>
        {snapshotAge && !isStale && (
          <span className="text-stone-400"> · snapshot from {snapshotAge}</span>
        )}
        {snapshotAge && isStale && (
          <span className="text-amber-400"> · snapshot from {snapshotAge} — weather may have changed</span>
        )}
        {pendingCount > 0 && (
          <span className="text-stone-400"> · {pendingCount} check-off{pendingCount !== 1 ? 's' : ''} pending sync</span>
        )}
      </span>
    </div>
  )
}
