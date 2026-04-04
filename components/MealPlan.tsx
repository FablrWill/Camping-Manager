'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { MealPlanResult, ShoppingItem, MealPlanMeal } from '@/lib/claude'
import { Button, ConfirmDialog } from '@/components/ui'

const STORE_SECTIONS = [
  { key: 'produce', emoji: '🥬', label: 'Produce' },
  { key: 'meat', emoji: '🥩', label: 'Meat' },
  { key: 'dairy', emoji: '🧀', label: 'Dairy' },
  { key: 'bakery', emoji: '🍞', label: 'Bakery' },
  { key: 'pantry', emoji: '🫙', label: 'Pantry' },
  { key: 'frozen', emoji: '🧊', label: 'Frozen' },
  { key: 'drinks', emoji: '🥤', label: 'Drinks' },
  { key: 'other', emoji: '📦', label: 'Other' },
] as const

interface MealPlanProps {
  tripId: string
  tripName: string
  offlineData?: MealPlanResult
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'recently'
  const diff = Date.now() - new Date(isoString).getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)
  if (minutes < 1) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  return `${days}d ago`
}

export default function MealPlan({ tripId, tripName, offlineData }: MealPlanProps) {
  const [mealPlan, setMealPlan] = useState<MealPlanResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loadingMounted, setLoadingMounted] = useState(true)  // loading saved on mount
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({})
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [showShopping, setShowShopping] = useState(false)
  const [showPrepTimeline, setShowPrepTimeline] = useState(false)
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)
  const [regeneratingMeal, setRegeneratingMeal] = useState<string | null>(null)
  const [mealUpdated, setMealUpdated] = useState<string | null>(null)

  // Load saved meal plan on mount
  useEffect(() => {
    if (offlineData) {
      // Render from IndexedDB snapshot — per D-01
      setMealPlan(offlineData)
      setLoadingMounted(false)
      return
    }
    async function loadSaved() {
      try {
        const res = await fetch(`/api/meal-plan?tripId=${tripId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.result) {
            setMealPlan(data.result)
            setGeneratedAt(data.generatedAt)
          }
        }
      } catch {
        // Silent fail on load — user can generate fresh
      } finally {
        setLoadingMounted(false)
      }
    }
    loadSaved()
  }, [tripId, offlineData])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setShoppingChecked({})
    setExpandedMeal(null)
    setShowShopping(false)
    setShowPrepTimeline(false)

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't generate -- Claude returned an unexpected response. Tap Retry to try again.")
        return
      }
      const data = await res.json()
      setMealPlan(data)
      setGeneratedAt(new Date().toISOString())
    } catch {
      setError("Couldn't generate -- Claude returned an unexpected response. Tap Retry to try again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const handleRegenMeal = useCallback(async (dayNumber: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const mealKey = `day${dayNumber}-${mealType}`
    setRegeneratingMeal(mealKey)
    setMealUpdated(null)
    setError(null)

    try {
      const res = await fetch('/api/meal-plan', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId, day: dayNumber, mealType }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to regenerate meal')
        return
      }
      const newMeal = await res.json() as MealPlanMeal

      setMealPlan((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          days: prev.days.map((d) =>
            d.dayNumber === dayNumber
              ? { ...d, meals: { ...d.meals, [mealType]: newMeal } }
              : d
          ),
        }
      })

      setMealUpdated(mealKey)
      setTimeout(() => setMealUpdated(null), 2000)
    } catch {
      setError('Failed to regenerate meal')
    } finally {
      setRegeneratingMeal(null)
    }
  }, [tripId])

  function toggleShopping(key: string) {
    setShoppingChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  function copyShoppingList() {
    if (!mealPlan) return
    const grouped: Record<string, ShoppingItem[]> = {}
    for (const item of mealPlan.shoppingList) {
      if (!grouped[item.section]) grouped[item.section] = []
      grouped[item.section].push(item)
    }

    const text = STORE_SECTIONS
      .filter((s) => grouped[s.key]?.length)
      .map((s) => {
        const items = grouped[s.key]!
        return `${s.label.toUpperCase()}\n${items.map((i) => `  □ ${i.name}`).join('\n')}`
      })
      .join('\n\n')

    navigator.clipboard.writeText(text)
  }

  // Mount loading state
  if (loadingMounted) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">Loading meal plan...</span>
        </div>
      </div>
    )
  }

  // Not generated yet — empty state
  if (!mealPlan && !generating) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              🍽️ Meal Plan
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              No meal plan yet
            </p>
          </div>
          {!offlineData && (
            <div className="flex flex-col items-end gap-2">
              <Button variant="primary" size="sm" onClick={handleGenerate} loading={generating}>
                Generate Meal Plan
              </Button>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 text-right max-w-[200px]">
                  {error}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleGenerate}
                    className="ml-1.5 !px-1 !py-0 font-medium !text-amber-600 dark:!text-amber-400 hover:!bg-transparent hover:underline"
                  >
                    Retry
                  </Button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Generating state (no existing result yet)
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
              {[1, 2].map((row) => (
                <div key={row} className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-12 w-full" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Generated state
  if (!mealPlan) return null

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            🍳 Meal Plan
          </h3>
          {offlineData ? (
            <span className="text-xs text-stone-400 dark:text-stone-500 italic">
              (Offline — read only)
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => mealPlan ? setShowRegenerateConfirm(true) : handleGenerate()}
              loading={generating}
              icon={!generating ? <RotateCcw size={12} /> : undefined}
            >
              Regenerate
            </Button>
          )}
        </div>

        {/* Metadata line */}
        {generatedAt && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-1">
            Generated {formatRelativeTime(generatedAt)} — results reflect your gear and weather at that time.
          </p>
        )}

        {/* Inline error + Retry */}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400">
            {error}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleGenerate}
              className="ml-1.5 !px-1 !py-0 font-medium !text-amber-600 dark:!text-amber-400 hover:!bg-transparent hover:underline"
            >
              Retry
            </Button>
          </div>
        )}
      </div>

      {/* Day sections */}
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {mealPlan.days.map((day) => (
          <div key={day.dayNumber} className="p-4">
            <h4 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">
              Day {day.dayNumber} — {day.dayLabel}
            </h4>

            <div className="space-y-2">
              {(['breakfast', 'lunch', 'dinner'] as const).map((mealType) => {
                const meal = day.meals[mealType]
                if (!meal) return null
                const mealKey = `day${day.dayNumber}-${mealType}`
                const isExpanded = expandedMeal === mealKey

                return (
                  <Button
                    key={mealType}
                    variant="ghost"
                    onClick={() => setExpandedMeal(isExpanded ? null : mealKey)}
                    className="w-full !p-0 !justify-start !font-normal !rounded-none hover:!bg-transparent text-left"
                  >
                    {/* Collapsed meal row */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider w-16 shrink-0">
                          {mealType}
                        </span>
                        {regeneratingMeal === mealKey ? (
                          <span className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-4 w-32 inline-block" />
                        ) : (
                          <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                            {meal.name}
                          </span>
                        )}
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium shrink-0 ml-2 ${
                        meal.prepType === 'home'
                          ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                          : 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                      }`}>
                        {meal.prepType === 'home' ? 'At Home' : 'At Camp'}
                      </span>
                    </div>

                    {/* Expanded detail */}
                    {isExpanded && (
                      <div className="pb-2 pl-[76px]">
                        <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
                          {meal.prepNotes}
                        </p>
                        <div className="space-y-0.5">
                          {meal.ingredients.map((ing, i) => (
                            <p key={i} className="text-xs text-stone-600 dark:text-stone-400">
                              • {ing}
                            </p>
                          ))}
                        </div>
                        {meal.cookwareNeeded.length > 0 && (
                          <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-1.5">
                            Gear: {meal.cookwareNeeded.join(', ')}
                          </p>
                        )}
                        {/* Per-meal regenerate — only in online mode */}
                        {!offlineData && (
                          <div className="mt-3 flex items-center gap-2">
                            {regeneratingMeal === mealKey ? (
                              <span className="flex items-center gap-1.5 text-xs text-stone-400 dark:text-stone-500">
                                <Loader2 size={12} className="animate-spin" />
                                Regenerating...
                              </span>
                            ) : mealUpdated === mealKey ? (
                              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                                Meal updated
                              </span>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleRegenMeal(day.dayNumber, mealType)
                                }}
                                icon={<RotateCcw size={11} />}
                                className="!text-xs !text-stone-400 dark:!text-stone-500 hover:!text-amber-600 dark:hover:!text-amber-400"
                              >
                                Regenerate this meal
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </Button>
                )
              })}
            </div>

            {/* Snacks row */}
            {day.meals.snacks.length > 0 && (
              <div className="flex items-center gap-3 py-2 mt-1 border-t border-stone-50 dark:border-stone-800/50">
                <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider w-16 shrink-0">
                  Snacks
                </span>
                <span className="text-xs text-stone-500 dark:text-stone-400">
                  {day.meals.snacks.join(' · ')}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Prep Timeline */}
      <div className="border-t border-stone-100 dark:border-stone-800">
        <Button
          variant="ghost"
          onClick={() => setShowPrepTimeline(!showPrepTimeline)}
          className="w-full !p-4 !justify-between !rounded-none hover:!bg-stone-50 dark:hover:!bg-stone-800/50"
        >
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            📋 Prep Timeline
          </h4>
          <ChevronDown size={14} className={`text-stone-400 transition-transform ${showPrepTimeline ? 'rotate-180' : ''}`} />
        </Button>
        {showPrepTimeline && (
          <div className="px-4 pb-4 space-y-1.5">
            {mealPlan.prepTimeline.map((step, i) => (
              <p key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span>
                {step}
              </p>
            ))}
          </div>
        )}
      </div>

      {/* Shopping List */}
      <div className="border-t border-stone-100 dark:border-stone-800">
        <Button
          variant="ghost"
          onClick={() => setShowShopping(!showShopping)}
          className="w-full !p-4 !justify-between !rounded-none hover:!bg-stone-50 dark:hover:!bg-stone-800/50"
        >
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              🛒 Shopping List
            </h4>
            <span className="text-[10px] text-stone-400 dark:text-stone-500">
              {Object.values(shoppingChecked).filter(Boolean).length}/{mealPlan.shoppingList.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {showShopping && (
              <Button
                variant="ghost"
                size="sm"
                onClick={(e) => { e.stopPropagation(); copyShoppingList() }}
                className="text-xs !text-amber-600 dark:!text-amber-400 font-medium hover:!text-amber-700 dark:hover:!text-amber-300 hover:!bg-transparent !px-1 !py-0"
              >
                Copy list
              </Button>
            )}
            <ChevronDown size={14} className={`text-stone-400 transition-transform ${showShopping ? 'rotate-180' : ''}`} />
          </div>
        </Button>

        {showShopping && (
          <div className="px-4 pb-4">
            {STORE_SECTIONS.map((section) => {
              const items = mealPlan.shoppingList.filter((i) => i.section === section.key)
              if (items.length === 0) return null
              return (
                <div key={section.key} className="mb-3 last:mb-0">
                  <h5 className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-1">
                    {section.emoji} {section.label}
                  </h5>
                  <div className="space-y-0.5">
                    {items.map((item, i) => {
                      const key = `${section.key}-${i}`
                      const isChecked = shoppingChecked[key] ?? false
                      return (
                        <label key={key} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            isChecked
                              ? 'bg-amber-600 dark:bg-amber-500 border-amber-600 dark:border-amber-500'
                              : 'border-stone-300 dark:border-stone-600 group-hover:border-amber-400'
                          }`}>
                            {isChecked && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
                          </div>
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleShopping(key)}
                            className="sr-only"
                          />
                          <span className={`text-sm transition-colors ${
                            isChecked ? 'line-through text-stone-400 dark:text-stone-600' : 'text-stone-900 dark:text-stone-100'
                          }`}>
                            {item.name}
                          </span>
                          <span className="text-[10px] text-stone-400 dark:text-stone-500 ml-auto shrink-0">
                            {item.forMeal}
                          </span>
                        </label>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Tips */}
      {mealPlan.tips.length > 0 && (
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            💡 Meal Tips
          </h4>
          <ul className="space-y-1.5">
            {mealPlan.tips.map((tip, i) => (
              <li key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
                <span className="text-amber-500 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Attribution */}
      <div className="px-4 py-2 text-center">
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
