'use client'

import { useState, useCallback } from 'react'
import { ThumbsUp, ThumbsDown } from 'lucide-react'

interface MealFeedbackButtonProps {
  mealId: string
  mealName: string
  tripId: string
  initialRating?: 'liked' | 'disliked' | null
  initialNote?: string | null
}

export default function MealFeedbackButton({
  mealId,
  mealName,
  tripId,
  initialRating = null,
  initialNote = null,
}: MealFeedbackButtonProps) {
  const [rating, setRating] = useState<'liked' | 'disliked' | null>(initialRating ?? null)
  const [noteOpen, setNoteOpen] = useState(initialRating !== null)
  const [noteText, setNoteText] = useState(initialNote ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const saveFeedback = useCallback(
    async (newRating: 'liked' | 'disliked', note: string) => {
      setSaving(true)
      setError(null)
      try {
        const res = await fetch(`/api/trips/${tripId}/meal-plan/feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            mealId,
            mealName,
            rating: newRating,
            notes: note.trim() || undefined,
          }),
        })
        if (!res.ok) {
          setError("Couldn't save your rating — check your connection.")
        }
      } catch {
        setError("Couldn't save your rating — check your connection.")
      } finally {
        setSaving(false)
      }
    },
    [mealId, mealName, tripId]
  )

  const handleThumb = useCallback(
    (thumb: 'liked' | 'disliked') => {
      if (thumb === rating) {
        // Toggle off — hide textarea, clear rating (no API call per spec)
        setRating(null)
        setNoteOpen(false)
        return
      }
      setRating(thumb)
      setNoteOpen(true)
      // Fire-and-forget save
      void saveFeedback(thumb, noteText)
    },
    [rating, noteText, saveFeedback]
  )

  const handleNoteBlur = useCallback(() => {
    if (rating) {
      void saveFeedback(rating, noteText)
    }
  }, [rating, noteText, saveFeedback])

  const likedActive = rating === 'liked'
  const dislikedActive = rating === 'disliked'

  return (
    <div className="mt-2">
      <div className="flex items-center gap-1">
        {/* Thumbs up */}
        <button
          onClick={() => handleThumb('liked')}
          disabled={saving}
          aria-label={likedActive ? 'Rated: great — tap to change' : 'This meal was great'}
          className={`flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-md transition-colors disabled:opacity-60 ${
            likedActive
              ? 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <ThumbsUp size={16} />
        </button>

        {/* Thumbs down */}
        <button
          onClick={() => handleThumb('disliked')}
          disabled={saving}
          aria-label={dislikedActive ? 'Rated: needs work — tap to change' : 'This meal needs work'}
          className={`flex items-center justify-center min-h-[44px] min-w-[44px] px-3 py-2 rounded-md transition-colors disabled:opacity-60 ${
            dislikedActive
              ? 'text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-900/30'
              : 'text-stone-400 dark:text-stone-500 hover:text-stone-600 dark:hover:text-stone-300'
          }`}
        >
          <ThumbsDown size={16} />
        </button>
      </div>

      {/* Optional note textarea — revealed after tapping a thumb */}
      {noteOpen && (
        <textarea
          rows={2}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
          onBlur={handleNoteBlur}
          placeholder="Add a note (optional)"
          className="w-full text-sm rounded-md border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-2 mt-2 resize-none focus:outline-none focus:ring-1 focus:ring-amber-400"
        />
      )}

      {/* Inline error */}
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}
