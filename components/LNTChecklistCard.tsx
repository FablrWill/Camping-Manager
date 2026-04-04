'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button, EmptyState } from '@/components/ui'
import { ConfirmDialog } from '@/components/ui/Modal'
import type { LNTChecklistResult } from '@/lib/parse-claude'

interface LNTChecklistCardProps {
  tripId: string
}

export default function LNTChecklistCard({ tripId }: LNTChecklistCardProps) {
  const [checklist, setChecklist] = useState<LNTChecklistResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    async function fetchChecklist() {
      try {
        const res = await fetch(`/api/trips/${tripId}/lnt`)
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
  }, [tripId])

  const handleGenerate = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/lnt`, {
        method: 'POST',
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
      fetch(`/api/trips/${tripId}/lnt/check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked }),
      }).catch(() => {})
    },
    [tripId]
  )

  // State: loading (generating)
  if (loading) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Claude is building your LNT checklist...
        </p>
        {Array.from({ length: 7 }).map((_, i) => (
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
        emoji="🌿"
        title="No checklist yet"
        description="Generate a location-specific Leave No Trace checklist for this trip."
        action={{
          label: 'Generate Pack-Out Checklist',
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
            {allDone ? (
              <span className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
                Camp left clean ✓
              </span>
            ) : (
              <span className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                {checkedCount} of {totalCount} items done
              </span>
            )}
            <span className="text-sm text-stone-400 dark:text-stone-500">
              {progressPct}%
            </span>
          </div>
          <div className="bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className={`rounded-full h-2 transition-all duration-300 ${
                allDone
                  ? 'bg-emerald-500 dark:bg-emerald-500'
                  : 'bg-amber-500 dark:bg-amber-500'
              }`}
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

      {/* Generated at + regenerate */}
      <div className="flex items-center justify-between pt-1">
        {generatedAt && (
          <span className="text-xs text-stone-400 dark:text-stone-500">
            Generated {new Date(generatedAt).toLocaleDateString()}
          </span>
        )}
        <Button variant="ghost" size="sm" onClick={handleRegenerate}>
          Regenerate
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
        title="Regenerate LNT Checklist?"
        message="This will replace your current checklist. Your check-off progress will be lost."
        confirmLabel="Regenerate"
        confirmVariant="primary"
      />
    </div>
  )
}
