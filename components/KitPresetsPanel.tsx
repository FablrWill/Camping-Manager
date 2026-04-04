'use client'

import { useState, useEffect, useCallback } from 'react'
import { getCategoryEmoji } from '@/lib/gear-categories'

interface KitPreset {
  id: string
  name: string
  description: string | null
  gearIds: string // JSON array
  createdAt: string
  updatedAt: string
}

interface GearItem {
  id: string
  name: string
  category: string
  brand: string | null
}

interface KitPresetsPanelProps {
  allGear: GearItem[]
  onClose: () => void
}

export default function KitPresetsPanel({ allGear, onClose }: KitPresetsPanelProps) {
  const [kits, setKits] = useState<KitPreset[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [editingKit, setEditingKit] = useState<KitPreset | null>(null)

  // Create form state
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [selectedGearIds, setSelectedGearIds] = useState<Set<string>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  function startCreate() {
    setCreating(true)
    setEditingKit(null)
    setName('')
    setDescription('')
    setSelectedGearIds(new Set())
    setError(null)
  }

  function startEdit(kit: KitPreset) {
    setCreating(false)
    setEditingKit(kit)
    setName(kit.name)
    setDescription(kit.description ?? '')
    const ids = JSON.parse(kit.gearIds) as string[]
    setSelectedGearIds(new Set(ids))
    setError(null)
  }

  function cancelForm() {
    setCreating(false)
    setEditingKit(null)
  }

  function toggleGear(gearId: string) {
    setSelectedGearIds((prev) => {
      const next = new Set(prev)
      if (next.has(gearId)) {
        next.delete(gearId)
      } else {
        next.add(gearId)
      }
      return next
    })
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('Kit name is required')
      return
    }
    if (selectedGearIds.size === 0) {
      setError('Select at least one gear item')
      return
    }

    setSaving(true)
    setError(null)

    const body = {
      name: name.trim(),
      description: description.trim() || null,
      gearIds: [...selectedGearIds],
    }

    try {
      if (editingKit) {
        const res = await fetch(`/api/kits/${editingKit.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to update kit')
      } else {
        const res = await fetch('/api/kits', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        if (!res.ok) throw new Error('Failed to create kit')
      }
      cancelForm()
      await fetchKits()
    } catch {
      setError('Failed to save kit')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(kitId: string) {
    try {
      await fetch(`/api/kits/${kitId}`, { method: 'DELETE' })
      setKits((prev) => prev.filter((k) => k.id !== kitId))
      if (editingKit?.id === kitId) cancelForm()
    } catch {
      // non-fatal
    }
  }

  const filteredGear = allGear.filter((g) =>
    !searchTerm || g.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (g.brand && g.brand.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Group gear by category for display
  const gearByCategory = filteredGear.reduce<Record<string, GearItem[]>>((acc, item) => {
    const cat = item.category
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(item)
    return acc
  }, {})

  const showForm = creating || editingKit

  function getGearNames(gearIdsJson: string): string {
    const ids = JSON.parse(gearIdsJson) as string[]
    const gearMap = new Map(allGear.map((g) => [g.id, g]))
    return ids
      .map((id) => gearMap.get(id))
      .filter(Boolean)
      .map((g) => g!.name)
      .join(', ')
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
            Kit Presets
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Kit list */}
          {!showForm && (
            <>
              {loading ? (
                <p className="text-sm text-stone-400 dark:text-stone-500">Loading kits...</p>
              ) : kits.length === 0 ? (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  No kits yet. Create one to save a reusable gear loadout.
                </p>
              ) : (
                <div className="space-y-2">
                  {kits.map((kit) => {
                    const count = (JSON.parse(kit.gearIds) as string[]).length
                    return (
                      <div
                        key={kit.id}
                        className="border border-stone-200 dark:border-stone-700 rounded-xl p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h3 className="font-semibold text-stone-900 dark:text-stone-50 text-sm">
                              {kit.name}
                            </h3>
                            {kit.description && (
                              <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                                {kit.description}
                              </p>
                            )}
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                              {count} item{count !== 1 ? 's' : ''}
                            </p>
                            <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5 truncate">
                              {getGearNames(kit.gearIds)}
                            </p>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <button
                              onClick={() => startEdit(kit)}
                              className="px-2 py-1 text-xs text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/30 rounded-lg transition-colors"
                            >
                              Edit
                            </button>
                            <button
                              onClick={() => void handleDelete(kit.id)}
                              className="px-2 py-1 text-xs text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              <button
                onClick={startCreate}
                className="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium text-sm transition-colors"
              >
                + New Kit
              </button>
            </>
          )}

          {/* Create/Edit form */}
          {showForm && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Kit Name *
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekend Warrior"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Quick overnighter loadout"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
                />
              </div>

              {/* Gear picker */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm font-medium text-stone-700 dark:text-stone-300">
                    Gear Items ({selectedGearIds.size} selected)
                  </label>
                </div>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search gear..."
                  className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 mb-2"
                />
                <div className="max-h-60 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-lg">
                  {Object.entries(gearByCategory).sort(([a], [b]) => a.localeCompare(b)).map(([cat, items]) => (
                    <div key={cat}>
                      <div className="sticky top-0 bg-stone-100 dark:bg-stone-800 px-3 py-1 text-xs font-semibold text-stone-600 dark:text-stone-400">
                        {getCategoryEmoji(cat)} {cat}
                      </div>
                      {items.map((g) => (
                        <label
                          key={g.id}
                          className="flex items-center gap-2 px-3 py-1.5 hover:bg-stone-50 dark:hover:bg-stone-800/50 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={selectedGearIds.has(g.id)}
                            onChange={() => toggleGear(g.id)}
                            className="rounded border-stone-300 dark:border-stone-600 accent-amber-600"
                          />
                          <span className="text-sm text-stone-800 dark:text-stone-200 truncate">
                            {g.name}
                            {g.brand && (
                              <span className="text-stone-400 dark:text-stone-500"> — {g.brand}</span>
                            )}
                          </span>
                        </label>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  onClick={cancelForm}
                  className="flex-1 py-2.5 rounded-xl border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium text-sm disabled:opacity-50 transition-colors"
                >
                  {saving ? 'Saving...' : editingKit ? 'Update Kit' : 'Create Kit'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
