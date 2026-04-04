'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UtensilsCrossed,
  RotateCcw,
  Loader2,
  ChevronDown,
  ChevronRight,
  Clock,
  ChefHat,
} from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'

interface MealIngredient {
  item: string
  quantity: string
  unit: string
}

interface MealData {
  id: string
  day: number
  slot: string
  name: string
  description: string | null
  ingredients: MealIngredient[]
  cookInstructions: string | null
  prepNotes: string | null
  estimatedMinutes: number | null
}

interface MealPlanData {
  id: string
  generatedAt: string
  notes: string | null
  meals: MealData[]
}

interface MealPlanClientProps {
  tripId: string
  tripName: string
}

const SLOT_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  lunch: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  dinner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  snack: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
}

function slotLabel(slot: string): string {
  return slot.charAt(0).toUpperCase() + slot.slice(1)
}

function formatGeneratedAt(isoString: string): string {
  try {
    const date = new Date(isoString)
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
  } catch {
    return 'recently'
  }
}

function groupByDay(meals: MealData[]): Map<number, MealData[]> {
  const map = new Map<number, MealData[]>()
  for (const meal of meals) {
    const existing = map.get(meal.day) ?? []
    map.set(meal.day, [...existing, meal])
  }
  return map
}

export default function MealPlanClient({ tripId, tripName: _tripName }: MealPlanClientProps) {
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regeneratingMealId, setRegeneratingMealId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  useEffect(() => {
    async function fetchMealPlan() {
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan`)
        if (res.ok) {
          const data = await res.json()
          if (data.mealPlan) {
            setMealPlan(data.mealPlan)
          }
        }
      } catch {
        // Silent fail on load — user can generate fresh
      } finally {
        setLoading(false)
      }
    }
    fetchMealPlan()
  }, [tripId])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/meal-plan/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't generate meal plan — tap Retry to try again.")
        return
      }
      const data = await res.json()
      setMealPlan(data.mealPlan)
      setCollapsedDays(new Set())
    } catch {
      setError("Couldn't generate meal plan — tap Retry to try again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const handleRegenerateAll = useCallback(() => {
    if (mealPlan) {
      setShowRegenerateConfirm(true)
    } else {
      handleGenerate()
    }
  }, [mealPlan, handleGenerate])

  const handleRegenerateMeal = useCallback(async (mealId: string) => {
    setRegeneratingMealId(mealId)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/meal-plan/meals/${mealId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't regenerate meal — tap Retry.")
        return
      }
      const data = await res.json()
      setMealPlan((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          meals: prev.meals.map((m) => (m.id === mealId ? data.meal : m)),
        }
      })
    } catch {
      setError("Couldn't regenerate meal — tap Retry.")
    } finally {
      setRegeneratingMealId(null)
    }
  }, [tripId])

  const toggleDay = useCallback((day: number) => {
    setCollapsedDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) {
        next.delete(day)
      } else {
        next.add(day)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">Loading meal plan...</span>
        </div>
      </div>
    )
  }

  if (!mealPlan && !generating) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <UtensilsCrossed size={18} className="text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Meal Plan
              </h3>
              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">No meal plan yet</p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-2">
            <Button variant="primary" size="sm" onClick={handleGenerate} loading={generating}>
              Generate Meal Plan
            </Button>
            {error && (
              <p className="text-xs text-red-600 dark:text-red-400 text-right max-w-[200px]">
                {error}{' '}
                <button
                  onClick={handleGenerate}
                  className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
                >
                  Retry
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  if (generating && !mealPlan) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 size={16} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Claude is planning your meals...
          </span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-2">
              <div className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-4 w-32" />
              {[1, 2, 3].map((row) => (
                <div key={row} className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-12 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (!mealPlan) return null

  const dayMap = groupByDay(mealPlan.meals)
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ChefHat size={16} className="text-amber-500 shrink-0" />
            <div>
              <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                Meal Plan
              </h3>
              <p className="text-xs text-stone-400 dark:text-stone-500">
                Generated {formatGeneratedAt(mealPlan.generatedAt)}
              </p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleRegenerateAll}
            loading={generating}
            icon={!generating ? <RotateCcw size={12} /> : undefined}
            disabled={generating || regeneratingMealId !== null}
          >
            Regenerate All
          </Button>
        </div>

        {mealPlan.notes && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-2 italic">{mealPlan.notes}</p>
        )}

        {error && (
          <div className="mt-2 text-xs text-red-600 dark:text-red-400">
            {error}{' '}
            <button
              onClick={() => setError(null)}
              className="font-medium hover:underline ml-1"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* Day sections */}
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {sortedDays.map((day) => {
          const meals = dayMap.get(day) ?? []
          const isCollapsed = collapsedDays.has(day)

          return (
            <div key={day}>
              {/* Day header */}
              <button
                onClick={() => toggleDay(day)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors"
              >
                <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                  Day {day}
                </h4>
                {isCollapsed ? (
                  <ChevronRight size={14} className="text-stone-400" />
                ) : (
                  <ChevronDown size={14} className="text-stone-400" />
                )}
              </button>

              {/* Meal cards */}
              {!isCollapsed && (
                <div className="px-4 pb-4 space-y-3">
                  {meals.map((meal) => {
                    const isRegenerating = regeneratingMealId === meal.id
                    const slotColor = SLOT_COLORS[meal.slot.toLowerCase()] ?? SLOT_COLORS.snack

                    return (
                      <div
                        key={meal.id}
                        className="bg-stone-50 dark:bg-stone-800 rounded-lg p-3 space-y-2"
                      >
                        {/* Meal header row */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap min-w-0">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${slotColor}`}>
                              {slotLabel(meal.slot)}
                            </span>
                            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 truncate">
                              {meal.name}
                            </span>
                          </div>
                          <button
                            onClick={() => handleRegenerateMeal(meal.id)}
                            disabled={isRegenerating || generating || regeneratingMealId !== null}
                            className="shrink-0 flex items-center gap-1 text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                            title="Regenerate this meal"
                          >
                            {isRegenerating ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <RotateCcw size={12} />
                            )}
                          </button>
                        </div>

                        {/* Description */}
                        {meal.description && (
                          <p className="text-xs text-stone-500 dark:text-stone-400">
                            {meal.description}
                          </p>
                        )}

                        {/* Prep notes */}
                        {meal.prepNotes && (
                          <p className="text-xs text-stone-400 dark:text-stone-500 italic">
                            {meal.prepNotes}
                          </p>
                        )}

                        {/* Ingredients */}
                        {meal.ingredients.length > 0 && (
                          <ul className="space-y-0.5">
                            {meal.ingredients.map((ing, i) => (
                              <li key={i} className="text-xs text-stone-600 dark:text-stone-400 flex gap-1">
                                <span className="text-amber-400 shrink-0">•</span>
                                <span>
                                  {ing.quantity} {ing.unit} {ing.item}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}

                        {/* Cook instructions */}
                        {meal.cookInstructions && (
                          <p className="text-xs text-stone-500 dark:text-stone-400 border-t border-stone-100 dark:border-stone-700 pt-2">
                            {meal.cookInstructions}
                          </p>
                        )}

                        {/* Time badge */}
                        {meal.estimatedMinutes && (
                          <div className="flex items-center gap-1 text-[10px] text-stone-400 dark:text-stone-500">
                            <Clock size={10} />
                            <span>{meal.estimatedMinutes} min</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Attribution */}
      <div className="px-4 py-2 border-t border-stone-100 dark:border-stone-800 text-center">
        <p className="text-xs text-stone-400 dark:text-stone-500">
          ✦ Generated by Claude · Edit freely
        </p>
      </div>

      <ConfirmDialog
        open={showRegenerateConfirm}
        onClose={() => setShowRegenerateConfirm(false)}
        onConfirm={() => {
          setShowRegenerateConfirm(false)
          handleGenerate()
        }}
        title="Regenerate meal plan?"
        message="This will replace your current meal plan with a new one."
        confirmLabel="Regenerate"
        confirmVariant="danger"
      />
    </div>
  )
}
