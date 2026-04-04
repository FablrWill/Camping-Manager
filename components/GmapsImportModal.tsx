'use client';

import { useState, useCallback } from 'react';
import type { GmapsPlace } from '@/lib/gmaps-import';

interface GmapsImportModalProps {
  onClose: () => void;
  onImportComplete: (count: number) => void;
}

type ModalState = 'idle' | 'fetching' | 'preview' | 'importing' | 'done';

export default function GmapsImportModal({ onClose, onImportComplete }: GmapsImportModalProps) {
  const [state, setState] = useState<ModalState>('idle');
  const [url, setUrl] = useState('');
  const [places, setPlaces] = useState<GmapsPlace[]>([]);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [importedCount, setImportedCount] = useState(0);
  const [importProgress, setImportProgress] = useState(0);

  const handleFetch = useCallback(async () => {
    setError(null);
    setState('fetching');
    try {
      const res = await fetch('/api/import/gmaps-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = await res.json() as { places?: GmapsPlace[]; error?: string };
      if (!res.ok) {
        setError(data.error || 'Failed to fetch list');
        setState('idle');
        return;
      }
      const fetchedPlaces = data.places ?? [];
      setPlaces(fetchedPlaces);
      setChecked(new Set(fetchedPlaces.map((_: GmapsPlace, i: number) => i)));
      setState('preview');
    } catch {
      setError('Failed to fetch list — check your connection and try again');
      setState('idle');
    }
  }, [url]);

  const handleImport = useCallback(async () => {
    setState('importing');
    setImportProgress(0);
    const selectedPlaces = places.filter((_, i) => checked.has(i));
    let count = 0;
    for (const place of selectedPlaces) {
      try {
        const res = await fetch('/api/locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: place.name,
            latitude: place.lat,
            longitude: place.lng,
            description: place.address ?? null,
            notes: 'Imported from Google Maps list',
          }),
        });
        if (res.ok) count++;
      } catch {
        // skip failed individual imports
      }
      setImportProgress(prev => prev + 1);
    }
    setImportedCount(count);
    setState('done');
  }, [places, checked]);

  const toggleCheck = useCallback((index: number) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const toggleAll = useCallback(() => {
    if (checked.size === places.length) {
      setChecked(new Set());
    } else {
      setChecked(new Set(places.map((_, i) => i)));
    }
  }, [checked.size, places]);

  const handleClose = useCallback(() => {
    if (importedCount > 0) {
      onImportComplete(importedCount);
    }
    onClose();
  }, [importedCount, onImportComplete, onClose]);

  const handleBackdropClick = useCallback(() => {
    if (state === 'idle' || state === 'preview' || state === 'done') {
      if (state === 'done') {
        handleClose();
      } else {
        onClose();
      }
    }
  }, [state, onClose, handleClose]);

  const selectedCount = checked.size;
  const totalCount = places.length;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={handleBackdropClick}
    >
      <div
        className="bg-white dark:bg-stone-900 rounded-2xl shadow-xl max-w-md w-full mx-4 p-5"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-stone-800 dark:text-stone-100">
            Import Google Maps List
          </h2>
          {(state === 'idle' || state === 'preview') && (
            <button
              onClick={onClose}
              className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-lg leading-none"
              aria-label="Close"
            >
              ×
            </button>
          )}
        </div>

        {/* idle state: URL input */}
        {state === 'idle' && (
          <div>
            <p className="text-xs text-stone-500 dark:text-stone-400 mb-3">
              Paste a shared Google Maps list URL to import its places as spots.
            </p>
            <input
              type="url"
              value={url}
              onChange={e => setUrl(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && url.trim()) handleFetch(); }}
              placeholder="https://maps.app.goo.gl/... or https://google.com/maps/..."
              className="w-full px-3 py-2 text-sm border border-stone-300 dark:border-stone-600 rounded-lg bg-white dark:bg-stone-800 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
            {error && (
              <p className="text-sm text-red-600 dark:text-red-400 mt-2">{error}</p>
            )}
            <div className="flex justify-end mt-3">
              <button
                onClick={handleFetch}
                disabled={!url.trim()}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Fetch List
              </button>
            </div>
          </div>
        )}

        {/* fetching state: spinner */}
        {state === 'fetching' && (
          <div className="flex flex-col items-center py-6">
            <p className="text-sm text-stone-500 dark:text-stone-400 animate-pulse">
              Fetching list...
            </p>
          </div>
        )}

        {/* preview state: checklist */}
        {state === 'preview' && (
          <div>
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm font-medium text-stone-700 dark:text-stone-300">
                Found {totalCount} {totalCount === 1 ? 'place' : 'places'}
              </p>
              <button
                onClick={toggleAll}
                className="text-xs text-amber-600 dark:text-amber-400 hover:underline"
              >
                {selectedCount === totalCount ? 'Select None' : 'Select All'}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto border border-stone-200 dark:border-stone-700 rounded-lg divide-y divide-stone-100 dark:divide-stone-800">
              {places.map((place, i) => (
                <label
                  key={i}
                  className="flex items-start gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50 dark:hover:bg-stone-800"
                >
                  <input
                    type="checkbox"
                    checked={checked.has(i)}
                    onChange={() => toggleCheck(i)}
                    className="mt-0.5 accent-amber-600 shrink-0"
                  />
                  <div className="min-w-0">
                    <p className="text-sm text-stone-800 dark:text-stone-100 truncate">{place.name}</p>
                    {place.address && (
                      <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{place.address}</p>
                    )}
                    {(place.lat != null && place.lng != null) && (
                      <span className="text-xs text-stone-400 dark:text-stone-500">
                        {place.lat.toFixed(4)}, {place.lng.toFixed(4)}
                      </span>
                    )}
                  </div>
                </label>
              ))}
            </div>
            <div className="flex justify-end mt-3">
              <button
                onClick={handleImport}
                disabled={selectedCount === 0}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-medium rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Import {selectedCount} selected
              </button>
            </div>
          </div>
        )}

        {/* importing state: progress */}
        {state === 'importing' && (
          <div className="flex flex-col items-center py-6">
            <p className="text-sm text-stone-500 dark:text-stone-400 animate-pulse">
              Importing {importProgress} of {places.filter((_, i) => checked.has(i)).length}...
            </p>
            <div className="w-full mt-3 bg-stone-200 dark:bg-stone-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-amber-600 h-1.5 rounded-full transition-all duration-200"
                style={{
                  width: `${places.filter((_, i) => checked.has(i)).length > 0
                    ? (importProgress / places.filter((_, i) => checked.has(i)).length) * 100
                    : 0}%`
                }}
              />
            </div>
          </div>
        )}

        {/* done state: result */}
        {state === 'done' && (
          <div className="flex flex-col items-center py-4">
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400 mb-4">
              Successfully imported {importedCount} {importedCount === 1 ? 'location' : 'locations'}
            </p>
            <button
              onClick={handleClose}
              className="px-4 py-2 bg-stone-700 dark:bg-stone-600 text-white text-sm font-medium rounded-lg hover:bg-stone-800 dark:hover:bg-stone-500 transition-colors"
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
