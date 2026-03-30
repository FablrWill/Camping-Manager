'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import Badge from '@/components/ui/Badge'
import type { PrepStatus } from '@/lib/prep-sections'

interface TripPrepSectionProps {
  title: string
  emoji: string
  status: PrepStatus
  summary: string
  defaultExpanded?: boolean
  children: React.ReactNode
}

const STATUS_BADGE: Record<PrepStatus, { label: string; className: string }> = {
  ready:       { label: 'Ready',       className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
  in_progress: { label: 'In Progress', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
  not_started: { label: 'Not Started', className: 'bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400' },
}

export default function TripPrepSection({
  title,
  emoji,
  status,
  summary,
  defaultExpanded = false,
  children,
}: TripPrepSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const badge = STATUS_BADGE[status]

  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
        aria-expanded={expanded}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-base leading-none shrink-0">{emoji}</span>
          <span className="font-semibold text-stone-900 dark:text-stone-50 text-sm">
            {title}
          </span>
          <Badge className={badge.className}>
            {badge.label}
          </Badge>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          {!expanded && summary && (
            <span className="text-xs text-stone-400 dark:text-stone-500 max-w-[120px] truncate">
              {summary}
            </span>
          )}
          <ChevronDown
            size={16}
            className={`text-stone-400 dark:text-stone-500 transition-transform duration-200 ${
              expanded ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      {/* CSS-based collapse — children stay mounted to avoid re-fetching */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          expanded ? 'max-h-[9999px]' : 'max-h-0'
        }`}
      >
        <div className="px-4 pb-4">{children}</div>
      </div>
    </div>
  )
}
