'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, X } from 'lucide-react'

interface KitPreset {
  id: string
  name: string
  gearIds: string // JSON array
}

interface KitStackPanelProps {
  tripId: string
  onClose: () => void
  onApplied: (kits: Array<{ id: string; name: string; gearIds: string[] }>) => void
}

export default function KitStackPanel({ tripId, onClose, onApplied }: KitStackPanelProps) {
  const [kits, setKits] = useState<KitPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedKitIds, setSelectedKitIds] = useState<Set<string>>(new Set())
  const [applying, setApplying] = useState(false)

  const fetchKits = useCallback(async () => {
    try {
      const res = await fetch('/api/kits')
      if (res.ok) {
        const data = await res.json() as KitPreset[]
        setKits(data)
      }
    } catch {
      // non-fatal
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchKits() }, [fetchKits])

  function toggleKit(kitId: string) {
    setSelectedKitIds((prev) => {
      const next = new Set(prev)
      if (next.has(kitId)) {
        next.delete(kitId)
      } else {
        next.add(kitId)
      }
      return next
    })
  }

  async function handleApply() {
    if (selectedKitIds.size === 0) return
    setApplying(true)
    try {
      const selectedKits = kits.filter(k => selectedKitIds.has(k.id))
      // Apply each selected kit sequentially
      for (const kit of selectedKits) {
        await fetch(`/api/kits/${kit.id}/apply`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tripId }),
        })
      }
      onApplied(
        selectedKits.map(k => ({
          id: k.id,
          name: k.name,
          gearIds: JSON.parse(k.gearIds) as string[],
        }))
      )
      onClose()
    } catch {
      // non-fatal — parent will handle via onApplied not being called
    } finally {
      setApplying(false)
    }
  }

  const selectedKits = kits.filter(k => selectedKitIds.has(k.id))

  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center animate-fade-in"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
            Apply Kit Presets
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 p-1 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-stone-400 dark:text-stone-500">
              <Loader2 size={14} className="animate-spin" />
              Loading kits...
            </div>
          ) : kits.length === 0 ? (
            <div className="py-6 text-center space-y-1">
              <p className="text-sm font-semibold text-stone-700 dark:text-stone-300">
                No kit presets yet
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Create one from the Gear page to save a reusable loadout.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {kits.map((kit) => {
                const count = (JSON.parse(kit.gearIds) as string[]).length
                const isSelected = selectedKitIds.has(kit.id)
                return (
                  <label
                    key={kit.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      isSelected
                        ? 'border-amber-400 dark:border-amber-500 bg-amber-50 dark:bg-amber-950/30'
                        : 'border-stone-200 dark:border-stone-700 hover:bg-stone-50 dark:hover:bg-stone-800/50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggleKit(kit.id)}
                      className="accent-amber-600 w-4 h-4 shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">
                        {kit.name}
                      </span>
                      <span className="text-xs text-stone-400 dark:text-stone-500 ml-2">
                        {count} item{count !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </label>
                )
              })}
            </div>
          )}

          {/* Selection preview */}
          {selectedKits.length > 0 && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              <span className="font-medium">Will apply:</span>{' '}
              {selectedKits.map(k => k.name).join(', ')}
            </p>
          )}

          {/* Apply button */}
          {kits.length > 0 && (
            <button
              onClick={() => void handleApply()}
              disabled={selectedKitIds.size === 0 || applying}
              className="w-full py-3 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              {applying ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Applying...
                </>
              ) : (
                'Apply Kits'
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
