'use client';

import { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '@/components/ui';
import type { TripIntelligenceReport } from '@/lib/trip-intelligence';

interface ApiResponse {
  report?: TripIntelligenceReport | null;
  error?: string;
}

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return 'just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function StatBadge({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 dark:bg-stone-800 text-xs font-medium text-stone-700 dark:text-stone-300">
      <span className="text-stone-500 dark:text-stone-400">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function ActionBadge({ action }: { action: 'keep' | 'reconsider' | 'always_bring' }) {
  const styles: Record<string, string> = {
    keep: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
    reconsider: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
    always_bring: 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-400',
  };
  const labels: Record<string, string> = {
    keep: 'keep',
    reconsider: 'reconsider',
    always_bring: 'always bring',
  };
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${styles[action]}`}
    >
      {labels[action]}
    </span>
  );
}

export default function TripIntelligenceCard() {
  const [report, setReport] = useState<TripIntelligenceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/trips/intelligence')
      .then((res) => res.json())
      .then((data: ApiResponse) => {
        if (data.report) {
          setReport(data.report);
        }
        setLoading(false);
      })
      .catch(() => {
        setLoading(false);
      });
  }, []);

  const handleGenerate = useCallback(async () => {
    setError(null);
    setGenerating(true);

    try {
      const res = await fetch('/api/trips/intelligence', { method: 'POST' });
      const data = await res.json() as ApiResponse;

      if (!res.ok) {
        setError(data.error ?? 'Failed to generate camping profile');
        return;
      }

      if (data.report) {
        setReport(data.report);
      }
    } catch {
      setError('Failed to generate camping profile. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, []);

  if (loading) {
    return (
      <Card>
        <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-3">
          My Camping Profile
        </p>
        <div className="space-y-2">
          <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-3/4" />
          <div className="h-4 bg-stone-100 dark:bg-stone-800 rounded animate-pulse w-1/2" />
        </div>
      </Card>
    );
  }

  return (
    <Card>
      <p className="text-sm font-bold text-stone-900 dark:text-stone-50 mb-3">
        My Camping Profile
      </p>

      {!report ? (
        <div className="space-y-3">
          <p className="text-sm text-stone-600 dark:text-stone-400">
            Generate your camping profile to see patterns and insights from your trip history.
          </p>
          {error && (
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          )}
          <Button variant="primary" onClick={handleGenerate} loading={generating}>
            Generate Profile
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Stat badges */}
          <div className="flex flex-wrap gap-2">
            <StatBadge label="trips" value={String(report.stats.tripCount)} />
            <StatBadge label="avg nights" value={String(report.stats.avgNights)} />
            <StatBadge label="total nights" value={String(report.stats.totalNights)} />
            <StatBadge label="top season" value={report.stats.topSeason} />
            {report.stats.avgDriveMiles > 0 && (
              <StatBadge label="avg drive" value={`${report.stats.avgDriveMiles}mi`} />
            )}
          </div>

          {/* Patterns */}
          {report.patterns.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1.5">
                Patterns
              </p>
              <ul className="space-y-1">
                {report.patterns.map((pattern, idx) => (
                  <li key={idx} className="text-sm text-stone-600 dark:text-stone-400 flex gap-2">
                    <span className="text-stone-400 mt-0.5">–</span>
                    <span>{pattern}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Gear Insights */}
          {report.gearInsights.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1.5">
                Gear Insights
              </p>
              <ul className="space-y-2">
                {report.gearInsights.map((item, idx) => (
                  <li key={idx} className="text-sm">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-stone-900 dark:text-stone-100">
                        {item.name}
                      </span>
                      <ActionBadge action={item.action} />
                    </div>
                    <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">
                      {item.insight}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Spots to Revisit */}
          {report.spotsToRevisit.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-stone-700 dark:text-stone-300 uppercase tracking-wide mb-1.5">
                Spots to Revisit
              </p>
              <ul className="space-y-2">
                {report.spotsToRevisit.map((spot, idx) => (
                  <li key={idx} className="text-sm">
                    <span className="font-medium text-stone-900 dark:text-stone-100">{spot.name}</span>
                    <p className="text-stone-500 dark:text-stone-400 text-xs mt-0.5">{spot.reason}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Footer */}
          <div className="flex items-center justify-between pt-1 border-t border-stone-100 dark:border-stone-800">
            <p className="text-xs text-stone-400 dark:text-stone-500">
              Last updated: {formatRelativeTime(report.generatedAt)}
            </p>
            <div className="space-y-1">
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400 text-right">{error}</p>
              )}
              <Button variant="secondary" size="sm" onClick={handleGenerate} loading={generating}>
                Refresh
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
