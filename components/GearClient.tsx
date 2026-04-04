'use client'

import { useState, useMemo, useEffect } from 'react'
import GearForm from './GearForm'
import GearDocumentsTab from './GearDocumentsTab'
import GearResearchCard from './GearResearchCard'
import GearDealsTab from './GearDealsTab'
import GearROITab from './GearROITab'
import GearMaintenancePanel from './GearMaintenancePanel'
import GearLoanPanel from './GearLoanPanel'
import KitPresetsPanel from './KitPresetsPanel'
import ChatContextButton from '@/components/ChatContextButton'
import { CATEGORY_GROUPS, CATEGORIES, getCategoryEmoji, getCategoryLabel } from '@/lib/gear-categories'
import { FilterChip, Skeleton, EmptyState } from '@/components/ui'

interface GearItem {
  id: string
  name: string
  brand: string | null
  category: string
  description: string | null
  condition: string | null
  weight: number | null
  photoUrl: string | null
  storageLocation: string | null
  isWishlist: boolean
  purchaseUrl: string | null
  price: number | null
  notes: string | null
  wattage: number | null
  hoursPerDay: number | null
  hasBattery: boolean
  modelNumber: string | null
  connectivity: string | null
  researchResult: string | null
  researchedAt: string | null
  targetPrice: number | null
  priceCheck: { isAtOrBelowTarget: boolean } | null
  lastMaintenanceAt: string | null
  maintenanceIntervalDays: number | null
  createdAt: string
  updatedAt: string
}

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'worn', label: 'Worn' },
  { value: 'broken', label: 'Broken' },
] as const

function getConditionColor(condition: string | null): string {
  switch (condition) {
    case 'new':
      return 'text-emerald-700 bg-emerald-50'
    case 'good':
      return 'text-sky-700 bg-sky-50'
    case 'fair':
      return 'text-amber-700 bg-amber-50'
    case 'worn':
      return 'text-orange-700 bg-orange-50'
    case 'broken':
      return 'text-red-700 bg-red-50'
    default:
      return 'text-stone-500 bg-stone-50'
  }
}

function isMaintenanceOverdue(item: GearItem): boolean {
  if (!item.maintenanceIntervalDays || !item.lastMaintenanceAt) return false
  const dueDate = new Date(item.lastMaintenanceAt)
  dueDate.setDate(dueDate.getDate() + item.maintenanceIntervalDays)
  return dueDate < new Date()
}

