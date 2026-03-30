'use client'

import { useState } from 'react'
import { Loader2, RotateCcw, ChevronDown, Check } from 'lucide-react'
import type { MealPlanResult, ShoppingItem } from '@/lib/claude'

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
}

export default function MealPlan({ tripId, tripName }: MealPlanProps) {
  const [mealPlan, setMealPlan] = useState<MealPlanResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [shoppingChecked, setShoppingChecked] = useState<Record<string, boolean>>({})
  const [expandedMeal, setExpandedMeal] = useState<string | null>(null)
  const [showShopping, setShowShopping] = useState(false)
  const [showPrepTimeline, setShowPrepTimeline] = useState(false)

  async function generate() {
    setLoading(true)
    setError(null)
    setMealPlan(null)
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
        throw new Error(data.error || 'Failed to generate meal plan')
      }
      const data = await res.json()
      setMealPlan(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

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

  // CTA state
  if (!loading && !error && !mealPlan) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              🍳 Meal Plan
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              AI-generated meals + shopping list
            </p>
          </div>
          <button
            onClick={generate}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Generate with Claude
          </button>
        </div>
      </div>
    )
  }

  // Loading state
  if (loading) {
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

  // Error state
  if (error) {
    return (
      <div
        className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4 cursor-pointer"
        onClick={generate}
      >
        <div className="flex items-center gap-2">
          <RotateCcw size={14} className="text-red-400 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-700 dark:text-red-400">
              Failed to generate meal plan
            </p>
            <p className="text-xs text-red-500 dark:text-red-500 mt-0.5">
              {error} · Tap to retry
            </p>
          </div>
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
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            🍳 Meal Plan
          </h3>
          <button
            onClick={generate}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 transition-colors"
          >
            <RotateCcw size={12} />
            Regenerate
          </button>
        </div>
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
                  <button
                    key={mealType}
                    onClick={() => setExpandedMeal(isExpanded ? null : mealKey)}
                    className="w-full text-left"
                  >
                    {/* Collapsed meal row */}
                    <div className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="text-[10px] font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider w-16 shrink-0">
                          {mealType}
                        </span>
                        <span className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                          {meal.name}
                        </span>
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
                      </div>
                    )}
                  </button>
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
        <button
          onClick={() => setShowPrepTimeline(!showPrepTimeline)}
          className="w-full p-4 flex items-center justify-between"
        >
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            📋 Prep Timeline
          </h4>
          <ChevronDown size={14} className={`text-stone-400 transition-transform ${showPrepTimeline ? 'rotate-180' : ''}`} />
        </button>
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
        <button
          onClick={() => setShowShopping(!showShopping)}
          className="w-full p-4 flex items-center justify-between"
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
              <button
                onClick={(e) => { e.stopPropagation(); copyShoppingList() }}
                className="text-xs text-amber-600 dark:text-amber-400 font-medium hover:text-amber-700 dark:hover:text-amber-300 transition-colors"
              >
                Copy list
              </button>
            )}
            <ChevronDown size={14} className={`text-stone-400 transition-transform ${showShopping ? 'rotate-180' : ''}`} />
          </div>
        </button>

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
    </div>
  )
}
