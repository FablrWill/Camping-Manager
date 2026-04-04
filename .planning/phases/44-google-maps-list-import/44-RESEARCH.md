# Phase 44: Google Maps List Import - Research

**Researched:** 2026-04-04
**Domain:** Web scraping (server-side fetch + regex HTML parsing), React modal state machine, Next.js API route
**Confidence:** MEDIUM — core approach is established; scraping layer is inherently fragile

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| GMAPS-01 | Paste a shared Google Maps list URL and return at least one place preview | Server-side fetch with redirect following; regex extraction from embedded data |
| GMAPS-02 | Each preview shows name and coordinates (lat/lng) | `[null,null,lat,lng]` pattern confirmed in current Google Maps HTML (2025) |
| GMAPS-03 | Unchecking a place excludes it from the import | Checklist state in GmapsImportModal; filter before POST loop |
| GMAPS-04 | Confirmed locations appear on the Spots map immediately after modal closes | `refreshLocations()` callback pattern already used by GPX import |
| GMAPS-05 | Invalid URL or zero-result scrape surfaces a clear error message, no crash | Throw descriptive error in lib; catch in API route; surface in modal error state |
</phase_requirements>

---

## Summary

This phase adds a zero-friction path from a Google Maps saved list URL to Outland OS spots. The user pastes a share URL (either a `maps.app.goo.gl` short link or a full `google.com/maps` URL), the server fetches the HTML page, and parses embedded coordinate data using regex. Results are shown as a confirmation checklist before import.

The core technical challenge is HTML parsing. Google Maps does not expose an official scraping API. The page embeds place data in a protobuf-over-JSON blob (the same format used for search results). The most reliable extraction target in 2025 is the `[null,null,<lat>,<lng>]` pattern that appears near place names in the serialized JS state. This approach is confirmed working in community gists, with the caveat that Google can change the format at any time. The feature must degrade gracefully rather than crash.

Node.js native `fetch()` follows HTTP redirects by default (redirect mode defaults to `"follow"`), so `maps.app.goo.gl` short links resolve automatically without extra packages. The existing project already uses server-side `fetch()` with `AbortSignal.timeout()` and a browser-like User-Agent — the same pattern applies here.

**Primary recommendation:** Use native `fetch()` with a browser User-Agent. Parse the HTML with two complementary strategies: (1) `[null,null,lat,lng]` regex on the raw serialized data blob, (2) JSON-LD `<script type="application/ld+json">` ItemList blocks as a secondary fallback. Name extraction walks backward in the same data string from the coordinate match. Return `GmapsPlace[]` and let the UI confirm before writing to DB.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no `any` in application code; use `unknown` for external input then narrow safely
- No `alert()` — use state-based inline error messages
- All API routes must have try-catch with `console.error` + JSON error response
- All React hooks must have correct, minimal dependency arrays — never include state that the hook itself updates
- No premature abstractions — build what's needed now
- Immutable patterns — never mutate existing objects; return new copies
- Functions < 50 lines; files < 800 lines; no deep nesting (> 4 levels)
- No hardcoded secrets — no API key required for this feature
- No new npm packages (spec constraint from V2-SESSIONS.md S37)
- No schema changes — use existing `Location` model

---

## Standard Stack

### Core (no new packages needed)
| Tool | Version | Purpose | Why Standard |
|------|---------|---------|--------------|
| Native `fetch()` | Node 18+ built-in | Server-side HTTP request + redirect following | Already used in `app/api/import/google-maps/route.ts` |
| Regex / String methods | JS built-in | Parse raw HTML blob for coordinate arrays | No DOM parser available in Next.js API routes |
| React `useState` | React 19.2.4 | Modal state machine | Project standard |
| Vitest | Existing | Unit tests for lib/gmaps-import.ts parsing logic | Already configured |

### Supporting (already in project)
| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `AbortSignal.timeout()` | Node 18+ | Prevent fetch from hanging | Wrap all external fetches |
| `NextResponse.json()` | Next.js 16 | API route response | All API routes |
| Tailwind CSS | 4 | Styling | All UI components |
| Lucide React | 1.7.0 | Icons | Consistent with other modals |

