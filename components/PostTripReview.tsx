'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'
import type { PackingListResult } from '@/lib/claude'
import type { TripSummaryResult } from '@/lib/parse-claude'
import { safeJsonParse } from '@/lib/safe-json'

interface PostTripReviewProps {
  tripId: string
}

type UsageStatus = 'used' | "didn't need" | 'forgot but needed' | null

const STATUS_OPTIONS: { value: UsageStatus; label: string; selectedClass: string }[] = [
  {
    value: 'used',
    label: 'Used',
    selectedClass:
      'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700',
  },
  {
    value: "didn't need",
    label: "Didn't Need",
    selectedClass:
      'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400 border border-stone-300 dark:border-stone-600',
  },
  {
    value: 'forgot but needed',
    label: 'Forgot',
    selectedClass:
      'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-300 dark:border-red-700',
  },
]

export default function PostTripReview({ tripId }: PostTripReviewProps) {
  const [packingList, setPackingList] = useState<PackingListResult | null>(null)
  const [usageMap, setUsageMap] = useState<Record<string, UsageStatus>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<TripSummaryResult | null>(null)
  const [summaryExists, setSummaryExists] = useState(false)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [summaryError, setSummaryError] = useState<string | null>(null)
  const generatingRef = useRef(false)

  useEffect(() => {
    async function loadData() {
      try {
        // Load packing list + usage state
        const res = await fetch(`/api/packing-list?tripId=${tripId}`)
        if (!res.ok) throw new Error('Failed to load packing list')
        const data = await res.json()
        setPackingList(data.result)
        if (data.usageState) {
          setUsageMap(data.usageState as Record<string, UsageStatus>)
        }

        // Load existing summary from feedback API
        const feedbackRes = await fetch(`/api/trips/${tripId}/feedback`)
        if (feedbackRes.ok) {
          const feedbackData = await feedbackRes.json()
          if (feedbackData.feedback?.summary) {
            const parsed = safeJsonParse<TripSummaryResult>(feedbackData.feedback.summary)
            if (parsed) {
              setSummary(parsed)
              setSummaryExists(true)
            }
          }
        }
      } catch (err) {
        console.error('PostTripReview load error:', err)
        setError('Failed to load packing list data.')
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [tripId])

  const generateSummary = useCallback(async () => {
    if (generatingRef.current) return
    generatingRef.current = true
    setSummaryLoading(true)
    setSummaryError(null)

    try {
      const res = await fetch(`/api/trips/${tripId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || 'Failed to generate trip summary')
      }
      const data = await res.json()
      if (data.feedback?.summary) {
        const parsed = safeJsonParse<TripSummaryResult>(data.feedback.summary)
        if (parsed) {
          setSummary(parsed)
          setSummaryExists(true)
        } else {
          setSummaryError('Trip summary data could not be loaded.')
        }
      }
    } catch (err) {
      console.error('Failed to generate trip summary:', err)
      setSummaryError(err instanceof Error ? err.message : 'Failed to generate trip summary')
    } finally {
      setSummaryLoading(false)
      generatingRef.current = false
    }
  }, [tripId])

  const handleStatusTap = useCallback(
    async (gearId: string, usageStatus: UsageStatus) => {
      const prev = usageMap[gearId] ?? null
      // Tapping the same status deselects (sets to null)
      const newStatus = prev === usageStatus ? null : usageStatus

      // Optimistic update
      setUsageMap((m) => ({ ...m, [gearId]: newStatus }))

      try {
        const res = await fetch(`/api/trips/${tripId}/usage`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gearId, usageStatus: newStatus }),
        })
        if (!res.ok) throw new Error('PATCH failed')
      } catch (err) {
        console.error('Failed to save usage status:', err)
        // Revert on failure
        setUsageMap((m) => ({ ...m, [gearId]: prev }))
      }
    },
    [tripId, usageMap]
  )

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500 py-2">
        <Loader2 size={14} className="animate-spin" />
        <span>Loading review...</span>
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-500 dark:text-red-400 py-2">{error}</p>
  }

  if (!packingList) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500">
        No packing list was generated for this trip.
      </p>
    )
  }

  // Collect all inventory items (fromInventory=true with gearId) for completion tracking
  const inventoryItems = packingList.categories.flatMap((cat) =>
    cat.items.filter((item) => item.fromInventory && item.gearId)
  )
  const totalCount = inventoryItems.length
  const completedCount = inventoryItems.filter(
    (item) => item.gearId && usageMap[item.gearId] !== null && usageMap[item.gearId] !== undefined
  ).length
  const allComplete = totalCount > 0 && completedCount === totalCount

  // Auto-generate when all items reviewed (per D-03)
  if (allComplete && !summaryExists && !summaryLoading && !generatingRef.current) {
    generateSummary()
  }

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Post-Trip Review
        </h4>
        {totalCount > 0 && (
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              allComplete
                ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
            }`}
          >
            {completedCount} / {totalCount} reviewed
          </span>
        )}
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {packingList.categories.map((category) => {
          const categoryItems = category.items
          if (categoryItems.length === 0) return null

          return (
            <div key={category.name}>
              <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                {category.name}
              </p>
              <div className="space-y-2">
                {categoryItems.map((item, i) => {
                  if (!item.fromInventory || !item.gearId) {
                    // Non-inventory item: display only
                    return (
                      <div
                        key={`${category.name}-${i}`}
                        className="text-sm text-stone-500 dark:text-stone-400 py-1"
                      >
                        {item.name}
                        <span className="ml-1.5 text-xs text-stone-400 dark:text-stone-600">
                          (not in inventory)
                        </span>
                      </div>
                    )
                  }

                  const gearId = item.gearId
                  const currentStatus = usageMap[gearId] ?? null

                  return (
                    <div
                      key={`${category.name}-${i}`}
                      className="flex items-center justify-between gap-2"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <span className="text-sm text-stone-700 dark:text-stone-300 flex-1 min-w-0 truncate">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        {STATUS_OPTIONS.map((option) => {
                          const isSelected = currentStatus === option.value
                          return (
                            <button
                              key={option.value}
                              onClick={() => handleStatusTap(gearId, option.value)}
                              className={`px-2 py-1 text-xs rounded-md font-medium transition-colors ${
                                isSelected
                                  ? option.selectedClass
                                  : 'border border-stone-200 dark:border-stone-700 text-stone-400 dark:text-stone-500 hover:border-stone-300 dark:hover:border-stone-600 hover:text-stone-600 dark:hover:text-stone-400'
                              }`}
                            >
                              {option.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary loading indicator */}
      {summaryLoading && (
        <div className="mt-4 p-4 bg-stone-50 dark:bg-stone-800/50 rounded-lg text-center">
          <p className="text-sm text-stone-500 dark:text-stone-400 animate-pulse">
            Generating trip debrief...
          </p>
        </div>
      )}

      {/* Summary error with retry */}
      {summaryError && !summaryLoading && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="text-sm text-red-600 dark:text-red-400">{summaryError}</p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={generateSummary}>
            Retry
          </Button>
        </div>
      )}

      {/* Trip Debrief summary card */}
      {summary && !summaryLoading && (
        <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
          <h4 className="font-semibold text-stone-900 dark:text-stone-50 mb-2">Trip Debrief</h4>
          <p className="text-sm text-stone-600 dark:text-stone-300 mb-3">{summary.summary}</p>

          {summary.whatToDrop.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase">
                Drop next time:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {summary.whatToDrop.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-400 px-2 py-0.5 rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.whatWasMissing.length > 0 && (
            <div className="mb-2">
              <span className="text-xs font-medium text-red-500 dark:text-red-400 uppercase">
                Add next time:
              </span>
              <div className="flex flex-wrap gap-1 mt-1">
                {summary.whatWasMissing.map((item, i) => (
                  <span
                    key={i}
                    className="text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 px-2 py-0.5 rounded"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          )}

          {summary.locationRating !== null && (
            <div className="text-xs text-stone-500 dark:text-stone-400">
              Suggested location rating: {summary.locationRating}/5
            </div>
          )}
        </div>
      )}
    </div>
  )
}
