'use client'

interface StatCardProps {
  label: string
  value: string | number
  icon?: string
  subtext?: string
  className?: string
}

export default function StatCard({ label, value, icon, subtext, className = '' }: StatCardProps) {
  return (
    <div className={`bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon && <span className="text-lg">{icon}</span>}
        <span className="text-xs font-medium text-stone-500 dark:text-stone-400 uppercase tracking-wider">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-stone-900 dark:text-stone-50">
        {value}
      </p>
      {subtext && (
        <p className="text-xs text-stone-400 dark:text-stone-500 mt-0.5">{subtext}</p>
      )}
    </div>
  )
}
