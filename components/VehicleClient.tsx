'use client'

import { useState } from 'react'
import {
  Car,
  Fuel,
  Mountain,
  Weight,
  Ruler,
  Box,
  Wrench,
  Plus,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Calendar,
} from 'lucide-react'

interface VehicleMod {
  id: string
  name: string
  description: string | null
  installedAt: string | null
  cost: number | null
  notes: string | null
  createdAt: string
  updatedAt: string
}

interface Vehicle {
  id: string
  name: string
  year: number | null
  make: string | null
  model: string | null
  drivetrain: string | null
  fuelEconomy: string | null
  groundClearance: number | null
  towingCapacity: number | null
  cargoVolume: number | null
  cargoLength: number | null
  cargoWidth: number | null
  notes: string | null
  mods: VehicleMod[]
  createdAt: string
  updatedAt: string
}

interface SpecRowProps {
  icon: React.ReactNode
  label: string
  value: string | number | null | undefined
  unit?: string
}

function SpecRow({ icon, label, value, unit }: SpecRowProps) {
  if (value == null) return null
  return (
    <div className="flex items-center gap-3 py-3 border-b border-stone-100 dark:border-stone-800 last:border-0">
      <div className="w-8 h-8 rounded-lg bg-stone-100 dark:bg-stone-800 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
        <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
          {value}
          {unit && <span className="text-stone-400 dark:text-stone-500 ml-1">{unit}</span>}
        </p>
      </div>
    </div>
  )
}

