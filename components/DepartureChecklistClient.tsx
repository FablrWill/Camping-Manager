'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState, PageHeader } from '@/components/ui'
import DepartureChecklistItem from '@/components/DepartureChecklistItem'
import type { DepartureChecklistResult } from '@/lib/parse-claude'
import { formatDateRange } from '@/lib/trip-utils'

interface DepartureChecklistClientProps {
  tripId: string
  tripName: string
  startDate: string
  endDate: string
}

export default function DepartureChecklistClient({
  tripId,
  tripName,
  startDate,
  endDate,
}: DepartureChecklistClientProps) {
  const [checklist, setChecklist] = useState<DepartureChecklistResult | null>(null)
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  // Load saved checklist on mount
  useEffect(() => {
    async function loadSaved() {
      try {
        const res = await fetch(`/api/departure-checklist?tripId=${tripId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.result) {
            setChecklist(data.result)
            setChecklistId(data.id)
          }
        }
      } catch {
        // Silent fail on load — user can generate fresh
      }
    }
    loadSaved()
  }, [tripId])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/departure-checklist', {
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
      setChecklistId(data.id)
    } catch {
      setError("Couldn't generate checklist — tap Try Again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const handleRegenerate = useCallback(() => {
    setShowRegenConfirm(true)
  }, [])

  const handleCheck = useCallback(
    (itemId: string, checked: boolean) => {
      if (!checklistId) return

      // Optimistic update
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          slots: prev.slots.map((slot) => ({
            ...slot,
            items: slot.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          })),
        }
      })

      // Fire-and-forget PATCH
      fetch(`/api/departure-checklist/${checklistId}/check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked }),
      }).catch(() => {})
    },
    [checklistId]
  )

  // Progress calculation
  const totalItems = checklist
    ? checklist.slots.reduce((sum, slot) => sum + slot.items.length, 0)
    : 0
  const checkedItems = checklist
    ? checklist.slots.reduce(
        (sum, slot) => sum + slot.items.filter((i) => i.checked).length,
        0
      )
    : 0
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  const dateRange = formatDateRange(startDate, endDate)

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back link */}
      <Link
        href={`/trips/${tripId}/prep`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to prep
      </Link>

      {/* Page header */}
      <PageHeader title={tripName} subtitle={dateRange} />

      {/* Progress bar */}
      {checklist && totalItems > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {checkedItems} of {totalItems} tasks done
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

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state — no checklist yet */}
      {!checklist && !generating && !error && (
        <EmptyState
          emoji="📋"
          title="No checklist yet"
          description="Generate a departure checklist from your trip's packing list, meals, and power data."
          action={{
            label: 'Generate Checklist',
            onClick: handleGenerate,
          }}
        />
      )}

      {/* Generating — skeleton loading */}
      {generating && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Claude is building your checklist...
          </p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-5 w-48" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-10 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Checklist slots */}
      {checklist && !generating && (
        <div className="space-y-6">
          {checklist.slots.map((slot) => (
            <div key={slot.label}>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50 mb-2">
                {slot.label}
              </h2>
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                {slot.items.map((item) => (
                  <DepartureChecklistItem
                    key={item.id}
                    item={item}
                    onCheck={handleCheck}
                  />
                ))}
              </div>
            </div>
          ))}

          {/* Regenerate button */}
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={handleRegenerate}>
              Regenerate Checklist
            </Button>
          </div>
        </div>
      )}

      {/* Float plan send button — added in Plan 03 */}
      <div id="float-plan-area" />

      {/* Regenerate confirmation */}
      <ConfirmDialog
        open={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={() => {
          setShowRegenConfirm(false)
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
