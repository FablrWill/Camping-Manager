'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Backpack, Car, MapPin, Tent, ChevronRight, Plus, Tag, ChevronDown, Compass } from 'lucide-react'
import { daysUntil } from '@/lib/trip-utils'
import { getCategoryEmoji } from '@/lib/gear-categories'
import AgentJobsBadge from './AgentJobsBadge'
import TripPrepStepper from './TripPrepStepper'
import DestinationDiscoverySheet from './DestinationDiscoverySheet'

interface DashboardStats {
  gearCount: number
  wishlistCount: number
  locationCount: number
  photoCount: number
  vehicleMods: number
  totalWeight: number
  tripCount: number
}

interface RecentGearItem {
  id: string
  name: string
  category: string
  brand: string | null
  condition: string | null
  updatedAt: string
}

interface UpcomingTrip {
  id: string
  name: string
  startDate: string
  endDate: string
  locationName: string | null
  mealPlanStatus: string | null
}

interface TripPrepStatus {
  tripId: string
  destination: boolean
  weather: boolean
  packing: boolean
  meals: boolean
  departure: boolean
}

interface ActiveDeal {
  id: string
  name: string
  targetPrice: number | null
  foundPriceRange: string | null
  foundPriceLow: number | null
}

export default function DashboardClient({
  stats,
  recentGear,
  upcomingTrip,
  tripPrepStatus,
  unreadJobCount,
  activeDeals = [],
}: {
  stats: DashboardStats
  recentGear: RecentGearItem[]
  upcomingTrip: UpcomingTrip | null
  tripPrepStatus: TripPrepStatus | null
  unreadJobCount?: number
  activeDeals?: ActiveDeal[]
}) {
  const [dealsOpen, setDealsOpen] = useState(false)
  const [showDiscovery, setShowDiscovery] = useState(false)

  return (
    <>
      {showDiscovery && (
        <DestinationDiscoverySheet onClose={() => setShowDiscovery(false)} />
      )}
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Hero */}
      <section className="text-center py-6 relative">
        <div className="absolute right-0 top-6">
          <AgentJobsBadge initialCount={unreadJobCount ?? 0} />
        </div>
        <h2 className="text-2xl font-bold text-stone-800 dark:text-stone-100 tracking-tight">
          Outland OS
        </h2>
        <p className="text-stone-500 dark:text-stone-400 text-sm mt-1">
          Your gear. Your rig. Your spots.
        </p>
      </section>

      {/* Upcoming trip card */}
      {upcomingTrip && (
        <Link href="/trips" className="block">
          <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-amber-600 dark:text-amber-400 font-medium uppercase tracking-wider">
                Next Trip — {daysUntil(upcomingTrip.startDate)} days away
              </p>
              <p className="text-base font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
                {upcomingTrip.name}
              </p>
              {upcomingTrip.locationName && (
                <p className="text-sm text-stone-500 dark:text-stone-400">{upcomingTrip.locationName}</p>
              )}
              {upcomingTrip.mealPlanStatus && (
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  {upcomingTrip.mealPlanStatus}
                </p>
              )}
            </div>
            <div className="text-amber-600 dark:text-amber-400 shrink-0 ml-3">
              <ChevronRight size={20} />
            </div>
          </div>
        </Link>
      )}

      {/* Trip prep stepper */}
      {tripPrepStatus && (
        <TripPrepStepper
          tripId={tripPrepStatus.tripId}
          steps={[
            { label: 'Destination', complete: tripPrepStatus.destination },
            { label: 'Weather', complete: tripPrepStatus.weather },
            { label: 'Packing', complete: tripPrepStatus.packing },
            { label: 'Meals', complete: tripPrepStatus.meals },
            { label: 'Departure', complete: tripPrepStatus.departure },
          ]}
        />
      )}

      {/* Quick stats row */}
      <section className="grid grid-cols-2 gap-3">
        <Link
          href="/gear"
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Backpack size={18} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Gear
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            {stats.gearCount}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {stats.totalWeight > 0
              ? `${stats.totalWeight.toFixed(1)} lb total`
              : 'items tracked'}
          </p>
        </Link>

        <Link
          href="/spots"
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center">
              <MapPin size={18} className="text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Spots
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            {stats.locationCount}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {stats.photoCount} photos
          </p>
        </Link>

        <Link
          href="/vehicle"
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-50 dark:bg-sky-900/30 flex items-center justify-center">
              <Car size={18} className="text-sky-600 dark:text-sky-400" />
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Vehicle
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            Santa Fe
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {stats.vehicleMods} mod{stats.vehicleMods !== 1 ? 's' : ''}
          </p>
        </Link>

        <Link
          href="/trips"
          className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
        >
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-orange-50 dark:bg-orange-900/30 flex items-center justify-center">
              <Tent size={18} className="text-orange-600 dark:text-orange-400" />
            </div>
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Trips
            </span>
          </div>
          <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
            {stats.tripCount}
          </p>
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
            {stats.tripCount === 1 ? 'trip planned' : 'trips planned'}
          </p>
        </Link>
      </section>

      {/* Wishlist callout */}
      {stats.wishlistCount > 0 && (
        <Link
          href="/gear"
          className="flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 hover:border-amber-400 dark:hover:border-amber-600 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🎁</span>
            <div>
              <p className="text-sm font-medium text-amber-900 dark:text-amber-200">
                {stats.wishlistCount} item{stats.wishlistCount !== 1 ? 's' : ''} on wish list
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Tap to browse your gear wants
              </p>
            </div>
          </div>
          <ChevronRight size={18} className="text-amber-400" />
        </Link>
      )}

      {/* Deals card — only when active deals exist */}
      {activeDeals.length > 0 && (
        <section className="bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800 rounded-xl overflow-hidden">
          <button
            onClick={() => setDealsOpen((prev) => !prev)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
          >
            <div className="flex items-center gap-2">
              <Tag size={16} className="text-emerald-600 dark:text-emerald-400" />
              <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                Deals ({activeDeals.length})
              </span>
              <span className="text-xs text-emerald-700 dark:text-emerald-400">
                — wishlist items at your target price
              </span>
            </div>
            <ChevronDown
              size={16}
              className={`text-emerald-500 transition-transform ${dealsOpen ? 'rotate-180' : ''}`}
            />
          </button>
          {dealsOpen && (
            <div className="divide-y divide-emerald-100 dark:divide-emerald-900 border-t border-emerald-200 dark:border-emerald-800">
              {activeDeals.map((deal) => (
                <Link
                  key={deal.id}
                  href="/gear"
                  className="flex items-center justify-between px-4 py-3 hover:bg-emerald-100 dark:hover:bg-emerald-900/20 transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate">
                      {deal.name}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      {deal.foundPriceRange && (
                        <span className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                          {deal.foundPriceRange}
                        </span>
                      )}
                      {deal.targetPrice != null && (
                        <span className="text-xs text-stone-500 dark:text-stone-400">
                          target: ${deal.targetPrice.toFixed(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <ChevronRight size={16} className="text-emerald-400 shrink-0 ml-2" />
                </Link>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Recent gear */}
      {recentGear.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Recently Updated Gear
            </h3>
            <Link
              href="/gear"
              className="text-xs text-amber-600 dark:text-amber-500 font-medium hover:text-amber-700 dark:hover:text-amber-400"
            >
              See all
            </Link>
          </div>
          <div className="space-y-2">
            {recentGear.map((item) => (
              <Link
                key={item.id}
                href="/gear"
                className="flex items-center gap-3 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
              >
                <span className="text-lg">{getCategoryEmoji(item.category)}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-stone-900 dark:text-stone-50 truncate">
                    {item.name}
                  </p>
                  <p className="text-xs text-stone-400 dark:text-stone-500">
                    {item.brand || item.category}
                  </p>
                </div>
                <ChevronRight size={16} className="text-stone-300 dark:text-stone-600 shrink-0" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Quick actions */}
      <section>
        <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-3">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <Link
            href="/gear"
            className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-600 dark:bg-amber-500 flex items-center justify-center">
              <Plus size={16} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Add Gear</span>
          </Link>

          <Link
            href="/spots"
            className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-600 dark:bg-emerald-500 flex items-center justify-center">
              <MapPin size={16} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Save Spot</span>
          </Link>

          <Link
            href="/trips"
            className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-orange-600 dark:bg-orange-500 flex items-center justify-center">
              <Tent size={16} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Plan Trip</span>
          </Link>

          <Link
            href="/spots"
            className="flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-600 dark:bg-sky-500 flex items-center justify-center">
              <MapPin size={16} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">View Map</span>
          </Link>

          <button
            onClick={() => setShowDiscovery(true)}
            className="col-span-2 flex items-center gap-2 bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-3 hover:border-amber-400 dark:hover:border-amber-500 transition-colors w-full"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-50 dark:bg-amber-900/30 flex items-center justify-center">
              <Compass size={16} className="text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-stone-700 dark:text-stone-300">Where should I go?</span>
          </button>
        </div>
      </section>
    </div>
    </>
  )
}
