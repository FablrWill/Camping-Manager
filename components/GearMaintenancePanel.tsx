'use client'

import { useState, useEffect, useCallback } from 'react'

type MaintenanceEvent =
  | 'cleaned'
  | 'resealed'
  | 'serviced'
  | 'charged'
  | 'inspected'
  | 'repaired'
  | 'other'

interface MaintenanceLogEntry {
  id: string
  event: string
  notes: string | null
  loggedAt: string
}

interface MaintenanceData {
  lastMaintenanceAt: string | null
  maintenanceIntervalDays: number | null
  logs: MaintenanceLogEntry[]
}

interface GearMaintenancePanelProps {
  gearItemId: string
}

const INTERVAL_OPTIONS = [
  { label: 'No reminder', value: null },
  { label: '3 months', value: 90 },
  { label: '6 months', value: 180 },
  { label: '12 months', value: 365 },
  { label: '24 months', value: 730 },
]

const EVENT_OPTIONS: { label: string; value: MaintenanceEvent }[] = [
  { label: 'Cleaned', value: 'cleaned' },
  { label: 'Resealed', value: 'resealed' },
  { label: 'Serviced', value: 'serviced' },
  { label: 'Charged', value: 'charged' },
  { label: 'Inspected', value: 'inspected' },
  { label: 'Repaired', value: 'repaired' },
  { label: 'Other', value: 'other' },
]

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function getDaysUntilDue(
  lastMaintenanceAt: string | null,
  intervalDays: number | null
): number | null {
  if (!lastMaintenanceAt || !intervalDays) return null
  const dueDate = new Date(lastMaintenanceAt)
  dueDate.setDate(dueDate.getDate() + intervalDays)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return Math.round((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

export default function GearMaintenancePanel({ gearItemId }: GearMaintenancePanelProps) {
  const [data, setData] = useState<MaintenanceData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Log form state
  const [logEvent, setLogEvent] = useState<MaintenanceEvent>('cleaned')
  const [logNotes, setLogNotes] = useState('')
  const [isSavingLog, setIsSavingLog] = useState(false)
  const [logError, setLogError] = useState<string | null>(null)

  // Interval state
  const [isSavingInterval, setIsSavingInterval] = useState(false)

  const fetchData = useCallback(() => {
    setIsLoading(true)
    setError(null)
    fetch(`/api/gear/${gearItemId}/maintenance`)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to load maintenance data')
        return res.json() as Promise<MaintenanceData>
      })
      .then((result) => setData(result))
      .catch(() => setError('Could not load maintenance data'))
      .finally(() => setIsLoading(false))
  }, [gearItemId])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleLogSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSavingLog(true)
    setLogError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/maintenance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: logEvent, notes: logNotes || undefined }),
      })
      if (!res.ok) throw new Error('Failed to save')
      setLogNotes('')
      fetchData()
    } catch {
      setLogError('Could not save maintenance log')
    } finally {
      setIsSavingLog(false)
    }
  }

  const handleIntervalChange = async (value: number | null) => {
    setIsSavingInterval(true)
    try {
      await fetch(`/api/gear/${gearItemId}/maintenance`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ maintenanceIntervalDays: value }),
      })
      fetchData()
    } finally {
      setIsSavingInterval(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3 animate-pulse">
        <div className="h-14 bg-stone-100 dark:bg-stone-800 rounded-lg" />
        <div className="h-10 bg-stone-100 dark:bg-stone-800 rounded-lg" />
        <div className="h-24 bg-stone-100 dark:bg-stone-800 rounded-lg" />
      </div>
    )
  }

  if (error) {
    return <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
  }

  if (!data) return null

  const daysUntilDue = getDaysUntilDue(data.lastMaintenanceAt, data.maintenanceIntervalDays)
  const isOverdue = daysUntilDue !== null && daysUntilDue < 0

  return (
    <div className="space-y-5">
      {/* Status card */}
      {data.maintenanceIntervalDays && (
        <div
          className={`rounded-lg border p-4 ${
            isOverdue
              ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              : 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
          }`}
        >
          {daysUntilDue === null ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              Log a maintenance event to start the reminder clock.
            </p>
          ) : isOverdue ? (
            <>
              <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                Overdue by {Math.abs(daysUntilDue)} {Math.abs(daysUntilDue) === 1 ? 'day' : 'days'}
              </p>
              {data.lastMaintenanceAt && (
                <p className="text-xs text-red-600 dark:text-red-500 mt-0.5">
                  Last service: {formatDate(data.lastMaintenanceAt)}
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-green-700 dark:text-green-400">
                Next due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
              </p>
              {data.lastMaintenanceAt && (
                <p className="text-xs text-green-600 dark:text-green-500 mt-0.5">
                  Last service: {formatDate(data.lastMaintenanceAt)}
                </p>
              )}
            </>
          )}
        </div>
      )}

      {/* Interval picker */}
      <div>
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
          Reminder interval
        </p>
        <div className="flex flex-wrap gap-2">
          {INTERVAL_OPTIONS.map((opt) => (
            <button
              key={opt.value ?? 'none'}
              onClick={() => handleIntervalChange(opt.value)}
              disabled={isSavingInterval}
              className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                data.maintenanceIntervalDays === opt.value
                  ? 'bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 border-stone-800 dark:border-stone-200'
                  : 'bg-white dark:bg-stone-900 text-stone-700 dark:text-stone-300 border-stone-300 dark:border-stone-700 hover:border-stone-500'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Log maintenance form */}
      <form onSubmit={handleLogSubmit} className="space-y-3">
        <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide">
          Log maintenance
        </p>
        <select
          value={logEvent}
          onChange={(e) => setLogEvent(e.target.value as MaintenanceEvent)}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 px-3 py-2 text-sm"
        >
          {EVENT_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Notes (optional)"
          value={logNotes}
          onChange={(e) => setLogNotes(e.target.value)}
          className="w-full rounded-lg border border-stone-300 dark:border-stone-600 bg-white dark:bg-stone-900 text-stone-800 dark:text-stone-200 px-3 py-2 text-sm placeholder:text-stone-400 dark:placeholder:text-stone-500"
        />
        {logError && <p className="text-xs text-red-600 dark:text-red-400">{logError}</p>}
        <button
          type="submit"
          disabled={isSavingLog}
          className="w-full rounded-lg bg-stone-800 dark:bg-stone-200 text-white dark:text-stone-900 px-4 py-2 text-sm font-medium hover:bg-stone-700 dark:hover:bg-stone-300 disabled:opacity-50 transition-colors"
        >
          {isSavingLog ? 'Saving…' : 'Log maintenance'}
        </button>
      </form>

      {/* Log history */}
      {data.logs.length > 0 && (
        <div>
          <p className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wide mb-2">
            History
          </p>
          <ul className="space-y-1">
            {data.logs.map((log) => (
              <li
                key={log.id}
                className="flex items-start justify-between gap-2 py-1.5 border-b border-stone-100 dark:border-stone-800 last:border-0"
              >
                <div>
                  <span className="text-sm font-medium text-stone-800 dark:text-stone-200 capitalize">
                    {log.event}
                  </span>
                  {log.notes && (
                    <span className="text-sm text-stone-500 dark:text-stone-400"> — {log.notes}</span>
                  )}
                </div>
                <span className="text-xs text-stone-400 dark:text-stone-500 shrink-0">
                  {formatDate(log.loggedAt)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data.logs.length === 0 && !data.maintenanceIntervalDays && (
        <p className="text-sm text-stone-400 dark:text-stone-500">
          No maintenance logged yet. Set a reminder interval and log your first service.
        </p>
      )}
    </div>
  )
}
