'use client'

import { useState } from 'react'
import { Zap, Tag, Wrench, CloudRain, ChevronDown } from 'lucide-react'
import type { WeeklyBriefingResult } from '@/lib/agent/jobs/weekly-briefing'

interface IntelligenceCardProps {
  briefing: WeeklyBriefingResult | null
}

export default function IntelligenceCard({ briefing }: IntelligenceCardProps) {
  const [dealsOpen, setDealsOpen] = useState(false)
  const [maintenanceOpen, setMaintenanceOpen] = useState(false)
  const [weatherOpen, setWeatherOpen] = useState(false)

  if (!briefing) return null

  const allClear =
    briefing.deals.count === 0 &&
    briefing.maintenance.overdueCount === 0 &&
    briefing.weather.alertCount === 0

  return (
    <section className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/30 flex items-center justify-center">
          <Zap size={15} className="text-violet-600 dark:text-violet-400" />
        </div>
        <span className="text-sm font-semibold text-stone-700 dark:text-stone-300">Intel</span>
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-auto">
          {new Date(briefing.generatedAt).toLocaleDateString()}
        </span>
      </div>

      {allClear ? (
        <div className="px-4 py-3 text-sm text-stone-500 dark:text-stone-400">
          All clear — no deals, overdue maintenance, or weather alerts.
        </div>
      ) : (
        <div className="divide-y divide-stone-100 dark:divide-stone-800">
          {/* Deals section */}
          <div>
            <button
              onClick={() => setDealsOpen((prev) => !prev)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
            >
              <Tag size={14} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 flex-1">
                Deals
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                briefing.deals.count > 0
                  ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}>
                {briefing.deals.count}
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-400 transition-transform ml-1 ${dealsOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {dealsOpen && (
              <div className="px-4 pb-3 space-y-1.5">
                {briefing.deals.nearTarget.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500">No items near target price.</p>
                ) : (
                  briefing.deals.nearTarget.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 dark:text-stone-300 truncate mr-2">
                        {item.name}
                      </span>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">
                          ~${item.estimatedPrice.toFixed(2)}
                        </span>
                        <span className="text-xs text-stone-400 dark:text-stone-500 ml-1">
                          / ${item.targetPrice.toFixed(2)} target
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Maintenance section */}
          <div>
            <button
              onClick={() => setMaintenanceOpen((prev) => !prev)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
            >
              <Wrench size={14} className="text-amber-600 dark:text-amber-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 flex-1">
                Maintenance
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                briefing.maintenance.overdueCount > 0
                  ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}>
                {briefing.maintenance.overdueCount}
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-400 transition-transform ml-1 ${maintenanceOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {maintenanceOpen && (
              <div className="px-4 pb-3 space-y-1.5">
                {briefing.maintenance.items.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500">No overdue maintenance.</p>
                ) : (
                  briefing.maintenance.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm text-stone-700 dark:text-stone-300 truncate mr-2">
                        {item.name}
                      </span>
                      <span className="text-xs text-amber-700 dark:text-amber-400 shrink-0">
                        {item.daysOverdue === 0 ? 'Never done' : `${item.daysOverdue}d overdue`}
                      </span>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Weather section */}
          <div>
            <button
              onClick={() => setWeatherOpen((prev) => !prev)}
              className="w-full flex items-center gap-2 px-4 py-3 hover:bg-stone-50 dark:hover:bg-stone-800/50 transition-colors text-left"
            >
              <CloudRain size={14} className="text-sky-600 dark:text-sky-400 shrink-0" />
              <span className="text-sm font-medium text-stone-700 dark:text-stone-300 flex-1">
                Weather
              </span>
              <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                briefing.weather.alertCount > 0
                  ? 'bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400'
                  : 'bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400'
              }`}>
                {briefing.weather.alertCount}
              </span>
              <ChevronDown
                size={14}
                className={`text-stone-400 transition-transform ml-1 ${weatherOpen ? 'rotate-180' : ''}`}
              />
            </button>
            {weatherOpen && (
              <div className="px-4 pb-3 space-y-2">
                {briefing.weather.trips.length === 0 ? (
                  <p className="text-xs text-stone-400 dark:text-stone-500">No weather alerts for upcoming trips.</p>
                ) : (
                  briefing.weather.trips.map((trip, i) => (
                    <div key={i}>
                      <p className="text-xs font-semibold text-stone-600 dark:text-stone-400 mb-1">
                        {trip.tripName}
                      </p>
                      <ul className="space-y-0.5">
                        {trip.alerts.map((alert, j) => (
                          <li key={j} className="text-xs text-stone-600 dark:text-stone-400 flex items-start gap-1">
                            <span className="mt-0.5 shrink-0">•</span>
                            <span>{alert}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
