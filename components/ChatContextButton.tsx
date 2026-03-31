'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'

const LABELS: Record<string, string> = {
  trip: 'Ask about this trip',
  gear: 'Ask about this gear',
  spot: 'Ask about this spot',
}

export default function ChatContextButton({
  contextType,
  contextId,
}: {
  contextType: 'trip' | 'gear' | 'spot'
  contextId: string
}) {
  return (
    <Link
      href={`/chat?context=${contextType}:${contextId}`}
      className="fixed bottom-24 right-4 z-40 flex items-center gap-2 px-4 py-3 bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-stone-900 rounded-full shadow-lg transition-colors"
    >
      <MessageCircle size={18} />
      <span className="text-sm font-medium">{LABELS[contextType]}</span>
    </Link>
  )
}
