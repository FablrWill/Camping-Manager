'use client'

import { useState, useEffect, useCallback } from 'react'
import { RefreshCw, Tag, AlertTriangle, CheckCircle, Store } from 'lucide-react'

interface PriceCheck {
  id: string
  gearItemId: string
  foundPriceRange: string
  foundPriceLow: number
  retailers: string
  disclaimer: string
  isAtOrBelowTarget: boolean
  checkedAt: string
}

interface GearDealsTabProps {
  gearItem: {
    id: string
    name: string
    brand: string | null
    modelNumber: string | null
    category: string
    price: number | null
    targetPrice: number | null
    isWishlist: boolean
  }
}

function isStale(checkedAt: string): boolean {
  const daysAgo = (Date.now() - new Date(checkedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysAgo > 30
}

function parseRetailers(retailers: string): string[] {
  try {
    const parsed = JSON.parse(retailers)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export default function GearDealsTab({ gearItem }: GearDealsTabProps) {
  const [loading, setLoading] = useState(false)
  const [checking, setChecking] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [priceCheck, setPriceCheck] = useState<PriceCheck | null>(null)

  const fetchPriceCheck = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItem.id}/price-check`)
      if (res.status === 404) {
        setPriceCheck(null)
        return
      }
      if (!res.ok) throw new Error('Failed to fetch price check')
      const data = await res.json() as PriceCheck
      setPriceCheck(data)
    } catch {
      setError('Could not load price check data.')
    } finally {
      setLoading(false)
    }
  }, [gearItem.id])

  useEffect(() => {
    void fetchPriceCheck()
  }, [fetchPriceCheck])

  async function handleCheckPrice() {
    setChecking(true)
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItem.id}/price-check`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to check price')
      const data = await res.json() as PriceCheck
      setPriceCheck(data)
    } catch {
      setError('Price check failed. Please try again.')
    } finally {
      setChecking(false)
    }
  }

  if (!gearItem.isWishlist) {
    return null
  }

  // No target price set — show prompt, no check button
  if (gearItem.targetPrice == null) {
    return (
      <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-4">
        No target price set. Add a target price in the item&apos;s edit form to enable deal monitoring.
      </p>
    )
  }

  const retailers = priceCheck ? parseRetailers(priceCheck.retailers) : []
  const stale = priceCheck ? isStale(priceCheck.checkedAt) : false

  return (
    <div className="space-y-3">
      {/* Stale banner */}
      {stale && (
        <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            Price data is over 30 days old — consider re-checking.
          </p>
        </div>
      )}

      {/* No price check yet */}
      {!loading && !priceCheck && (
        <p className="text-sm text-stone-400 dark:text-stone-500 text-center py-2">
          No price check yet.
        </p>
      )}

      {/* Check / Re-check Price button */}
      <button
        onClick={handleCheckPrice}
        disabled={checking || loading}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-amber-600 dark:bg-amber-500 rounded-xl text-sm font-medium text-white dark:text-stone-900 hover:bg-amber-700 dark:hover:bg-amber-400 transition-colors disabled:opacity-50"
      >
        {checking ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Checking price...
          </>
        ) : (
          <>
            <Tag size={16} />
            {priceCheck ? 'Re-check price' : 'Check price'}
          </>
        )}
      </button>

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {loading && !priceCheck && (
        <p className="text-sm text-stone-400 dark:text-stone-500 animate-pulse text-center py-2">
          Loading...
        </p>
      )}

      {priceCheck && (
        <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-stone-400" />
              <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                Deal Check
              </span>
              {priceCheck.isAtOrBelowTarget ? (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                  <CheckCircle size={10} />
                  Deal!
                </span>
              ) : (
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400">
                  No deal yet
                </span>
              )}
            </div>
          </div>

          {/* Price info */}
          <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-xs text-stone-500 dark:text-stone-400">Found price range</span>
              <span className="text-sm font-semibold text-stone-800 dark:text-stone-200">
                {priceCheck.foundPriceRange}
              </span>
            </div>
            {gearItem.targetPrice != null && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-stone-500 dark:text-stone-400">Your target</span>
                <span className={`text-sm font-medium ${priceCheck.isAtOrBelowTarget ? 'text-emerald-600 dark:text-emerald-400' : 'text-stone-600 dark:text-stone-300'}`}>
                  ${gearItem.targetPrice.toFixed(2)}
                </span>
              </div>
            )}
          </div>

          {/* Retailers */}
          {retailers.length > 0 && (
            <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
              <div className="flex items-center gap-2 mb-1.5">
                <Store size={12} className="text-stone-400" />
                <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                  Retailers
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {retailers.map((retailer, i) => (
                  <span
                    key={i}
                    className="text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300"
                  >
                    {retailer}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="px-4 py-2 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-700 space-y-1">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Checked {new Date(priceCheck.checkedAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-stone-400 dark:text-stone-500 italic">
              {priceCheck.disclaimer}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
