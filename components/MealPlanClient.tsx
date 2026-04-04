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
  ShoppingCart,
  ClipboardList,
  ThumbsUp,
  Minus,
  ThumbsDown,
} from 'lucide-react'
import { Button, ConfirmDialog } from '@/components/ui'

// ── Types ───────────────────────────────────────────────────────────────────

interface MealIngredient {
  item: string
  quantity: string
  unit: string
}

interface MealFeedbackData {
  id: string
  mealId: string
  rating: string
  note: string | null
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
  feedback: MealFeedbackData | null
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

// ── Shopping list types ──────────────────────────────────────────────────────

interface ShoppingItem {
  item: string
  quantity: string
  unit: string
  fromMeals: string[]
}

type ShoppingCategory = 'produce' | 'protein' | 'dairy' | 'grains' | 'pantry' | 'other'

interface ShoppingList {
  produce: ShoppingItem[]
  protein: ShoppingItem[]
  dairy: ShoppingItem[]
  grains: ShoppingItem[]
  pantry: ShoppingItem[]
  other: ShoppingItem[]
}

// ── Prep guide types ─────────────────────────────────────────────────────────

interface PrepEntry {
  mealId: string
  day: number
  slot: string
  mealName: string
  prepNotes: string
}

// ── Constants ────────────────────────────────────────────────────────────────

type TabId = 'meals' | 'shopping' | 'prep'

const SLOT_COLORS: Record<string, string> = {
  breakfast: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
  lunch: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400',
  dinner: 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-400',
  snack: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-400',
}

const CATEGORY_LABELS: Record<ShoppingCategory, string> = {
  produce: 'Produce',
  protein: 'Proteins & Meat',
  dairy: 'Dairy',
  grains: 'Bread & Grains',
  pantry: 'Pantry',
  other: 'Other',
}

const CATEGORY_ORDER: ShoppingCategory[] = ['produce', 'protein', 'dairy', 'grains', 'pantry', 'other']

const RATING_CONFIG = {
  loved: { label: 'Loved it', icon: ThumbsUp, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/40' },
  ok: { label: 'It was ok', icon: Minus, color: 'text-stone-500 dark:text-stone-400', bg: 'bg-stone-100 dark:bg-stone-700' },
  skip: { label: 'Skip it', icon: ThumbsDown, color: 'text-red-500 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/40' },
} as const

type RatingKey = keyof typeof RATING_CONFIG

// ── Helper functions ─────────────────────────────────────────────────────────

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

function isRatingKey(val: string): val is RatingKey {
  return val === 'loved' || val === 'ok' || val === 'skip'
}

// ── Tab bar ──────────────────────────────────────────────────────────────────

interface TabBarProps {
  active: TabId
  onChange: (tab: TabId) => void
}

function TabBar({ active, onChange }: TabBarProps) {
  const tabs: { id: TabId; label: string; icon: React.ReactNode }[] = [
    { id: 'meals', label: 'Meals', icon: <ChefHat size={14} /> },
    { id: 'shopping', label: 'Shopping', icon: <ShoppingCart size={14} /> },
    { id: 'prep', label: 'Prep Guide', icon: <ClipboardList size={14} /> },
  ]

  return (
    <div className="flex border-b border-stone-100 dark:border-stone-800">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors ${
            active === tab.id
              ? 'text-amber-600 dark:text-amber-400 border-b-2 border-amber-500 -mb-px'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </div>
  )
}

// ── Shopping tab ─────────────────────────────────────────────────────────────

interface ShoppingTabProps {
  tripId: string
}

function ShoppingTab({ tripId }: ShoppingTabProps) {
  const [shoppingList, setShoppingList] = useState<ShoppingList | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())

  useEffect(() => {
    async function fetchShoppingList() {
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan/shopping-list`)
        if (!res.ok) {
          setError('Could not load shopping list')
          return
        }
        const data = await res.json() as { shoppingList: ShoppingList }
        setShoppingList(data.shoppingList)
      } catch {
        setError('Could not load shopping list')
      } finally {
        setLoading(false)
      }
    }
    fetchShoppingList()
  }, [tripId])

  const toggleChecked = useCallback((key: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div className="p-4 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-amber-500" />
        <span className="text-sm text-stone-500 dark:text-stone-400">Building shopping list...</span>
      </div>
    )
  }

  if (error) {
    return <p className="p-4 text-sm text-red-500 dark:text-red-400">{error}</p>
  }

  if (!shoppingList) return null

  const hasItems = CATEGORY_ORDER.some((cat) => shoppingList[cat].length > 0)
  if (!hasItems) {
    return (
      <p className="p-4 text-sm text-stone-500 dark:text-stone-400">
        No ingredients found. Generate a meal plan first.
      </p>
    )
  }

  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800">
      {CATEGORY_ORDER.map((cat) => {
        const items = shoppingList[cat]
        if (items.length === 0) return null
        return (
          <div key={cat} className="px-4 py-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-2">
              {CATEGORY_LABELS[cat]}
            </h4>
            <ul className="space-y-1.5">
              {items.map((item) => {
                const key = `${cat}-${item.item.toLowerCase()}`
                const isChecked = checked.has(key)
                const quantityLabel = [item.quantity, item.unit].filter(Boolean).join(' ')
                return (
                  <li key={key} className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      id={key}
                      checked={isChecked}
                      onChange={() => toggleChecked(key)}
                      className="mt-0.5 accent-amber-500 shrink-0"
                    />
                    <label
                      htmlFor={key}
                      className={`text-sm cursor-pointer leading-tight ${
                        isChecked
                          ? 'line-through text-stone-400 dark:text-stone-600'
                          : 'text-stone-700 dark:text-stone-300'
                      }`}
                    >
                      {item.item}
                      {quantityLabel && (
                        <span className="text-stone-400 dark:text-stone-500 ml-1 text-xs">
                          ({quantityLabel})
                        </span>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
      <div className="px-4 py-2">
        <p className="text-[10px] text-stone-400 dark:text-stone-500 italic">
          Checkboxes reset when you close this page
        </p>
      </div>
    </div>
  )
}

// ── Prep Guide tab ───────────────────────────────────────────────────────────

interface PrepGuideTabProps {
  tripId: string
}

function PrepGuideTab({ tripId }: PrepGuideTabProps) {
  const [entries, setEntries] = useState<PrepEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchPrepGuide() {
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan/prep-guide`)
        if (!res.ok) {
          setError('Could not load prep guide')
          return
        }
        const data = await res.json() as { prepGuide: PrepEntry[] }
        setEntries(data.prepGuide)
      } catch {
        setError('Could not load prep guide')
      } finally {
        setLoading(false)
      }
    }
    fetchPrepGuide()
  }, [tripId])

