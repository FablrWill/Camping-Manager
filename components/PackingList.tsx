'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, RotateCcw, Plus, X, Check } from 'lucide-react'
import type { PackingListResult } from '@/lib/claude'
import { Button, ConfirmDialog } from '@/components/ui'

interface PackingListProps {
  tripId: string
  tripName: string
  offlineData?: PackingListResult
}

interface CheckedState {
  [categoryAndItem: string]: boolean
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

export default function PackingList({ tripId, tripName, offlineData }: PackingListProps) {
  const [packingList, setPackingList] = useState<PackingListResult | null>(null)
  const [generatedAt, setGeneratedAt] = useState<string | null>(null)
  const [loadingMounted, setLoadingMounted] = useState(true)  // loading saved on mount
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checked, setChecked] = useState<CheckedState>({})
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [newItemName, setNewItemName] = useState('')
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false)

  // Load saved packing list on mount
  useEffect(() => {
    if (offlineData) {
      // Render from IndexedDB snapshot — per D-01
      setPackingList(offlineData)
      setLoadingMounted(false)
      return
    }
    async function loadSaved() {
      try {
        const res = await fetch(`/api/packing-list?tripId=${tripId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.result) {
            setPackingList(data.result)
            setGeneratedAt(data.generatedAt)
            // Initialize checked state from server packedState (gearId -> packed)
            if (data.packedState && data.result) {
              const initialChecked: CheckedState = {}
              data.result.categories.forEach((cat: { name: string; items: Array<{ gearId?: string }> }) => {
                cat.items.forEach((item: { gearId?: string }, i: number) => {
                  if (item.gearId && data.packedState[item.gearId]) {
                    initialChecked[`${cat.name}-${i}`] = true
                  }
                })
              })
              setChecked(initialChecked)
            }
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

  const totalItems = packingList
    ? packingList.categories.reduce((sum, cat) => sum + cat.items.length, 0)
    : 0
  const packedCount = Object.values(checked).filter(Boolean).length

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    setChecked({})

    try {
      const res = await fetch('/api/packing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't generate -- Claude returned an unexpected response. Tap Retry to try again.")
        return
      }

      const data: PackingListResult = await res.json()
      setPackingList(data)
      setGeneratedAt(new Date().toISOString())
    } catch {
      setError("Couldn't generate -- Claude returned an unexpected response. Tap Retry to try again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  async function togglePacked(key: string, gearId: string | undefined, newChecked: boolean) {
    setChecked(prev => ({ ...prev, [key]: newChecked }))
    if (gearId) {
      try {
        await fetch('/api/packing-list/items', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId, gearId, packed: newChecked }),
        })
      } catch (err) {
        console.error('Failed to save packed state:', err)
        // Revert optimistic update
        setChecked(prev => ({ ...prev, [key]: !newChecked }))
      }
    }
  }

  function addCustomItem(category: string) {
    if (!newItemName.trim() || !packingList) return

    const updatedResult = {
      ...packingList,
      categories: packingList.categories.map((cat) => {
        if (cat.name !== category) return cat
        return {
          ...cat,
          items: [
            ...cat.items,
            {
              name: newItemName.trim(),
              category,
              fromInventory: false,
            },
          ],
        }
      }),
    }

    setPackingList(updatedResult)
    setNewItemName('')
    setAddingTo(null)

    // Persist updated result to server
    fetch('/api/packing-list', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId, result: updatedResult }),
    }).catch((err) => {
      console.error('Failed to save custom item:', err)
    })
  }

  // Mount loading state
  if (loadingMounted) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">Loading packing list...</span>
        </div>
      </div>
    )
  }

  // Not generated yet — empty state
  if (!packingList && !generating) {
    return (
      <div className="bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              🎒 Packing List
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              No packing list yet
            </p>
          </div>
          {!offlineData && (
            <div className="flex flex-col items-end gap-2">
              <Button variant="primary" size="sm" onClick={handleGenerate} loading={generating}>
                Generate Packing List
              </Button>
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 text-right max-w-[200px]">
                  {error}
                  <button
                    onClick={handleGenerate}
                    className="ml-1.5 font-medium text-amber-600 dark:text-amber-400 hover:underline"
                  >
                    Retry
                  </button>
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Generating state (no existing result yet)
  if (generating && !packingList) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 size={16} className="animate-spin text-amber-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Claude is building your packing list...
          </span>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((section) => (
            <div key={section} className="space-y-2">
              <div className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-4 w-24" />
              {[1, 2, 3].map((row) => (
                <div
                  key={row}
                  className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-8 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  // Generated list (with optional regenerating overlay — shows while re-generating with existing result visible)
  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      {/* Header with progress */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            🎒 Packing List
          </h3>
          {offlineData ? (
            <span className="text-xs text-stone-400 dark:text-stone-500 italic">
              (Offline — read only)
            </span>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => packingList ? setShowRegenerateConfirm(true) : handleGenerate()}
              loading={generating}
              icon={!generating ? <RotateCcw size={12} /> : undefined}
            >
              Regenerate
            </Button>
          )}
        </div>

        {/* Metadata line */}
        {generatedAt && (
          <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">
            Generated {formatRelativeTime(generatedAt)} — results reflect your gear and weather at that time.
          </p>
        )}

        {/* Inline error + Retry */}
        {error && (
          <div className="text-xs text-red-600 dark:text-red-400 mb-2">
            {error}
            <button
              onClick={handleGenerate}
              className="ml-1.5 font-medium text-amber-600 dark:text-amber-400 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Progress bar */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className="bg-amber-500 dark:bg-amber-400 rounded-full h-2 transition-all duration-300"
              style={{
                width: totalItems > 0 ? `${(packedCount / totalItems) * 100}%` : '0%',
              }}
            />
          </div>
          <span className="text-xs text-stone-500 dark:text-stone-400 tabular-nums shrink-0">
            {packedCount} / {totalItems} packed
          </span>
        </div>
      </div>

      {/* Categories */}
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {packingList!.categories.map((cat) => (
          <div key={cat.name} className="p-4">
            <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
              {cat.emoji} {cat.name}
            </h4>

            <div className="space-y-1">
              {cat.items.map((item, i) => {
                const key = `${cat.name}-${i}`
                const isChecked = checked[key] ?? false

                return (
                  <label
                    key={key}
                    className="flex items-center gap-3 py-1.5 cursor-pointer group"
                  >
                    {/* Custom checkbox */}
                    <div
                      className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                        isChecked
                          ? 'bg-amber-600 dark:bg-amber-500 border-amber-600 dark:border-amber-500'
                          : 'border-stone-300 dark:border-stone-600 group-hover:border-amber-400 dark:group-hover:border-amber-500'
                      }`}
                    >
                      {isChecked && (
                        <Check
                          size={12}
                          className="text-white dark:text-stone-900"
                          strokeWidth={3}
                        />
                      )}
                    </div>

                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => togglePacked(key, item.gearId, !isChecked)}
                      className="sr-only"
                    />

                    <div className="flex-1 min-w-0">
                      <span
                        className={`text-sm transition-colors ${
                          isChecked
                            ? 'line-through text-stone-400 dark:text-stone-600'
                            : 'text-stone-900 dark:text-stone-100'
                        }`}
                      >
                        {item.name}
                      </span>

                      {item.reason && (
                        <span className="text-xs text-stone-400 dark:text-stone-500 ml-1.5">
                          — {item.reason}
                        </span>
                      )}
                    </div>

                    {!item.fromInventory && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400 font-medium shrink-0">
                        add
                      </span>
                    )}
                  </label>
                )
              })}
            </div>

            {/* Add custom item */}
            {addingTo === cat.name ? (
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addCustomItem(cat.name)
                    if (e.key === 'Escape') {
                      setAddingTo(null)
                      setNewItemName('')
                    }
                  }}
                  placeholder="Item name..."
                  autoFocus
                  className="flex-1 px-2 py-1.5 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
                <button
                  onClick={() => addCustomItem(cat.name)}
                  className="text-amber-600 dark:text-amber-400 p-1.5"
                >
                  <Check size={16} />
                </button>
                <button
                  onClick={() => {
                    setAddingTo(null)
                    setNewItemName('')
                  }}
                  className="text-stone-400 dark:text-stone-500 p-1.5"
                >
                  <X size={16} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setAddingTo(cat.name)}
                className="text-xs text-stone-400 dark:text-stone-500 hover:text-amber-600 dark:hover:text-amber-400 flex items-center gap-1 mt-2 transition-colors"
              >
                <Plus size={12} />
                Add item
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Tips */}
      {packingList!.tips.length > 0 && (
        <div className="p-4 border-t border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            💡 Trip Tips
          </h4>
          <ul className="space-y-1.5">
            {packingList!.tips.map((tip, i) => (
              <li
                key={i}
                className="text-sm text-stone-600 dark:text-stone-300 flex gap-2"
              >
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
        title="Regenerate packing list?"
        message="This will replace your current packing list and reset all packed checkboxes. Custom items will be lost."
        confirmLabel="Regenerate"
        confirmVariant="danger"
      />
    </div>
  )
}