export default function VehicleClient({ vehicle }: { vehicle: Vehicle }) {
  const [showAllSpecs, setShowAllSpecs] = useState(false)
  const [showModForm, setShowModForm] = useState(false)
  const [mods, setMods] = useState(vehicle.mods)
  const [saving, setSaving] = useState(false)
  const [modError, setModError] = useState<string | null>(null)

  const totalModCost = mods.reduce((sum, m) => sum + (m.cost ?? 0), 0)

  async function handleAddMod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name') as string,
      description: (form.get('description') as string) || null,
      cost: form.get('cost') ? parseFloat(form.get('cost') as string) : null,
      installedAt: form.get('installedAt') ? new Date(form.get('installedAt') as string).toISOString() : null,
      notes: (form.get('notes') as string) || null,
    }

    setModError(null)
    try {
      const res = await fetch(`/api/vehicle/${vehicle.id}/mods`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to save')
      const saved = await res.json()
      setMods((prev) => [{ ...saved, installedAt: saved.installedAt, createdAt: saved.createdAt, updatedAt: saved.updatedAt }, ...prev])
      setShowModForm(false)
      ;(e.target as HTMLFormElement).reset()
    } catch {
      setModError('Failed to save mod. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Vehicle hero card */}
      <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
        {/* Hero banner */}
        <div className="bg-gradient-to-br from-stone-800 to-stone-700 dark:from-stone-800 dark:to-stone-900 p-6 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center">
              <Car size={28} />
            </div>
            <div>
              <h2 className="text-xl font-bold">{vehicle.name}</h2>
              {vehicle.drivetrain && (
                <p className="text-stone-300 text-sm">{vehicle.drivetrain}</p>
              )}
            </div>
          </div>
        </div>

        {/* Key specs */}
        <div className="p-4">
          <SpecRow
            icon={<Fuel size={16} className="text-stone-500 dark:text-stone-400" />}
            label="Fuel Economy"
            value={vehicle.fuelEconomy}
          />
          <SpecRow
            icon={<Mountain size={16} className="text-stone-500 dark:text-stone-400" />}
            label="Ground Clearance"
            value={vehicle.groundClearance}
            unit="in"
          />
          <SpecRow
            icon={<Weight size={16} className="text-stone-500 dark:text-stone-400" />}
            label="Towing Capacity"
            value={vehicle.towingCapacity ? vehicle.towingCapacity.toLocaleString() : null}
            unit="lb"
          />

          {/* Expandable cargo section */}
          {(vehicle.cargoVolume || vehicle.cargoLength || vehicle.cargoWidth) && (
            <>
              <button
                onClick={() => setShowAllSpecs(!showAllSpecs)}
                className="flex items-center gap-2 w-full py-3 text-sm text-amber-600 dark:text-amber-500 font-medium"
              >
                {showAllSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAllSpecs ? 'Hide' : 'Show'} cargo dimensions
              </button>

              {showAllSpecs && (
                <div className="pb-2">
                  <SpecRow
                    icon={<Box size={16} className="text-stone-500 dark:text-stone-400" />}
                    label="Cargo Volume (behind 2nd row)"
                    value={vehicle.cargoVolume}
                    unit="cu ft"
                  />
                  <SpecRow
                    icon={<Ruler size={16} className="text-stone-500 dark:text-stone-400" />}
                    label="Cargo Length (seats folded)"
                    value={vehicle.cargoLength}
                    unit="in"
                  />
                  <SpecRow
                    icon={<Ruler size={16} className="text-stone-500 dark:text-stone-400" />}
                    label="Cargo Width (between wheel wells)"
                    value={vehicle.cargoWidth}
                    unit="in"
                  />
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Notes */}
      {vehicle.notes && (
        <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
          <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider mb-2">
            Notes
          </h3>
          <p className="text-sm text-stone-700 dark:text-stone-300 whitespace-pre-wrap">
            {vehicle.notes}
          </p>
        </div>
      )}

      {/* Mods section */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Modifications
            </h3>
            {totalModCost > 0 && (
              <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                ${totalModCost.toFixed(0)} invested
              </p>
            )}
          </div>
          <button
            onClick={() => setShowModForm(!showModForm)}
            className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus size={14} />
            Add Mod
          </button>
        </div>

        {/* Add mod form */}
        {showModForm && (
          <form
            onSubmit={handleAddMod}
            className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 mb-4 space-y-3"
          >
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Mod Name *
              </label>
              <input
                name="name"
                required
                placeholder="e.g. Roof rack crossbars"
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Description
              </label>
              <input
                name="description"
                placeholder="What it does, brand, part number..."
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Cost ($)
                </label>
                <input
                  name="cost"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                  Installed
                </label>
                <input
                  name="installedAt"
                  type="date"
                  className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
                Notes
              </label>
              <textarea
                name="notes"
                rows={2}
                placeholder="Any additional notes..."
                className="w-full px-3 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 resize-none"
              />
            </div>
            {modError && (
              <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
                {modError}
              </p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => { setShowModForm(false); setModError(null) }}
                className="flex-1 py-2.5 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-300 font-medium hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 py-2.5 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium disabled:opacity-50 transition-colors"
              >
                {saving ? 'Saving...' : 'Add Mod'}
              </button>
            </div>
          </form>
        )}

        {/* Mods list */}
        {mods.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-3">🔧</p>
            <p className="text-lg font-medium text-stone-400 dark:text-stone-500">
              No mods yet
            </p>
            <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">
              Track your vehicle modifications here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {mods.map((mod) => (
              <div
                key={mod.id}
                className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Wrench size={14} className="text-stone-400 dark:text-stone-500 shrink-0" />
                      <span className="font-medium text-stone-900 dark:text-stone-50 text-sm">
                        {mod.name}
                      </span>
                    </div>
                    {mod.description && (
                      <p className="text-sm text-stone-500 dark:text-stone-400 mb-1">
                        {mod.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-stone-400 dark:text-stone-500">
                      {mod.cost != null && (
                        <span className="flex items-center gap-1">
                          <DollarSign size={12} />
                          {mod.cost.toFixed(0)}
                        </span>
                      )}
                      {mod.installedAt && (
                        <span className="flex items-center gap-1">
                          <Calendar size={12} />
                          {new Date(mod.installedAt).toLocaleDateString('en-US', {
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      )}
                    </div>
                    {mod.notes && (
                      <p className="text-xs text-stone-400 dark:text-stone-500 mt-1 line-clamp-2">
                        {mod.notes}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
