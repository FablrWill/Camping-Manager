'use client'

import { useState, useEffect, useCallback } from 'react'
import { Activity, Database, HardDrive, RefreshCw, Server, Zap } from 'lucide-react'

// ── Types ────────────────────────────────────────────────────────────────────

interface ServiceStatus {
  label: string
  name: string
  pid: number | null
  lastExit: number
  status: 'running' | 'stopped' | 'failed'
}

interface MemorySource {
  source: string
  total: number
  today: number
  last_activity: number | null
}

interface StatusData {
  timestamp: string
  services: ServiceStatus[]
  memories: {
    total: number
    today: number
    bySource: MemorySource[]
  }
  disk: { total: string; used: string; available: string; capacity: string } | null
  gemini: { count: number; limit: number; pct: number } | null
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeTime(ts: string | number | null): string {
  if (!ts) return 'never'
  const ms = typeof ts === 'number' ? ts * 1000 : new Date(ts).getTime()
  const diff = Date.now() - ms
  if (diff < 0) return 'just now'
  const m = Math.floor(diff / 60_000)
  if (m < 60) return m <= 0 ? 'just now' : `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function formatSource(s: string): string {
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

// ── Sub-components ───────────────────────────────────────────────────────────

function StatusDot({ status }: { status: ServiceStatus['status'] }) {
  const cls =
    status === 'running' ? 'bg-emerald-500' :
    status === 'failed'  ? 'bg-red-500 animate-pulse' :
                           'bg-stone-400'
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${cls}`} />
}

function ServiceCard({ svc }: { svc: ServiceStatus }) {
  const shortLabel = svc.label.replace('com.lisaos.', '').replace('com.lisa.', '')
  const statusText =
    svc.status === 'running' ? (svc.pid ? `PID ${svc.pid}` : 'Running') :
    svc.status === 'failed'  ? `Exit ${svc.lastExit}` :
                               'Stopped'
  const statusCls =
    svc.status === 'running' ? 'text-emerald-600 dark:text-emerald-400' :
    svc.status === 'failed'  ? 'text-red-500 dark:text-red-400' :
                               'text-stone-400'

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm">
      <StatusDot status={svc.status} />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-stone-900 dark:text-stone-100 truncate leading-tight">{svc.name}</p>
        <p className="text-xs text-stone-400 truncate leading-tight">{shortLabel}</p>
      </div>
      <span className={`text-xs font-medium flex-shrink-0 tabular-nums ${statusCls}`}>{statusText}</span>
    </div>
  )
}

function SectionHeader({ icon: Icon, title, aside }: {
  icon: React.ElementType
  title: string
  aside?: React.ReactNode
}) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon size={14} className="text-amber-600 flex-shrink-0" />
      <h2 className="text-xs font-semibold text-stone-600 dark:text-stone-400 uppercase tracking-wider">{title}</h2>
      {aside && <span className="ml-auto text-xs text-stone-400">{aside}</span>}
    </div>
  )
}

// ── Main component ───────────────────────────────────────────────────────────

