'use client'

import { useEffect } from 'react'
import { CheckCircle2, Loader2, AlertCircle, Circle } from 'lucide-react'
import { CACHE_STEPS, CACHE_STEP_LABELS, type CacheStep, type StepStatus } from '@/lib/cache-trip'

interface CachingProgressOverlayProps {
  tripName: string
  dateRange: string
  stepStatuses: Record<CacheStep, StepStatus>
  onDone: () => void
}

function renderStepIcon(status: StepStatus) {
  switch (status) {
    case 'pending':
      return <Circle className="w-4 h-4 text-stone-600" />
    case 'loading':
      return <Loader2 className="w-4 h-4 text-amber-400 animate-spin" />
    case 'done':
      return <CheckCircle2 className="w-4 h-4 text-emerald-400" />
    case 'error':
      return <AlertCircle className="w-4 h-4 text-red-400" />
  }
}

export default function CachingProgressOverlay({
  tripName,
  dateRange,
  stepStatuses,
  onDone,
}: CachingProgressOverlayProps) {
  const completedCount = CACHE_STEPS.filter(
    (s) => stepStatuses[s] === 'done' || stepStatuses[s] === 'error'
  ).length
  const progressPercent = Math.round((completedCount / CACHE_STEPS.length) * 100)
  const allComplete = CACHE_STEPS.every(
    (s) => stepStatuses[s] === 'done' || stepStatuses[s] === 'error'
  )

  useEffect(() => {
    if (!allComplete) return
    const timer = setTimeout(onDone, 1500)
    return () => clearTimeout(timer)
  }, [allComplete, onDone])

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-stone-900 rounded-2xl p-6 w-full max-w-sm">
        <h2 className="text-lg font-bold text-stone-50">Caching your trip</h2>
        <p className="text-sm text-stone-400 mt-1">
          {tripName} · {dateRange}
        </p>

        {/* Progress bar */}
        <div className="mt-4 h-2 bg-stone-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-amber-500 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-xs text-stone-400 mt-1 text-right">{progressPercent}%</p>

        {/* Step list */}
        <div className="mt-4 space-y-1">
          {CACHE_STEPS.map((step) => (
            <div key={step} className="flex items-center gap-3 h-11 px-2 rounded">
              {renderStepIcon(stepStatuses[step])}
              <span className="text-sm text-stone-300">{CACHE_STEP_LABELS[step]}</span>
            </div>
          ))}
        </div>

        {/* Done button */}
        {allComplete && (
          <button
            onClick={onDone}
            className="mt-4 w-full py-3 bg-amber-600 hover:bg-amber-500 text-white font-medium rounded-lg transition-colors"
          >
            Done — you&apos;re ready to go
          </button>
        )}
      </div>
    </div>
  )
}
