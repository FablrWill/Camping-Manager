'use client'

import { useState } from 'react'
import { safeParseFloat } from '@/lib/validate'
import { CATEGORIES } from '@/lib/gear-categories'

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
}

interface ConditionOption {
  value: string
  label: string
}

interface GearFormProps {
  item: GearItem | null
  conditions: readonly ConditionOption[]
  onSave: (data: Record<string, unknown>) => Promise<void>
  onDelete?: () => void
  onClose: () => void
}

export default function GearForm({
  item,
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
      weight: safeParseFloat(form.get('weight')),
      storageLocation: form.get('storageLocation') || null,
      purchaseUrl: form.get('purchaseUrl') || null,
      price: safeParseFloat(form.get('price')),
      notes: form.get('notes') || null,
      wattage: safeParseFloat(form.get('wattage')),
      hoursPerDay: safeParseFloat(form.get('hoursPerDay')),
      hasBattery: form.get('hasBattery') === 'on',
      modelNumber: form.get('modelNumber') as string || null,
      connectivity: form.get('connectivity') as string || null,
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
              {CATEGORIES.map((cat) => (
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

          {/* Power fields: wattage + hours/day */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="gear-wattage" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Power draw (W)
              </label>
              <input
                id="gear-wattage"
                name="wattage"
                type="number"
                step="0.1"
                min="0"
                defaultValue={item?.wattage ?? ''}
                placeholder="e.g. 30"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
            <div>
              <label htmlFor="gear-hours" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Hours/day
              </label>
              <input
                id="gear-hours"
                name="hoursPerDay"
                type="number"
                step="0.5"
                min="0"
                max="24"
                defaultValue={item?.hoursPerDay ?? ''}
                placeholder="e.g. 6"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
          </div>

          {/* hasBattery checkbox */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                name="hasBattery"
                type="checkbox"
                defaultChecked={item?.hasBattery ?? false}
                className="mt-0.5 w-4 h-4 accent-emerald-600 shrink-0"
              />
              <div>
                <span className="text-sm font-medium text-stone-700 dark:text-stone-300">
                  Has internal battery
                </span>
                <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                  Adds this device to the &quot;Charge Before You Go&quot; checklist on trip cards
                </p>
              </div>
            </label>
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

          {/* Tech Details */}
          <div className="border-t border-stone-200 dark:border-stone-700 pt-4 mt-4">
            <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Tech Details (optional)</h3>

            <div className="space-y-3">
              <div>
                <label htmlFor="gear-modelNumber" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Model Number
                </label>
                <input
                  id="gear-modelNumber"
                  name="modelNumber"
                  type="text"
                  defaultValue={item?.modelNumber ?? ''}
                  placeholder="e.g. ESP32-WROOM-32"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
              </div>

              <div>
                <label htmlFor="gear-connectivity" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Connectivity
                </label>
                <input
                  id="gear-connectivity"
                  name="connectivity"
                  type="text"
                  defaultValue={item?.connectivity ?? ''}
                  placeholder="e.g. WiFi, Bluetooth"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
              </div>

            </div>
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
