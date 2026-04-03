# Phase 20: Live Location Sharing - Research

**Researched:** 2026-04-02
**Domain:** Next.js public route + Prisma schema + Leaflet map (no auth)
**Confidence:** HIGH

## Summary

This phase adds a single-record "I'm here" feature: Will taps a button, enters coordinates and a label, and gets a shareable URL his family can open in any browser — no login, no Tailscale. The public page renders a Leaflet map with a pin and a "Last updated X ago" timestamp. Will can update or delete the record at any time.

The implementation is narrow and self-contained. It requires one new Prisma model (`SharedLocation`), two API route files, one new Next.js page (`app/share/[slug]/page.tsx`), and one new React component (`ShareLocationButton.tsx`). No external services, no GPS polling, no WebSocket — just manual update → database → public read.

The primary technical concerns are: (1) keeping the public page truly auth-free in a Next.js App Router app that uses AppShell, (2) properly loading Leaflet on a public SSR page via dynamic import, and (3) generating a URL-safe slug without adding a new dependency.

**Primary recommendation:** Use Node's built-in `crypto.randomBytes` (already used in this codebase) to generate the slug; use `next/dynamic` with `ssr: false` for the public Leaflet map (same pattern as SpotsClient); render the public page outside AppShell by NOT including it in the root layout.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| LOCATION-SHARE-01 | Will can tap "Share Location" and receive a shareable URL | ShareLocationButton modal + POST /api/share/location creates/updates record, returns slug URL |
| LOCATION-SHARE-02 | The shared page works in a plain browser (no auth required) | app/share/[slug]/page.tsx renders outside AppShell; public GET /api/share/location/[slug] requires no auth |
| LOCATION-SHARE-03 | Shared page shows Leaflet map with a pin, label, and "Last updated: X ago" | Leaflet dynamic import (ssr:false) in public page; updatedAt timestamp formatted as relative time |
| LOCATION-SHARE-04 | Will can update his location (new lat/lon replaces old) | POST /api/share/location upserts (upsert on slug or single-row); ShareLocationButton pre-fills current values |
| LOCATION-SHARE-05 | Will can stop sharing (deletes the SharedLocation record) | DELETE /api/share/location authenticated endpoint; ShareLocationButton shows "Stop sharing" when active |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Prisma | 6.19.2 (in use) | SharedLocation model, slug lookup, upsert | Already the project ORM |
| Leaflet | 1.9.4 (in use) | Map on public share page | Already installed; SpotMap pattern reusable |
| next/dynamic | built-in | SSR-safe Leaflet load on public page | Same pattern used in spots-client.tsx |
| crypto (Node built-in) | built-in | randomBytes for slug generation | Already used in upload routes; no new dep |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Lucide React | 1.7.0 (in use) | Icons in ShareLocationButton | Already installed |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| crypto.randomBytes | nanoid | nanoid is better for URL slugs but adds a dep; randomBytes + base64url slice is zero-dep and sufficient for a single-user tool |
| Manual upsert (findFirst + update/create) | Prisma upsert | Prisma upsert requires a unique constraint to target; use `@@unique([id])` or a `@default("singleton")` approach — see Architecture Patterns |

**Installation:** No new packages needed. Everything required is already in the project.

## Architecture Patterns

### Recommended Project Structure
```
prisma/
  schema.prisma           # + SharedLocation model
app/
  api/
    share/
      location/
        route.ts          # GET (authenticated, fetch own record) + POST (upsert) + DELETE
        [slug]/
          route.ts        # GET (public, no auth check)
  share/
    [slug]/
      page.tsx            # Public page — must NOT be wrapped by AppShell
components/
  ShareLocationButton.tsx # "Share my location" button + modal
```

