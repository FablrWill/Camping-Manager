'use client'

import { useState } from 'react'
import { Loader2, RotateCcw, ChevronDown, Check, RefreshCw } from 'lucide-react'
import type { PowerBudgetResult, DayPowerBudget } from '@/lib/power'

interface PowerBudgetProps {
  tripId: string
  tripName: string
}

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function BatteryBar({ day, dim = false }: { day: DayPowerBudget; dim?: boolean }) {
  const color =
    day.status === 'critical' ? 'bg-red-500' :
    day.status === 'deficit'  ? 'bg-amber-500' :
                                'bg-emerald-500'
  const textColor =
    day.status === 'critical' ? 'text-red-600 dark:text-red-400' :
    day.status === 'deficit'  ? 'text-amber-600 dark:text-amber-400' :
                                'text-emerald-600 dark:text-emerald-400'

  return (
    <div className={dim ? 'opacity-40' : ''}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs font-medium text-stone-700 dark:text-stone-300">
          {day.dayLabel} · {day.date}
        </span>
        <span className="text-xs text-stone-400 dark:text-stone-500">
          {day.weatherEmoji} {day.weatherLabel}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 h-2 bg-stone-100 dark:bg-stone-800 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full ${color}`}
            style={{ width: `${Math.max(2, day.batteryPercent)}%` }}
          />
        </div>
        <span className={`text-xs font-medium w-10 text-right shrink-0 ${textColor}`}>
          {Math.round(day.batteryPercent)}%
        </span>
      </div>
      <div className="flex items-center gap-3 mt-1">
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          ☀️ +{Math.round(day.solarHarvestWh)} Wh
          {day.cloudFactor < 0.5 && (
            <span className="text-amber-500"> ({Math.round(day.cloudFactor * 100)}% eff.)</span>
          )}
        </span>
        <span className="text-[10px] text-stone-400 dark:text-stone-500">
          🔋 −{Math.round(day.consumptionWh)} Wh
        </span>
        <span className={`text-[10px] font-medium ${day.netWh >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
          Net: {day.netWh >= 0 ? '+' : ''}{Math.round(day.netWh)} Wh
        </span>
      </div>
    </div>
  )
}

export default function PowerBudget({ tripId, tripName }: PowerBudgetProps) {
  const [budget, setBudget] = useState<PowerBudgetResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showDays, setShowDays] = useState(false)
  const [showDevices, setShowDevices] = useState(false)
  const [chargeChecked, setChargeChecked] = useState<Record<string, boolean>>({})
  const [showLiveInput, setShowLiveInput] = useState(false)
  const [inputBatteryPct, setInputBatteryPct] = useState(80)

  async function calculate(batteryPct?: number) {
    setLoading(true)
    setError(null)
    setShowLiveInput(false)
    try {
      const body: { tripId: string; currentBatteryPct?: number } = { tripId }
      if (batteryPct !== undefined) body.currentBatteryPct = batteryPct
      const res = await fetch('/api/power-budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to calculate power budget')
      }
      const data: PowerBudgetResult = await res.json()
      setBudget(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  function toggleCharge(key: string) {
    setChargeChecked((prev) => ({ ...prev, [key]: !prev[key] }))
  }

  // ── Not yet calculated ──
  if (!budget && !loading && !error) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              ⚡ Power Budget
            </h3>
            <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
              Solar + battery estimate, weather-adjusted
            </p>
          </div>
          <button
            onClick={() => calculate()}
            className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-stone-900 px-4 py-2 rounded-lg font-medium text-sm transition-colors"
          >
            Calculate
          </button>
        </div>
      </div>
    )
  }

  // ── Loading ──
  if (loading) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center gap-2">
          <Loader2 size={16} className="animate-spin text-emerald-500" />
          <span className="text-sm text-stone-500 dark:text-stone-400">
            Calculating power budget...
          </span>
        </div>
      </div>
    )
  }

  // ── Error ──
  if (error) {
    return (
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => calculate()}
            className="text-xs text-stone-400 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 ml-3 transition-colors"
          >
            <RotateCcw size={12} /> Retry
          </button>
        </div>
      </div>
    )
  }

  if (!budget) return null

  const isLive = budget.mode === 'live'

  const verdictColor =
    budget.verdict === 'good'
      ? 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400'
      : budget.verdict === 'tight'
      ? 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400'
      : 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400'

  const verdictLabel =
    budget.verdict === 'good' ? 'Covered' :
    budget.verdict === 'tight' ? 'Tight' : 'Not enough'

  const lastDay = budget.days[budget.days.length - 1]
  const endPct = lastDay ? Math.round(lastDay.batteryPercent) : 0
  const endPctColor =
    endPct >= 40 ? 'text-emerald-600 dark:text-emerald-400' :
    endPct >= 15 ? 'text-amber-600 dark:text-amber-400' :
                   'text-red-600 dark:text-red-400'

  const liveBatteryColor =
    (budget.liveStatus?.currentBatteryPct ?? 100) >= 40
      ? 'text-emerald-600 dark:text-emerald-400'
      : (budget.liveStatus?.currentBatteryPct ?? 100) >= 15
      ? 'text-amber-600 dark:text-amber-400'
      : 'text-red-600 dark:text-red-400'

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">

      {/* ── Header ── */}
      <div className="p-4 border-b border-stone-100 dark:border-stone-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              ⚡ Power Budget
            </h3>
            {isLive && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                LIVE
              </span>
            )}
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${verdictColor}`}>
              {verdictLabel}
            </span>
          </div>
          <button
            onClick={() => isLive ? setShowLiveInput(true) : calculate()}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-emerald-600 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
          >
            {isLive ? <RefreshCw size={12} /> : <RotateCcw size={12} />}
            {isLive ? 'Update' : 'Recalculate'}
          </button>
        </div>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
          {budget.verdictMessage}
        </p>
        {isLive && budget.liveStatus && (
          <p className="text-[10px] text-stone-400 dark:text-stone-500 mt-0.5">
            Updated {formatRelativeTime(budget.liveStatus.updatedAt)} · {Math.round(budget.liveStatus.currentBatteryPct)}% battery
          </p>
        )}
      </div>

      {/* ── Live: Update battery input ── */}
      {showLiveInput && (
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60">
          <p className="text-xs font-medium text-stone-600 dark:text-stone-400 mb-2">
            EcoFlow battery level right now
          </p>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={inputBatteryPct}
              onChange={(e) => setInputBatteryPct(Number(e.target.value))}
              className="flex-1 accent-emerald-600"
            />
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100 w-12 text-right">
              {inputBatteryPct}%
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => calculate(inputBatteryPct)}
              className="bg-emerald-600 hover:bg-emerald-700 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-stone-900 px-4 py-1.5 rounded-lg font-medium text-sm transition-colors"
            >
              Update
            </button>
            <button
              onClick={() => setShowLiveInput(false)}
              className="px-4 py-1.5 rounded-lg text-sm text-stone-600 dark:text-stone-400 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ── Live: Alerts ── */}
      {isLive && budget.liveStatus && budget.liveStatus.alerts.length > 0 && (
        <div className="px-4 py-2 space-y-1 border-b border-stone-100 dark:border-stone-800">
          {budget.liveStatus.alerts.map((alert, i) => (
            <div
              key={i}
              className={`flex items-start gap-2 text-sm ${
                alert.level === 'warning'
                  ? 'text-red-700 dark:text-red-400'
                  : 'text-amber-700 dark:text-amber-400'
              }`}
            >
              <span className="shrink-0">{alert.level === 'warning' ? '⚠️' : 'ℹ️'}</span>
              {alert.message}
            </div>
          ))}
        </div>
      )}

      {/* ── Stats row: planning vs live ── */}
      {isLive && budget.liveStatus ? (
        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-stone-100 dark:border-stone-800">
          <div className="text-center">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Battery</p>
            <p className={`text-sm font-semibold mt-0.5 ${liveBatteryColor}`}>
              {Math.round(budget.liveStatus.currentBatteryPct)}%
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">
              {Math.round(budget.liveStatus.currentBatteryWh)} Wh
            </p>
          </div>
          <div className="text-center border-x border-stone-100 dark:border-stone-800">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Solar now</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
              ~{Math.round(budget.liveStatus.currentSolarWph)}W
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">
              {(Math.round(budget.liveStatus.hoursOfSolarLeft * 10) / 10)}h sun left
            </p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">
              {budget.liveStatus.hoursToEmpty === null ? 'Charging' : 'Runs out'}
            </p>
            <p className={`text-sm font-semibold mt-0.5 ${
              budget.liveStatus.hoursToEmpty === null
                ? 'text-emerald-600 dark:text-emerald-400'
                : budget.liveStatus.hoursToEmpty < 4
                ? 'text-red-600 dark:text-red-400'
                : 'text-amber-600 dark:text-amber-400'
            }`}>
              {budget.liveStatus.hoursToEmpty === null
                ? '☀️ net +'
                : `~${Math.round(budget.liveStatus.hoursToEmpty)}h`}
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">at current draw</p>
          </div>
        </div>
      ) : (
        <div className="px-4 py-3 grid grid-cols-3 gap-2 border-b border-stone-100 dark:border-stone-800">
          <div className="text-center">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Battery</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
              {budget.batteryCapacityWh} Wh
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">100% at start</p>
          </div>
          <div className="text-center border-x border-stone-100 dark:border-stone-800">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Solar</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">
              {budget.solarPanelWatts}W panel
            </p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">weather-adjusted</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Car</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mt-0.5">backup</p>
            <p className="text-[10px] text-stone-400 dark:text-stone-500">12V + BESTEK</p>
          </div>
        </div>
      )}

      {/* ── Daily stats bar (planning only) ── */}
      {!isLive && (
        <div className="px-4 py-3 flex items-center gap-4 border-b border-stone-100 dark:border-stone-800">
          <div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Avg daily draw</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {Math.round(budget.avgDailyConsumptionWh)} Wh
            </p>
          </div>
          <div className="h-8 w-px bg-stone-100 dark:bg-stone-800" />
          <div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Avg daily solar</p>
            <p className="text-sm font-semibold text-stone-900 dark:text-stone-100">
              {Math.round(budget.totalSolarWh / Math.max(1, budget.days.length))} Wh
            </p>
          </div>
          <div className="h-8 w-px bg-stone-100 dark:bg-stone-800" />
          <div>
            <p className="text-[10px] text-stone-400 dark:text-stone-500 uppercase tracking-wider">Trip end</p>
            <p className={`text-sm font-semibold ${endPctColor}`}>{endPct}%</p>
          </div>
        </div>
      )}

      {/* ── Live: Priority charge list ── */}
      {isLive && budget.liveStatus && (
        budget.liveStatus.priorityChargeNow.length > 0 ||
        budget.liveStatus.priorityChargeSoon.length > 0
      ) && (
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
          {budget.liveStatus!.priorityChargeNow.length > 0 && (
            <div className="mb-2">
              <p className="text-[10px] font-semibold text-red-600 dark:text-red-400 uppercase tracking-wider mb-1">
                ⚡ Charge Now
              </p>
              {budget.liveStatus!.priorityChargeNow.map((name) => (
                <p key={name} className="text-sm text-stone-900 dark:text-stone-100">• {name}</p>
              ))}
            </div>
          )}
          {budget.liveStatus!.priorityChargeSoon.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider mb-1">
                Charge Soon
              </p>
              {budget.liveStatus!.priorityChargeSoon.map((name) => (
                <p key={name} className="text-sm text-stone-700 dark:text-stone-300">• {name}</p>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Planning: Charge Before You Go ── */}
      {!isLive && budget.chargeReminders.length > 0 && (
        <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800 bg-amber-50/50 dark:bg-amber-950/20">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            🔋 Charge Before You Go
          </h4>
          <div className="space-y-1">
            {/* EcoFlow always first */}
            <label className="flex items-center gap-2.5 py-1 cursor-pointer group">
              <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                chargeChecked['ecoflow-main']
                  ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500'
                  : 'border-stone-300 dark:border-stone-600 group-hover:border-emerald-400'
              }`}>
                {chargeChecked['ecoflow-main'] && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
              </div>
              <input
                type="checkbox"
                checked={chargeChecked['ecoflow-main'] ?? false}
                onChange={() => toggleCharge('ecoflow-main')}
                className="sr-only"
              />
              <span className={`text-sm transition-colors ${
                chargeChecked['ecoflow-main']
                  ? 'line-through text-stone-400 dark:text-stone-600'
                  : 'text-stone-900 dark:text-stone-100'
              }`}>
                EcoFlow Delta 2 — charge to 100%
              </span>
            </label>
            {budget.chargeReminders.map((reminder) => (
              <label key={reminder.id} className="flex items-center gap-2.5 py-1 cursor-pointer group">
                <div className={`w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                  chargeChecked[reminder.id]
                    ? 'bg-emerald-600 dark:bg-emerald-500 border-emerald-600 dark:border-emerald-500'
                    : 'border-stone-300 dark:border-stone-600 group-hover:border-emerald-400'
                }`}>
                  {chargeChecked[reminder.id] && <Check size={10} className="text-white dark:text-stone-900" strokeWidth={3} />}
                </div>
                <input
                  type="checkbox"
                  checked={chargeChecked[reminder.id] ?? false}
                  onChange={() => toggleCharge(reminder.id)}
                  className="sr-only"
                />
                <span className={`text-sm transition-colors ${
                  chargeChecked[reminder.id]
                    ? 'line-through text-stone-400 dark:text-stone-600'
                    : 'text-stone-900 dark:text-stone-100'
                }`}>
                  {reminder.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* ── Day-by-day breakdown ── */}
      <div className="border-b border-stone-100 dark:border-stone-800">
        <button
          onClick={() => setShowDays(!showDays)}
          className="w-full p-4 flex items-center justify-between"
        >
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            📅 Day by Day
          </h4>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform ${showDays ? 'rotate-180' : ''}`}
          />
        </button>
        {showDays && (
          <div className="px-4 pb-4 space-y-4">
            {budget.days.map((day, i) => {
              const isPast = budget.todayIndex !== null && i < budget.todayIndex
              const isToday = budget.todayIndex === i
              return (
                <div key={day.date}>
                  {isToday && (
                    <p className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider mb-1">
                      ← Today
                    </p>
                  )}
                  <BatteryBar day={day} dim={isPast} />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ── Device breakdown ── */}
      <div className="border-b border-stone-100 dark:border-stone-800">
        <button
          onClick={() => setShowDevices(!showDevices)}
          className="w-full p-4 flex items-center justify-between"
        >
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            🔌 Connected Devices
          </h4>
          <ChevronDown
            size={14}
            className={`text-stone-400 transition-transform ${showDevices ? 'rotate-180' : ''}`}
          />
        </button>
        {showDevices && (
          <div className="px-4 pb-4 space-y-1">
            {budget.devices
              .filter((d) => d.role === 'consumer' && d.whPerDay > 0)
              .sort((a, b) => b.whPerDay - a.whPerDay)
              .map((device) => (
                <div key={device.id} className="flex items-center justify-between py-1">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm text-stone-700 dark:text-stone-300 truncate">
                      {device.name}
                    </span>
                    {device.sourceType === 'estimated' && (
                      <span className="text-[10px] text-stone-400 dark:text-stone-500 shrink-0">~est.</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span className="text-xs text-stone-400 dark:text-stone-500">
                      {device.wattage}W × {device.hoursPerDay}h
                    </span>
                    <span className="text-xs font-medium text-stone-600 dark:text-stone-400 w-16 text-right">
                      {Math.round(device.whPerDay)} Wh/day
                    </span>
                  </div>
                </div>
              ))}
            {budget.devices.filter((d) => d.role === 'consumer' && d.whPerDay > 0).length === 0 && (
              <p className="text-sm text-stone-400 dark:text-stone-500">
                No powered devices found — add gear with wattage to your inventory.
              </p>
            )}
            <p className="text-[10px] text-stone-400 dark:text-stone-500 pt-2">
              Set wattage on gear items for accurate estimates
            </p>
          </div>
        )}
      </div>

      {/* ── Tips ── */}
      {budget.tips.length > 0 && (
        <div className="p-4 bg-stone-50 dark:bg-stone-800/50">
          <h4 className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            💡 Power Tips
          </h4>
          <ul className="space-y-1.5">
            {budget.tips.map((tip, i) => (
              <li key={i} className="text-sm text-stone-600 dark:text-stone-300 flex gap-2">
                <span className="text-emerald-500 shrink-0">•</span>
                {tip}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