export default function GearClient({
  initialItems,
  overdueMaintenanceCount,
  activeLoanCount,
}: {
  initialItems: GearItem[]
  overdueMaintenanceCount: number
  activeLoanCount: number
}) {
  const [items, setItems] = useState<GearItem[]>(initialItems)
  const [isLoading, setIsLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState<string | null>(null)
  const [showWishlist, setShowWishlist] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingItem, setEditingItem] = useState<GearItem | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [deletingItem, setDeletingItem] = useState<GearItem | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [isResearching, setIsResearching] = useState(false)
  const [showKits, setShowKits] = useState(false)
  const [detailTab, setDetailTab] = useState<'research' | 'documents' | 'deals' | 'roi' | 'maintenance' | 'loans'>('research')

  useEffect(() => {
    setIsLoading(false)
  }, [])

  // Filter items
  const filtered = useMemo(() => {
    return items.filter((item) => {
      if (item.isWishlist !== showWishlist) return false
      if (activeCategory && item.category !== activeCategory) return false
      if (searchQuery) {
        const q = searchQuery.toLowerCase()
        return (
          item.name.toLowerCase().includes(q) ||
          item.brand?.toLowerCase().includes(q) ||
          item.notes?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [items, activeCategory, showWishlist, searchQuery])

  // Group by category for the list view
  const grouped = useMemo(() => {
    const groups: Record<string, GearItem[]> = {}
    for (const item of filtered) {
      if (!groups[item.category]) groups[item.category] = []
      groups[item.category].push(item)
    }
    // Sort categories in the defined order
    const order: string[] = CATEGORIES.map((c) => c.value)
    return Object.entries(groups).sort(
      ([a], [b]) => order.indexOf(a) - order.indexOf(b)
    )
  }, [filtered])

  const ownedCount = items.filter((i) => !i.isWishlist).length
  const wishlistCount = items.filter((i) => i.isWishlist).length

  async function handleSave(data: Record<string, unknown>) {
    const isEditing = !!editingItem

    const res = await fetch(
      isEditing ? `/api/gear/${editingItem.id}` : '/api/gear',
      {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, isWishlist: showWishlist }),
      }
    )

    if (!res.ok) {
      throw new Error('Failed to save')
    }

    const saved = await res.json()

    if (isEditing) {
      setItems((prev) => prev.map((i) => (i.id === saved.id ? saved : i)))
    } else {
      setItems((prev) => [...prev, saved])

      // Auto-queue gear enrichment if brand and notes are both empty
      if (!saved.brand && !saved.notes) {
        fetch('/api/agent/jobs', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'gear_enrichment',
            triggeredBy: 'auto',
            payload: {
              gearItemId: saved.id,
              name: saved.name,
              category: saved.category,
            },
          }),
        }).catch(() => { /* fire-and-forget */ })
      }
    }

    setShowForm(false)
    setEditingItem(null)
  }

  async function handleDelete() {
    if (!deletingItem) return
    setIsDeleting(true)
    setDeleteError(null)

    try {
      const res = await fetch(`/api/gear/${deletingItem.id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setItems((prev) => prev.filter((i) => i.id !== deletingItem.id))
      setDeletingItem(null)
    } catch (err) {
      console.error(err)
      setDeleteError('Failed to delete item. Please try again.')
    } finally {
      setIsDeleting(false)
    }
  }

  async function handleResearch(): Promise<void> {
    if (!editingItem) return
    setIsResearching(true)
    try {
      const res = await fetch(`/api/gear/${editingItem.id}/research`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to research')
      const updated = await res.json()
      setItems((prev) => prev.map((i) => (i.id === updated.id ? updated : i)))
      setEditingItem(updated)
    } catch (err) {
      console.error(err)
    } finally {
      setIsResearching(false)
    }
  }

  function openEdit(item: GearItem) {
    setEditingItem(item)
    setDetailTab('research')
    setShowForm(true)
  }

  function openAdd() {
    setEditingItem(null)
    setShowForm(true)
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-stone-900 dark:text-stone-50 tracking-tight">
          {showWishlist ? 'Wish List' : 'My Gear'}
        </h1>
        <div className="flex gap-2">
          <button
            onClick={() => setShowKits(true)}
            className="border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 px-3 py-2 rounded-lg font-medium text-sm hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
          >
            Kits
          </button>
          <button
            onClick={openAdd}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium transition-colors"
          >
            + Add {showWishlist ? 'Wish' : 'Gear'}
          </button>
        </div>
      </div>

      {/* Overdue maintenance banner */}
      {overdueMaintenanceCount > 0 && (
        <div className="mb-4 rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400 flex items-center gap-2">
          <span>🔧</span>
          <span>
            <span className="font-semibold">{overdueMaintenanceCount} {overdueMaintenanceCount === 1 ? 'item' : 'items'}</span>{' '}
            due for maintenance — tap to service.
          </span>
        </div>
      )}

      {/* Active loans banner */}
      {activeLoanCount > 0 && (
        <div className="mb-4 rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-4 py-3 text-sm text-amber-700 dark:text-amber-400 flex items-center gap-2">
          <span>🤝</span>
          <span>
            <span className="font-semibold">{activeLoanCount} {activeLoanCount === 1 ? 'item' : 'items'}</span>{' '}
            currently on loan — open gear detail to manage.
          </span>
        </div>
      )}

      {/* Owned / Wishlist toggle */}
      <div className="flex gap-1 mb-4 bg-stone-200 dark:bg-stone-800 rounded-lg p-1">
        <button
          onClick={() => setShowWishlist(false)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            !showWishlist
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          Owned ({ownedCount})
        </button>
        <button
          onClick={() => setShowWishlist(true)}
          className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
            showWishlist
              ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
              : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
          }`}
        >
          Wish List ({wishlistCount})
        </button>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="Search gear..."
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        className="w-full px-3 py-2 mb-4 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
      />

      {/* Category filter chips — grouped */}
      <div className="mb-6">
        <div className="mb-2">
          <FilterChip
            label="All"
            active={!activeCategory}
            onClick={() => setActiveCategory(null)}
          />
        </div>
        {CATEGORY_GROUPS.map((group) => (
          <div key={group.name} className="mb-2">
            <div className="text-xs font-medium text-stone-500 dark:text-stone-400 mb-1 uppercase tracking-wide">
              {group.name}
            </div>
            <div className="flex flex-wrap gap-1">
              {group.categories.map((cat) => {
                const count = items.filter(
                  (i) => i.category === cat.value && i.isWishlist === showWishlist
                ).length
                if (count === 0) return null
                return (
                  <FilterChip
                    key={cat.value}
                    label={`${cat.emoji} ${cat.label} (${count})`}
                    active={activeCategory === cat.value}
                    onClick={() => setActiveCategory(activeCategory === cat.value ? null : cat.value)}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Gear list grouped by category */}
      {isLoading ? (
        <div className="space-y-2">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/5" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : grouped.length === 0 ? (
        searchQuery ? (
          <EmptyState
            emoji={showWishlist ? '🎁' : '🎒'}
            title="No items match your search"
          />
        ) : (
          <EmptyState
            emoji={showWishlist ? '🎁' : '🎒'}
            title={showWishlist ? 'Your wish list is empty' : 'No gear yet'}
            description={showWishlist ? 'Add items you want to buy' : 'Add your first item to get started'}
            action={{ label: `+ Add ${showWishlist ? 'Wish Item' : 'Gear'}`, onClick: openAdd }}
          />
        )
      ) : (
        <div className="space-y-6">
          {grouped.map(([category, categoryItems]) => (
            <div key={category}>
              {/* Category header (only if "All" is selected) */}
              {!activeCategory && (
                <h2 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
                  {getCategoryEmoji(category)} {getCategoryLabel(category)} ({categoryItems.length})
                </h2>
              )}
              <div className="space-y-2">
                {categoryItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => openEdit(item)}
                    className="w-full text-left bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 hover:border-amber-400 dark:hover:border-amber-500 p-4 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <span className="font-semibold text-stone-900 dark:text-stone-50 truncate">
                            {item.name}
                          </span>
                          {item.condition && (
                            <span
                              className={`text-xs px-2 py-0.5 rounded-full font-medium ${getConditionColor(item.condition)}`}
                            >
                              {item.condition}
                            </span>
                          )}
                          {item.isWishlist && item.priceCheck?.isAtOrBelowTarget && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Deal!
                            </span>
                          )}
                          {item.isWishlist && item.targetPrice != null && !item.priceCheck?.isAtOrBelowTarget && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                              Target: ${item.targetPrice.toFixed(0)}
                            </span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-stone-500 dark:text-stone-400">
                          {item.brand && <span>{item.brand}</span>}
                          {item.weight && <span>{item.weight} lb</span>}
                          {item.storageLocation && (
                            <span>📍 {item.storageLocation}</span>
                          )}
                          {item.price && (
                            <span className={showWishlist ? 'font-medium text-stone-700 dark:text-stone-300' : ''}>
                              ${item.price.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p className="text-sm text-stone-400 dark:text-stone-500 mt-1 line-clamp-1">
                            {item.notes}
                          </p>
                        )}
                      </div>
                      {/* Purchase link indicator */}
                      {item.purchaseUrl && (
                        <span className="text-stone-300 text-lg shrink-0" title="Has purchase link">
                          🔗
                        </span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary footer */}
      {filtered.length > 0 && (
        <div className="mt-8 text-center text-sm text-stone-400 dark:text-stone-500">
          {filtered.length} item{filtered.length !== 1 ? 's' : ''}
          {items.some((i) => i.weight && !i.isWishlist) && !showWishlist && (
            <>
              {' · '}
              {filtered
                .reduce((sum, i) => sum + (i.weight ?? 0), 0)
                .toFixed(1)}{' '}
              lb total
            </>
          )}
        </div>
      )}

      {/* Context-aware FAB — show when editing a gear item */}
      {editingItem && (
        <ChatContextButton contextType="gear" contextId={editingItem.id} />
      )}

      {/* Add/Edit form modal */}
      {showForm && (
        <GearForm
          item={editingItem}
          categories={CATEGORIES}
          conditions={CONDITIONS}
          onSave={handleSave}
          onDelete={editingItem ? () => setDeletingItem(editingItem) : undefined}
          onClose={() => {
            setShowForm(false)
            setEditingItem(null)
          }}
          extraContent={editingItem ? (
            <div className="border-t border-stone-200 dark:border-stone-700 pt-4 mt-2">
              {/* Tab bar */}
              <div className="flex gap-1 mb-4 bg-stone-100 dark:bg-stone-800 rounded-lg p-1">
                <button
                  type="button"
                  onClick={() => setDetailTab('research')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                    detailTab === 'research'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  Research
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('documents')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                    detailTab === 'documents'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  Docs
                </button>
                {editingItem.isWishlist && (
                  <button
                    type="button"
                    onClick={() => setDetailTab('deals')}
                    className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                      detailTab === 'deals'
                        ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                        : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                    }`}
                  >
                    Deals
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setDetailTab('roi')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                    detailTab === 'roi'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  ROI
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('maintenance')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors relative ${
                    detailTab === 'maintenance'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  Maint.
                  {isMaintenanceOverdue(editingItem) && (
                    <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-red-500 rounded-full" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setDetailTab('loans')}
                  className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
                    detailTab === 'loans'
                      ? 'bg-white dark:bg-stone-700 text-stone-900 dark:text-stone-50 shadow-sm'
                      : 'text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-300'
                  }`}
                >
                  Loans
                </button>
              </div>

              {/* Tab content */}
              {detailTab === 'research' && (
                <GearResearchCard
                  researchResult={editingItem.researchResult}
                  researchedAt={editingItem.researchedAt}
                  onResearch={handleResearch}
                  isResearching={isResearching}
                />
              )}
              {detailTab === 'documents' && (
                <GearDocumentsTab
                  gearItemId={editingItem.id}
                  gearName={editingItem.name}
                  gearBrand={editingItem.brand}
                  gearModelNumber={editingItem.modelNumber}
                  gearCategory={editingItem.category}
                />
              )}
              {detailTab === 'deals' && editingItem.isWishlist && (
                <GearDealsTab
                  gearItem={{
                    id: editingItem.id,
                    name: editingItem.name,
                    brand: editingItem.brand,
                    modelNumber: editingItem.modelNumber,
                    category: editingItem.category,
                    price: editingItem.price,
                    targetPrice: editingItem.targetPrice,
                    isWishlist: editingItem.isWishlist,
                  }}
                />
              )}
              {detailTab === 'roi' && (
                <GearROITab
                  gearItemId={editingItem.id}
                  gearName={editingItem.name}
                />
              )}
              {detailTab === 'maintenance' && (
                <GearMaintenancePanel gearItemId={editingItem.id} />
              )}
              {detailTab === 'loans' && (
                <GearLoanPanel gearItemId={editingItem.id} />
              )}
            </div>
          ) : undefined}
        />
      )}

      {/* Delete confirmation */}
      {deletingItem && (
        <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center p-4 animate-fade-in">
          <div className="bg-white dark:bg-stone-900 rounded-2xl w-full max-w-sm p-6 shadow-xl animate-slide-up">
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-50 mb-2">
              Delete {deletingItem.name}?
            </h3>
            <p className="text-stone-500 dark:text-stone-400 mb-4">
              This will permanently remove this item from your{' '}
              {deletingItem.isWishlist ? 'wish list' : 'gear inventory'}.
            </p>
            {deleteError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2 mb-4">
                {deleteError}
              </p>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => { setDeletingItem(null); setDeleteError(null) }}
                className="flex-1 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
              >
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Kit Presets Panel */}
      {showKits && (
        <KitPresetsPanel
          allGear={items.filter((i) => !i.isWishlist).map((i) => ({
            id: i.id,
            name: i.name,
            category: i.category,
            brand: i.brand,
          }))}
          onClose={() => setShowKits(false)}
        />
      )}
    </div>
  )
}