### Pattern 1: Public Page Outside AppShell
**What:** The root `app/layout.tsx` wraps all children in `AppShell` (nav, auth-gated chrome). The public share page must NOT inherit AppShell, because AppShell assumes logged-in context and adds navigation.
**When to use:** Any page that must be accessible without auth in a Next.js App Router app that uses a global layout.
**How:** Next.js App Router supports nested layouts. Create `app/share/layout.tsx` that renders `{children}` with no AppShell — just a bare `<html>/<body>` wrapper. This overrides the root layout for all routes under `/share/`.

```typescript
// app/share/layout.tsx
// Source: Next.js App Router docs — nested layouts
export default function ShareLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body style={{ margin: 0, background: '#fafaf9', fontFamily: 'system-ui, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
```

**Critical pitfall:** If you skip this step, the public page will try to render AppShell and potentially throw on missing server context. The nested layout completely replaces the root layout for routes under `/share/`.

### Pattern 2: Leaflet on a Public Server Page via dynamic import
**What:** Leaflet requires `window` — it cannot run during SSR. The existing project solves this in `spots-client.tsx` via `next/dynamic` with `ssr: false`.
**When to use:** Any page that needs Leaflet.

```typescript
// app/share/[slug]/page.tsx
'use client';
import dynamic from 'next/dynamic';

const ShareMap = dynamic(() => import('@/components/ShareMap'), {
  ssr: false,
  loading: () => <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading map...</div>,
});
```

**Alternative:** The public share page could be a thin Server Component that passes data down to a `'use client'` component holding the dynamic map. This matches the spots page pattern (server page.tsx -> client spots-client.tsx -> dynamic SpotMap).

### Pattern 3: SharedLocation Model — Single-Row Upsert
**What:** Will has one active share at a time. Design choices:
- Option A: One record per share, slug is the PK. Will can have multiple active shares. Delete = remove specific record.
- Option B: Singleton record. One row, fixed slug. Simpler but less flexible.

**Recommendation:** Option A — one record, slug as unique identifier. This matches the roadmap spec (`SharedLocation` with a `slug` field). Use `upsert` to replace the existing record if slug already exists, or `create` for new. Since the feature is single-user with one share link at a time, the UI flow is: check if a SharedLocation exists → if yes, show "Update / Stop sharing"; if no, show "Start sharing (generates new slug)".

```prisma
// prisma/schema.prisma addition
model SharedLocation {
  id        String   @id @default(cuid())
  slug      String   @unique
  lat       Float
  lon       Float
  label     String?
  updatedAt DateTime @updatedAt
  createdAt DateTime @default(now())
}
```

### Pattern 4: Slug Generation (Zero-Dep)
**What:** Generate a URL-safe random slug without nanoid.

```typescript
// Source: Node.js crypto docs + existing codebase pattern (app/api/photos/upload/route.ts)
import { randomBytes } from 'crypto';

function generateSlug(): string {
  return randomBytes(8).toString('base64url'); // 11 chars, URL-safe
}
```

`base64url` encoding (Node 16+) produces characters `[A-Za-z0-9\-_]` — safe in URLs with no encoding needed. 8 bytes = 64 bits of entropy. Collision probability for a single-user app with one active slug: effectively zero.

### Pattern 5: Authenticated vs. Public API Routes
**What:** Next.js App Router has no built-in auth. This project has no auth system at all (single user). "Authenticated" in this context means: the route is only called from within the Outland OS UI (behind Tailscale), not exposed publicly. "Public" means: accessible to family without Tailscale.

**Implementation:** No actual auth token needed. The distinction is structural:
- `POST /api/share/location` and `DELETE /api/share/location` — called only from the app UI, which is behind Tailscale
- `GET /api/share/location/[slug]` — no auth check, returns location data by slug. Family accesses this route through whatever public URL strategy is in place.

**Important:** Phase 20 depends on Phase 15 (Tailscale + go live). The current deployment uses Tailscale for private access. For the share page to be accessible to family *without* Tailscale, there must be a public URL. This is a scope dependency to verify — the roadmap marks Phase 20 as depending on Phase 15, which uses Tailscale-only access. See Open Questions.

