'use client'

import { useState } from 'react'

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
}

interface CategoryOption {
  value: string
  label: string
  emoji: string
}

interface ConditionOption {
  value: string
  label: string
}

interface GearFormProps {
  item: GearItem | null
  categories: readonly CategoryOption[]
  conditions: readonly ConditionOption[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export default function GearForm({
  item,
  categories,
  conditions,
  onSave,
  onDelete,
  onClose,
}: GearFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const form = new FormData(e.currentTarget)

    const data: Record<string, unknown> = {
      name: form.get('name'),
      brand: form.get('brand') || null,
      category: form.get('category'),
      description: form.get('description') || null,
      condition: form.get('condition') || null,
      weight: form.get('weight') || null,
      storageLocation: form.get('storageLocation') || null,
      purchaseUrl: form.get('purchaseUrl') || null,
      price: form.get('price') || null,
      notes: form.get('notes') || null,
    }

    try {
      await onSave(data)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 dark:bg-black/70 flex items-end sm:items-center justify-center animate-fade-in">
      <div className="bg-white dark:bg-stone-900 rounded-t-2xl sm:rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-stone-900 border-b border-stone-200 dark:border-stone-700 px-4 py-3 flex items-center justify-between rounded-t-2xl z-10">
          <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50">
            {item ? 'Edit Gear' : 'Add Gear'}
          </h2>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-2xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Name — required */}
          <div>
            <label htmlFor="gear-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Name *
            </label>
            <input
              id="gear-name"
              name="name"
              type="text"
              required
              defaultValue={item?.name ?? ''}
              placeholder="e.g. REI Half Dome 2 Plus"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
            />
          </div>

          {/* Category — required */}
          <div>
            <label htmlFor="gear-category" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Category *
            </label>
            <select
              id="gear-category"
              name="category"
              required
              defaultValue={item?.category ?? ''}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="" disabled>
                Select a category
              </option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.emoji} {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Brand */}
          <div>
            <label htmlFor="gear-brand" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Brand
            </label>
            <input
              id="gear-brand"
              name="brand"
              type="text"
              defaultValue={item?.brand ?? ''}
              placeholder="e.g. REI Co-op"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
            />
          </div>

          {/* Condition */}
          <div>
            <label htmlFor="gear-condition" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Condition
            </label>
            <select
              id="gear-condition"
              name="condition"
              defaultValue={item?.condition ?? ''}
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 bg-white text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-400"
            >
              <option value="">Not specified</option>
              {conditions.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>

          {/* Weight + Price row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gear-weight" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Weight (lb)
              </label>
              <input
                id="gear-weight"
                name="weight"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item?.weight ?? ''}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="gear-price" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Price ($)
              </label>
              <input
                id="gear-price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                defaultValue={item?.price ?? ''}
                placeholder="0.00"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Storage location */}
          <div>
            <label htmlFor="gear-storage" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Storage Location
            </label>
            <input
              id="gear-storage"
              name="storageLocation"
              type="text"
              defaultValue={item?.storageLocation ?? ''}
              placeholder="e.g. Garage bin #3, Car trunk"
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
            />
          </div>

          {/* Purchase URL */}
          <div>
            <label htmlFor="gear-url" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Purchase Link
            </label>
            <input
              id="gear-url"
              name="purchaseUrl"
              type="url"
              defaultValue={item?.purchaseUrl ?? ''}
              placeholder="https://www.amazon.com/..."
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="gear-notes" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Notes
            </label>
            <textarea
              id="gear-notes"
              name="notes"
              rows={3}
              defaultValue={item?.notes ?? ''}
              placeholder="Any notes about this item..."
              className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 resize-none"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-red-600 dark:text-red-400 text-sm font-medium">{error}</p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2 pb-4">
            {item && onDelete && (
              <button
                type="button"
                onClick={onDelete}
                className="px-4 py-2.5 rounded-lg text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 font-medium transition-colors"
              >
                Delete
              </button>
            )}
            <div className="flex-1" />
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : item ? 'Update' : 'Add'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
