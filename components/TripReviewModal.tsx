'use client'

import { useState, useCallback } from 'react'
import { Modal } from '@/components/ui'

// ---- Types ----

interface PackedItem {
  gearId: string
  name: string
  category: string
  usageStatus: string | null
}

interface MealEntry {
  mealId: string
  mealPlanId: string
  name: string
  dayLabel: string
}

interface TripReviewModalProps {
  tripId: string
  tripName: string
  packedItems: PackedItem[]
  meals: MealEntry[]
  locationId: string | null
  locationName: string | null
  existingNotes: string | null
  onComplete: (reviewedAt: string) => void
  onClose: () => void
}

type UsageStatus = 'used' | "didn't need" | 'forgot but needed'
type GearUsageMap = Record<string, UsageStatus>
type MealRating = 'liked' | 'disliked'
type MealRatingMap = Record<string, MealRating>

// ---- Step type ----

type StepKey = 'gear' | 'meals' | 'spot'

// ---- Sub-components ----

interface GearStepProps {
  packedItems: PackedItem[]
  gearUsage: GearUsageMap
  onToggle: (gearId: string, status: UsageStatus) => void
}

function GearStep({ packedItems, gearUsage, onToggle }: GearStepProps) {
  const buttons: { label: string; value: UsageStatus }[] = [
    { label: 'Used', value: 'used' },
    { label: "Didn't Need", value: "didn't need" },
    { label: 'Forgot to Pack', value: 'forgot but needed' },
  ]

  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        How did your gear hold up?
      </p>
      {packedItems.map((item) => {
        const selected = gearUsage[item.gearId]
        return (
          <div key={item.gearId} className="border border-stone-200 dark:border-stone-700 rounded-xl p-3">
            <p className="font-medium text-stone-900 dark:text-stone-50 mb-2">{item.name}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-3 capitalize">{item.category}</p>
            <div className="flex gap-2 flex-wrap">
              {buttons.map(({ label, value }) => (
                <button
                  key={value}
                  onClick={() => onToggle(item.gearId, value)}
                  aria-pressed={selected === value}
                  className={`
                    min-h-[44px] px-3 py-2 rounded-lg text-sm font-medium transition-colors border
                    ${selected === value
                      ? 'bg-amber-600 border-amber-600 text-white'
                      : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 hover:bg-stone-50 dark:hover:bg-stone-700'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}

interface MealsStepProps {
  meals: MealEntry[]
  mealRatings: MealRatingMap
  mealNotes: Record<string, string>
  onRate: (mealId: string, rating: MealRating) => void
  onNote: (mealId: string, note: string) => void
}

function MealsStep({ meals, mealRatings, mealNotes, onRate, onNote }: MealsStepProps) {
  return (
    <div className="space-y-4">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        How were the meals?
      </p>
      {meals.map((meal) => {
        const rating = mealRatings[meal.mealId]
        return (
          <div key={meal.mealId} className="border border-stone-200 dark:border-stone-700 rounded-xl p-3">
            <p className="font-medium text-stone-900 dark:text-stone-50">{meal.name}</p>
            <p className="text-xs text-stone-400 dark:text-stone-500 mb-3">{meal.dayLabel}</p>
            <div className="flex gap-3 mb-3">
              <button
                onClick={() => onRate(meal.mealId, 'liked')}
                aria-label={`liked ${meal.name}`}
                aria-pressed={rating === 'liked'}
                className={`
                  min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-lg border transition-colors
                  ${rating === 'liked'
                    ? 'bg-green-100 dark:bg-green-900 border-green-500 text-green-700 dark:text-green-300'
                    : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }
                `}
              >
                👍
              </button>
              <button
                onClick={() => onRate(meal.mealId, 'disliked')}
                aria-label={`disliked ${meal.name}`}
                aria-pressed={rating === 'disliked'}
                className={`
                  min-h-[44px] min-w-[44px] px-4 py-2 rounded-lg text-lg border transition-colors
                  ${rating === 'disliked'
                    ? 'bg-red-100 dark:bg-red-900 border-red-500 text-red-700 dark:text-red-300'
                    : 'bg-white dark:bg-stone-800 border-stone-300 dark:border-stone-600 hover:bg-stone-50 dark:hover:bg-stone-700'
                  }
                `}
              >
                👎
              </button>
            </div>
            <input
              type="text"
              value={mealNotes[meal.mealId] ?? ''}
              onChange={(e) => onNote(meal.mealId, e.target.value)}
              placeholder="optional note"
              className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-50 placeholder:text-stone-400"
            />
          </div>
        )
      })}
    </div>
  )
}

interface SpotNotesStepProps {
  locationId: string | null
  locationName: string | null
  spotRating: number | null
  tripNotes: string
  onRateStar: (rating: number) => void
  onNotes: (notes: string) => void
}

function SpotNotesStep({ locationId, locationName, spotRating, tripNotes, onRateStar, onNotes }: SpotNotesStepProps) {
  return (
    <div className="space-y-5">
      {locationId !== null && (
        <div>
          <p className="text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
            {locationName ? `Rate: ${locationName}` : 'Spot Rating'}
          </p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => onRateStar(spotRating === star ? 0 : star)}
                aria-label={`${star} star`}
                className={`
                  min-h-[44px] min-w-[44px] text-2xl transition-colors
                  ${(spotRating ?? 0) >= star ? 'text-amber-500' : 'text-stone-300 dark:text-stone-600'}
                `}
              >
                ★
              </button>
            ))}
          </div>
        </div>
      )}
      <div>
        <label className="text-sm font-medium text-stone-700 dark:text-stone-300 block mb-1">
          Notes
        </label>
        <textarea
          rows={4}
          value={tripNotes}
          onChange={(e) => onNotes(e.target.value)}
          placeholder="notes from the trip..."
          className="w-full text-sm px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-50 placeholder:text-stone-400 resize-none"
        />
      </div>
    </div>
  )
}

// ---- Main component ----

export default function TripReviewModal({
  tripId,
  tripName,
  packedItems,
  meals,
  locationId,
  locationName,
  existingNotes,
  onComplete,
  onClose,
}: TripReviewModalProps) {
  // Compute step sequence at render time
  const steps: StepKey[] = ['gear', ...(meals.length > 0 ? ['meals' as StepKey] : []), 'spot']

  const [stepIndex, setStepIndex] = useState(0)
  const [gearUsage, setGearUsage] = useState<GearUsageMap>({})
  const [mealRatings, setMealRatings] = useState<MealRatingMap>({})
  const [mealNotes, setMealNotes] = useState<Record<string, string>>({})
  const [spotRating, setSpotRating] = useState<number | null>(null)
  const [tripNotes, setTripNotes] = useState(existingNotes ?? '')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const currentStep = steps[stepIndex]
  const isLastStep = stepIndex === steps.length - 1

  const handleGearToggle = useCallback((gearId: string, status: UsageStatus) => {
    setGearUsage((prev) =>
      prev[gearId] === status
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== gearId))
        : { ...prev, [gearId]: status }
    )
  }, [])

  const handleMealRate = useCallback((mealId: string, rating: MealRating) => {
    setMealRatings((prev) =>
      prev[mealId] === rating
        ? Object.fromEntries(Object.entries(prev).filter(([k]) => k !== mealId))
        : { ...prev, [mealId]: rating }
    )
  }, [])

  const handleMealNote = useCallback((mealId: string, note: string) => {
    setMealNotes((prev) => ({ ...prev, [mealId]: note }))
  }, [])

  const handleStarRating = useCallback((rating: number) => {
    setSpotRating(rating === 0 ? null : rating)
  }, [])

  const handleSubmit = useCallback(async () => {
    setError(null)
    setSubmitting(true)

    const gearUsageArr = Object.entries(gearUsage).map(([gearId, usageStatus]) => ({
      gearId,
      usageStatus,
    }))

    const mealFeedbacks = Object.entries(mealRatings).map(([mealId, rating]) => {
      const meal = meals.find((m) => m.mealId === mealId)
      return {
        mealId,
        mealPlanId: meal?.mealPlanId ?? '',
        mealName: meal?.name ?? '',
        rating,
        notes: mealNotes[mealId] || undefined,
      }
    })

    try {
      const res = await fetch(`/api/trips/${tripId}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          gearUsage: gearUsageArr,
          mealFeedbacks,
          spotRating: spotRating ?? null,
          spotNote: null,
          tripNotes: tripNotes || null,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        setError('Failed to save review. Try again.')
        setSubmitting(false)
        return
      }

      onComplete(data.reviewedAt)
      onClose()
    } catch {
      setError('Failed to save review. Try again.')
      setSubmitting(false)
    }
  }, [gearUsage, mealRatings, mealNotes, meals, spotRating, tripNotes, tripId, onComplete, onClose])

  return (
    <Modal open title={`Review: ${tripName}`} onClose={onClose}>
      <div className="p-4 pb-2">
        {/* Step indicator */}
        <div className="flex gap-1 mb-4">
          {steps.map((s, i) => (
            <div
              key={s}
              className={`h-1 flex-1 rounded-full transition-colors ${
                i <= stepIndex ? 'bg-amber-600' : 'bg-stone-200 dark:bg-stone-700'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="min-h-[200px]">
          {currentStep === 'gear' && (
            <GearStep
              packedItems={packedItems}
              gearUsage={gearUsage}
              onToggle={handleGearToggle}
            />
          )}
          {currentStep === 'meals' && (
            <MealsStep
              meals={meals}
              mealRatings={mealRatings}
              mealNotes={mealNotes}
              onRate={handleMealRate}
              onNote={handleMealNote}
            />
          )}
          {currentStep === 'spot' && (
            <SpotNotesStep
              locationId={locationId}
              locationName={locationName}
              spotRating={spotRating}
              tripNotes={tripNotes}
              onRateStar={handleStarRating}
              onNotes={setTripNotes}
            />
          )}
        </div>

        {/* Error */}
        {error && (
          <p className="text-red-600 dark:text-red-400 text-sm mt-2">{error}</p>
        )}
      </div>

      {/* Navigation footer */}
      <div className="sticky bottom-0 bg-white dark:bg-stone-900 border-t border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between gap-3">
        {/* Skip */}
        <button
          onClick={onClose}
          className="text-stone-500 dark:text-stone-400 text-sm py-2 px-3 rounded-lg hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          Skip
        </button>

        <div className="flex gap-2">
          {/* Back */}
          {stepIndex > 0 && (
            <button
              onClick={() => setStepIndex((i) => i - 1)}
              className="min-h-[44px] px-4 py-2 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Back
            </button>
          )}

          {/* Next / Submit */}
          {isLastStep ? (
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium disabled:opacity-50 transition-colors"
            >
              {submitting ? 'Saving...' : 'Submit Review'}
            </button>
          ) : (
            <button
              onClick={() => setStepIndex((i) => i + 1)}
              className="min-h-[44px] px-5 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-medium transition-colors"
            >
              Next
            </button>
          )}
        </div>
      </div>
    </Modal>
  )
}