### Pattern 6: "Last updated X ago" Timestamp
**What:** Display relative time without a date library.

```typescript
// Pure JS, no dependency
function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

### Anti-Patterns to Avoid
- **Putting the share page inside AppShell:** Will cause rendering failures or expose nav to unauthenticated users. Must use nested layout.
- **Importing Leaflet without dynamic:** SSR will throw `window is not defined`. Always use `next/dynamic` with `ssr: false`.
- **Storing slug in localStorage only:** The shareable URL must work from any device (family's phones). Slug lives in the database.
- **Implementing GPS polling / auto-update:** The spec is manual update only. No `navigator.geolocation` polling, no WebSocket, no cron job.
- **Creating a new Leaflet component from scratch:** The existing `SpotMap.tsx` has all the Leaflet setup patterns (icon fix, tile layers, `escHtml`, dark mode). The share map component should be a simpler, stripped-down version using the same established patterns.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL-safe random ID | Custom base62 encoder | `crypto.randomBytes(8).toString('base64url')` | Already in use in codebase; base64url is URL-safe |
| Relative time formatting | Custom formatter | Inline `timeAgo()` function | Simple enough to inline; date-fns would add 20KB+ |
| Map rendering | Custom canvas/SVG map | Leaflet (already installed) | Handles tiles, markers, zoom, mobile touch |
| "Last updated" polling | setInterval refresh | Static render + manual page reload | Spec says manual update only; polling adds complexity for no gain |

**Key insight:** This feature is deliberately low-tech. The entire value is "family can see a pin on a map." Don't add real-time infrastructure that isn't in the spec.

## Common Pitfalls

### Pitfall 1: AppShell Wrapping the Public Page
**What goes wrong:** The root `app/layout.tsx` wraps `AppShell` around all children. Without a nested `app/share/layout.tsx`, the public share page inherits AppShell — which may import server-only modules, reference Tailscale context, or require cookies.
**Why it happens:** Next.js App Router applies layouts hierarchically; the root layout applies to everything unless overridden.
**How to avoid:** Always create `app/share/layout.tsx` as a bare layout (no AppShell) before building the share page.
**Warning signs:** TypeScript errors about missing context providers; nav bar appearing on the share page; 500 errors from SSR context.

### Pitfall 2: Leaflet SSR Crash
**What goes wrong:** Importing Leaflet directly in a Server Component or a `'use client'` component without `next/dynamic` causes `ReferenceError: window is not defined` during the server render pass.
**Why it happens:** Leaflet reads `window` at import time. Next.js SSR runs in Node.js where `window` does not exist.
**How to avoid:** Use `dynamic(() => import('@/components/ShareMap'), { ssr: false })` in the client wrapper. The public page can be a Server Component that passes serialized data to a client wrapper.
**Warning signs:** Build fails with window/document errors; `npm run build` crashes.

### Pitfall 3: Prisma Date Serialization on Public Route
**What goes wrong:** `prisma.sharedLocation.findUnique()` returns a `Date` object for `updatedAt`. Passing a `Date` directly to a Client Component via `JSON.stringify` or `NextResponse.json` fails unless serialized to ISO string.
**Why it happens:** Next.js cannot serialize `Date` objects across the Server/Client boundary. `NextResponse.json` handles it, but manual serialization is required when passing props from Server to Client Components.
**How to avoid:** Always `.toISOString()` any Date fields before returning from API routes or passing as props (this is the established pattern throughout this codebase — see `app/api/locations/route.ts`).
**Warning signs:** "Only plain objects" serialization errors in Next.js; date displays as `[object Object]`.

### Pitfall 4: Public API Route Caching
**What goes wrong:** Next.js 14+ aggressively caches GET responses from Route Handlers. The public `/api/share/location/[slug]` route could return a stale location to family.
**Why it happens:** Next.js caches `fetch` calls and Route Handlers by default.
**How to avoid:** Export `export const dynamic = 'force-dynamic'` from the public route handler, matching the pattern in `app/api/chat/route.ts`.
**Warning signs:** Family sees old location after Will updates; cache never invalidates.

### Pitfall 5: Slug Collision on Single-User Upsert
**What goes wrong:** If the UI generates a new slug each time "Start Sharing" is tapped, old slugs become orphans in the database (old shared URLs stop working; old records accumulate).
**Why it happens:** Each call to `generateSlug()` produces a different value; without cleanup, old records linger.
**How to avoid:** On "Start Sharing", check if a `SharedLocation` already exists. If yes, update it in place (keep slug). Only generate a new slug if no record exists. On "Stop Sharing", delete the record. This keeps exactly zero or one record in the table at all times.
**Warning signs:** Multiple rows in SharedLocation; old share URLs still resolve to stale data.

## Code Examples

Verified patterns from official sources and existing codebase:

### Prisma Upsert with Unique Slug
```typescript
// Source: Prisma docs — upsert + existing codebase pattern
const record = await prisma.sharedLocation.upsert({
  where: { slug: existingSlug },
  update: { lat, lon, label },
  create: { slug: generateSlug(), lat, lon, label },
});
```

### Checking Existence Before Upsert (Single-Record Flow)
```typescript
// Source: existing codebase API pattern (app/api/locations/route.ts)
const existing = await prisma.sharedLocation.findFirst();
if (existing) {
  const updated = await prisma.sharedLocation.update({
    where: { id: existing.id },
    data: { lat, lon, label },
  });
  return NextResponse.json({ slug: updated.slug });
} else {
  const created = await prisma.sharedLocation.create({
    data: { slug: generateSlug(), lat, lon, label },
  });
  return NextResponse.json({ slug: created.slug }, { status: 201 });
}
```

### Public Route Handler (force-dynamic)
```typescript
// Source: existing pattern in app/api/chat/route.ts
export const dynamic = 'force-dynamic';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  try {
    const record = await prisma.sharedLocation.findUnique({ where: { slug } });
    if (!record) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json({
      lat: record.lat,
      lon: record.lon,
      label: record.label,
      updatedAt: record.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Failed to fetch shared location:', error);
    return NextResponse.json({ error: 'Failed to fetch' }, { status: 500 });
  }
}
```

### Minimal Leaflet Map for Share Page
```typescript
// Source: SpotMap.tsx patterns (L.Icon.Default fix, tile layers)
// Stripping cluster/animation/layer complexity for the minimal share use case
'use client';
import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon path issue with bundlers (from SpotMap.tsx)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface ShareMapProps {
  lat: number;
  lon: number;
  label: string | null;
}

export default function ShareMap({ lat, lon, label }: ShareMapProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const map = L.map(containerRef.current).setView([lat, lon], 13);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map);
    const marker = L.marker([lat, lon]).addTo(map);
    if (label) marker.bindPopup(label).openPopup();
    return () => { map.remove(); };
  }, [lat, lon, label]);

  return <div ref={containerRef} style={{ width: '100%', height: '100%' }} />;
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Pages Router `getServerSideProps` | App Router Server Components | Next.js 13+ | Public pages use `async function Page()` directly; no `getServerSideProps` needed |
| `params.slug` (sync) | `params` is a Promise in Next.js 15 | Next.js 15 | Must `await params` before reading `params.slug` in route handlers and dynamic pages |