**Installation:** No new packages needed.

---

## Architecture Patterns

### Recommended File Structure (new files only)
```
lib/
  gmaps-import.ts          # fetchGmapsList(url): Promise<GmapsPlace[]>
app/api/import/
  gmaps-list/
    route.ts               # POST { url: string } → { places: GmapsPlace[] }
components/
  GmapsImportModal.tsx     # idle → fetching → preview → importing → done
tests/
  gmaps-import.test.ts     # unit tests for parsing logic (Wave 0)
```

### Existing files modified
```
app/spots/spots-client.tsx   # Add showGmapsListModal state, wire GmapsImportModal
```

### Pattern 1: URL Validation
**What:** Accept two URL shapes only; reject everything else at the API layer.
**When to use:** In `app/api/import/gmaps-list/route.ts` before calling the lib.
```typescript
// Source: V2-SESSIONS.md S37 spec
const VALID_PREFIXES = [
  'https://maps.app.goo.gl',
  'https://www.google.com/maps',
];
const isValid = VALID_PREFIXES.some(p => url.startsWith(p));
if (!isValid) {
  return NextResponse.json({ error: 'URL must be a Google Maps share link' }, { status: 400 });
}
```

### Pattern 2: Server-Side Fetch with Browser User-Agent
**What:** Fetch the HTML page server-side with a realistic User-Agent string and timeout.
**When to use:** In `lib/gmaps-import.ts`, the `fetchGmapsList` function.
```typescript
// Source: existing app/api/import/google-maps/route.ts lines 158-165
const res = await fetch(url, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  },
  redirect: 'follow',  // default — follows maps.app.goo.gl → google.com/maps
  signal: AbortSignal.timeout(15000),
});
if (!res.ok) {
  throw new Error(`HTTP ${res.status} fetching Google Maps page`);
}
const html = await res.text();
```

### Pattern 3: Coordinate Extraction from Embedded Data Blob
**What:** Google Maps embeds serialized protobuf-like data as JS state in the page. The format `[null,null,<lat>,<lng>]` appears for each place entry (2025 confirmed pattern).
**When to use:** Primary extraction strategy in `lib/gmaps-import.ts`.
```typescript
// Source: community research — gist.github.com/ByteSizedMarius (2025 pattern)
// The regex captures negative coords and handles >=100 degree longitude values
const COORD_RE = /\[null,null,(-?[0-9]+\.[0-9]+),(-?[0-9]+\.[0-9]+)\]/g;
```
Name extraction walks backward in the surrounding string to find a quoted name near the coordinate match. The serialized blob uses escaped quotes and backslashes, so HTML unescaping is needed before matching names.

### Pattern 4: JSON-LD Fallback
**What:** Google Maps sometimes includes `<script type="application/ld+json">` with `ItemList` schema. This is a cleaner secondary target if the primary regex fails.
**When to use:** Run after primary regex extraction yields zero results.
```typescript
// Standard JSON-LD ItemList shape
// { "@type": "ItemList", "itemListElement": [{ "item": { "name": "...", "geo": { "latitude": N, "longitude": N } } }] }
const ldJsonRe = /<script type="application\/ld\+json">([\s\S]*?)<\/script>/g;
```

### Pattern 5: Modal State Machine
**What:** `GmapsImportModal` follows the same inline-panel pattern as the existing Google Maps text import in `spots-client.tsx`, but as a separate component with a proper state enum for clarity.
**When to use:** New `GmapsImportModal.tsx` component.
```typescript
type ModalState = 'idle' | 'fetching' | 'preview' | 'importing' | 'done';
const [state, setState] = useState<ModalState>('idle');
const [places, setPlaces] = useState<GmapsPlace[]>([]);
const [checked, setChecked] = useState<Set<number>>(new Set());
const [error, setError] = useState<string | null>(null);
const [importedCount, setImportedCount] = useState(0);
```
Sequential import loop (not Promise.all) per spec to avoid DB race conditions:
```typescript
// Source: V2-SESSIONS.md S37 spec
for (const place of selectedPlaces) {
  await fetch('/api/locations', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: place.name, latitude: place.lat, longitude: place.lng, description: place.address }),
  });
}
```

