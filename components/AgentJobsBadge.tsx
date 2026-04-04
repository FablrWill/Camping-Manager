'use client'

import { useState, useEffect, useCallback } from 'react'
import { Zap, X, Check } from 'lucide-react'

interface AgentJob {
  id: string
  type: string
  status: string
  payload: string
  result: string | null
  readAt: string | null
  createdAt: string
  completedAt: string | null
}

function jobTypeLabel(type: string): string {
  switch (type) {
    case 'gear_enrichment': return 'Gear enrichment'
    default: return type.replace(/_/g, ' ')
  }
}

function parsePayloadName(payload: string): string {
  try {
    const parsed = JSON.parse(payload)
    return parsed.name || parsed.gearItemId || 'Unknown'
  } catch {
    return 'Unknown'
  }
}

interface AgentJobsBadgeProps {
  initialCount?: number
}

export default function AgentJobsBadge({ initialCount = 0 }: AgentJobsBadgeProps) {
  const [unreadJobs, setUnreadJobs] = useState<AgentJob[]>([])
  const [count, setCount] = useState(initialCount)
  const [showDropdown, setShowDropdown] = useState(false)

  const fetchUnread = useCallback(async () => {
    try {
      const res = await fetch('/api/agent/jobs?status=done&unread=true')
      if (!res.ok) return
      const jobs: AgentJob[] = await res.json()
      setUnreadJobs(jobs)
      setCount(jobs.length)
    } catch {
      // silent fail — badge is non-critical
    }
  }, [])

  useEffect(() => {
    fetchUnread()
  }, [fetchUnread])

  async function markAllRead(): Promise<void> {
    try {
      await Promise.all(
        unreadJobs.map((job) =>
          fetch(`/api/agent/jobs/${job.id}`, { method: 'PATCH' })
        )
      )
      setUnreadJobs([])
      setCount(0)
      setShowDropdown(false)
    } catch {
      // silent fail
    }
  }

  if (count === 0) return null

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-1.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded-lg px-2.5 py-1.5 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
      >
        <Zap size={14} />
        <span className="text-xs font-semibold">{count}</span>
        <span className="text-xs hidden sm:inline">new result{count !== 1 ? 's' : ''}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl shadow-lg z-50">
          <div className="flex items-center justify-between px-3 py-2 border-b border-stone-200 dark:border-stone-700">
            <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
              Agent Results
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={markAllRead}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 flex items-center gap-1"
              >
                <Check size={12} />
                Mark read
              </button>
              <button
                onClick={() => setShowDropdown(false)}
                className="ml-2 text-stone-400 hover:text-stone-600 dark:hover:text-stone-300"
              >
                <X size={14} />
              </button>
            </div>
          </div>
          <div className="max-h-60 overflow-y-auto">
            {unreadJobs.map((job) => (
              <div
                key={job.id}
                className="px-3 py-2 border-b border-stone-100 dark:border-stone-700 last:border-b-0"
              >
                <p className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {jobTypeLabel(job.type)}
                </p>
                <p className="text-xs text-stone-500 dark:text-stone-400 truncate">
                  {parsePayloadName(job.payload)}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
