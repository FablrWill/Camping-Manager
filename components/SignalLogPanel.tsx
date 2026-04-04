'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button, Input, Select } from '@/components/ui';

interface SignalLog {
  id: string;
  carrier: string | null;
  cellBars: number | null;
  cellType: string | null;
  starlinkQuality: string | null;
  speedDown: number | null;
  speedUp: number | null;
  notes: string | null;
  loggedAt: string;
}

interface SignalLogPanelProps {
  locationId: string;
}

const CELL_TYPE_OPTIONS = [
  { value: '', label: '---' },
  { value: 'none', label: 'None' },
  { value: '3G', label: '3G' },
  { value: 'LTE', label: 'LTE' },
  { value: '5G', label: '5G' },
];

const STARLINK_OPTIONS = [
  { value: '', label: '---' },
  { value: 'none', label: 'None' },
  { value: 'weak', label: 'Weak' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'strong', label: 'Strong' },
  { value: 'excellent', label: 'Excellent' },
];

function formatDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function renderBars(count: number | null): string {
  if (count == null) return '';
  return '\u2582'.repeat(count) + '\u2581'.repeat(4 - count);
}

function starlinkLabel(quality: string | null): string {
  if (!quality || quality === 'none') return '';
  const map: Record<string, string> = {
    weak: 'Weak',
    moderate: 'Moderate',
    strong: 'Strong',
    excellent: 'Excellent',
  };
  return map[quality] ?? quality;
}

export default function SignalLogPanel({ locationId }: SignalLogPanelProps) {
  const [logs, setLogs] = useState<SignalLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [carrier, setCarrier] = useState('');
  const [cellBars, setCellBars] = useState<number | null>(null);
  const [cellType, setCellType] = useState('');
  const [starlinkQuality, setStarlinkQuality] = useState('');
  const [speedDown, setSpeedDown] = useState('');
  const [speedUp, setSpeedUp] = useState('');
  const [notes, setNotes] = useState('');

  const fetchLogs = useCallback(async () => {
    try {
      const res = await fetch(`/api/locations/${locationId}/signal`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch {
      // Degrade gracefully — logs just won't show
    } finally {
      setLoading(false);
    }
  }, [locationId]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const resetForm = () => {
    setCarrier('');
    setCellBars(null);
    setCellType('');
    setStarlinkQuality('');
    setSpeedDown('');
    setSpeedUp('');
    setNotes('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(`/api/locations/${locationId}/signal`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          carrier: carrier.trim() || null,
          cellBars,
          cellType: cellType || null,
          starlinkQuality: starlinkQuality || null,
          speedDown: speedDown ? parseFloat(speedDown) : null,
          speedUp: speedUp ? parseFloat(speedUp) : null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      resetForm();
      setShowForm(false);
      await fetchLogs();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log signal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="border-t border-stone-200 dark:border-stone-700 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-stone-700 dark:text-stone-300">
          Signal History
        </h3>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            if (showForm) {
              resetForm();
            }
            setShowForm(!showForm);
          }}
        >
          {showForm ? 'Cancel' : '+ Log Signal'}
        </Button>
      </div>

      {/* Log form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="space-y-3 mb-4 p-3 bg-stone-50 dark:bg-stone-800/50 rounded-lg">
          {/* Carrier + Cell type */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Carrier"
              type="text"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. Verizon"
            />
            <Select
              label="Cell type"
              value={cellType}
              onChange={(e) => setCellType(e.target.value)}
              options={CELL_TYPE_OPTIONS}
            />
          </div>

          {/* Bars selector */}
          <div>
            <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1">
              Cell bars
            </label>
            <div className="flex gap-1">
              {[0, 1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setCellBars(cellBars === n ? null : n)}
                  className={`flex-1 py-1.5 text-sm font-medium rounded transition-colors ${
                    cellBars === n
                      ? 'bg-stone-800 text-white dark:bg-stone-200 dark:text-stone-900'
                      : 'bg-stone-200 text-stone-600 dark:bg-stone-700 dark:text-stone-400 hover:bg-stone-300 dark:hover:bg-stone-600'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Starlink */}
          <Select
            label="Starlink quality"
            value={starlinkQuality}
            onChange={(e) => setStarlinkQuality(e.target.value)}
            options={STARLINK_OPTIONS}
          />

          {/* Speeds */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Download (Mbps)"
              type="number"
              value={speedDown}
              onChange={(e) => setSpeedDown(e.target.value)}
              placeholder="e.g. 25.5"
            />
            <Input
              label="Upload (Mbps)"
              type="number"
              value={speedUp}
              onChange={(e) => setSpeedUp(e.target.value)}
              placeholder="e.g. 5.2"
            />
          </div>

          {/* Notes */}
          <Input
            label="Notes"
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Better near hilltop"
          />

          {error && (
            <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/30 px-3 py-2 rounded-lg">
              {error}
            </p>
          )}

          <Button type="submit" variant="primary" size="sm" loading={saving} className="w-full">
            Save Reading
          </Button>
        </form>
      )}

      {/* Log list */}
      {loading ? (
        <p className="text-xs text-stone-400 dark:text-stone-500 animate-pulse">Loading...</p>
      ) : logs.length === 0 ? (
        <p className="text-xs text-stone-400 dark:text-stone-500">
          No signal readings yet. Tap &quot;+ Log Signal&quot; to add one.
        </p>
      ) : (
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {logs.map((log) => (
            <div
              key={log.id}
              className="p-2.5 bg-stone-50 dark:bg-stone-800/50 rounded-lg text-xs"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-stone-500 dark:text-stone-400">
                  {formatDate(log.loggedAt)}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-stone-700 dark:text-stone-300">
                {log.carrier && (
                  <span>{log.carrier}</span>
                )}
                {log.cellBars != null && (
                  <span className="font-mono tracking-tight">{renderBars(log.cellBars)}</span>
                )}
                {log.cellType && log.cellType !== 'none' && (
                  <span className="font-medium">{log.cellType}</span>
                )}
                {log.starlinkQuality && log.starlinkQuality !== 'none' && (
                  <span>Starlink: {starlinkLabel(log.starlinkQuality)}</span>
                )}
                {log.speedDown != null && (
                  <span>{log.speedDown} Mbps &darr;</span>
                )}
                {log.speedUp != null && (
                  <span>{log.speedUp} Mbps &uarr;</span>
                )}
              </div>
              {log.notes && (
                <p className="text-stone-500 dark:text-stone-400 mt-1">{log.notes}</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
