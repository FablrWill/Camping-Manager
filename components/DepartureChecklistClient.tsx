'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { Button, ConfirmDialog, EmptyState, PageHeader } from '@/components/ui'
import DepartureChecklistItem from '@/components/DepartureChecklistItem'
import LeavingNowButton from '@/components/LeavingNowButton'
import type { DepartureChecklistResult } from '@/lib/parse-claude'
import { formatDateRange } from '@/lib/trip-utils'
import { useOnlineStatus } from '@/lib/use-online-status'
import { getTripSnapshot } from '@/lib/offline-storage'
import { queueCheckOff } from '@/lib/offline-write-queue'

interface DepartureChecklistClientProps {
  tripId: string
  tripName: string
  startDate: string
  endDate: string
  emergencyContactName: string | null
  emergencyContactEmail: string | null
  offlineData?: DepartureChecklistResult
  tripCoords?: { lat: number; lon: number }
}

interface FloatPlanSentState {
  sentTo: string
  sentToName: string
  sentAt: string
}

export default function DepartureChecklistClient({
  tripId,
  tripName,
  startDate,
  endDate,
  emergencyContactName: tripEmergencyContactName,
  emergencyContactEmail: tripEmergencyContactEmail,
  offlineData,
  tripCoords,
}: DepartureChecklistClientProps) {
  const isOnline = useOnlineStatus()
  const [offlineChecklist, setOfflineChecklist] = useState<DepartureChecklistResult | null>(null)
  const [checklist, setChecklist] = useState<DepartureChecklistResult | null>(null)
  const [checklistId, setChecklistId] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showRegenConfirm, setShowRegenConfirm] = useState(false)

  // Float plan state
  const [resolvedContactName, setResolvedContactName] = useState<string | null>(
    tripEmergencyContactName
  )
  const [resolvedContactEmail, setResolvedContactEmail] = useState<string | null>(
    tripEmergencyContactEmail
  )
  const [sendingFloatPlan, setSendingFloatPlan] = useState(false)
  const [floatPlanSent, setFloatPlanSent] = useState<FloatPlanSentState | null>(null)
  const [floatPlanError, setFloatPlanError] = useState<string | null>(null)
  const [showFloatPlanConfirm, setShowFloatPlanConfirm] = useState(false)

  // Load offline checklist data when device is offline
  useEffect(() => {
    if (isOnline) return
    if (offlineData) {
      setOfflineChecklist(offlineData)
      return
    }
    // Fallback: load from IndexedDB directly
    let cancelled = false
    async function loadFromSnapshot() {
      const snap = await getTripSnapshot(tripId)
      if (!cancelled && snap?.departureChecklist) {
        setOfflineChecklist(snap.departureChecklist as DepartureChecklistResult)
      }
    }
    loadFromSnapshot()
    return () => { cancelled = true }
  }, [isOnline, tripId, offlineData])

  // Load saved checklist on mount
  useEffect(() => {
    if (!isOnline && offlineChecklist) {
      setChecklist(offlineChecklist)
      return
    }
    async function loadSaved() {
      try {
        const res = await fetch(`/api/departure-checklist?tripId=${tripId}`)
        if (res.ok) {
          const data = await res.json()
          if (data.result) {
            setChecklist(data.result)
            setChecklistId(data.id)
          }
        }
      } catch {
        // Silent fail on load — user can generate fresh
      }
    }
    loadSaved()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId, offlineChecklist])

  // Load emergency contact from settings (fallback if not set at trip level)
  useEffect(() => {
    if (tripEmergencyContactEmail) {
      // Trip-level override already set — no need to fetch settings
      return
    }
    async function loadSettings() {
      try {
        const res = await fetch('/api/settings')
        if (res.ok) {
          const data = await res.json()
          if (data.emergencyContactEmail) {
            setResolvedContactEmail(data.emergencyContactEmail)
            setResolvedContactName(data.emergencyContactName ?? null)
          }
        }
      } catch {
        // Silent fail — user will see no-contact prompt
      }
    }
    loadSettings()
  }, [tripEmergencyContactEmail])

  const handleGenerate = useCallback(async () => {
    setGenerating(true)
    setError(null)
    try {
      const res = await fetch('/api/departure-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error || "Couldn't generate checklist — tap Try Again.")
        return
      }
      const data = await res.json()
      setChecklist(data.result)
      setChecklistId(data.id)
    } catch {
      setError("Couldn't generate checklist — tap Try Again.")
    } finally {
      setGenerating(false)
    }
  }, [tripId])

  const handleRegenerate = useCallback(() => {
    setShowRegenConfirm(true)
  }, [])

  const handleCheck = useCallback(
    async (itemId: string, checked: boolean) => {
      if (!checklistId) return

      // Optimistic update
      setChecklist((prev) => {
        if (!prev) return prev
        return {
          ...prev,
          slots: prev.slots.map((slot) => ({
            ...slot,
            items: slot.items.map((item) =>
              item.id === itemId ? { ...item, checked } : item
            ),
          })),
        }
      })

      if (!isOnline) {
        // Queue for sync when back online — per D-02. AppShell handles replay.
        await queueCheckOff(checklistId, itemId, checked)
        return
      }

      // Fire-and-forget PATCH (only runs when online)
      fetch(`/api/departure-checklist/${checklistId}/check`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, checked }),
      }).catch(() => {})
    },
    [checklistId, isOnline]
  )

  const handleSendFloatPlan = useCallback(() => {
    if (!resolvedContactEmail) {
      // No emergency contact — don't open confirm, just show amber prompt
      return
    }
    setShowFloatPlanConfirm(true)
  }, [resolvedContactEmail])

  const onConfirmSend = useCallback(async () => {
    setShowFloatPlanConfirm(false)
    setSendingFloatPlan(true)
    setFloatPlanError(null)
    try {
      const res = await fetch('/api/float-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      const data = await res.json()
      if (!res.ok) {
        setFloatPlanError(data.error || 'Could not send float plan — try again.')
        return
      }
      setFloatPlanSent({
        sentTo: data.sentTo,
        sentToName: data.sentToName,
        sentAt: data.sentAt,
      })
    } catch {
      setFloatPlanError('Could not send float plan — check your connection and try again.')
    } finally {
      setSendingFloatPlan(false)
    }
  }, [tripId])

  // Progress calculation
  const totalItems = checklist
    ? checklist.slots.reduce((sum, slot) => sum + slot.items.length, 0)
    : 0
  const checkedItems = checklist
    ? checklist.slots.reduce(
        (sum, slot) => sum + slot.items.filter((i) => i.checked).length,
        0
      )
    : 0
  const progressPct = totalItems > 0 ? Math.round((checkedItems / totalItems) * 100) : 0

  const dateRange = formatDateRange(startDate, endDate)

  // Format sent time for display
  const formattedSentAt = floatPlanSent
    ? new Date(floatPlanSent.sentAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })
    : null

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back link */}
      <Link
        href={`/trips/${tripId}/prep`}
        className="inline-flex items-center gap-1.5 text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 transition-colors"
      >
        <ArrowLeft size={16} />
        Back to prep
      </Link>

      {/* Page header */}
      <PageHeader title={tripName} subtitle={dateRange} />

      {/* Leaving Now — cache trip data for offline */}
      <LeavingNowButton
        tripId={tripId}
        tripName={tripName}
        dateRange={dateRange}
        emergencyContact={{ name: tripEmergencyContactName, email: tripEmergencyContactEmail }}
        tripCoords={tripCoords}
      />

      {/* Progress bar */}
      {checklist && totalItems > 0 && (
        <div className="space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-amber-600 dark:text-amber-400">
              {checkedItems} of {totalItems} tasks done
            </span>
            <span className="text-sm text-stone-400 dark:text-stone-500">
              {progressPct}%
            </span>
          </div>
          <div className="bg-stone-200 dark:bg-stone-700 rounded-full h-2">
            <div
              className="bg-amber-600 dark:bg-amber-500 rounded-full h-2 transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="bg-red-50 dark:bg-red-950/30 rounded-xl border border-red-200 dark:border-red-800 p-4">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={handleGenerate}
            className="mt-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Empty state — no checklist yet */}
      {!checklist && !generating && !error && (
        <EmptyState
          emoji="📋"
          title="No checklist yet"
          description={isOnline ? "Generate a departure checklist from your trip's packing list, meals, and power data." : "Connect to generate a departure checklist."}
          action={{
            label: isOnline ? 'Generate Checklist' : 'Connect to generate',
            onClick: isOnline ? handleGenerate : () => {},
          }}
        />
      )}

      {/* Generating — skeleton loading */}
      {generating && (
        <div className="space-y-4">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Claude is building your checklist...
          </p>
          {[1, 2, 3].map((i) => (
            <div key={i} className="space-y-2">
              <div className="animate-pulse bg-stone-200 dark:bg-stone-700 rounded h-5 w-48" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="animate-pulse bg-stone-100 dark:bg-stone-800 rounded h-10 w-full"
                />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Checklist slots */}
      {checklist && !generating && (
        <div className="space-y-6">
          {checklist.slots.map((slot) => (
            <div key={slot.label}>
              <h2 className="text-lg font-bold text-stone-900 dark:text-stone-50 mb-2">
                {slot.label}
              </h2>
              <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 divide-y divide-stone-100 dark:divide-stone-800 overflow-hidden">
                {slot.items.map((item) => (
                  <DepartureChecklistItem
                    key={item.id}
                    item={item}
                    onCheck={handleCheck}
                    disabled={!isOnline}
                  />
                ))}
              </div>
            </div>
          ))}

          {!isOnline && (
            <p className="text-xs text-stone-400 mt-2 italic">Check-offs sync when you reconnect.</p>
          )}

          {/* Regenerate button */}
          <div className="pt-2">
            <Button variant="ghost" size="sm" onClick={handleRegenerate} disabled={!isOnline}>
              {isOnline ? 'Regenerate Checklist' : 'Connect to generate'}
            </Button>
          </div>
        </div>
      )}

      {/* Float plan section */}
      <div className="border-t border-stone-200 dark:border-stone-800 my-6 pt-6">
        {floatPlanSent ? (
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircle size={18} />
            <span className="text-sm font-bold">
              Float plan sent to {floatPlanSent.sentToName} at {formattedSentAt}
            </span>
          </div>
        ) : (
          <>
            <Button
              variant="primary"
              onClick={handleSendFloatPlan}
              disabled={!resolvedContactEmail || sendingFloatPlan || !isOnline}
              className="w-full"
            >
              {!isOnline ? 'Connect to send' : sendingFloatPlan ? 'Sending...' : 'Send Float Plan'}
            </Button>

            {!resolvedContactEmail && (
              <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg text-sm text-amber-700 dark:text-amber-400">
                No emergency contact set.{' '}
                <Link href="/settings" className="underline font-bold">
                  Add one in Settings
                </Link>{' '}
                before sending.
              </div>
            )}

            {floatPlanError && (
              <p className="mt-2 text-sm text-red-600 dark:text-red-400">{floatPlanError}</p>
            )}
          </>
        )}
      </div>

      {/* Regenerate confirmation */}
      <ConfirmDialog
        open={showRegenConfirm}
        onClose={() => setShowRegenConfirm(false)}
        onConfirm={() => {
          setShowRegenConfirm(false)
          handleGenerate()
        }}
        title="Regenerate Checklist?"
        message="This will replace your current checklist. Your check-off progress will be lost."
        confirmLabel="Regenerate Checklist"
        confirmVariant="primary"
      />

      {/* Float plan send confirmation */}
      <ConfirmDialog
        open={showFloatPlanConfirm}
        onClose={() => setShowFloatPlanConfirm(false)}
        onConfirm={onConfirmSend}
        title="Send Float Plan?"
        message={`This will email your trip summary to ${resolvedContactName ?? 'your emergency contact'} (${resolvedContactEmail ?? ''}).`}
        confirmLabel="Send Plan"
        confirmVariant="primary"
      />
    </div>
  )
}
