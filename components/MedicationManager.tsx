'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Pencil, Check, X } from 'lucide-react'
import { Button } from '@/components/ui'

interface Medication {
  id: string
  name: string
  dosesPerDay: number
  unitsPerDose: number
  unit: string
  isForDog: boolean
  notes: string | null
}

interface MedicationFormState {
  name: string
  dosesPerDay: string
  unitsPerDose: string
  unit: string
  isForDog: boolean
  notes: string
}

const EMPTY_FORM: MedicationFormState = {
  name: '',
  dosesPerDay: '1',
  unitsPerDose: '1',
  unit: 'pill',
  isForDog: false,
  notes: '',
}

function formatDosage(med: Medication): string {
  const doses = med.dosesPerDay
  const units = med.unitsPerDose
  const totalPerDay = doses * units
  const perDayStr = `${totalPerDay % 1 === 0 ? totalPerDay : totalPerDay.toFixed(1)} ${med.unit}${totalPerDay !== 1 ? 's' : ''}/day`
  if (doses === 1) return perDayStr
  return `${units} ${med.unit}${units !== 1 ? 's' : ''} × ${doses}x/day`
}

export default function MedicationManager() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<MedicationFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchMedications = useCallback(async () => {
    try {
      const res = await fetch('/api/medications')
      if (res.ok) {
        const data = await res.json()
        setMedications(data)
      }
    } catch {
      // Silent fail on load
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchMedications()
  }, [fetchMedications])

  function openAdd() {
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
    setShowForm(true)
  }

  function openEdit(med: Medication) {
    setEditingId(med.id)
    setForm({
      name: med.name,
      dosesPerDay: String(med.dosesPerDay),
      unitsPerDose: String(med.unitsPerDose),
      unit: med.unit,
      isForDog: med.isForDog,
      notes: med.notes ?? '',
    })
    setError(null)
    setShowForm(true)
  }

  function cancelForm() {
    setShowForm(false)
    setEditingId(null)
    setForm(EMPTY_FORM)
    setError(null)
  }

  async function handleSave() {
    if (!form.name.trim()) {
      setError('Name is required')
      return
    }
    const dosesPerDay = parseFloat(form.dosesPerDay)
    const unitsPerDose = parseFloat(form.unitsPerDose)
    if (isNaN(dosesPerDay) || dosesPerDay <= 0) {
      setError('Doses per day must be a positive number')
      return
    }
    if (isNaN(unitsPerDose) || unitsPerDose <= 0) {
      setError('Amount per dose must be a positive number')
      return
    }

    setSaving(true)
    setError(null)

    const payload = {
      name: form.name.trim(),
      dosesPerDay,
      unitsPerDose,
      unit: form.unit.trim() || 'pill',
      isForDog: form.isForDog,
      notes: form.notes.trim() || null,
    }

    try {
      const res = editingId
        ? await fetch(`/api/medications/${editingId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })
        : await fetch('/api/medications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Failed to save')
        return
      }

      await fetchMedications()
      cancelForm()
    } catch {
      setError('Failed to save medication')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await fetch(`/api/medications/${id}`, { method: 'DELETE' })
      setMedications((prev) => prev.filter((m) => m.id !== id))
    } catch {
      // Silent fail
    }
  }

  const myMeds = medications.filter((m) => !m.isForDog)
  const dogMeds = medications.filter((m) => m.isForDog)

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 overflow-hidden">
      <div className="p-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100">
            💊 Medications
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
            Saved once — quantities auto-calculated per trip length
          </p>
        </div>
        {!showForm && (
          <Button variant="ghost" size="sm" onClick={openAdd} icon={<Plus size={12} />}>
            Add
          </Button>
        )}
      </div>

      {/* Add/Edit form */}
      {showForm && (
        <div className="p-4 border-b border-stone-100 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/50 space-y-3">
          <p className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            {editingId ? 'Edit medication' : 'Add medication'}
          </p>

          {/* Name */}
          <div>
            <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">
              Name
            </label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. Adderall, Lisinopril"
              className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
          </div>

          {/* Dosage row */}
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">
                Doses/day
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.dosesPerDay}
                onChange={(e) => setForm({ ...form, dosesPerDay: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">
                Amount/dose
              </label>
              <input
                type="number"
                min="0.5"
                step="0.5"
                value={form.unitsPerDose}
                onChange={(e) => setForm({ ...form, unitsPerDose: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
            <div className="flex-1">
              <label className="text-xs text-stone-500 dark:text-stone-400 mb-1 block">
                Unit
              </label>
              <input
                type="text"
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="pill"
                className="w-full px-3 py-2 text-sm rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-400"
              />
            </div>
          </div>

          {/* Dog toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <div
              onClick={() => setForm({ ...form, isForDog: !form.isForDog })}
              className={`w-8 h-4 rounded-full transition-colors ${
                form.isForDog ? 'bg-amber-500' : 'bg-stone-300 dark:bg-stone-600'
              } relative`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-transform ${
                  form.isForDog ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </div>
            <span className="text-xs text-stone-600 dark:text-stone-300">
              This is for the dog 🐾
            </span>
          </label>

          {error && (
            <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
          )}

          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSave}
              loading={saving}
              icon={!saving ? <Check size={12} /> : undefined}
            >
              {editingId ? 'Save changes' : 'Add medication'}
            </Button>
            <Button variant="ghost" size="sm" onClick={cancelForm} icon={<X size={12} />}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* List */}
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {loading ? (
          <div className="p-4 text-xs text-stone-400 dark:text-stone-500">Loading...</div>
        ) : medications.length === 0 && !showForm ? (
          <div className="p-4 text-xs text-stone-400 dark:text-stone-500">
            No medications configured. Add any meds you take so the packing list knows how many to pack.
          </div>
        ) : (
          <>
            {myMeds.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                  Your medications
                </p>
                {myMeds.map((med) => (
                  <MedRow key={med.id} med={med} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
            {dogMeds.length > 0 && (
              <div className="p-4 space-y-2">
                <p className="text-xs font-semibold text-stone-400 dark:text-stone-500 uppercase tracking-wider mb-2">
                  Dog medications 🐾
                </p>
                {dogMeds.map((med) => (
                  <MedRow key={med.id} med={med} onEdit={openEdit} onDelete={handleDelete} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function MedRow({
  med,
  onEdit,
  onDelete,
}: {
  med: Medication
  onEdit: (med: Medication) => void
  onDelete: (id: string) => void
}) {
  return (
    <div className="flex items-center gap-3 group">
      <div className="flex-1 min-w-0">
        <span className="text-sm text-stone-900 dark:text-stone-100">{med.name}</span>
        <span className="text-xs text-stone-400 dark:text-stone-500 ml-2">
          {formatDosage(med)}
        </span>
        {med.notes && (
          <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{med.notes}</p>
        )}
      </div>
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button
          onClick={() => onEdit(med)}
          className="p-1 rounded text-stone-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
          aria-label={`Edit ${med.name}`}
        >
          <Pencil size={12} />
        </button>
        <button
          onClick={() => onDelete(med.id)}
          className="p-1 rounded text-stone-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
          aria-label={`Delete ${med.name}`}
        >
          <Trash2 size={12} />
        </button>
      </div>
    </div>
  )
}