export default function StatusClient() {
  const [data, setData] = useState<StatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [spinning, setSpinning] = useState(false)

  const refresh = useCallback(async (manual = false) => {
    if (manual) setSpinning(true)
    try {
      const res = await fetch('/api/status', { cache: 'no-store' })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      setData(await res.json())
      setError(null)
      setLastRefresh(new Date())
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to fetch status')
    } finally {
      setLoading(false)
      if (manual) setSpinning(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const id = setInterval(() => refresh(), 30_000)
    return () => clearInterval(id)
  }, [refresh])

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <RefreshCw className="animate-spin text-stone-400" size={22} />
      </div>
    )
  }

  // ── Hard error (no data yet) ───────────────────────────────────────────────
  if (error && !data) {
    return (
      <div className="p-4 max-w-lg mx-auto mt-8">
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 p-4 text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">Could not reach /api/status</p>
          <p className="font-mono text-xs">{error}</p>
        </div>
      </div>
    )
  }

  // ── Derived ────────────────────────────────────────────────────────────────
  const runningCount  = data?.services.filter(s => s.status === 'running').length ?? 0
  const totalServices = data?.services.length ?? 0
  const failedSvcs    = data?.services.filter(s => s.status === 'failed') ?? []

  // Disk percentage (strip trailing %)
  const diskPct = data?.disk
    ? Math.min(100, parseInt(data.disk.capacity.replace('%', ''), 10) || 0)
    : 0
  const diskBarCls = diskPct >= 90 ? 'bg-red-500' : diskPct >= 75 ? 'bg-amber-500' : 'bg-emerald-500'

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="max-w-xl mx-auto px-4 py-4 space-y-6 pb-10">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Activity size={16} className="text-amber-600" />
            LisaOS Status
          </h1>
          <p className="text-xs text-stone-400 mt-0.5">
            {lastRefresh ? `Updated ${formatRelativeTime(lastRefresh.toISOString())}` : 'Loading…'}
            {' · '}auto-refreshes every 30s
          </p>
        </div>
        <button
          onClick={() => refresh(true)}
          aria-label="Refresh now"
          className="p-2 rounded-lg text-stone-500 hover:text-amber-600 hover:bg-stone-100 dark:hover:bg-stone-800 transition-colors"
        >
          <RefreshCw size={15} className={spinning ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Soft error banner (stale data still shown) */}
      {error && data && (
        <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
          Last refresh failed: {error}
        </div>
      )}

      {/* Failed-service alert */}
      {failedSvcs.length > 0 && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 p-3 flex items-start gap-2.5">
          <span className="mt-1 w-2 h-2 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
          <div>
            <p className="text-sm font-semibold text-red-700 dark:text-red-300">
              {failedSvcs.length} service{failedSvcs.length > 1 ? 's' : ''} in failed state
            </p>
            <p className="text-xs text-red-500 dark:text-red-400 mt-0.5">
              {failedSvcs.map(s => s.name).join(' · ')}
            </p>
          </div>
        </div>
      )}

      {/* ── Services ── */}
      <section>
        <SectionHeader
          icon={Server}
          title="Services"
          aside={`${runningCount} / ${totalServices} running`}
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {data?.services.map(svc => <ServiceCard key={svc.label} svc={svc} />)}
        </div>
      </section>

      {/* ── Memory ── */}
      <section>
        <SectionHeader icon={Database} title="Memory" />

        {/* Big numbers */}
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold tabular-nums text-stone-900 dark:text-stone-100">
              {(data?.memories.total ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-stone-500 mt-1">Total memories</p>
          </div>
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 shadow-sm text-center">
            <p className="text-2xl font-bold tabular-nums text-amber-600">
              +{(data?.memories.today ?? 0).toLocaleString()}
            </p>
            <p className="text-xs text-stone-500 mt-1">Added today</p>
          </div>
        </div>

        {/* Per-source breakdown */}
        <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm overflow-x-auto">
          <table className="w-full text-sm min-w-[320px]">
            <thead>
              <tr className="border-b border-stone-100 dark:border-stone-800">
                <th className="text-left px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wide">Source</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wide">Total</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wide">Today</th>
                <th className="text-right px-3 py-2 text-xs font-semibold text-stone-400 uppercase tracking-wide hidden sm:table-cell">Last active</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-50 dark:divide-stone-800/60">
              {data?.memories.bySource.map(src => (
                <tr key={src.source} className="hover:bg-stone-50 dark:hover:bg-stone-800/40 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-stone-800 dark:text-stone-200">{formatSource(src.source)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-stone-500 dark:text-stone-400">{src.total.toLocaleString()}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    <span className={src.today > 0 ? 'font-semibold text-amber-600' : 'text-stone-300 dark:text-stone-600'}>
                      {src.today > 0 ? `+${src.today}` : '—'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-stone-400 hidden sm:table-cell">
                    {formatRelativeTime(src.last_activity)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* ── Gemini API Usage ── */}
      {data?.gemini != null && (
        <section>
          <SectionHeader icon={Zap} title="Gemini API · Today" />
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Requests</span>
              <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                {(data.gemini.count).toLocaleString()} / {(data.gemini.limit).toLocaleString()}
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  data.gemini.pct >= 93 ? 'bg-red-500' :
                  data.gemini.pct >= 80 ? 'bg-amber-500' :
                                          'bg-emerald-500'
                }`}
                style={{ width: `${Math.min(100, data.gemini.pct)}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>{data.gemini.pct}% used</span>
              <span>{(data.gemini.limit - data.gemini.count).toLocaleString()} remaining · resets midnight UTC</span>
            </div>
          </div>
        </section>
      )}
      {/* ── Disk ── */}
      {data?.disk && (
        <section>
          <SectionHeader icon={HardDrive} title="Disk · lisa-mini" />
          <div className="rounded-xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 p-4 shadow-sm space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-stone-500">Used</span>
              <span className="font-medium text-stone-900 dark:text-stone-100 tabular-nums">
                {data.disk.used} / {data.disk.total}
              </span>
            </div>
            <div className="h-2 rounded-full bg-stone-100 dark:bg-stone-800 overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${diskBarCls}`}
                style={{ width: `${diskPct}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-stone-400">
              <span>{data.disk.available} available</span>
              <span>{data.disk.capacity} used</span>
            </div>
          </div>
        </section>
      )}

    </div>
  )
}
