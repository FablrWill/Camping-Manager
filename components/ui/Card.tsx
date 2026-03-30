'use client'

interface CardProps {
  children: React.ReactNode
  className?: string
  onClick?: () => void
  hoverable?: boolean
  padding?: 'none' | 'sm' | 'md' | 'lg'
}

const paddingStyles = {
  none: '',
  sm: 'p-3',
  md: 'p-4',
  lg: 'p-6',
}

export default function Card({
  children,
  className = '',
  onClick,
  hoverable = false,
  padding = 'md',
}: CardProps) {
  const interactive = onClick || hoverable
  const Component = onClick ? 'button' : 'div'

  return (
    <Component
      onClick={onClick}
      className={`
        bg-white dark:bg-stone-900
        rounded-xl border border-stone-200 dark:border-stone-700
        ${interactive ? 'hover:border-amber-400 dark:hover:border-amber-500 cursor-pointer' : ''}
        ${onClick ? 'w-full text-left' : ''}
        transition-colors
        ${paddingStyles[padding]}
        ${className}
      `}
    >
      {children}
    </Component>
  )
}

export function CardHeader({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex items-center justify-between mb-3 ${className}`}>
      {children}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <h3 className={`font-semibold text-stone-900 dark:text-stone-50 ${className}`}>
      {children}
    </h3>
  )
}

export function CardDescription({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <p className={`text-sm text-stone-500 dark:text-stone-400 ${className}`}>
      {children}
    </p>
  )
}
