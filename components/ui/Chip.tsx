'use client'

interface ChipProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}

export default function Chip({ children, active = false, onClick, className = '' }: ChipProps) {
  return (
    <button
      onClick={onClick}
      className={`
        shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
        ${
          active
            ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
            : 'bg-stone-200 text-stone-600 hover:bg-stone-300 dark:bg-stone-700 dark:text-stone-400 dark:hover:bg-stone-600'
        }
        ${className}
      `}
    >
      {children}
    </button>
  )
}

/** Scrollable row of chips with hidden scrollbar */
export function ChipRow({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex gap-2 overflow-x-auto hide-scrollbar pb-1 -mx-4 px-4 ${className}`}>
      {children}
    </div>
  )
}
