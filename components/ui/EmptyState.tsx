'use client'

interface EmptyStateProps {
  emoji: string
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export default function EmptyState({ emoji, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-16">
      <p className="text-4xl mb-3">{emoji}</p>
      <p className="text-lg font-medium text-stone-400 dark:text-stone-500">{title}</p>
      {description && (
        <p className="text-sm text-stone-400 dark:text-stone-500 mt-1">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400 font-medium text-sm mt-2"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