### Pattern 6: Entry Point Wiring (spots-client.tsx)
**What:** Add a new button alongside the existing "G-Maps" button. After modal closes with import success, call `refreshLocations()`.
**When to use:** Modifying `app/spots/spots-client.tsx`.

The existing "G-Maps" button (line 410) fires `setShowGmapsImport(!showGmapsImport)` for text/URL paste. The new "List Import" feature uses a separate state variable `showGmapsListModal` and renders `<GmapsImportModal>`. On `onClose` with a successful import, call `refreshLocations()`.

### Anti-Patterns to Avoid
- **Storing raw HTML:** Spec prohibits caching the HTML response — parse and discard immediately.
- **Promise.all for sequential imports:** Use a for-of loop to avoid race conditions on rapid DB creates.
- **Hard-fail on partial parse:** If some places parse but some don't, return what parsed. Only throw if zero results.
- **Tight regex without fallback:** Always include the JSON-LD fallback; Google changes page structure frequently.
- **Trusting coordinates from URL params only:** The `@lat,lng` in the URL is the map viewport center, not individual place coordinates.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTTP redirect following | Custom redirect chain | `fetch()` with `redirect: 'follow'` (default) | Built into Node 18 fetch |
| HTML entity unescaping | Custom entity map | `html.replace(/&#(\d+);/g, ...)` or `decodeURIComponent` where appropriate | One-pass regex is sufficient for the narrow Google Maps escaping used |
| DB dedup logic | Custom overlap check | Check existing pattern from `app/api/import/google-maps/route.ts` (within ~0.001 degree) | Already proven; apply the same guard |

**Key insight:** This is string processing, not DOM parsing. The embedded data in Google Maps HTML is a serialized JS array blob — treat it as text, not structured HTML. `cheerio` and similar HTML parsers add no value here because the data isn't in HTML attributes or clean DOM nodes.

---

## Common Pitfalls

### Pitfall 1: Google Blocks the Server-Side Fetch
**What goes wrong:** Google returns 429 (rate limit) or serves a CAPTCHA/empty page to non-browser requests, yielding zero parse results.
**Why it happens:** Google detects non-browser user agents or missing cookie/session headers.
**How to avoid:** Use a realistic Chrome User-Agent (matching what the existing `/api/import/google-maps` already uses). Do not add automated retry loops. The feature is documented as best-effort.
**Warning signs:** HTTP 429 status, response HTML contains "Before you continue" text, or response is < 5KB (probably a bot-check redirect).

### Pitfall 2: Short Link Resolves to Login Gate
**What goes wrong:** `maps.app.goo.gl` redirects to `accounts.google.com` if the list is private or requires sign-in.
**Why it happens:** Google Maps saved lists are private by default. Only "Share publicly" lists have open short links.
**How to avoid:** After fetching, check that the final response URL contains `google.com/maps` (not `accounts.google.com`). If not, throw: "This list requires Google sign-in and can't be imported."
**Warning signs:** `res.url` after redirect contains `accounts.google.com`.

### Pitfall 3: Data Pagination — Lists > 20 Items
**What goes wrong:** For lists with more than ~20 places, Google only renders the first page of results in the HTML. The remaining places are loaded dynamically via subsequent API calls.
**Why it happens:** Google Maps uses infinite scroll / pagination for long lists.
**How to avoid:** Accept the limitation — document it clearly. The feature is best-effort. A single-page fetch typically returns the first 20 items. Do not attempt to implement pagination (no reliable API endpoint without auth).
**Warning signs:** User reports "I have 50 places but only 20 imported."

### Pitfall 4: Coordinate Regex Matches Non-Place Data
**What goes wrong:** The `[null,null,lat,lng]` pattern can appear in map viewport, bounding box, or camera position data — not just place pins.
**Why it happens:** Google's serialized state uses the same tuple format for multiple purposes.
**How to avoid:** After extraction, filter out duplicates within ~0.0001 degrees. Validate coordinate ranges (lat -90..90, lng -180..180). The name extraction step naturally filters to entries that have an associated name string nearby.

