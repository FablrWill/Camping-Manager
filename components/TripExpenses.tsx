'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Pencil, Trash2, DollarSign, X } from 'lucide-react'
import { Button, Input, Select, Textarea } from '@/components/ui'

const EXPENSE_CATEGORIES = [
  { value: 'gas', label: 'Gas', emoji: '\u26FD' },
  { value: 'permits', label: 'Permits', emoji: '\uD83D\uDCCB' },
  { value: 'groceries', label: 'Groceries', emoji: '\uD83D\uDED2' },
  { value: 'food', label: 'Food & Drinks', emoji: '\uD83C\uDF54' },
  { value: 'gear', label: 'Gear', emoji: '\uD83C\uDF92' },
  { value: 'campsite', label: 'Campsite', emoji: '\uD83C\uDFD5\uFE0F' },
  { value: 'other', label: 'Other', emoji: '\uD83D\uDCDD' },
] as const

type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]['value']

interface TripExpense {
  id: string
  tripId: string
  category: string
  description: string
  amount: number
  paidAt: string | null
  notes: string | null
  createdAt: string
}

interface TripExpensesProps {
  tripId: string
}

function getCategoryEmoji(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.emoji ?? '\uD83D\uDCDD'
}

function getCategoryLabel(category: string): string {
  return EXPENSE_CATEGORIES.find((c) => c.value === category)?.label ?? category
}

function formatCurrency(amount: number): string {
  return `$${amount.toFixed(2)}`
}

function formatExpenseDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function TripExpenses({ tripId }: TripExpensesProps) {
  const [expenses, setExpenses] = useState<TripExpense[]>([])
  const [total, setTotal] = useState(0)
  const [byCategory, setByCategory] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [showForm, setShowForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<TripExpense | null>(null)
  const [formCategory, setFormCategory] = useState<ExpenseCategory>('gas')
  const [formDescription, setFormDescription] = useState('')
  const [formAmount, setFormAmount] = useState('')
  const [formDate, setFormDate] = useState('')
  const [formNotes, setFormNotes] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Delete state
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchExpenses = useCallback(async () => {
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setExpenses(data.expenses)
      setTotal(data.total)
      setByCategory(data.byCategory)
      setError(null)
    } catch {
      setError('Could not load expenses')
    } finally {
      setLoading(false)
    }
  }, [tripId])

  useEffect(() => {
    fetchExpenses()
  }, [fetchExpenses])

  function resetForm() {
    setFormCategory('gas')
    setFormDescription('')
    setFormAmount('')
    setFormDate('')
    setFormNotes('')
    setFormError(null)
    setEditingExpense(null)
    setShowForm(false)
  }

  function openAdd() {
    resetForm()
    setFormDate(new Date().toISOString().split('T')[0])
    setShowForm(true)
  }

  function openEdit(expense: TripExpense) {
    setEditingExpense(expense)
    setFormCategory(expense.category as ExpenseCategory)
    setFormDescription(expense.description)
    setFormAmount(expense.amount.toString())
    setFormDate(expense.paidAt ? expense.paidAt.split('T')[0] : '')
    setFormNotes(expense.notes ?? '')
    setFormError(null)
    setShowForm(true)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const amount = parseFloat(formAmount)
    if (!formDescription.trim()) {
      setFormError('Description is required')
      return
    }
    if (isNaN(amount) || amount < 0) {
      setFormError('Enter a valid amount')
      return
    }

    setSaving(true)
    try {
      const payload = {
        category: formCategory,
        description: formDescription.trim(),
        amount,
        paidAt: formDate || null,
        notes: formNotes.trim() || null,
      }

      if (editingExpense) {
        const res = await fetch(`/api/trips/${tripId}/expenses/${editingExpense.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to update')
        const updated = await res.json()
        setExpenses((prev) => prev.map((exp) => (exp.id === updated.id ? updated : exp)))
      } else {
        const res = await fetch(`/api/trips/${tripId}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (!res.ok) throw new Error('Failed to create')
        const created = await res.json()
        setExpenses((prev) => [created, ...prev])
      }

      // Recalculate totals from updated list
      await fetchExpenses()
      resetForm()
    } catch {
      setFormError(editingExpense ? 'Failed to update expense' : 'Failed to add expense')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(expenseId: string) {
    setDeletingId(expenseId)
    try {
      const res = await fetch(`/api/trips/${tripId}/expenses/${expenseId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setExpenses((prev) => prev.filter((exp) => exp.id !== expenseId))
      await fetchExpenses()
    } catch {
      setError('Failed to delete expense')
    } finally {
      setDeletingId(null)
    }
  }

  // Sort categories by amount for breakdown display
  const sortedCategories = Object.entries(byCategory).sort(([, a], [, b]) => b - a)

  if (loading) {
    return (
      <div className="text-sm text-stone-400 dark:text-stone-500 py-2">
        Loading expenses...
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header with total */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <DollarSign size={16} className="text-stone-400 dark:text-stone-500" />
          <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
            Expenses
          </h3>
          {total > 0 && (
            <span className="text-sm font-bold text-stone-900 dark:text-stone-50">
              {formatCurrency(total)}
            </span>
          )}
        </div>
        {!showForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={openAdd}
            icon={<Plus size={14} />}
          >
            Add
          </Button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Category breakdown (only if expenses exist) */}
      {sortedCategories.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sortedCategories.map(([cat, amt]) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full bg-stone-100 dark:bg-stone-800 px-2.5 py-1 text-xs text-stone-600 dark:text-stone-400"
            >
              <span>{getCategoryEmoji(cat)}</span>
              <span>{getCategoryLabel(cat)}</span>
              <span className="font-semibold text-stone-900 dark:text-stone-50">
                {formatCurrency(amt)}
              </span>
            </span>
          ))}
        </div>
      )}

      {/* Add/Edit form */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="bg-stone-50 dark:bg-stone-800/50 rounded-lg border border-stone-200 dark:border-stone-700 p-3 space-y-2.5"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
              {editingExpense ? 'Edit Expense' : 'New Expense'}
            </span>
            <button
              type="button"
              onClick={resetForm}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
            >
              <X size={14} />
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <Select
              label="Category"
              value={formCategory}
              onChange={(e) => setFormCategory(e.target.value as ExpenseCategory)}
              options={EXPENSE_CATEGORIES.map((c) => ({
                value: c.value,
                label: `${c.emoji} ${c.label}`,
              }))}
            />
            <Input
              label="Amount ($)"
              type="number"
              step="0.01"
              min="0"
              value={formAmount}
              onChange={(e) => setFormAmount(e.target.value)}
              placeholder="0.00"
              required
            />
          </div>

          <Input
            label="Description"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            placeholder="e.g. Shell gas station on I-40"
            required
          />

          <Input
            label="Date"
            type="date"
            value={formDate}
            onChange={(e) => setFormDate(e.target.value)}
          />

          <Textarea
            label="Notes"
            rows={2}
            value={formNotes}
            onChange={(e) => setFormNotes(e.target.value)}
            placeholder="Optional notes..."
          />

          {formError && (
            <p className="text-xs text-red-600 dark:text-red-400">
              {formError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="flex-1"
              onClick={resetForm}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              className="flex-1"
              loading={saving}
            >
              {editingExpense ? 'Update' : 'Add'}
            </Button>
          </div>
        </form>
      )}

      {/* Expense list */}
      {expenses.length === 0 && !showForm && (
        <p className="text-xs text-stone-400 dark:text-stone-500 py-1">
          No expenses tracked yet
        </p>
      )}

      {expenses.length > 0 && (
        <div className="space-y-1">
          {expenses.map((expense) => (
            <div
              key={expense.id}
              className="flex items-center gap-2 py-1.5 px-1 rounded-lg hover:bg-stone-50 dark:hover:bg-stone-800/50 group"
            >
              <span className="text-base leading-none shrink-0">
                {getCategoryEmoji(expense.category)}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-stone-700 dark:text-stone-300 truncate">
                  {expense.description}
                </p>
                {expense.paidAt && (
                  <p className="text-[11px] text-stone-400 dark:text-stone-500">
                    {formatExpenseDate(expense.paidAt)}
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold text-stone-900 dark:text-stone-50 shrink-0">
                {formatCurrency(expense.amount)}
              </span>
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  onClick={() => openEdit(expense)}
                  className="p-1.5 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
                  aria-label="Edit expense"
                >
                  <Pencil size={12} />
                </button>
                <button
                  onClick={() => handleDelete(expense.id)}
                  disabled={deletingId === expense.id}
                  className="p-1.5 text-stone-400 hover:text-red-500 disabled:opacity-50"
                  aria-label="Delete expense"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
