'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, AlertTriangle, TrendingUp, CheckCircle, Clock } from 'lucide-react'
import type { GearResearchResult, GearResearchAlternative } from '@/lib/parse-claude'

interface GearResearchTabProps {
  gearItemId: string
  gearName: string
}

type ResearchData = GearResearchResult & { id: string; researchedAt: string }

const STALE_DAYS = 90

const VERDICT_CONFIG: Record<GearResearchResult['verdict'], { color: string; icon: React.ReactNode; label: string }> = {
  'Worth upgrading': {
    color: 'text-orange-700 bg-orange-50 dark:text-orange-300 dark:bg-orange-950/30',
    icon: <TrendingUp className="w-4 h-4" />,
    label: 'Worth upgrading',
  },
  'Keep what you have': {
    color: 'text-emerald-700 bg-emerald-50 dark:text-emerald-300 dark:bg-emerald-950/30',
    icon: <CheckCircle className="w-4 h-4" />,
    label: 'Keep what you have',
  },
  'Only if budget allows': {
    color: 'text-amber-700 bg-amber-50 dark:text-amber-300 dark:bg-amber-950/30',
    icon: <Clock className="w-4 h-4" />,
    label: 'Only if budget allows',
  },
}

function AlternativeCard({ alt }: { alt: GearResearchAlternative }) {
  return (
    <div className="bg-white dark:bg-stone-900 rounded-xl border border-stone-200 dark:border-stone-700 p-4 space-y-3">
      <div className="flex items-start justify-between gap-2 flex-wrap">
        <div>
          <p className="font-semibold text-stone-900 dark:text-stone-50 text-sm">
            {alt.brand ? `${alt.brand} ` : ''}{alt.name}
          </p>
          <p className="text-xs text-stone-500 dark:text-stone-400">{alt.priceRange}</p>
        </div>
      </div>

      {alt.pros.length > 0 && (
        <ul className="space-y-1">
          {alt.pros.map((pro, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
              <span className="text-emerald-500 dark:text-emerald-400 mt-0.5 shrink-0">+</span>
              <span>{pro}</span>
            </li>
          ))}
        </ul>
      )}

      {alt.cons.length > 0 && (
        <ul className="space-y-1">
          {alt.cons.map((con, i) => (
            <li key={i} className="flex items-start gap-2 text-xs text-stone-700 dark:text-stone-300">
              <span className="text-red-500 dark:text-red-400 mt-0.5 shrink-0">−</span>
              <span>{con}</span>
            </li>
          ))}
        </ul>
      )}

      {alt.reason && (
        <p className="text-xs italic text-stone-500 dark:text-stone-400">{alt.reason}</p>
      )}
    </div>
  )
}

export default function GearResearchTab({ gearItemId, gearName }: GearResearchTabProps) {
  const [research, setResearch] = useState<ResearchData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [researching, setResearching] = useState(false)

  useEffect(() => {
    async function loadResearch() {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/gear/${gearItemId}/research`)
        if (res.status === 404) {
          setResearch(null)
        } else if (!res.ok) {
          throw new Error('Failed to load research')
        } else {
          const data: ResearchData = await res.json()
          setResearch(data)
        }
      } catch (err) {
        console.error('Failed to load gear research:', err)
        setError('Could not load research data.')
      } finally {
        setLoading(false)
      }
    }
    loadResearch()
  }, [gearItemId])

  async function handleResearch() {
    setResearching(true)
    setError(null)
    try {
      const res = await fetch(`/api/gear/${gearItemId}/research`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error((body as { error?: string }).error ?? 'Research failed')
      }
      const data: ResearchData = await res.json()
      setResearch(data)
    } catch (err) {
      console.error('Failed to run gear research:', err)
      setError(err instanceof Error ? err.message : 'Research failed. Please try again.')
    } finally {
      setResearching(false)
    }
  }

  const isStale = research?.researchedAt
    ? Date.now() - new Date(research.researchedAt).getTime() > STALE_DAYS * 24 * 60 * 60 * 1000
    : false

  if (loading) {
    return (
      <div className="py-6 text-center text-stone-400 dark:text-stone-500 text-sm">
        Loading research...
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Error banner */}
      {error && (
        <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 rounded-lg px-3 py-2">
          {error}
        </p>
      )}

      {/* No research yet */}
      {!research && !researching && (
        <div className="py-6 text-center space-y-3">
          <p className="text-sm text-stone-400 dark:text-stone-500">
            No research yet for {gearName}
          </p>
          <button
            onClick={handleResearch}
            className="inline-flex items-center justify-center gap-2 py-2.5 px-6 rounded-lg bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-400 text-white dark:text-stone-900 font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Research
          </button>
        </div>
      )}

      {/* Researching overlay (no existing results) */}
      {researching && !research && (
        <div className="py-6 text-center text-stone-400 dark:text-stone-500 text-sm">
          <RefreshCw className="w-5 h-5 mx-auto mb-2 animate-spin" />
          Researching alternatives...
        </div>
      )}

      {/* Existing research results */}
      {research && (
        <div className={researching ? 'opacity-50 pointer-events-none' : ''}>
          {/* Staleness warning */}
          {isStale && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-950/30 border border-yellow-200 dark:border-yellow-800 px-3 py-2.5 mb-3">
              <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
              <p className="text-xs text-yellow-700 dark:text-yellow-300 flex-1">
                Research is over 90 days old — results may be outdated
              </p>
            </div>
          )}

          {/* Verdict badge */}
          {(() => {
            const cfg = VERDICT_CONFIG[research.verdict]
            return (
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold mb-3 ${cfg.color}`}>
                {cfg.icon}
                {cfg.label}
              </div>
            )
          })()}

          {/* Summary */}
          {research.summary && (
            <p className="text-sm text-stone-700 dark:text-stone-300 mb-4">{research.summary}</p>
          )}

          {/* Alternatives */}
          {research.alternatives.length > 0 && (
            <div className="space-y-3 mb-4">
              {research.alternatives.map((alt, i) => (
                <AlternativeCard key={i} alt={alt} />
              ))}
            </div>
          )}

          {/* Price disclaimer */}
          {research.priceDisclaimer && (
            <p className="text-xs text-stone-400 dark:text-stone-500 italic mb-4">
              {research.priceDisclaimer}
            </p>
          )}

          {/* Re-research button */}
          <button
            onClick={handleResearch}
            disabled={researching}
            className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg border border-stone-300 dark:border-stone-600 text-stone-600 dark:text-stone-400 hover:border-amber-500 dark:hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 transition-colors text-sm disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${researching ? 'animate-spin' : ''}`} />
            {researching ? 'Researching alternatives...' : 'Re-research'}
          </button>
        </div>
      )}

      {/* Researching overlay when existing results shown */}
      {researching && research && (
        <div className="text-center text-xs text-stone-400 dark:text-stone-500 mt-1">
          Updating research results...
        </div>
      )}
    </div>
  )
}
