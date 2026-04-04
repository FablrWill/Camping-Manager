'use client'

import { useState, useEffect, useCallback } from 'react'
import { AlertTriangle, Info, Loader2, RefreshCw, ShieldCheck } from 'lucide-react'

interface PreTripAlert {
  severity: 'warning' | 'info'
  title: string
  body: string
}

interface PreTripAlertResult {
  alerts: PreTripAlert[]
  checkedAt: string
}

interface AgentJob {
  id: string
  status: string
  result: string | null
  createdAt: string
  completedAt: string | null
}

interface PreTripAlertCardProps {
  tripId: string
}

type CardState = 'no-job' | 'running' | 'done' | 'failed'

const POLL_INTERVAL_MS = 4000

export default function PreTripAlertCard({ tripId }: PreTripAlertCardProps) {
  const [cardState, setCardState] = useState<CardState>('no-job')
  const [job, setJob] = useState<AgentJob | null>(null)
  const [result, setResult] = useState<PreTripAlertResult | null>(null)
  const [triggering, setTriggering] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch the latest pre_trip_alert job for this trip
  const fetchLatestJob = useCallback(async (): Promise<AgentJob | null> => {
    try {
      const res = await fetch(`/api/agent/jobs?type=pre_trip_alert&tripId=${tripId}`)
      if (!res.ok) return null
      const jobs: AgentJob[] = await res.json()
      // Jobs are ordered by createdAt desc; return the most recent for this trip
      return jobs[0] ?? null
    } catch {
      return null
    }
  }, [tripId])

  // Parse result JSON from a completed job
  function parseResult(rawResult: string | null): PreTripAlertResult | null {
    if (!rawResult) return null
    try {
      return JSON.parse(rawResult) as PreTripAlertResult
    } catch {
      return null
    }
  }

  // Resolve card state from a job record
  function resolveState(j: AgentJob | null): CardState {
    if (!j) return 'no-job'
    if (j.status === 'done') return 'done'
    if (j.status === 'failed') return 'failed'
    return 'running' // pending or running
  }

  // Initial load
  useEffect(() => {
    let cancelled = false
    async function init() {
      const latestJob = await fetchLatestJob()
      if (cancelled) return
      setJob(latestJob)
      setCardState(resolveState(latestJob))
      if (latestJob?.status === 'done') {
        setResult(parseResult(latestJob.result))
      }
    }
    void init()
    return () => { cancelled = true }
  }, [fetchLatestJob])

  // Poll while running
  useEffect(() => {
    if (cardState !== 'running' || !job) return

    const interval = setInterval(async () => {
      const res = await fetch(`/api/agent/jobs/${job.id}`)
      if (!res.ok) return
      const updated: AgentJob = await res.json()
      setJob(updated)

      if (updated.status === 'done') {
        clearInterval(interval)
        setCardState('done')
        setResult(parseResult(updated.result))
      } else if (updated.status === 'failed') {
        clearInterval(interval)
        setCardState('failed')
        const parsed = parseResult(updated.result)
        if (parsed && 'error' in (parsed as unknown as Record<string, unknown>)) {
          setError((parsed as unknown as Record<string, unknown>).error as string)
        }
      }
    }, POLL_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [cardState, job])

  async function triggerJob() {
    setTriggering(true)
    setError(null)
    try {
      const res = await fetch('/api/agent/jobs/trigger/pre-trip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tripId }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to start check')
      }
      const newJob: AgentJob = await res.json()
      setJob(newJob)
      setCardState('running')
      setResult(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start check')
    } finally {
      setTriggering(false)
    }
  }

  async function retryJob() {
    setCardState('no-job')
    setJob(null)
    setResult(null)
    setError(null)
    await triggerJob()
  }

  function formatCheckedAt(iso: string): string {
    try {
      return new Date(iso).toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    } catch {
      return iso
    }
  }

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-amber-500" />
          <h3 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
            Pre-Trip Check
          </h3>
        </div>
        {cardState === 'done' && result && (
          <button
            onClick={retryJob}
            disabled={triggering}
            aria-label="Re-run pre-trip check"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-300 transition-colors"
          >
            <RefreshCw size={14} />
          </button>
        )}
      </div>

      {/* No-job state */}
      {cardState === 'no-job' && (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Check for fire restrictions, weather risks, and road closures before you go.
          </p>
          <button
            onClick={triggerJob}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50"
          >
            {triggering ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Starting…
              </>
            ) : (
              'Run Pre-Trip Check'
            )}
          </button>
          {error && (
            <p className="text-xs text-red-500 dark:text-red-400">{error}</p>
          )}
        </div>
      )}

      {/* Running / pending state */}
      {cardState === 'running' && (
        <div className="flex items-center gap-2 text-sm text-stone-500 dark:text-stone-400">
          <Loader2 size={15} className="animate-spin text-amber-500" />
          <span>Checking fire restrictions, weather, and road conditions…</span>
        </div>
      )}

      {/* Done state */}
      {cardState === 'done' && result && (
        <div className="space-y-3">
          {result.alerts.length === 0 ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">
              No alerts found — conditions look clear.
            </p>
          ) : (
            result.alerts.map((alert, i) => (
              <div
                key={i}
                className={`flex gap-2.5 p-3 rounded-lg border ${
                  alert.severity === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-700'
                    : 'bg-stone-50 dark:bg-stone-800/50 border-stone-200 dark:border-stone-700'
                }`}
              >
                {alert.severity === 'warning' ? (
                  <AlertTriangle
                    size={16}
                    className="text-amber-500 shrink-0 mt-0.5"
                  />
                ) : (
                  <Info
                    size={16}
                    className="text-stone-400 dark:text-stone-500 shrink-0 mt-0.5"
                  />
                )}
                <div>
                  <p className={`text-sm font-medium ${
                    alert.severity === 'warning'
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-stone-700 dark:text-stone-300'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`text-xs mt-0.5 ${
                    alert.severity === 'warning'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-stone-500 dark:text-stone-400'
                  }`}>
                    {alert.body}
                  </p>
                </div>
              </div>
            ))
          )}
          <p className="text-xs text-stone-400 dark:text-stone-600">
            Checked {formatCheckedAt(result.checkedAt)}
          </p>
        </div>
      )}

      {/* Failed state */}
      {cardState === 'failed' && (
        <div className="space-y-2">
          <p className="text-sm text-stone-500 dark:text-stone-400">
            Check failed. {error ? error : 'Something went wrong.'}
          </p>
          <button
            onClick={retryJob}
            disabled={triggering}
            className="inline-flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 transition-colors disabled:opacity-50"
          >
            {triggering ? (
              <>
                <Loader2 size={14} className="animate-spin" />
                Retrying…
              </>
            ) : (
              <>
                <RefreshCw size={14} />
                Retry
              </>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
