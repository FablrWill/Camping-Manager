'use client'

import { useRef, useState } from 'react'
import { safeParseFloat } from '@/lib/validate'

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
  targetPrice: number | null
  notes: string | null
  wattage: number | null
  hoursPerDay: number | null
  hasBattery: boolean
  modelNumber: string | null
  connectivity: string | null
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
  extraContent?: React.ReactNode
}

async function resizeImageToBase64(
  file: File,
  maxWidth = 1200
): Promise<{ base64: string; mimeType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.width)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      const ctx = canvas.getContext('2d')
      if (!ctx) { reject(new Error('Canvas not available')); return }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
      URL.revokeObjectURL(img.src)
      resolve({ base64: dataUrl.split(',')[1], mimeType: 'image/jpeg' })
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); reject(new Error('Image load failed')) }
    img.src = URL.createObjectURL(file)
  })
}

export default function GearForm({
  item,
  categories,
  conditions,
  onSave,
  onDelete,
  onClose,
  extraContent,
}: GearFormProps) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Controlled fields so AI can pre-fill them
  const [name, setName] = useState(item?.name ?? '')
  const [brand, setBrand] = useState(item?.brand ?? '')
  const [category, setCategory] = useState(item?.category ?? '')
  const [condition, setCondition] = useState(item?.condition ?? '')
  const [description, setDescription] = useState(item?.description ?? '')
  const [weight, setWeight] = useState(item?.weight?.toString() ?? '')
  const [price, setPrice] = useState(item?.price?.toString() ?? '')
  const [targetPrice, setTargetPrice] = useState(item?.targetPrice?.toString() ?? '')
  const [wattage, setWattage] = useState(item?.wattage?.toString() ?? '')
  const [hoursPerDay, setHoursPerDay] = useState(item?.hoursPerDay?.toString() ?? '')
  const [hasBattery, setHasBattery] = useState(item?.hasBattery ?? false)
  const [storageLocation, setStorageLocation] = useState(item?.storageLocation ?? '')
  const [purchaseUrl, setPurchaseUrl] = useState(item?.purchaseUrl ?? '')
  const [notes, setNotes] = useState(item?.notes ?? '')
  const [modelNumber, setModelNumber] = useState(item?.modelNumber ?? '')
  const [connectivity, setConnectivity] = useState(item?.connectivity ?? '')

  // isWishlist is read from item prop for conditional display
  const isWishlist = item?.isWishlist ?? false

  // AI identification state
  const [identifyTab, setIdentifyTab] = useState<'url' | 'photo'>('url')
  const [urlInput, setUrlInput] = useState('')
  const [identifying, setIdentifying] = useState(false)
  const [identifyError, setIdentifyError] = useState<string | null>(null)
  const [identifiedName, setIdentifiedName] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function applyIdentifyResult(data: Record<string, unknown>) {
    if (typeof data.name === 'string' && data.name) setName(data.name)
    if (typeof data.brand === 'string') setBrand(data.brand)
    if (typeof data.category === 'string' && categories.some((c) => c.value === data.category)) {
      setCategory(data.category as string)
    }
    if (typeof data.description === 'string') setDescription(data.description)
    if (typeof data.weight === 'number') setWeight(String(data.weight))
    if (typeof data.price === 'number') setPrice(String(data.price))
    if (typeof data.notes === 'string') setNotes(data.notes)
    if (typeof data.wattage === 'number') setWattage(String(data.wattage))
    if (typeof data.purchaseUrl === 'string' && data.purchaseUrl) setPurchaseUrl(data.purchaseUrl)
    setIdentifiedName(typeof data.name === 'string' ? data.name : null)
  }

  async function handleIdentifyUrl() {
    const trimmed = urlInput.trim()
    if (!trimmed) return
    setIdentifying(true)
    setIdentifyError(null)
    setIdentifiedName(null)
    try {
      const res = await fetch('/api/gear/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? 'Failed'))
      applyIdentifyResult(data)
    } catch {
      setIdentifyError('Could not identify gear from that link. Try uploading a photo instead.')
    } finally {
      setIdentifying(false)
    }
  }

  async function handleIdentifyImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIdentifying(true)
    setIdentifyError(null)
    setIdentifiedName(null)
    try {
      const { base64, mimeType } = await resizeImageToBase64(file)
      const res = await fetch('/api/gear/identify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: base64, mimeType }),
      })
      const data = await res.json() as Record<string, unknown>
      if (!res.ok) throw new Error(String(data.error ?? 'Failed'))
      applyIdentifyResult(data)
    } catch {
      setIdentifyError('Could not identify gear from that image. Try a clearer photo.')
    } finally {
      setIdentifying(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)
    setError(null)

    const data: Record<string, unknown> = {
      name,
      brand: brand || null,
      category,
      description: description || null,
      condition: condition || null,
      weight: safeParseFloat(weight),
      storageLocation: storageLocation || null,
      purchaseUrl: purchaseUrl || null,
      price: safeParseFloat(price),
      targetPrice: safeParseFloat(targetPrice),
      notes: notes || null,
      wattage: safeParseFloat(wattage),
      hoursPerDay: safeParseFloat(hoursPerDay),
      hasBattery,
      modelNumber: modelNumber || null,
      connectivity: connectivity || null,
    }

    try {
      await onSave(data)
    } catch {
      setError('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const inputClass =
    'w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500'

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
          {/* AI Identification — only for new gear */}
          {!item && (
            <div className="rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/40 p-3 space-y-2.5">
              <p className="text-xs font-semibold text-amber-800 dark:text-amber-400 uppercase tracking-wide">
                Add with AI
              </p>

              {/* Tabs */}
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setIdentifyTab('url')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    identifyTab === 'url'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  Paste a link
                </button>
                <button
                  type="button"
                  onClick={() => setIdentifyTab('photo')}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    identifyTab === 'photo'
                      ? 'bg-amber-600 text-white'
                      : 'text-amber-700 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/40'
                  }`}
                >
                  Upload photo
                </button>
              </div>

              {identifyTab === 'url' && (
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); void handleIdentifyUrl() } }}
                    placeholder="https://www.amazon.com/..."
                    className="flex-1 px-3 py-2 rounded-lg border border-amber-300 dark:border-amber-700 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
                  />
                  <button
                    type="button"
                    onClick={handleIdentifyUrl}
                    disabled={identifying || !urlInput.trim()}
                    className="px-3 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium disabled:opacity-50 transition-colors shrink-0"
                  >
                    {identifying ? '...' : 'Go'}
                  </button>
                </div>
              )}

              {identifyTab === 'photo' && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleIdentifyImage}
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={identifying}
                    className="w-full px-3 py-2 rounded-lg border-2 border-dashed border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-400 text-sm font-medium hover:bg-amber-100 dark:hover:bg-amber-900/30 disabled:opacity-50 transition-colors"
                  >
                    {identifying ? 'Identifying...' : 'Choose photo or screenshot'}
                  </button>
                  <p className="text-xs text-amber-600 dark:text-amber-500 mt-1">
                    Works with Amazon screenshots, gear photos, or product images
                  </p>
                </div>
              )}

              {identifying && (
                <p className="text-xs text-amber-700 dark:text-amber-400 animate-pulse">
                  Identifying gear...
                </p>
              )}

              {identifiedName && !identifying && (
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                  Found: {identifiedName} — fields pre-filled below
                </p>
              )}

              {identifyError && (
                <p className="text-xs text-red-600 dark:text-red-400">{identifyError}</p>
              )}
            </div>
          )}

          {/* Name */}
          <div>
            <label htmlFor="gear-name" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Name *
            </label>
            <input
              id="gear-name"
              name="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. REI Half Dome 2 Plus"
              className={inputClass}
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="gear-category" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Category *
            </label>
            <select
              id="gear-category"
              name="category"
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
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
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              placeholder="e.g. REI Co-op"
              className={inputClass}
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
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
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

          {/* Weight + Price */}
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
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="0.00"
                className={inputClass}
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
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                className={inputClass}
              />
            </div>
          </div>

          {/* Target Price — wishlist items only */}
          {isWishlist && (
            <div>
              <label htmlFor="gear-target-price" className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Target price ($)
              </label>
              <input
                id="gear-target-price"
                name="targetPrice"
                type="number"
                step="0.01"
                min="0"
                value={targetPrice}
                onChange={(e) => setTargetPrice(e.target.value)}
                placeholder="e.g. 299.00"
                className={inputClass}
              />
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-1">
                Set a deal alert threshold — Claude will flag when prices drop to this level
              </p>
            </div>
          )}

          {/* Power fields */}
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
                value={wattage}
                onChange={(e) => setWattage(e.target.value)}
                placeholder="e.g. 30"
                className={inputClass}
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
                value={hoursPerDay}
                onChange={(e) => setHoursPerDay(e.target.value)}
                placeholder="e.g. 6"
                className={inputClass}
              />
            </div>
          </div>

          {/* hasBattery */}
          <div>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                name="hasBattery"
                type="checkbox"
                checked={hasBattery}
                onChange={(e) => setHasBattery(e.target.checked)}
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
              value={storageLocation}
              onChange={(e) => setStorageLocation(e.target.value)}
              placeholder="e.g. Garage bin #3, Car trunk"
              className={inputClass}
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
              value={purchaseUrl}
              onChange={(e) => setPurchaseUrl(e.target.value)}
              placeholder="https://www.amazon.com/..."
              className={inputClass}
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
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
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
                  type="text"
                  value={modelNumber}
                  onChange={(e) => setModelNumber(e.target.value)}
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
                  type="text"
                  value={connectivity}
                  onChange={(e) => setConnectivity(e.target.value)}
                  placeholder="e.g. WiFi, Bluetooth"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
              </div>
            </div>
          </div>

          {/* Extra content slot (e.g. GearDocumentsTab) */}
          {extraContent}

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
