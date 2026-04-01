'use client'

import { Mic } from 'lucide-react'

interface VoiceDebriefButtonProps {
  tripId: string
  tripName: string
  locationId?: string | null
  onOpen: () => void
}

export default function VoiceDebriefButton({ tripId: _tripId, tripName: _tripName, locationId: _locationId, onOpen }: VoiceDebriefButtonProps) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation()
        onOpen()
      }}
      aria-label="Record trip debrief"
      className="inline-flex items-center justify-center w-11 h-11 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-500 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors"
    >
      <Mic size={16} />
    </button>
  )
}
