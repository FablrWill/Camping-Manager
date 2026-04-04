'use client'

import { useState, useEffect, useCallback } from 'react'

interface GearLoan {
  id: string
  gearItemId: string
  borrowerName: string
  lentAt: string
  returnedAt: string | null
  notes: string | null
  createdAt: string
}

interface GearLoanPanelProps {
  gearItemId: string
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export default function GearLoanPanel({ gearItemId }: GearLoanPanelProps) {
  const [loans, setLoans] = useState<GearLoan[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showPastLoans, setShowPastLoans] = useState(false)

  // Add form state
  const [borrowerName, setBorrowerName] = useState('')
  const [lentAt, setLentAt] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)

  const fetchLoans = useCallback(async () => {
    try {
      const res = await fetch(`/api/gear/${gearItemId}/loans`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setLoans(data)
    } catch {
      setError('Failed to load loans')
    } finally {
      setIsLoading(false)
    }
  }, [gearItemId])

  useEffect(() => {
    fetchLoans()
  }, [fetchLoans])

  async function handleAddLoan() {
    if (!borrowerName.trim()) {
      setAddError('Borrower name is required')
      return
    }
    setIsSaving(true)
    setAddError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/loans`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          borrowerName: borrowerName.trim(),
          lentAt: lentAt || undefined,
          notes: notes.trim() || undefined,
        }),
      })
      if (!res.ok) throw new Error('Failed to create loan')
      const newLoan = await res.json()
      setLoans((prev) => [newLoan, ...prev])
      setBorrowerName('')
      setLentAt('')
      setNotes('')
      setShowAddForm(false)
    } catch {
      setAddError('Failed to save loan. Please try again.')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleMarkReturned(loanId: string) {
    try {
      const res = await fetch(`/api/gear/${gearItemId}/loans/${loanId}`, {
        method: 'PATCH',
      })
      if (!res.ok) throw new Error('Failed to update')
      const updated = await res.json()
      setLoans((prev) => prev.map((l) => (l.id === loanId ? updated : l)))
    } catch {
      setError('Failed to mark as returned')
    }
  }

  async function handleDelete(loanId: string) {
    try {
      const res = await fetch(`/api/gear/${gearItemId}/loans/${loanId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete')
      setLoans((prev) => prev.filter((l) => l.id !== loanId))
    } catch {
      setError('Failed to delete loan record')
    }
  }

  const activeLoans = loans.filter((l) => !l.returnedAt)
  const pastLoans = loans.filter((l) => l.returnedAt)

  if (isLoading) {
    return (
      <div className="space-y-2">
        <div className="h-12 bg-stone-100 dark:bg-stone-800 rounded-lg animate-pulse" />
        <div className="h-12 bg-stone-100 dark:bg-stone-800 rounded-lg animate-pulse" />
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* Active loans */}
      {activeLoans.length === 0 && !showAddForm && (
        <p className="text-sm text-stone-500 dark:text-stone-400 text-center py-3">
          No active loans
        </p>
      )}

      {activeLoans.map((loan) => (
        <div
          key={loan.id}
          className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg px-3 py-2.5"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-stone-900 dark:text-stone-50">
                {loan.borrowerName}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Lent {formatDate(loan.lentAt)}
              </p>
              {loan.notes && (
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{loan.notes}</p>
              )}
            </div>
            <div className="flex gap-1.5 shrink-0">
              <button
                onClick={() => handleMarkReturned(loan.id)}
                className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1 rounded-md font-medium transition-colors"
              >
                Returned
              </button>
              <button
                onClick={() => handleDelete(loan.id)}
                className="text-xs text-stone-400 hover:text-red-600 dark:hover:text-red-400 px-1 py-1 transition-colors"
                aria-label="Delete loan"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      ))}

      {/* Add loan form */}
      {showAddForm ? (
        <div className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg p-3 space-y-2">
          <input
            type="text"
            placeholder="Borrower name *"
            value={borrowerName}
            onChange={(e) => setBorrowerName(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="date"
            value={lentAt}
            onChange={(e) => setLentAt(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          <input
            type="text"
            placeholder="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-800 text-stone-900 dark:text-stone-100 placeholder:text-stone-400 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
          {addError && (
            <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
          )}
          <div className="flex gap-2">
            <button
              onClick={handleAddLoan}
              disabled={isSaving}
              className="flex-1 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              {isSaving ? 'Saving...' : 'Save Loan'}
            </button>
            <button
              onClick={() => { setShowAddForm(false); setAddError(null); setBorrowerName(''); setLentAt(''); setNotes('') }}
              className="px-3 py-2 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 text-sm transition-colors hover:bg-stone-50 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full py-2 rounded-lg border border-dashed border-stone-300 dark:border-stone-600 text-stone-500 dark:text-stone-400 text-sm hover:border-amber-400 hover:text-amber-600 dark:hover:text-amber-400 transition-colors"
        >
          + Add Loan
        </button>
      )}

      {/* Past loans (collapsible) */}
      {pastLoans.length > 0 && (
        <div>
          <button
            onClick={() => setShowPastLoans((v) => !v)}
            className="text-xs text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            {showPastLoans ? '▾' : '▸'} Past loans ({pastLoans.length})
          </button>
          {showPastLoans && (
            <div className="mt-2 space-y-2">
              {pastLoans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-stone-50 dark:bg-stone-800/50 border border-stone-200 dark:border-stone-700 rounded-lg px-3 py-2"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm text-stone-600 dark:text-stone-300">
                        {loan.borrowerName}
                      </p>
                      <p className="text-xs text-stone-400 dark:text-stone-500">
                        {formatDate(loan.lentAt)} → returned {formatDate(loan.returnedAt!)}
                      </p>
                      {loan.notes && (
                        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">
                          {loan.notes}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(loan.id)}
                      className="text-xs text-stone-300 hover:text-red-500 dark:text-stone-600 dark:hover:text-red-400 transition-colors"
                      aria-label="Delete loan record"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