**Deprecated/outdated:**
- Synchronous `params` access: In Next.js 15 (this project uses 16.2.1), `params` in dynamic routes is a Promise. Use `const { slug } = await params` not `params.slug` directly.

## Environment Availability

> This phase depends only on packages already installed. No new external dependencies.

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Leaflet | Share map | Yes | 1.9.4 | — |
| Prisma | SharedLocation model | Yes | 6.19.2 | — |
| Node crypto | Slug generation | Yes (built-in) | N/A | — |
| Public URL access | Family viewing share page | See Open Questions | — | — |

**Public URL availability:** The current deployment (Phase 15) uses Tailscale-only access. Phase 20's success criteria requires family to open the share URL without Tailscale. This is an infrastructure gap — see Open Questions.

## Validation Architecture

### Test Framework
| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | `vitest.config.ts` (root) |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements → Test Map
| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| LOCATION-SHARE-01 | Slug generated correctly (URL-safe, no collisions) | unit | `npm test -- tests/share-location.test.ts` | No — Wave 0 |
| LOCATION-SHARE-02 | Public GET returns 404 for unknown slug | unit | `npm test -- tests/share-location.test.ts` | No — Wave 0 |
| LOCATION-SHARE-03 | timeAgo() returns correct relative strings | unit | `npm test -- tests/share-location.test.ts` | No — Wave 0 |
| LOCATION-SHARE-04 | POST upserts existing record (slug preserved) | unit | `npm test -- tests/share-location.test.ts` | No — Wave 0 |
| LOCATION-SHARE-05 | DELETE removes the record | unit | `npm test -- tests/share-location.test.ts` | No — Wave 0 |

