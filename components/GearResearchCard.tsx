'use client'

import { Search, RefreshCw, ThumbsUp, ArrowUpRight, AlertTriangle } from 'lucide-react'

interface GearAlternative {
  name: string
  brand: string
  price: string
  weight: string
  pros: string[]
  cons: string[]
  url?: string
}

interface GearResearch {
  alternatives: GearAlternative[]
  summary: string
  recommendation: 'keep' | 'consider_upgrade' | 'upgrade'
}

interface GearResearchCardProps {
  researchResult: string | null
  researchedAt: string | null
  onResearch: () => void
  isResearching: boolean
}

function isStale(researchedAt: string): boolean {
  const daysAgo = (Date.now() - new Date(researchedAt).getTime()) / (1000 * 60 * 60 * 24)
  return daysAgo > 90
}

function recommendationBadge(rec: string): { label: string; className: string } {
  switch (rec) {
    case 'keep':
      return { label: 'Keep it', className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' }
    case 'consider_upgrade':
      return { label: 'Consider upgrade', className: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' }
    case 'upgrade':
      return { label: 'Upgrade recommended', className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' }
    default:
      return { label: rec, className: 'bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300' }
  }
}

export default function GearResearchCard({
  researchResult,
  researchedAt,
  onResearch,
  isResearching,
}: GearResearchCardProps) {
  if (!researchResult) {
    return (
      <button
        onClick={onResearch}
        disabled={isResearching}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-medium text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-700 transition-colors disabled:opacity-50"
      >
        {isResearching ? (
          <>
            <RefreshCw size={16} className="animate-spin" />
            Researching alternatives...
          </>
        ) : (
          <>
            <Search size={16} />
            Research alternatives
          </>
        )}
      </button>
    )
  }

  let research: GearResearch
  try {
    research = JSON.parse(researchResult)
  } catch {
    return null
  }

  const stale = researchedAt ? isStale(researchedAt) : false
  const badge = recommendationBadge(research.recommendation)

  return (
    <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
        <div className="flex items-center gap-2">
          <Search size={14} className="text-stone-400" />
          <span className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
            Research
          </span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${badge.className}`}>
            {badge.label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {stale && (
            <span className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400">
              <AlertTriangle size={12} />
              Stale
            </span>
          )}
          <button
            onClick={onResearch}
            disabled={isResearching}
            className="text-xs text-stone-500 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 flex items-center gap-1 disabled:opacity-50"
          >
            <RefreshCw size={12} className={isResearching ? 'animate-spin' : ''} />
            {isResearching ? 'Researching...' : 'Re-research'}
          </button>
        </div>
      </div>

      {/* Summary */}
      <div className="px-4 py-3 border-b border-stone-100 dark:border-stone-800">
        <p className="text-sm text-stone-700 dark:text-stone-300">{research.summary}</p>
      </div>

      {/* Alternatives */}
      <div className="divide-y divide-stone-100 dark:divide-stone-800">
        {research.alternatives.map((alt, i) => (
          <div key={i} className="px-4 py-3">
            <div className="flex items-start justify-between mb-1.5">
              <div>
                <span className="text-sm font-medium text-stone-800 dark:text-stone-200">
                  {alt.brand} {alt.name}
                </span>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs text-stone-500 dark:text-stone-400">{alt.price}</span>
                  <span className="text-xs text-stone-500 dark:text-stone-400">{alt.weight}</span>
                </div>
              </div>
              {alt.url && (
                <a
                  href={alt.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 shrink-0"
                >
                  <ArrowUpRight size={14} />
                </a>
              )}
            </div>
            <div className="flex gap-4 mt-1.5">
              <div className="flex-1">
                {alt.pros.map((pro, j) => (
                  <p key={j} className="text-xs text-emerald-600 dark:text-emerald-400 flex items-start gap-1">
                    <ThumbsUp size={10} className="mt-0.5 shrink-0" />
                    {pro}
                  </p>
                ))}
              </div>
              <div className="flex-1">
                {alt.cons.map((con, j) => (
                  <p key={j} className="text-xs text-stone-500 dark:text-stone-400">
                    — {con}
                  </p>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      {researchedAt && (
        <div className="px-4 py-2 bg-stone-50 dark:bg-stone-800/50 border-t border-stone-200 dark:border-stone-700">
          <p className="text-xs text-stone-400 dark:text-stone-500">
            Researched {new Date(researchedAt).toLocaleDateString()}
          </p>
        </div>
      )}
    </div>
  )
}