### Pitfall 5: TypeScript `unknown` Narrowing for Fetched HTML
**What goes wrong:** `res.text()` returns `string`, but JSON-LD parsing involves `JSON.parse()` which returns `unknown` (or `any`). Unchecked access causes TypeScript errors and potential runtime crashes.
**Why it happens:** JSON.parse has no schema — always returns `any` typed as object.
**How to avoid:** Type-narrow each field before use. Use `typeof checks` or a simple inline validator before accessing nested properties.

### Pitfall 6: Conflating the New Endpoint with the Existing One
**What goes wrong:** `POST /api/import/google-maps` already exists. Adding `POST /api/import/gmaps-list` is a separate endpoint. The existing endpoint does text/URL coordinate extraction from pasted content; the new one does HTML page scraping of a list URL.
**Why it happens:** Similar names.
**How to avoid:** The new route lives at `app/api/import/gmaps-list/route.ts`. Do not modify the existing `app/api/import/google-maps/route.ts`.

---

## Code Examples

### lib/gmaps-import.ts — Full Module Shape
```typescript
// Source: V2-SESSIONS.md S37 spec + community pattern (ByteSizedMarius gist)
export interface GmapsPlace {
  name: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
}

export async function fetchGmapsList(url: string): Promise<GmapsPlace[]> {
  const res = await fetch(url, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' },
    redirect: 'follow',
    signal: AbortSignal.timeout(15000),
  });

  // Detect login redirect
  if (res.url.includes('accounts.google.com')) {
    throw new Error('This list requires Google sign-in and cannot be imported.');
  }
  if (!res.ok) {
    throw new Error(`Google Maps returned HTTP ${res.status}`);
  }

  const html = await res.text();

  // Strategy 1: [null,null,lat,lng] pattern in serialized JS state
  const places = extractFromDataBlob(html);

  // Strategy 2: JSON-LD ItemList fallback
  if (places.length === 0) {
    const ldPlaces = extractFromJsonLd(html);
    places.push(...ldPlaces);
  }

  if (places.length === 0) {
    throw new Error('No places found. The list may be private or the page format has changed.');
  }

  return places;
}
```

### Coordinate Extraction — extractFromDataBlob
```typescript
// Source: ByteSizedMarius gist (2025 updated pattern)
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

    // Walk backward from match index to extract name
    const name = extractNameBefore(html, match.index);
    if (name) {
      results.push({ name, address: null, lat, lng });
    }
  }
  return results;
}
```