### Sampling Rate
- **Per task commit:** `npm test -- tests/share-location.test.ts`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps
- [ ] `tests/share-location.test.ts` — covers LOCATION-SHARE-01 through LOCATION-SHARE-05 (slug generation, upsert logic, timeAgo, 404 path)

## Open Questions

1. **Public URL for family access**
   - What we know: Phase 15 deployed the app behind Tailscale. Family does not have Tailscale.
   - What's unclear: How does the share URL get to a public IP? Phase 20 success criteria says "works in a plain browser without login or Tailscale" — but the roadmap explicitly marks public internet exposure as Out of Scope ("Private Tailscale mesh only").
   - Recommendation: Clarify with Will before executing. Options: (a) family installs Tailscale (defeats the point), (b) add a Cloudflare Tunnel for the `/share/*` route only (minimal exposure), (c) the Mac mini gets a second public-facing port. This is a planning question, not a code question. The code for Phase 20 is valid regardless of which option is chosen — the public route is auth-free and will work with any public URL.

2. **Single share vs. multiple active shares**
   - What we know: The spec says "a shareable public URL" (singular). Roadmap says Will can update/stop sharing. Success criteria has one URL.
   - What's unclear: Should `ShareLocationButton` show the existing URL and allow update-in-place, or create a new slug on each "start"?
   - Recommendation: Single active share. On "Start Sharing": generate one slug, store it, show URL. On "Update Location": POST replaces lat/lon, slug stays the same (family's bookmark still works). On "Stop Sharing": DELETE removes the record.

## Sources

### Primary (HIGH confidence)
- Existing codebase — `SpotMap.tsx`, `spots-client.tsx`, `app/api/locations/route.ts`, `app/api/photos/upload/route.ts`, `app/layout.tsx`
- `prisma/schema.prisma` — 17 existing models reviewed; no `SharedLocation` model present yet
- `vitest.config.ts` — test framework confirmed as Vitest 3.2.4 with jsdom environment
- `.planning/config.json` — `nyquist_validation: true` confirmed

### Secondary (MEDIUM confidence)
- Next.js App Router nested layouts — behavior verified by examining root layout and AppShell usage in this project; documented as standard Next.js pattern
- `export const dynamic = 'force-dynamic'` — verified in `app/api/chat/route.ts`
- `await params` requirement for Next.js 15 dynamic routes — based on Next.js 15 release notes (project is on 16.2.1)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already in the project; no new dependencies
- Architecture: HIGH — public page pattern, Leaflet dynamic import, slug generation all derived from existing codebase patterns
- Pitfalls: HIGH — AppShell pitfall and Leaflet SSR pitfall are well-established Next.js gotchas; others verified against existing project code
- Open question (public URL): LOW — infrastructure dependency not resolved in current roadmap; requires Will's decision

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack; only risk is Next.js minor version changes to params API)
