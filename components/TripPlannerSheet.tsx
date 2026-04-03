'use client'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import ChatClient from './ChatClient'

interface TripPlannerSheetProps {
  open: boolean
  onClose: () => void
  onAddManually: () => void
}

export default function TripPlannerSheet({ open, onClose, onAddManually }: TripPlannerSheetProps) {
  const router = useRouter()

  const handleEscape = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [open, handleEscape])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [open])

  const handleTripCreated = useCallback((tripId: string) => {
    onClose()
    router.push(`/trips/${tripId}/prep`)
  }, [onClose, router])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-white dark:bg-stone-950">
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-950 sticky top-0 z-10">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Plan a Trip</h2>
        <div className="flex items-center gap-3">
          <button
            onClick={onAddManually}
            className="text-sm text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline py-1 px-1"
          >
            Add manually
          </button>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
      </div>
      {/* Chat body */}
      <div className="flex-1 overflow-hidden">
        <ChatClient
          apiEndpoint="/api/trip-planner"
          fullHeight={true}
          initialMessages={[{
            id: 'greeting',
            role: 'assistant',
            content: 'Where are you thinking of going?',
          }]}
          onTripCreated={handleTripCreated}
        />
      </div>
    </div>
  )
}