### Existing Location POST (reference — do not change)
```typescript
// Source: app/api/locations/route.ts lines 40-74
// Required field: name (string)
// Optional: latitude, longitude, type, description, notes, etc.
// Import maps: name → name, lat → latitude, lng → longitude, address → description
await fetch('/api/locations', {
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
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `window.__PWA_INITIAL_STATE__` parsing | `[null,null,lat,lng]` regex on raw HTML | ~2023-2024 | The named JS variable is less reliable; raw regex on the full HTML body is more robust |
| `APP_INITIALIZATION_STATE` blob parsing | Same `[null,null,lat,lng]` regex | ~2023-2024 | Both variable names are still present but unparseable as clean JSON; regex approach is preferred |
| Pagination API attempts | Accept first ~20 results | Ongoing | No reliable unauthenticated pagination endpoint exists |

**Deprecated/outdated:**
- Structured JSON parsing of `window.__PWA_INITIAL_STATE__`: The variable is heavily nested and changes structure frequently. Raw regex is more stable.
- Place API without key: `maps.googleapis.com/maps/api/place/details` requires an API key. Not applicable here.

---

## Open Questions

1. **Name extraction reliability from data blob**
   - What we know: The `[null,null,lat,lng]` coordinate pattern is confirmed for 2025. Name strings appear in the same serialized blob near the coordinates.
   - What's unclear: The exact distance and delimiter between name and coordinates in the blob. The ByteSizedMarius gist shows `curr.rindex("\\\"") + 2` style indexing, but the exact offset varies.
   - Recommendation: Implement with a conservative backward-scan over a fixed window (e.g., 200 chars before the coord match), extract the last double-quoted string in that window. This is best-effort; if no name is found, fall back to `"Place (lat, lng)"` as the name.

2. **JSON-LD ItemList availability**
   - What we know: Some Google Maps pages include JSON-LD markup for SEO. Its presence is inconsistent.
   - What's unclear: Whether shared list pages (as opposed to individual place pages) include it.
   - Recommendation: Implement it as a lightweight fallback (< 20 lines). If it doesn't trigger in practice, it costs nothing.

3. **Rate limiting / blocking severity**
   - What we know: Single-user personal app means very low request frequency. Scraping tools report that browser User-Agent strings help.
   - What's unclear: Whether Google applies IP-level blocking after a certain number of requests.
   - Recommendation: This is a personal app with one user. Rate limiting is not a practical concern. Document the failure mode clearly (HTTP 429 → user-facing error).

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js fetch() | lib/gmaps-import.ts | Yes (built-in) | Node 18+ | — |
| AbortSignal.timeout() | lib/gmaps-import.ts | Yes (built-in) | Node 17.3+ | — |
| Vitest | tests/gmaps-import.test.ts | Yes | Existing config | — |

No missing dependencies.

---

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest (existing) |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- gmaps-import` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| GMAPS-01 | `fetchGmapsList` returns places from a mocked HTML blob | unit | `npm test -- gmaps-import` | ❌ Wave 0 |
| GMAPS-02 | Extracted places include numeric lat/lng | unit | `npm test -- gmaps-import` | ❌ Wave 0 |
| GMAPS-03 | Unchecked items excluded from import payload | unit | `npm test -- gmaps-import` | ❌ Wave 0 |
| GMAPS-04 | POST /api/locations called per selected place | unit (mock) | `npm test -- gmaps-import` | ❌ Wave 0 |
| GMAPS-05 | Zero-result parse throws descriptive error | unit | `npm test -- gmaps-import` | ❌ Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- gmaps-import`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/gmaps-import.test.ts` — covers GMAPS-01, GMAPS-02, GMAPS-05 (parsing logic with fixture HTML)
- [ ] Fixture HTML blob — a representative snippet of Google Maps list HTML (sanitized) for deterministic parsing tests

---

## Sources

### Primary (HIGH confidence)
- `app/api/import/google-maps/route.ts` — existing server-side fetch pattern with User-Agent and AbortSignal.timeout
- `app/spots/spots-client.tsx` — existing UI panel pattern for imports and `refreshLocations()` callback
- `app/api/locations/route.ts` — Location model required fields (name only), optional lat/lng/description
- `prisma/schema.prisma` — Location model definition (no changes needed)
- V2-SESSIONS.md S37 spec — authoritative implementation spec

### Secondary (MEDIUM confidence)
- [ByteSizedMarius gist](https://gist.github.com/ByteSizedMarius/8c9df821ebb69b07f2d82de01e68387d) — `[null,null,lat,lng]` regex pattern confirmed with 2025 update comment
- [Scrapfly Google Maps guide](https://scrapfly.io/blog/posts/how-to-scrape-google-maps) — confirms protobuf-over-JSON blob approach for coordinate extraction
- [MDN Fetch API — redirect](https://developer.mozilla.org/en-US/docs/Web/API/Request/redirect) — `redirect: 'follow'` is the default

### Tertiary (LOW confidence — single source)
- ByteSizedMarius comment (2025): "This doesn't work for lists > 20 items" — pagination limitation
- Community reports that `accounts.google.com` redirect indicates private list — not officially documented

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new packages, all built-ins
- Architecture patterns: HIGH — directly mirrors existing codebase conventions
- Parsing approach: MEDIUM — regex pattern confirmed in 2025 but inherently fragile
- Pitfalls: MEDIUM — derived from community reports, not official docs

**Research date:** 2026-04-04
**Valid until:** 2026-05-04 (Google can change HTML structure; revalidate if parsing breaks)
