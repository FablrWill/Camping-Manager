'use client'

import { useState, useCallback } from 'react'
import { ClipboardList, Home, Flame, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface BeforeLeaveStep {
  step: string
  meals: string[]
}

interface AtCampStep {
  day: number
  mealSlot: string
  steps: string[]
}

interface PrepGuide {
  beforeLeave: BeforeLeaveStep[]
  atCamp: AtCampStep[]
}

interface PrepGuideClientProps {
  tripId: string
  initialPrepGuide: PrepGuide | null
}

export default function PrepGuideClient({ tripId, initialPrepGuide }: PrepGuideClientProps) {
  const [prepGuide, setPrepGuide] = useState<PrepGuide | null>(initialPrepGuide)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/meal-plan/prep-guide`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        setError("Couldn't generate your prep guide — tap Retry to try again.")
        return
      }
      const data = await res.json() as { prepGuide: PrepGuide }
      setPrepGuide(data.prepGuide)
    } catch {
      setError("Couldn't generate your prep guide — tap Retry to try again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  // Generating state
  if (generating) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Claude is writing your prep guide...
          </span>
        </div>
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-8 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (!prepGuide) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <ClipboardList size={24} className="text-stone-300" />
        <div>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            No prep guide yet
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Generate a step-by-step guide for what to prep before you leave and what to cook at camp.
          </p>
        </div>
        {error && (
          <p className="text-xs text-red-600 dark:text-red-400">
            {error}{' '}
            <button
              onClick={() => { setError(null); void handleGenerate() }}
              className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Retry
            </button>
          </p>
        )}
        <Button variant="primary" size="sm" onClick={() => void handleGenerate()}>
          Generate Prep Guide
        </Button>
      </div>
    )
  }

  // Guide rendered state
  return (
    <div className="px-4 pb-4 space-y-6">
      {error && (
        <p className="pt-3 text-xs text-red-600 dark:text-red-400">
          {error}{' '}
          <button
            onClick={() => { setError(null); void handleGenerate() }}
            className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            Retry
          </button>
        </p>
      )}

      {/* Before You Leave section */}
      {prepGuide.beforeLeave.length > 0 && (
        <div>
          <div className="flex items-center justify-between pt-4 pb-2">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Home size={14} className="text-amber-500 shrink-0" />
              Before You Leave
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void handleGenerate()}
              icon={<RotateCcw size={12} />}
            >
              Regenerate Guide
            </Button>
          </div>
          <ol className="space-y-2">
            {prepGuide.beforeLeave.map((step, idx) => (
              <li key={idx} className="flex gap-3 py-1">
                <span className="text-xs text-stone-400 font-mono w-5 shrink-0 pt-0.5">
                  {idx + 1}.
                </span>
                <div>
                  <p className="text-sm text-stone-700 dark:text-stone-300">{step.step}</p>
                  {step.meals.length > 0 && (
                    <p className="text-xs text-stone-400 mt-0.5">
                      For: {step.meals.join(', ')}
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* At Camp section */}
      {prepGuide.atCamp.length > 0 && (
        <div>
          <div className="flex items-center pt-2 pb-2">
            <h4 className="text-sm font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
              <Flame size={14} className="text-amber-500 shrink-0" />
              At Camp
            </h4>
          </div>
          <div className="space-y-4">
            {prepGuide.atCamp.map((entry, idx) => (
              <div key={idx}>
                <p className="text-xs text-amber-600 dark:text-amber-400 font-medium mb-1">
                  Day {entry.day} · {entry.mealSlot.charAt(0).toUpperCase() + entry.mealSlot.slice(1)}
                </p>
                <ol className="space-y-1.5">
                  {entry.steps.map((step, stepIdx) => (
                    <li key={stepIdx} className="flex gap-3">
                      <span className="text-xs text-stone-400 font-mono w-5 shrink-0 pt-0.5">
                        {stepIdx + 1}.
                      </span>
                      <p className="text-sm text-stone-700 dark:text-stone-300">{step}</p>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Regenerate at bottom if no beforeLeave section shown header */}
      {prepGuide.beforeLeave.length === 0 && (
        <div className="flex justify-end pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleGenerate()}
            icon={<RotateCcw size={12} />}
          >
            Regenerate Guide
          </Button>
        </div>
      )}
    </div>
  )
}
