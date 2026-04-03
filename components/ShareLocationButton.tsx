'use client';

import { useState, useEffect, useCallback } from 'react';
import { MapPin, X, Copy, Check } from 'lucide-react';

interface ShareLocationButtonProps {
  className?: string;
}

type Status = 'idle' | 'loading' | 'active' | 'error';

interface ShareRecord {
  lat: number;
  lon: number;
  label: string | null;
  slug: string;
  updatedAt: string;
}

export default function ShareLocationButton({ className }: ShareLocationButtonProps) {
  const [status, setStatus] = useState<Status>('idle');
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [lat, setLat] = useState('');
  const [lon, setLon] = useState('');
  const [label, setLabel] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Load current share status on mount
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch('/api/share/location');
        if (!res.ok) return;
        const data: ShareRecord | null = await res.json();
        if (data) {
          setStatus('active');
          const base = process.env.NEXT_PUBLIC_BASE_URL || '';
          setShareUrl(`${base}/share/${data.slug}`);
          setLat(String(data.lat));
          setLon(String(data.lon));
          setLabel(data.label ?? '');
        }
      } catch {
        // Silently degrade — non-critical on mount
      }
    }
    loadStatus();
  }, []);

  const handlePost = useCallback(async () => {
    setError(null);
    const parsedLat = parseFloat(lat);
    const parsedLon = parseFloat(lon);
    if (isNaN(parsedLat) || isNaN(parsedLon)) {
      setError('Latitude and longitude must be valid numbers.');
      return;
    }
    if (parsedLat < -90 || parsedLat > 90) {
      setError('Latitude must be between -90 and 90.');
      return;
    }
    if (parsedLon < -180 || parsedLon > 180) {
      setError('Longitude must be between -180 and 180.');
      return;
    }

    setStatus('loading');
    try {
      const res = await fetch('/api/share/location', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat: parsedLat, lon: parsedLon, label: label.trim() || undefined }),
      });
      if (!res.ok) {
        const data: { error?: string } = await res.json();
        setStatus('error');
        setError(data.error ?? 'Failed to share location.');
        return;
      }
      const data: { slug: string; url: string } = await res.json();
      setStatus('active');
      setShareUrl(data.url);
      setError(null);
    } catch {
      setStatus('error');
      setError('Network error. Please try again.');
    }
  }, [lat, lon, label]);

  const handleDelete = useCallback(async () => {
    setError(null);
    setStatus('loading');
    try {
      const res = await fetch('/api/share/location', { method: 'DELETE' });
      if (!res.ok) {
        setStatus('active');
        setError('Failed to stop sharing.');
        return;
      }
      setStatus('idle');
      setShareUrl(null);
      setLat('');
      setLon('');
      setLabel('');
      setShowModal(false);
    } catch {
      setStatus('active');
      setError('Network error. Please try again.');
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!shareUrl) return;
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Could not copy to clipboard.');
    }
  }, [shareUrl]);

  const isActive = status === 'active';
  const isLoading = status === 'loading';

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
          isActive
            ? 'bg-green-600 text-white hover:bg-green-700'
            : 'bg-stone-200 text-stone-700 dark:bg-stone-700 dark:text-stone-200 hover:bg-stone-300 dark:hover:bg-stone-600'
        } ${className ?? ''}`}
        title={isActive ? 'Location sharing active' : 'Share your location'}
      >
        <MapPin size={14} />
        {isActive ? 'Sharing' : 'Share Location'}
      </button>

      {showModal && (
        <div
          className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}
        >
          <div className="bg-white dark:bg-stone-900 rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-stone-200 dark:border-stone-700">
              <h2 className="text-base font-semibold text-stone-900 dark:text-stone-100">
                {isActive ? 'Update Location' : 'Share My Location'}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 text-stone-500 hover:text-stone-700 dark:hover:text-stone-300 rounded"
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="px-4 py-4 space-y-3">
              {/* Share URL (when active) */}
              {isActive && shareUrl && (
                <div>
                  <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                    Share URL
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shareUrl}
                      className="flex-1 min-w-0 px-2.5 py-1.5 text-xs bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-stone-700 dark:text-stone-300 ring-1 ring-stone-200 dark:ring-stone-700"
                    />
                    <button
                      onClick={handleCopy}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border border-stone-200 dark:border-stone-700 rounded-lg hover:bg-stone-200 dark:hover:bg-stone-700 transition-colors"
                    >
                      {copied ? <Check size={12} /> : <Copy size={12} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              )}

              {/* Latitude */}
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(e.target.value)}
                  placeholder="35.5951"
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-stone-100 ring-1 ring-stone-200 dark:ring-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Longitude */}
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="any"
                  value={lon}
                  onChange={(e) => setLon(e.target.value)}
                  placeholder="-82.5515"
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-stone-100 ring-1 ring-stone-200 dark:ring-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Label */}
              <div>
                <label className="block text-xs font-medium text-stone-600 dark:text-stone-400 mb-1">
                  Label <span className="font-normal text-stone-400">(optional)</span>
                </label>
                <input
                  type="text"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Asheville trailhead"
                  className="w-full px-2.5 py-1.5 text-sm bg-white dark:bg-stone-800 border border-stone-300 dark:border-stone-600 rounded-lg text-stone-900 dark:text-stone-100 ring-1 ring-stone-200 dark:ring-stone-700 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Error */}
              {error && (
                <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-stone-200 dark:border-stone-700 gap-2">
              {isActive && (
                <button
                  onClick={handleDelete}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:opacity-50 rounded-lg transition-colors"
                >
                  Stop Sharing
                </button>
              )}
              <button
                onClick={handlePost}
                disabled={isLoading}
                className="ml-auto px-3 py-1.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {isLoading ? 'Saving...' : isActive ? 'Update Location' : 'Start Sharing'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
