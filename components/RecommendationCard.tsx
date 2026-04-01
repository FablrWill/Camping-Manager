'use client'

import { useState } from 'react'
import { MapPin, Star, BookOpen, Bookmark, Check } from 'lucide-react'

export interface Recommendation {
  id: string | null
  name: string
  description: string
  type: string | null
  rating: number | null
  source: 'saved' | 'knowledge_base'
  distanceNote: string | null
  coordinates: { lat: number; lon: number } | null
}

interface RecommendationCardProps {
  rec: Recommendation
}

export default function RecommendationCard({ rec }: RecommendationCardProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const handleSave = async () => {
    if (saving || saved) return
    setSaving(true)
    setSaveError(null)

    try {
      const res = await fetch('/api/locations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: rec.name,
          description: rec.description,
          type: rec.type ?? null,
          latitude: rec.coordinates?.lat ?? null,
          longitude: rec.coordinates?.lon ?? null,
          notes: `Saved from AI recommendation. Source: ${rec.source}`,
        }),
      })

      if (!res.ok) {
        const data = await res.json() as { error?: string }
        setSaveError(data.error ?? 'Save failed')
      } else {
        setSaved(true)
      }
    } catch {
      setSaveError('Save failed. Try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-2 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 p-3 space-y-2">
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={14} className="shrink-0 text-amber-600 dark:text-amber-400" />
          <span className="font-semibold text-stone-900 dark:text-stone-50 text-sm truncate">{rec.name}</span>
        </div>
        {/* Source badge */}
        {rec.source === 'saved' ? (
          <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">
            <Bookmark size={10} />
            Saved
          </span>
        ) : (
          <span className="shrink-0 flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-stone-100 dark:bg-stone-800 text-stone-500 dark:text-stone-400">
            <BookOpen size={10} />
            Knowledge Base
          </span>
        )}
      </div>

      {/* Meta row: type + rating */}
      {(rec.type || rec.rating || rec.distanceNote) && (
        <div className="flex items-center gap-3 text-xs text-stone-500 dark:text-stone-400">
          {rec.type && <span className="capitalize">{rec.type.replace('_', ' ')}</span>}
          {rec.rating && (
            <span className="flex items-center gap-0.5">
              <Star size={10} className="text-amber-500" />
              {rec.rating}/5
            </span>
          )}
          {rec.distanceNote && <span>{rec.distanceNote}</span>}
        </div>
      )}

      {/* Description */}
      <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed line-clamp-3">
        {rec.description}
      </p>

      {/* Save button — only for knowledge_base spots not yet saved */}
      {rec.source === 'knowledge_base' && !saved && (
        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full mt-1 py-2 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white dark:text-stone-900 disabled:opacity-50 transition-colors"
        >
          {saving ? 'Saving...' : 'Save to My Spots'}
        </button>
      )}

      {saved && (
        <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400">
          <Check size={12} />
          Saved to your spots
        </div>
      )}

      {saveError && (
        <p className="text-xs text-red-500 dark:text-red-400">{saveError}</p>
      )}
    </div>
  )
}
