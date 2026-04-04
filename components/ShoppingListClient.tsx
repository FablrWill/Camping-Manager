'use client'

import { useState, useEffect, useCallback } from 'react'
import { ShoppingCart, Clipboard, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

interface ShoppingItem {
  id: string
  item: string
  quantity: string
  unit: string
  category: string
  checked: boolean
}

interface ShoppingListClientProps {
  tripId: string
  tripName: string
  mealPlanId: string | null
}

const CATEGORY_LABELS: Record<string, string> = {
  produce: 'Produce',
  protein: 'Proteins & Meat',
  dairy: 'Dairy',
  dry: 'Dry Goods',
  frozen: 'Frozen',
  other: 'Other',
}

const CATEGORY_ORDER = ['produce', 'protein', 'dairy', 'dry', 'frozen', 'other']

function groupByCategory(items: ShoppingItem[]): Map<string, ShoppingItem[]> {
  const map = new Map<string, ShoppingItem[]>()
  for (const item of items) {
    const cat = item.category || 'other'
    const existing = map.get(cat) ?? []
    map.set(cat, [...existing, item])
  }
  return map
}

function formatListAsText(items: ShoppingItem[], tripName: string): string {
  const grouped = groupByCategory(items)
  const lines: string[] = [`Shopping List — ${tripName}`, '']
  const order = CATEGORY_ORDER.filter((c) => grouped.has(c))
  const extras = Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c))
  for (const cat of [...order, ...extras]) {
    const catItems = grouped.get(cat) ?? []
    if (catItems.length === 0) continue
    lines.push((CATEGORY_LABELS[cat] ?? cat).toUpperCase())
    for (const item of catItems) {
      const qty = [item.quantity, item.unit].filter(Boolean).join(' ')
      lines.push(`- ${qty ? qty + ' ' : ''}${item.item}`)
    }
    lines.push('')
  }
  return lines.join('\n').trim()
}

export default function ShoppingListClient({ tripId, tripName, mealPlanId }: ShoppingListClientProps) {
  const [items, setItems] = useState<ShoppingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!mealPlanId) {
      setLoading(false)
      return
    }
    async function fetchItems() {
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan/shopping-list`)
        if (!res.ok) {
          setError('Could not load shopping list')
          return
        }
        const data = await res.json() as { items: ShoppingItem[] }
        setItems(data.items ?? [])
      } catch {
        setError('Could not load shopping list')
      } finally {
        setLoading(false)
      }
    }
    void fetchItems()
  }, [tripId, mealPlanId])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch(`/api/trips/${tripId}/meal-plan/shopping-list`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        setError("Couldn't build your shopping list — tap Retry to try again.")
        return
      }
      const data = await res.json() as { items: ShoppingItem[] }
      setItems(data.items ?? [])
    } catch {
      setError("Couldn't build your shopping list — tap Retry to try again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const handleToggleChecked = useCallback(async (item: ShoppingItem) => {
    // Optimistic update
    const newChecked = !item.checked
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, checked: newChecked } : i))
    )
    try {
      const res = await fetch(
        `/api/trips/${tripId}/meal-plan/shopping-list/${item.id}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ checked: newChecked }),
        }
      )
      if (!res.ok) {
        // Revert optimistic update
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
        )
      }
    } catch {
      // Revert optimistic update
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, checked: item.checked } : i))
      )
    }
  }, [tripId])

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(formatListAsText(items, tripName))
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setError('Could not copy to clipboard')
    }
  }, [items, tripName])

  // Loading state
  if (loading) {
    return (
      <div className="p-4 flex items-center gap-2">
        <Loader2 size={14} className="animate-spin text-amber-500" />
        <span className="text-sm text-stone-500 dark:text-stone-400">Loading shopping list...</span>
      </div>
    )
  }

  // Generating state
  if (generating) {
    return (
      <div className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Loader2 size={14} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Claude is building your shopping list...
          </span>
        </div>
        {[1, 2, 3].map((i) => (
          <div key={i} className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-8 w-full" />
        ))}
      </div>
    )
  }

  // Empty state
  if (items.length === 0) {
    return (
      <div className="p-6 flex flex-col items-center gap-3 text-center">
        <ShoppingCart size={24} className="text-stone-300" />
        <div>
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            No shopping list yet
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Tap Generate to build your list from the meal plan.
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
          Generate Shopping List
        </Button>
      </div>
    )
  }

  // List rendered state
  const grouped = groupByCategory(items)
  const orderedCats = [
    ...CATEGORY_ORDER.filter((c) => grouped.has(c)),
    ...Array.from(grouped.keys()).filter((c) => !CATEGORY_ORDER.includes(c)),
  ]

  return (
    <div>
      {/* Header row */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
          Shopping List
        </span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleCopy()}
            icon={<Clipboard size={12} />}
          >
            {copied ? <span className="text-amber-600 dark:text-amber-400">Copied!</span> : 'Copy List'}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void handleGenerate()}
            icon={<RotateCcw size={12} />}
          >
            Regenerate
          </Button>
        </div>
      </div>

      {error && (
        <p className="px-4 py-2 text-xs text-red-600 dark:text-red-400">
          {error}{' '}
          <button
            onClick={() => { setError(null); void handleGenerate() }}
            className="font-medium text-amber-600 dark:text-amber-400 hover:underline"
          >
            Retry
          </button>
        </p>
      )}

      {/* Grouped items */}
      <div className="px-4 pb-4">
        {orderedCats.map((cat) => {
          const catItems = grouped.get(cat) ?? []
          if (catItems.length === 0) return null
          return (
            <div key={cat}>
              <p className="text-xs font-medium text-stone-500 uppercase tracking-wider mt-4 mb-2">
                {CATEGORY_LABELS[cat] ?? cat}
              </p>
              {catItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-3 py-2 border-b border-stone-50 dark:border-stone-800"
                >
                  <input
                    type="checkbox"
                    id={item.id}
                    checked={item.checked}
                    onChange={() => void handleToggleChecked(item)}
                    className="w-5 h-5 rounded border-stone-300 accent-amber-500 shrink-0"
                  />
                  <label
                    htmlFor={item.id}
                    className={`text-sm cursor-pointer flex-1 ${
                      item.checked
                        ? 'line-through text-stone-400 dark:text-stone-600'
                        : 'text-stone-800 dark:text-stone-200'
                    }`}
                  >
                    {item.item}
                  </label>
                  {(item.quantity || item.unit) && (
                    <span className="text-xs text-stone-400 ml-auto shrink-0">
                      {[item.quantity, item.unit].filter(Boolean).join(' ')}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}
