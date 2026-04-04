'use client'

import { useRouter } from 'next/navigation'
import { Check } from 'lucide-react'

interface PrepStep {
  label: string
  complete: boolean
}

interface TripPrepStepperProps {
  tripId: string
  steps: PrepStep[]
}

export default function TripPrepStepper({ tripId, steps }: TripPrepStepperProps) {
  const router = useRouter()

  const handleStepClick = () => {
    router.push(`/trips/${tripId}/prep`)
  }

  // Find the index of the first incomplete step (the "active" step)
  const activeIndex = steps.findIndex((s) => !s.complete)

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl p-4">
      <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
        Trip Prep
      </p>
      <div className="flex items-center justify-between">
        {steps.map((step, index) => {
          const isComplete = step.complete
          const isActive = index === activeIndex

          return (
            <div key={step.label} className="flex items-center flex-1">
              {/* Step circle + label */}
              <button
                onClick={handleStepClick}
                aria-label={`${step.label} — ${isComplete ? 'complete' : isActive ? 'in progress' : 'not started'}`}
                className="flex flex-col items-center gap-1 flex-1 min-w-0"
              >
                <div
                  className={[
                    'w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-colors',
                    isComplete
                      ? 'bg-amber-500 text-white'
                      : isActive
                        ? 'bg-white dark:bg-stone-900 border-2 border-amber-500 text-amber-500'
                        : 'bg-stone-100 dark:bg-stone-800 border-2 border-stone-300 dark:border-stone-600 text-stone-400 dark:text-stone-500',
                  ].join(' ')}
                >
                  {isComplete ? (
                    <Check size={14} strokeWidth={2.5} />
                  ) : (
                    <span className="text-xs font-semibold">{index + 1}</span>
                  )}
                </div>
                <span
                  className={[
                    'text-xs text-center leading-tight truncate w-full px-0.5',
                    isComplete
                      ? 'text-amber-600 dark:text-amber-400 font-medium'
                      : isActive
                        ? 'text-stone-800 dark:text-stone-200 font-medium'
                        : 'text-stone-400 dark:text-stone-500',
                  ].join(' ')}
                >
                  {step.label}
                </span>
              </button>

              {/* Connector line (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 mt-[-12px] shrink">
                  <div
                    className={[
                      'w-full h-full transition-colors',
                      isComplete ? 'bg-amber-400' : 'bg-stone-200 dark:bg-stone-700',
                    ].join(' ')}
                  />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
