import { NextRequest, NextResponse } from 'next/server';
import { fetchGmapsList } from '@/lib/gmaps-import';

const VALID_PREFIXES = [
  'https://maps.app.goo.gl',
  'https://www.google.com/maps',
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const url = typeof body.url === 'string' ? body.url.trim() : '';

    if (!url) {
      return NextResponse.json({ error: 'url is required' }, { status: 400 });
    }

    const isValid = VALID_PREFIXES.some(p => url.startsWith(p));
    if (!isValid) {
      return NextResponse.json(
        { error: 'URL must be a Google Maps share link (maps.app.goo.gl or google.com/maps)' },
        { status: 400 }
      );
    }

    const places = await fetchGmapsList(url);
    return NextResponse.json({ places });
  } catch (error) {
    console.error('Failed to fetch Google Maps list:', error);
    const message = error instanceof Error ? error.message : 'Failed to fetch Google Maps list';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
