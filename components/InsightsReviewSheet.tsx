'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Check, Star } from 'lucide-react'
import Button from '@/components/ui/Button'
import Badge from '@/components/ui/Badge'
import type { InsightPayload, ApplyInsightRequest } from '@/lib/voice/types'

interface InsightsReviewSheetProps {
  insights: InsightPayload
  tripId: string
  locationId: string | null
  onClose: () => void
  transcription?: string  // Raw voice transcription for TripFeedback storage
}

interface GearItem {
  id: string
  name: string
}

interface LocationData {
  id: string
  name: string
  rating: number | null
}

export default function InsightsReviewSheet({ insights, tripId, locationId, onClose, transcription }: InsightsReviewSheetProps) {
  const [checkedWhatWorked, setCheckedWhatWorked] = useState<Set<number>>(
    () => new Set(insights.whatWorked.map((_, i) => i))
  )
  const [checkedWhatDidnt, setCheckedWhatDidnt] = useState<Set<number>>(
    () => new Set(insights.whatDidnt.map((_, i) => i))
  )
  const [checkedGear, setCheckedGear] = useState<Set<number>>(
    () => new Set(insights.gearFeedback.map((_, i) => i))
  )
  const [confirmRating, setConfirmRating] = useState(false)
  const [adjustedRating, setAdjustedRating] = useState<number>(insights.spotRating.rating ?? 0)
  const [gearMatches, setGearMatches] = useState<Map<number, string>>(new Map())
  const [applyState, setApplyState] = useState<'idle' | 'applying' | 'done'>('idle')
  const [discardConfirm, setDiscardConfirm] = useState(false)
  const [gearList, setGearList] = useState<GearItem[]>([])
  const [locationData, setLocationData] = useState<LocationData | null>(null)
  const [applyError, setApplyError] = useState<string | null>(null)

  // Fetch gear list and match gear names
  useEffect(() => {
    async function loadGear() {
      try {
        const res = await fetch('/api/gear')
        if (!res.ok) return
        const data: GearItem[] = await res.json()
        setGearList(data)

        const matches = new Map<number, string>()
        insights.gearFeedback.forEach((item, i) => {
          if (!item.gearName) return
          const normalised = item.gearName.toLowerCase()
          const match = data.find(g => g.name.toLowerCase().includes(normalised) || normalised.includes(g.name.toLowerCase()))
          if (match) matches.set(i, match.id)
        })
        setGearMatches(matches)
      } catch {
        // Silently fail — gear matching is best-effort
      }
    }
    loadGear()
  }, [insights.gearFeedback])

  // Fetch location data for rating comparison
  useEffect(() => {
    if (!locationId || insights.spotRating.rating === null) return
    async function loadLocation() {
      try {
        const res = await fetch(`/api/locations/${locationId}`)
        if (!res.ok) return
        const data = await res.json()
        setLocationData(data)
      } catch {
        // Silently fail
      }
    }
    loadLocation()
  }, [locationId, insights.spotRating.rating])

  const toggleWhatWorked = useCallback((i: number) => {
    setCheckedWhatWorked(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }, [])

  const toggleWhatDidnt = useCallback((i: number) => {
    setCheckedWhatDidnt(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }, [])

  const toggleGear = useCallback((i: number) => {
    setCheckedGear(prev => {
      const next = new Set(prev)
      if (next.has(i)) next.delete(i); else next.add(i)
      return next
    })
  }, [])

  const handleApply = useCallback(async () => {
    setApplyError(null)
    setApplyState('applying')

    const gearUpdates: { gearId: string; text: string }[] = []
    checkedGear.forEach(i => {
      const gearId = gearMatches.get(i)
      if (gearId) {
        gearUpdates.push({ gearId, text: insights.gearFeedback[i].text })
      }
    })

    const payload: ApplyInsightRequest = {
      tripId,
      voiceTranscript: transcription,
      insights: {
        whatWorked: [...checkedWhatWorked].map(i => insights.whatWorked[i].text),
        whatDidnt: [...checkedWhatDidnt].map(i => insights.whatDidnt[i].text),
        gearUpdates,
        locationRating: (locationId && confirmRating && insights.spotRating.rating !== null)
          ? { locationId, rating: adjustedRating }
          : null,
      },
    }

    try {
      const res = await fetch('/api/voice/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error('Apply failed')
      setApplyState('done')
      setTimeout(() => onClose(), 1500)
    } catch {
      setApplyError('Failed to apply insights. Please try again.')
      setApplyState('idle')
    }
  }, [checkedWhatWorked, checkedWhatDidnt, checkedGear, gearMatches, insights, tripId, locationId, confirmRating, adjustedRating, onClose])

  const isEmpty =
    insights.whatWorked.length === 0 &&
    insights.whatDidnt.length === 0 &&
    insights.gearFeedback.length === 0 &&
    insights.spotRating.rating === null

  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="relative bg-white dark:bg-stone-900 rounded-t-2xl flex flex-col max-h-[90vh] animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 pb-4 border-b border-stone-100 dark:border-stone-800">
          <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-50">Review Insights</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 dark:text-stone-500 dark:hover:text-stone-200 dark:hover:bg-stone-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isEmpty ? (
            <div className="text-center py-8">
              <p className="text-lg font-semibold text-stone-700 dark:text-stone-300 mb-2">Nothing to review</p>
              <p className="text-sm text-stone-500 dark:text-stone-400">
                The recording didn&apos;t yield structured insights. Try again with more detail about what worked and what didn&apos;t.
              </p>
            </div>
          ) : (
            <>
              {/* What Worked */}
              {insights.whatWorked.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-3">What Worked</h3>
                  <div className="space-y-2">
                    {insights.whatWorked.map((item, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 cursor-pointer group"
                        aria-label={item.text}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checkedWhatWorked.has(i)}
                          aria-label={item.text}
                          onClick={() => toggleWhatWorked(i)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checkedWhatWorked.has(i)
                              ? 'bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500'
                              : 'border-stone-300 dark:border-stone-600 hover:border-amber-400 dark:hover:border-amber-500'
                          }`}
                        >
                          {checkedWhatWorked.has(i) && <Check size={12} className="text-white dark:text-stone-900" />}
                        </button>
                        <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* What Didn't */}
              {insights.whatDidnt.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-3">What Didn&apos;t Work</h3>
                  <div className="space-y-2">
                    {insights.whatDidnt.map((item, i) => (
                      <label
                        key={i}
                        className="flex items-start gap-3 cursor-pointer group"
                        aria-label={item.text}
                      >
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={checkedWhatDidnt.has(i)}
                          aria-label={item.text}
                          onClick={() => toggleWhatDidnt(i)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            checkedWhatDidnt.has(i)
                              ? 'bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500'
                              : 'border-stone-300 dark:border-stone-600 hover:border-amber-400 dark:hover:border-amber-500'
                          }`}
                        >
                          {checkedWhatDidnt.has(i) && <Check size={12} className="text-white dark:text-stone-900" />}
                        </button>
                        <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{item.text}</span>
                      </label>
                    ))}
                  </div>
                </section>
              )}

              {/* Gear Feedback */}
              {insights.gearFeedback.length > 0 && (
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">Gear Feedback</h3>
                  <div className="space-y-2">
                    {insights.gearFeedback.map((item, i) => {
                      const matchedId = gearMatches.get(i)
                      const matchedGear = matchedId ? gearList.find(g => g.id === matchedId) : null
                      return (
                        <div key={i} className="flex items-start gap-3">
                          <button
                            type="button"
                            role="checkbox"
                            aria-checked={checkedGear.has(i)}
                            aria-label={item.text}
                            onClick={() => toggleGear(i)}
                            className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                              checkedGear.has(i)
                                ? 'bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500'
                                : 'border-stone-300 dark:border-stone-600 hover:border-amber-400 dark:hover:border-amber-500'
                            }`}
                          >
                            {checkedGear.has(i) && <Check size={12} className="text-white dark:text-stone-900" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm text-stone-700 dark:text-stone-300 leading-relaxed">{item.text}</span>
                            <div className="mt-1">
                              {matchedGear ? (
                                <Badge variant="muted">Gear: {matchedGear.name}</Badge>
                              ) : item.gearName ? (
                                <Badge variant="muted">Gear: {item.gearName} (unlinked)</Badge>
                              ) : (
                                <Badge variant="muted">Unlinked</Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Spot Rating */}
              {insights.spotRating.rating !== null && (
                <section>
                  <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300 mb-3">Spot Rating</h3>
                  <div className="space-y-3">
                    {/* Star picker */}
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setAdjustedRating(star)}
                          aria-label={`Rate ${star} star${star !== 1 ? 's' : ''}`}
                          className="p-0.5 transition-colors"
                        >
                          <Star
                            size={20}
                            className={star <= adjustedRating ? 'fill-amber-500 text-amber-500' : 'text-stone-300 dark:text-stone-600'}
                          />
                        </button>
                      ))}
                    </div>

                    {/* Replace confirmation */}
                    {locationId && (
                      <label className="flex items-start gap-3 cursor-pointer">
                        <button
                          type="button"
                          role="checkbox"
                          aria-checked={confirmRating}
                          aria-label="Apply rating to location"
                          onClick={() => setConfirmRating(prev => !prev)}
                          className={`mt-0.5 w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${
                            confirmRating
                              ? 'bg-amber-600 border-amber-600 dark:bg-amber-500 dark:border-amber-500'
                              : 'border-stone-300 dark:border-stone-600 hover:border-amber-400 dark:hover:border-amber-500'
                          }`}
                        >
                          {confirmRating && <Check size={12} className="text-white dark:text-stone-900" />}
                        </button>
                        <span className="text-sm text-stone-600 dark:text-stone-400 leading-relaxed">
                          {locationData?.rating != null
                            ? `Replace ${locationData.rating}-star rating with ${adjustedRating} stars`
                            : `Set rating to ${adjustedRating} star${adjustedRating !== 1 ? 's' : ''}`}
                        </span>
                      </label>
                    )}
                  </div>
                </section>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 pt-4 border-t border-stone-100 dark:border-stone-800 space-y-3">
          {applyError && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
              {applyError}
            </p>
          )}

          {!isEmpty && (
            <Button
              variant="primary"
              size="lg"
              className="w-full"
              disabled={applyState === 'applying' || applyState === 'done'}
              loading={applyState === 'applying'}
              onClick={handleApply}
            >
              {applyState === 'done' ? (
                <span className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                  <Check size={16} />
                  Done
                </span>
              ) : applyState === 'applying' ? (
                'Applying...'
              ) : (
                'Apply Selected'
              )}
            </Button>
          )}

          {/* Discard All — double-tap */}
          {!discardConfirm ? (
            <Button
              variant="ghost"
              size="lg"
              className="w-full text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
              onClick={() => setDiscardConfirm(true)}
            >
              Discard All
            </Button>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-stone-500 dark:text-stone-400 text-center px-2">
                Tap again to discard all insights. This can&apos;t be undone.
              </p>
              <Button
                variant="danger"
                size="lg"
                className="w-full"
                onClick={onClose}
              >
                Discard All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setDiscardConfirm(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
