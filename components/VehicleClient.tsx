'use client'

import { useState } from 'react'
import { safeParseFloat, safeParseInt, isValidDate } from '@/lib/validate'
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
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button, Input, Textarea, Modal, ConfirmDialog } from '@/components/ui'

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

export default function VehicleClient({ vehicle: initialVehicle }: { vehicle: Vehicle }) {
  const [vehicle, setVehicle] = useState(initialVehicle)
  const [showAllSpecs, setShowAllSpecs] = useState(false)
  const [showModForm, setShowModForm] = useState(false)
  const [mods, setMods] = useState(vehicle.mods)
  const [saving, setSaving] = useState(false)
  const [modError, setModError] = useState<string | null>(null)

  // Vehicle edit state
  const [editingVehicle, setEditingVehicle] = useState(false)
  const [isSavingVehicle, setIsSavingVehicle] = useState(false)
  const [vehicleError, setVehicleError] = useState<string | null>(null)

  // Mod delete state
  const [confirmDeleteMod, setConfirmDeleteMod] = useState<{ id: string; name: string } | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  // Vehicle edit form state
  const [editName, setEditName] = useState(vehicle.name)
  const [editYear, setEditYear] = useState(vehicle.year?.toString() ?? '')
  const [editMake, setEditMake] = useState(vehicle.make ?? '')
  const [editModel, setEditModel] = useState(vehicle.model ?? '')
  const [editDrivetrain, setEditDrivetrain] = useState(vehicle.drivetrain ?? '')
  const [editFuelEconomy, setEditFuelEconomy] = useState(vehicle.fuelEconomy ?? '')
  const [editGroundClearance, setEditGroundClearance] = useState(vehicle.groundClearance?.toString() ?? '')
  const [editTowingCapacity, setEditTowingCapacity] = useState(vehicle.towingCapacity?.toString() ?? '')
  const [editCargoVolume, setEditCargoVolume] = useState(vehicle.cargoVolume?.toString() ?? '')
  const [editCargoLength, setEditCargoLength] = useState(vehicle.cargoLength?.toString() ?? '')
  const [editCargoWidth, setEditCargoWidth] = useState(vehicle.cargoWidth?.toString() ?? '')
  const [editNotes, setEditNotes] = useState(vehicle.notes ?? '')

  function openVehicleEdit() {
    setEditName(vehicle.name)
    setEditYear(vehicle.year?.toString() ?? '')
    setEditMake(vehicle.make ?? '')
    setEditModel(vehicle.model ?? '')
    setEditDrivetrain(vehicle.drivetrain ?? '')
    setEditFuelEconomy(vehicle.fuelEconomy ?? '')
    setEditGroundClearance(vehicle.groundClearance?.toString() ?? '')
    setEditTowingCapacity(vehicle.towingCapacity?.toString() ?? '')
    setEditCargoVolume(vehicle.cargoVolume?.toString() ?? '')
    setEditCargoLength(vehicle.cargoLength?.toString() ?? '')
    setEditCargoWidth(vehicle.cargoWidth?.toString() ?? '')
    setEditNotes(vehicle.notes ?? '')
    setVehicleError(null)
    setEditingVehicle(true)
  }

  async function handleVehicleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSavingVehicle(true)
    setVehicleError(null)
    try {
      const res = await fetch(`/api/vehicle/${vehicle.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          year: safeParseInt(editYear),
          make: editMake || null,
          model: editModel || null,
          drivetrain: editDrivetrain || null,
          fuelEconomy: editFuelEconomy || null,
          groundClearance: safeParseFloat(editGroundClearance),
          towingCapacity: safeParseInt(editTowingCapacity),
          cargoVolume: safeParseFloat(editCargoVolume),
          cargoLength: safeParseFloat(editCargoLength),
          cargoWidth: safeParseFloat(editCargoWidth),
          notes: editNotes || null,
        }),
      })
      if (!res.ok) throw new Error('Failed to save')
      const updated = await res.json()
      setVehicle(updated)
      setEditingVehicle(false)
    } catch {
      setVehicleError("Couldn't save — check your connection and try again.")
    } finally {
      setIsSavingVehicle(false)
    }
  }

  async function handleDeleteMod(modId: string) {
    setIsDeleting(true)
    setDeleteError(null)
    try {
      const res = await fetch(`/api/vehicle/${vehicle.id}/mods/${modId}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
      setMods((prev) => prev.filter((m) => m.id !== modId))
      setConfirmDeleteMod(null)
    } catch {
      setDeleteError("Couldn't delete — try again or reload the page.")
    } finally {
      setIsDeleting(false)
    }
  }

  const totalModCost = mods.reduce((sum, m) => sum + (m.cost ?? 0), 0)

  async function handleAddMod(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSaving(true)

    const form = new FormData(e.currentTarget)
    const data = {
      name: form.get('name') as string,
      description: (form.get('description') as string) || null,
      cost: safeParseFloat(form.get('cost')),
      installedAt: (() => { const d = isValidDate(form.get('installedAt') as string | null); return d ? d.toISOString() : null; })(),
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
          <div className="flex items-center justify-between gap-3">
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
            <Button
              variant="ghost"
              size="sm"
              onClick={openVehicleEdit}
              aria-label="Edit vehicle"
              className="text-white/70 hover:text-white hover:bg-white/10"
            >
              <Pencil size={16} />
            </Button>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllSpecs(!showAllSpecs)}
                className="flex items-center gap-2 w-full py-3 text-sm text-amber-600 dark:text-amber-500 font-medium"
              >
                {showAllSpecs ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                {showAllSpecs ? 'Hide' : 'Show'} cargo dimensions
              </Button>

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
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShowModForm(true)}
            icon={<Plus size={14} />}
          >
            Add Mod
          </Button>
        </div>

        {/* Inline errors */}
        {deleteError && (
          <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-4 py-2 mb-3">
            {deleteError}
          </div>
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
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setConfirmDeleteMod({ id: mod.id, name: mod.name })}
                    aria-label="Delete mod"
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add mod modal */}
      <Modal
        open={showModForm}
        onClose={() => { setShowModForm(false); setModError(null) }}
        title="Add Mod"
      >
        <form onSubmit={handleAddMod} className="p-4 space-y-3">
          <Input
            label="Mod Name *"
            name="name"
            required
            placeholder="e.g. Roof rack crossbars"
          />
          <Input
            label="Description"
            name="description"
            placeholder="What it does, brand, part number..."
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cost ($)"
              name="cost"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
            />
            <Input
              label="Installed"
              name="installedAt"
              type="date"
            />
          </div>
          <Textarea
            label="Notes"
            name="notes"
            rows={2}
            placeholder="Any additional notes..."
          />
          {modError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {modError}
            </p>
          )}
          <div className="flex gap-3 pt-1 pb-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => { setShowModForm(false); setModError(null) }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={saving}
            >
              Add Mod
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit vehicle modal */}
      <Modal
        open={editingVehicle}
        onClose={() => setEditingVehicle(false)}
        title="Edit Vehicle"
        size="lg"
      >
        <form onSubmit={handleVehicleSave} className="p-4 space-y-3">
          <Input
            label="Name *"
            required
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            placeholder="e.g. Santa Fe Hybrid"
          />
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Year"
              type="number"
              min="1900"
              max="2100"
              value={editYear}
              onChange={(e) => setEditYear(e.target.value)}
              placeholder="2025"
            />
            <Input
              label="Make"
              value={editMake}
              onChange={(e) => setEditMake(e.target.value)}
              placeholder="Hyundai"
            />
            <Input
              label="Model"
              value={editModel}
              onChange={(e) => setEditModel(e.target.value)}
              placeholder="Santa Fe"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Drivetrain"
              value={editDrivetrain}
              onChange={(e) => setEditDrivetrain(e.target.value)}
              placeholder="AWD Hybrid"
            />
            <Input
              label="Fuel Economy"
              value={editFuelEconomy}
              onChange={(e) => setEditFuelEconomy(e.target.value)}
              placeholder="36 mpg city / 31 hwy"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input
              label="Ground Clearance (in)"
              type="number"
              step="0.1"
              value={editGroundClearance}
              onChange={(e) => setEditGroundClearance(e.target.value)}
              placeholder="8.3"
            />
            <Input
              label="Towing Capacity (lb)"
              type="number"
              value={editTowingCapacity}
              onChange={(e) => setEditTowingCapacity(e.target.value)}
              placeholder="3500"
            />
            <Input
              label="Cargo Volume (cu ft)"
              type="number"
              step="0.1"
              value={editCargoVolume}
              onChange={(e) => setEditCargoVolume(e.target.value)}
              placeholder="72.1"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Cargo Length (in)"
              type="number"
              step="0.1"
              value={editCargoLength}
              onChange={(e) => setEditCargoLength(e.target.value)}
              placeholder="74.8"
            />
            <Input
              label="Cargo Width (in)"
              type="number"
              step="0.1"
              value={editCargoWidth}
              onChange={(e) => setEditCargoWidth(e.target.value)}
              placeholder="43.5"
            />
          </div>
          <Textarea
            label="Notes"
            rows={3}
            value={editNotes}
            onChange={(e) => setEditNotes(e.target.value)}
            placeholder="Any notes about the vehicle..."
          />
          {vehicleError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {vehicleError}
            </p>
          )}
          <div className="flex gap-3 pt-1 pb-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setEditingVehicle(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="flex-1"
              loading={isSavingVehicle}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete mod confirm dialog */}
      <ConfirmDialog
        open={!!confirmDeleteMod}
        onClose={() => setConfirmDeleteMod(null)}
        onConfirm={() => confirmDeleteMod && handleDeleteMod(confirmDeleteMod.id)}
        title="Delete mod?"
        message="This mod record will be permanently removed."
        confirmLabel="Delete"
        confirmVariant="danger"
        loading={isDeleting}
      />
    </div>
  )
}
