'use client';

import dynamic from 'next/dynamic';

const ShareMap = dynamic(() => import('@/components/ShareMap'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#f5f5f4',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        color: '#78716c',
      }}
    >
      Loading map...
    </div>
  ),
});

interface SharePageClientProps {
  lat: number;
  lon: number;
  label: string | null;
  updatedAtLabel: string;
}

export default function SharePageClient({
  lat,
  lon,
  label,
  updatedAtLabel,
}: SharePageClientProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100vh',
        background: '#fafaf9',
      }}
    >
      {/* Map */}
      <div style={{ flex: 1, minHeight: 0, position: 'relative' }}>
        <ShareMap lat={lat} lon={lon} label={label} />
      </div>

      {/* Info bar */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: '1px solid #e7e5e4',
          background: '#ffffff',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {label && (
          <p
            style={{
              margin: '0 0 4px',
              fontSize: '16px',
              fontWeight: 600,
              color: '#1c1917',
            }}
          >
            {label}
          </p>
        )}
        <p style={{ margin: '0 0 2px', fontSize: '13px', color: '#78716c' }}>
          Last updated: {updatedAtLabel}
        </p>
        <p style={{ margin: 0, fontSize: '11px', color: '#a8a29e' }}>Outland OS</p>
      </div>
    </div>
  );
}