  if (loading) {
    return (
      <div className="p-4 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-amber-500" />
        <span className="text-sm text-stone-500 dark:text-stone-400">Loading prep guide...</span>
      </div>
    )
  }

  if (error) {
    return <p className="p-4 text-sm text-red-500 dark:text-red-400">{error}</p>
  }

  if (entries.length === 0) {
    return (
      <p className="p-4 text-sm text-stone-500 dark:text-stone-400">
        No prep notes found. Claude will add prep notes when generating meal plans.
      </p>
    )
  }

  // Group by day
  const byDay = new Map<number, PrepEntry[]>()
  for (const entry of entries) {
    byDay.set(entry.day, [...(byDay.get(entry.day) ?? []), entry])
  }
  const sortedDays = Array.from(byDay.keys()).sort((a, b) => a - b)

  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800">
      {sortedDays.map((day) => {
        const dayEntries = byDay.get(day) ?? []
        return (
          <div key={day} className="px-4 py-3">
            <h4 className="text-[11px] font-semibold uppercase tracking-wide text-stone-400 dark:text-stone-500 mb-2">
              Day {day}
            </h4>
            <ul className="space-y-3">
              {dayEntries.map((entry) => {
                const slotColor = SLOT_COLORS[entry.slot.toLowerCase()] ?? SLOT_COLORS.snack
                return (
                  <li key={entry.mealId} className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${slotColor}`}>
                        {slotLabel(entry.slot)}
                      </span>
                      <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
                        {entry.mealName}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed pl-1">
                      {entry.prepNotes}
                    </p>
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

// ── Feedback buttons ─────────────────────────────────────────────────────────

interface FeedbackButtonsProps {
  mealId: string
  tripId: string
  currentRating: string | null
  onFeedbackSaved: (mealId: string, rating: string) => void
}

function FeedbackButtons({ mealId, tripId, currentRating, onFeedbackSaved }: FeedbackButtonsProps) {
  const [saving, setSaving] = useState<RatingKey | null>(null)

  const handleRate = useCallback(async (rating: RatingKey) => {
    if (saving) return
    setSaving(rating)
    // Optimistic update
    onFeedbackSaved(mealId, rating)
    try {
      const res = await fetch(`/api/trips/${tripId}/meal-plan/meals/${mealId}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating }),
      })
      if (!res.ok) {
        // Revert on failure — just refetch would be heavy; silently keep optimistic update
        console.error('Failed to save meal feedback')
      }
    } catch {
      console.error('Failed to save meal feedback')
    } finally {
      setSaving(null)
    }
  }, [mealId, tripId, saving, onFeedbackSaved])

  return (
    <div className="flex items-center gap-1 pt-1 border-t border-stone-100 dark:border-stone-700">
      <span className="text-[10px] text-stone-400 dark:text-stone-500 mr-0.5">Rate:</span>
      {(Object.keys(RATING_CONFIG) as RatingKey[]).map((key) => {
        const config = RATING_CONFIG[key]
        const Icon = config.icon
        const isActive = currentRating === key
        const isSaving = saving === key
        return (
          <button
            key={key}
            onClick={() => handleRate(key)}
            disabled={saving !== null}
            title={config.label}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-medium transition-colors disabled:opacity-60 ${
              isActive
                ? `${config.bg} ${config.color}`
                : 'text-stone-400 dark:text-stone-500 hover:bg-stone-100 dark:hover:bg-stone-700'
            }`}
          >
            {isSaving ? (
              <Loader2 size={10} className="animate-spin" />
            ) : (
              <Icon size={10} />
            )}
            <span>{key}</span>
          </button>
        )
      })}
    </div>
  )
}

// ── Meals tab ────────────────────────────────────────────────────────────────

interface MealsTabProps {
  mealPlan: MealPlanData
  tripId: string
  regeneratingMealId: string | null
  generating: boolean
  onRegenerateMeal: (mealId: string) => void
  onFeedbackSaved: (mealId: string, rating: string) => void
}

function MealsTab({
  mealPlan,
  tripId,
  regeneratingMealId,
  generating,
  onRegenerateMeal,
  onFeedbackSaved,
}: MealsTabProps) {
  const [collapsedDays, setCollapsedDays] = useState<Set<number>>(new Set())

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

  const dayMap = groupByDay(mealPlan.meals)
  const sortedDays = Array.from(dayMap.keys()).sort((a, b) => a - b)

  return (
    <div className="divide-y divide-stone-100 dark:divide-stone-800">
      {sortedDays.map((day) => {
        const meals = dayMap.get(day) ?? []
        const isCollapsed = collapsedDays.has(day)

        return (
          <div key={day}>
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

            {!isCollapsed && (
              <div className="px-4 pb-4 space-y-3">
                {meals.map((meal) => {
                  const isRegenerating = regeneratingMealId === meal.id
                  const slotColor = SLOT_COLORS[meal.slot.toLowerCase()] ?? SLOT_COLORS.snack
                  const currentRating = meal.feedback?.rating ?? null

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
                          onClick={() => onRegenerateMeal(meal.id)}
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

                      {/* Feedback */}
                      <FeedbackButtons
                        mealId={meal.id}
                        tripId={tripId}
                        currentRating={currentRating}
                        onFeedbackSaved={onFeedbackSaved}
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function MealPlanClient({ tripId, tripName: _tripName }: MealPlanClientProps) {
  const [mealPlan, setMealPlan] = useState<MealPlanData | null>(null)
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [regeneratingMealId, setRegeneratingMealId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<TabId>('meals')

  useEffect(() => {
    async function fetchMealPlan() {
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan`)
        if (res.ok) {
          const data = await res.json() as { mealPlan: MealPlanData | null }
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
        const data = await res.json() as { error?: string }
        setError(data.error || "Couldn't generate meal plan — tap Retry to try again.")
        return
      }
      const data = await res.json() as { mealPlan: MealPlanData }
      setMealPlan(data.mealPlan)
      setActiveTab('meals')
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
        const data = await res.json() as { error?: string }
        setError(data.error || "Couldn't regenerate meal — tap Retry.")
        return
      }
      const data = await res.json() as { meal: MealData }
      setMealPlan((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          meals: prev.meals.map((m) =>
            m.id === mealId ? { ...data.meal, feedback: m.feedback } : m
          ),
        }
      })
    } catch {
      setError("Couldn't regenerate meal — tap Retry.")
    } finally {
      setRegeneratingMealId(null)
    }
  }, [tripId])

  const handleFeedbackSaved = useCallback((mealId: string, rating: string) => {
    if (!isRatingKey(rating)) return
    setMealPlan((prev) => {
      if (!prev) return prev
      return {
        ...prev,
        meals: prev.meals.map((m) => {
          if (m.id !== mealId) return m
          const newFeedback: MealFeedbackData = m.feedback
            ? { ...m.feedback, rating }
            : { id: '', mealId, rating, note: null }
          return { ...m, feedback: newFeedback }
        }),
      }
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

      {/* Tab bar */}
      <TabBar active={activeTab} onChange={setActiveTab} />

      {/* Tab content */}
      {activeTab === 'meals' && (
        <MealsTab
          mealPlan={mealPlan}
          tripId={tripId}
          regeneratingMealId={regeneratingMealId}
          generating={generating}
          onRegenerateMeal={handleRegenerateMeal}
          onFeedbackSaved={handleFeedbackSaved}
        />
      )}

      {activeTab === 'shopping' && <ShoppingTab tripId={tripId} />}

      {activeTab === 'prep' && <PrepGuideTab tripId={tripId} />}

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
