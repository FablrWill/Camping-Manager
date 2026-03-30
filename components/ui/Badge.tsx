'use client'

type BadgeVariant = 'default' | 'new' | 'good' | 'fair' | 'worn' | 'broken' | 'accent' | 'muted'

interface BadgeProps {
  children: React.ReactNode
  variant?: BadgeVariant
  className?: string
}

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-stone-100 text-stone-600 dark:bg-stone-800 dark:text-stone-400',
  new: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400',
  good: 'bg-sky-50 text-sky-700 dark:bg-sky-900/50 dark:text-sky-400',
  fair: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  worn: 'bg-orange-50 text-orange-700 dark:bg-orange-900/50 dark:text-orange-400',
  broken: 'bg-red-50 text-red-700 dark:bg-red-900/50 dark:text-red-400',
  accent: 'bg-amber-50 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400',
  muted: 'bg-stone-50 text-stone-500 dark:bg-stone-800/50 dark:text-stone-500',
}

export default function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center text-xs px-2 py-0.5 rounded-full font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {children}
    </span>
  )
}

/** Map gear condition string to badge variant */
export function conditionVariant(condition: string | null): BadgeVariant {
  switch (condition) {
    case 'new': return 'new'
    case 'good': return 'good'
    case 'fair': return 'fair'
    case 'worn': return 'worn'
    case 'broken': return 'broken'
    default: return 'default'
  }
}
