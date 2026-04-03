'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, EmptyState } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/Modal'
import type { VehicleChecklistResult } from '@/lib/parse-claude'

interface VehicleChecklistCardProps {
  tripId: string
  hasVehicle: boolean
}

export default function VehicleChecklistCard({ tripId, hasVehicle }: VehicleChecklistCardProps) {
  const [checklist, setChecklist] = useState<VehicleChecklistResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    if (!hasVehicle) return
    async function fetchChecklist() {
      try {
        const res = await fetch(`/api/vehicle-checklist?tripId=${tripId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.result) {
            setChecklist(data.result)
            setGeneratedAt(data.generatedAt ?? null)
          }
        }
      } catch {
        // Silent fail on load — user can generate fresh
      }
    }
    fetchChecklist()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, hasVehicle])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/vehicle-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't generate checklist — tap Try Again.")
        return
      }
      const data = await res.json()
      setChecklist(data.result)
      setGeneratedAt(data.generatedAt ?? null)
    } catch {
      setError("Couldn't generate checklist — tap Try Again.")
    } finally {
      setLoading(false)
    }
  }, [tripId])

  const handleRegenerate = useCallback(() => {
    setShowConfirm(true)
  }, [])

  const handleCheck = useCallback(
    (itemId: string, checked: boolean) => {
      // Optimistic update
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          items: prev.items.map((item) =>
            item.id === itemId ? { ...item, checked } : item
          ),
        }
      })

      // Fire-and-forget PATCH
      fetch(`/api/vehicle-checklist/${tripId}/check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked }),
      }).catch(() => {})
    },
    [tripId]
  )

  // State: no vehicle assigned
  if (!hasVehicle) {
    return (
      <EmptyState
        emoji="🚙"
        title="No vehicle assigned"
        description="Assign a vehicle to this trip to generate a pre-trip checklist."
      />
    )
  }

  // State: loading (generating)
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Claude is building your checklist...
        </p>
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-10 w-full"
          />
        ))}
      </div>
    )
  }

  // State: error
  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
        <button
          onClick={handleGenerate}
          className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
        >
          Try Again
        </button>
      </div>
    )
  }

  // State: no checklist yet
  if (!checklist) {
    return (
      <EmptyState
        emoji="📋"
        title="No checklist yet"
        description="Generate a pre-trip checklist tailored to your vehicle and trip."
        action={{
          label: 'Generate Vehicle Checklist',
          onClick: handleGenerate,
        }}
      />
    )
  }

  // State: loaded
  const totalCount = checklist.items.length
  const checkedCount = checklist.items.filter((i) => i.checked).length
  const progressPct = totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0
  const allDone = totalCount > 0 && checkedCount === totalCount

  return (
    <div className="space-y-3">
      {/* Progress bar */}
      {totalCount > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
              {allDone ? `All ${totalCount} items done` : `${checkedCount} of ${totalCount} items done`}
            </span>
            <span className="text-sm text-stone-400 dark:text-stone-500">
              {progressPct}%
            </span>
          </div>
          <div className="bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className="bg-amber-600 dark:bg-amber-500 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Checklist items */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
        {checklist.items.map((item) => (
          <label
            key={item.id}
            className="flex items-center gap-3 px-4 min-h-[44px] cursor-pointer"
          >
            <input
              type="checkbox"
              checked={item.checked}
              onChange={(e) => handleCheck(item.id, e.target.checked)}
              className="shrink-0 accent-amber-600 w-4 h-4"
            />
            <span
              className={`text-sm flex-1 py-3 ${
                item.checked
                  ? 'line-through text-stone-400 dark:text-stone-500'
                  : 'text-stone-900 dark:text-stone-50'
              }`}
            >
              {item.text}
            </span>
          </label>
        ))}
      </div>

      {/* Regenerate button */}
      <div className="pt-1">
        <Button variant="ghost" size="sm" onClick={handleRegenerate}>
          Regenerate Checklist
        </Button>
      </div>

      {/* Regenerate confirmation dialog */}
      <ConfirmDialog
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={() => {
          setShowConfirm(false)
          handleGenerate()
        }}
        title="Regenerate Checklist?"
        message="This will replace your current checklist. Your check-off progress will be lost."
        confirmLabel="Regenerate Checklist"
        confirmVariant="primary"
      />
    </div>
  )
}
