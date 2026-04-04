export interface GmapsPlace {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';

export async function fetchGmapsList(url: string): Promise<GmapsPlace[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': UA },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  if (res.url.includes('accounts.google.com')) {
    throw new Error('This list requires Google sign-in and cannot be imported.');
  }

  if (!res.ok) {
    throw new Error(`Google Maps returned HTTP ${res.status}`);
  }

  const html = await res.text();

  const places = extractFromDataBlob(html);

  if (places.length === 0) {
    const ldPlaces = extractFromJsonLd(html);
    places.push(...ldPlaces);
  }

  if (places.length === 0) {
    throw new Error('No places found. The list may be private or the page format has changed.');
  }

  return places;
}

function extractNameNear(html: string, matchIndex: number): string {
  const window = html.slice(Math.max(0, matchIndex - 500), matchIndex);
  // Replace escaped quotes before matching to avoid false boundaries
  const normalized = window.replace(/\\"/g, '\u0000');
  const nameRe = /"([^"]{2,80})"/g;
  let last: RegExpExecArray | null = null;
  let m: RegExpExecArray | null;
  while ((m = nameRe.exec(normalized)) !== null) {
    last = m;
  }
  return last ? last[1] : '';
}

function extractFromDataBlob(html: string): GmapsPlace[] {
  const COORD_RE = /\[null,null,(-?[0-9]+\.[0-9]+),(-?[0-9]+\.[0-9]+)\]/g;
  const results: GmapsPlace[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = COORD_RE.exec(html)) !== null) {
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);

    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;

    const key = `${lat.toFixed(5)},${lng.toFixed(5)}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const name = extractNameNear(html, match.index) || `Place (${lat}, ${lng})`;
    results.push({ name, address: null, lat, lng });
  }

  return results;
}

function extractFromJsonLd(html: string): GmapsPlace[] {
  const ldJsonRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  const results: GmapsPlace[] = [];
  let match: RegExpExecArray | null;

  while ((match = ldJsonRe.exec(html)) !== null) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(match[1]);
    } catch {
      continue;
    }

    if (
      typeof parsed !== 'object' ||
      parsed === null ||
      (parsed as Record<string, unknown>)['@type'] !== 'ItemList'
    ) {
      continue;
    }

    const items = (parsed as Record<string, unknown>)['itemListElement'];
    if (!Array.isArray(items)) continue;

    for (const element of items) {
      if (typeof element !== 'object' || element === null) continue;
      const el = element as Record<string, unknown>;
      const item = el['item'];
      if (typeof item !== 'object' || item === null) continue;
      const it = item as Record<string, unknown>;

      const name = typeof it['name'] === 'string' ? it['name'] : null;
      const geo = it['geo'];
      if (typeof geo !== 'object' || geo === null || !name) continue;
      const g = geo as Record<string, unknown>;

      const lat = typeof g['latitude'] === 'number' ? g['latitude'] : null;
      const lng = typeof g['longitude'] === 'number' ? g['longitude'] : null;

      results.push({ name, address: null, lat, lng });
    }
  }

  return results;
}
