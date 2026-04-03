'use client'

import { AlertTriangle } from 'lucide-react'
import type { DepartureChecklistItem as ChecklistItem } from '@/lib/parse-claude'

interface DepartureChecklistItemProps {
  item: ChecklistItem
  onCheck: (itemId: string, checked: boolean) => void
  disabled?: boolean
}

export default function DepartureChecklistItem({ item, onCheck, disabled }: DepartureChecklistItemProps) {
  return (
    <div
      className={`flex items-center gap-3 min-h-[44px] px-2 py-1.5 rounded-lg transition-colors ${
        disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:bg-stone-100 dark:active:bg-stone-800'
      } ${
        item.isUnpackedWarning && !item.checked
          ? 'bg-amber-50 dark:bg-amber-950/20'
          : ''
      }`}
      onClick={() => !disabled && onCheck(item.id, !item.checked)}
    >
      {/* Checkbox */}
      <div
        className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
          item.checked
            ? 'bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500'
            : item.isUnpackedWarning
            ? 'border-amber-400 dark:border-amber-500'
            : 'border-stone-300 dark:border-stone-600'
        }`}
        style={{ accentColor: '#d97706' }}
      >
        {item.checked && (
          <svg
            width="10"
            height="8"
            viewBox="0 0 10 8"
            fill="none"
            className="text-white dark:text-stone-900"
          >
            <path
              d="M1 4L3.5 6.5L9 1"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
      </div>

      {/* Item text */}
      <div className="flex-1 min-w-0 flex items-center gap-1.5">
        {item.isUnpackedWarning && !item.checked && (
          <AlertTriangle
            size={14}
            className="text-amber-600 dark:text-amber-400 shrink-0"
          />
        )}
        <span
          className={`text-sm transition-colors ${
            item.checked
              ? 'line-through text-stone-400 dark:text-stone-600'
              : item.isUnpackedWarning
              ? 'text-amber-700 dark:text-amber-400'
              : 'text-stone-900 dark:text-stone-100'
          }`}
        >
          {item.text}
        </span>
        {item.isUnpackedWarning && !item.checked && (
          <span className="text-xs text-amber-600 dark:text-amber-400 shrink-0">
            (not packed yet)
          </span>
        )}
      </div>

      {/* Time badge — per D-09, UI-SPEC */}
      {item.suggestedTime && (
        <span
          className={`text-xs tabular-nums shrink-0 ml-auto ${
            item.checked
              ? 'line-through text-stone-400 dark:text-stone-600'
              : 'text-stone-400 dark:text-stone-500'
          }`}
          style={{ maxWidth: '80px' }}
        >
          {item.suggestedTime}
        </span>
      )}
    </div>
  )
}
