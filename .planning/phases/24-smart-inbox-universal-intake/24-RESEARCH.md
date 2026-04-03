# Phase 24: Smart Inbox / Universal Intake - Research

**Researched:** 2026-04-03
**Domain:** Multi-modal AI triage, PWA Web Share Target API, Next.js App Router file upload, Cheerio scraping
**Confidence:** HIGH

## Summary

Phase 24 adds a universal intake system so Will can share anything from his phone (screenshots, URLs, plain text) and have AI classify and extract structured data before manually accepting it into the right entity type. The architecture is straightforward: a single POST endpoint accepts FormData, routes to the correct extractor based on input type (image/url/text), persists the raw input plus an AI-generated suggestion as an InboxItem, and presents a card-based inbox UI for review.

The project already has every required dependency in place. Cheerio is installed and actively used in `lib/rag/parsers/web.ts`. Claude Vision (image analysis via the Anthropic SDK) is already used elsewhere in the codebase. The `parseClaudeJSON` + Zod pattern from `lib/parse-claude.ts` is the established way to safely parse AI responses. Sharp handles image compression. The RAG ingest pipeline (`lib/rag/ingest.ts`) already handles URL → knowledge chunk conversion.

The main design consideration is the "accept" flow. The spec says accept should pre-fill GearForm/LocationForm rather than build new review UI — this means the InboxItem must store suggestion data in a structure that maps cleanly to those existing form props. The InboxItem.suggestion JSON field needs to be typed carefully so the accept handler can translate it directly into a POST /api/gear or POST /api/locations body.

**Primary recommendation:** Build inline (no queue), store raw + suggestion separately in InboxItem, use existing extractors for all heavy lifting, and focus acceptance UX on passing suggestion data to existing form flows.

## Project Constraints (from CLAUDE.md)

- TypeScript throughout — no plain JS
- No `alert()` — state-based inline errors only
- All API routes must have try-catch + console.error + JSON error response
- All React hooks must have correct, minimal dependency arrays
- Functional components with hooks only
- No premature abstractions
- `parseClaudeJSON<T>` with Zod schemas for all Claude API response parsing
- Use `claude-sonnet-4-20250514` for vision/complex tasks; `claude-haiku-4-20250514` for simple classification
- Files max 800 lines; functions max 50 lines
- Immutable patterns — return new objects, never mutate

## Standard Stack

### Core (all already in package.json — no new installs needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @anthropic-ai/sdk | 0.80.0 | Claude Vision + text classification | Already project standard |
| cheerio | 1.2.0 | Product page HTML scraping | Already installed, used in lib/rag/parsers/web.ts |
| sharp | 0.34.5 | Image compression before storage | Already used in photo upload and import |
| exif-parser | 0.1.12 | EXIF GPS extraction from images | Already used in lib/exif.ts |
| zod | 4.3.6 | Schema validation for AI responses | Already project standard via lib/parse-claude.ts |
| prisma | 6.19.2 | InboxItem model persistence | Already project ORM |

### No New Dependencies Required

All required libraries are already in package.json. This is a zero-new-install phase.

**Installation:**
```bash
# No installation needed — all deps already present
```

## Architecture Patterns

### Recommended Project Structure

```
lib/intake/
├── triage.ts                    # Core router: detect type → call extractor → return TriageResult
└── extractors/
    ├── gear-from-url.ts         # Cheerio scrape product pages → gear fields
    ├── gear-from-image.ts       # Claude Vision → gear fields
    ├── location-from-image.ts   # EXIF + Claude Vision → location fields
    └── classify-text.ts         # Claude Haiku text classification

app/api/
├── intake/
│   └── route.ts                 # POST: accepts FormData (text, url, file)
└── inbox/
    ├── route.ts                 # GET: list with status filter
    └── [id]/
        ├── route.ts             # GET, PUT, DELETE
        ├── accept/route.ts      # POST: create entity from suggestion
        └── reject/route.ts      # POST: mark rejected

app/inbox/
└── page.tsx                     # Server component (data fetch)

components/
└── InboxClient.tsx              # Card-based inbox UI
```

### Pattern 1: FormData Intake Endpoint

Next.js App Router handles multipart FormData natively via `request.formData()`. No multer or busboy needed.

```typescript
// Source: Next.js App Router docs, confirmed in existing import/photos/route.ts pattern
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const text = formData.get('text') as string | null
    const url = formData.get('url') as string | null
    const file = formData.get('file') as File | null
    // ... route to triage
  } catch (error) {
    console.error('Intake failed:', error)
    return NextResponse.json({ error: 'Intake failed' }, { status: 500 })
  }
}
```

### Pattern 2: Claude Vision for Image Extraction

Anthropic SDK supports image inputs as base64. Claude Sonnet should handle both gear identification and location inference from photos.

```typescript
// Source: Anthropic SDK docs — vision message format
const message = await anthropic.messages.create({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1000,
  messages: [{
    role: 'user',
    content: [
      {
        type: 'image',
        source: {
          type: 'base64',
          media_type: 'image/jpeg',  // or image/png, image/webp
          data: base64ImageData,
        },
      },
      { type: 'text', text: 'Extract product info from this image...' }
    ],
  }],
})
```

The `File` from FormData gives `.arrayBuffer()` → `Buffer.from()` → base64. Sharp should be used to resize before sending to Claude (keep under 5MB, ideal <1MB for latency).

### Pattern 3: parseClaudeJSON with Zod (existing project pattern)

All AI responses MUST go through `parseClaudeJSON<T>` from `lib/parse-claude.ts`. New schemas for triage results get added to that file following the established pattern.

```typescript
// Source: existing lib/parse-claude.ts pattern — HIGH confidence
export const TriageResultSchema = z.object({
  triageType: z.enum(['gear', 'location', 'knowledge', 'tip', 'unknown']),
  confidence: z.number().min(0).max(1),
  summary: z.string(),
  suggestion: z.record(z.unknown()),  // typed per triageType
})

export type TriageResult = z.infer<typeof TriageResultSchema>
```

### Pattern 4: Cheerio Product Page Scraping (already in codebase)

The existing `lib/rag/parsers/web.ts` already shows how to use Cheerio. For gear-from-url, we need a more targeted extraction: product title, price, brand, description, and image URL.

```typescript
// Source: existing lib/rag/parsers/web.ts — this pattern is already proven
import * as cheerio from 'cheerio'

const response = await fetch(url, {
  headers: { 'User-Agent': 'OutlandOS/1.0' }
})
const html = await response.text()
const $ = cheerio.load(html)

// Target product-specific selectors
const name = $('h1').first().text().trim()
  || $('[data-testid="product-title"]').text().trim()
  || $('.product-title').text().trim()
```

Product pages (Amazon, REI, manufacturer sites) vary significantly in HTML structure. The extractor should collect multiple candidate values and let Claude synthesize the best gear description from the raw scraped text.

**Better approach for product URLs:** After scraping raw text, pass it to Claude Haiku with a prompt to extract structured gear fields. This avoids brittle CSS selector targeting and handles any e-commerce site.

### Pattern 5: PWA Web Share Target

The Web Share Target API lets a PWA receive shared content from the iOS Share Sheet. It requires entries in the web app manifest and a service worker to handle the incoming share.

```typescript
// Source: Web Share Target API spec — app/manifest.ts addition
share_target: {
  action: '/api/intake',
  method: 'POST',
  enctype: 'multipart/form-data',
  params: {
    title: 'title',
    text: 'text',
    url: 'url',
    files: [{
      name: 'file',
      accept: ['image/*'],
    }],
  },
}
```

**Critical constraint:** The share_target action URL must be the same origin as the app. The POST lands at `/api/intake`. The service worker intercepts the share POST, can redirect to the inbox page after processing, or handle it as a fetch. For our single-user local-first app, inline processing (no queue) means the POST must complete within iOS's timeout window — typically up to 30 seconds is acceptable for a share target, but 2-5 seconds is ideal.

**iOS PWA limitation (MEDIUM confidence):** As of 2025, iOS Safari's PWA support for Web Share Target (POST with files) requires the app to be installed as a PWA (added to home screen). Browsers on iOS that aren't the installed PWA won't route shares through the manifest share_target. This is expected behavior for the use case.

### Pattern 6: InboxItem Suggestion JSON Structure

The `suggestion` field stores the AI-extracted data as JSON. Its shape must match what the accept endpoint sends to the entity creation API. Defining a discriminated union per triageType keeps this manageable:

```typescript
type GearSuggestion = {
  triageType: 'gear'
  name: string
  brand?: string
  category: string   // must be one of the 15 CATEGORIES from lib/gear-categories.ts
  description?: string
  price?: number
  purchaseUrl?: string
  isWishlist: boolean
}

type LocationSuggestion = {
  triageType: 'location'
  name: string
  latitude?: number
  longitude?: number
  description?: string
  type?: string
}

type KnowledgeSuggestion = {
  triageType: 'knowledge'
  content: string   // the raw text to ingest
  title: string
}
```

### Pattern 7: Accept Flow — Pre-fill Existing Forms

The spec says accept on gear opens a pre-filled GearForm. GearForm already accepts an `item` prop (GearItem | null). The accept flow needs to:

1. Parse the suggestion JSON from InboxItem
2. Map it to GearForm's expected item shape (with null for missing optional fields)
3. Open the GearForm in "new item" mode with values pre-populated
4. On save, create the GearItem and mark InboxItem as `accepted`

The cleanest implementation: InboxClient passes the suggestion as initialValues to GearForm. When GearForm calls `onSave`, InboxClient makes BOTH the `/api/gear POST` and the `/api/inbox/[id]/accept POST` in sequence.

For knowledge/tip types, accept calls the existing RAG ingest pipeline directly via the accept endpoint — no UI involvement needed since knowledge doesn't have a visual form in the current app.

### Anti-Patterns to Avoid

- **Don't build a new form for inbox acceptance:** GearForm and LocationForm already exist with full validation. Pre-fill them instead of building InboxReviewForm.
- **Don't auto-accept:** The spec explicitly requires Will to always review before accepting.
- **Don't batch process:** One item at a time via share sheet is the constraint.
- **Don't store the image in InboxItem.imagePath until compressed:** Always run sharp before writing to disk. The existing photo upload pattern in `app/api/import/photos/route.ts` shows the correct approach.
- **Don't use a separate knowledge/tip form:** For knowledge types, acceptance is a server action — call the RAG ingest pipeline directly, no UI gate needed.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| HTML scraping | Custom regex parser | Cheerio (already installed) | Handles malformed HTML, has robust selectors |
| Image base64 encoding | Manual Buffer manipulation | `Buffer.from(await file.arrayBuffer()).toString('base64')` | One-liner using Node's built-in |
| AI response validation | Manual field checking | parseClaudeJSON + Zod (lib/parse-claude.ts) | Established project pattern, handles markdown fences |
| Image resizing before Claude | Raw buffer send | sharp (already installed) | Reduces API latency and cost |
| EXIF extraction | Custom parser | lib/exif.ts extractGps() (already exists) | Already written and tested |
| Knowledge ingestion | Custom embedding pipeline | lib/rag/ingest.ts ingestChunks() (already exists) | Full embedding + vec DB already wired |
| URL fetching for scraping | Anything else | fetch() with User-Agent header | Same as existing web.ts pattern |

**Key insight:** Every technical capability needed for this phase already exists in the codebase. The phase is primarily about connecting these existing pieces with a new data model and UI layer.

## Common Pitfalls

### Pitfall 1: Claude Vision Image Size Limits
**What goes wrong:** Sending full-resolution photos to Claude Vision causes slow responses (5-10+ seconds) or API errors if the image exceeds size limits.
**Why it happens:** Anthropic has a 5MB limit per image; phone photos are often 3-8MB.
**How to avoid:** Always run sharp before base64-encoding for Claude. Resize to max 1024px wide, jpeg quality 70. This brings most phone photos under 200KB.
**Warning signs:** API timeout errors, slow intake responses.

### Pitfall 2: Web Share Target Action URL vs. Service Worker Scope
**What goes wrong:** The share lands at `/api/intake` but the service worker isn't registered for that path, causing the share to fail silently or navigate to a blank page.
**Why it happens:** Service worker scope must cover the share_target action URL.
**How to avoid:** The existing `public/sw.js` handles fetch events. The share target POST to `/api/intake` should be a network-first fetch (not cached). Verify the SW scope covers `/api/`.
**Warning signs:** Share appears to work on iOS but nothing appears in inbox.

### Pitfall 3: InboxItem.suggestion JSON Type Drift
**What goes wrong:** The suggestion JSON stored in SQLite doesn't match what the accept endpoint expects, causing runtime errors on accept.
**Why it happens:** The triage extractor and accept handler evolve independently.
**How to avoid:** Define suggestion shape as a Zod schema in `lib/parse-claude.ts` and parse it in BOTH the triage extractor (before storing) and the accept endpoint (before creating entity). Never trust raw JSON from the DB without parsing.
**Warning signs:** Accept throws on valid-looking inbox items.

### Pitfall 4: Amazon URL Scraping Limitations
**What goes wrong:** Amazon aggressively blocks scrapers; product page HTML is heavily JS-rendered.
**Why it happens:** Amazon uses bot detection and client-side rendering.
**How to avoid:** The extractor should gracefully fallback — if the scraped HTML is sparse (< 200 chars of useful text), classify the result as LOW confidence and surface the raw URL for Will to handle manually. Don't throw; store the InboxItem with low confidence.
**Warning signs:** gear-from-url returns empty or garbage product names for Amazon URLs.

### Pitfall 5: BottomNav Pending Count Badge Performance
**What goes wrong:** Every BottomNav render triggers a DB count query if the badge fetches live.
**Why it happens:** BottomNav is rendered on every page.
**How to avoid:** Fetch the pending count once in the InboxClient (or the inbox page server component) and pass it as a prop. For the badge in BottomNav, use a simple client-side fetch with SWR or a static prop from the server layout. Since this is a single-user app, polling every 30 seconds or fetching on page focus is sufficient.
**Warning signs:** Excessive API calls in network tab.

### Pitfall 6: Zod v4 API Differences
**What goes wrong:** Zod 4.3.6 is installed; some online examples show Zod v3 API which differs.
**Why it happens:** Project uses Zod v4 (package.json shows `"zod": "^4.3.6"`) but most docs examples are for v3.
**How to avoid:** Use `z.object()`, `z.enum()`, `z.string()`, `z.number()` — these are stable across v3/v4. Avoid `.default()` at the top level (use `.optional()` instead if needed). Follow the exact patterns in `lib/parse-claude.ts` — they're already v4 compatible.
**Warning signs:** TypeScript errors on Zod schema methods.

## Code Examples

### Triage Router Structure

```typescript
// Source: project pattern from lib/claude.ts function structure
// lib/intake/triage.ts
export type TriageType = 'gear' | 'location' | 'knowledge' | 'tip' | 'unknown'

export interface TriageResult {
  triageType: TriageType
  confidence: number        // 0–1
  summary: string           // one-line description for inbox card
  suggestion: GearSuggestion | LocationSuggestion | KnowledgeSuggestion | null
}

export async function triage(input: {
  text?: string
  url?: string
  imageBuffer?: Buffer
  imageMime?: string
}): Promise<TriageResult> {
  const { text, url, imageBuffer } = input

  if (imageBuffer) {
    // Step 1: Try EXIF GPS → location-from-image
    const exif = extractGps(imageBuffer)
    if (exif?.latitude) {
      return locationFromImage(imageBuffer, input.imageMime ?? 'image/jpeg', exif)
    }
    // Step 2: No GPS → gear-from-image
    return gearFromImage(imageBuffer, input.imageMime ?? 'image/jpeg')
  }

  if (url) {
    return gearFromUrl(url)
  }

  if (text) {
    return classifyText(text)
  }

  return { triageType: 'unknown', confidence: 0, summary: 'No input provided', suggestion: null }
}
```

### FormData Parsing in Intake Route

```typescript
// Source: Next.js App Router FormData pattern
// app/api/intake/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const text = formData.get('text') as string | null
    const url = formData.get('url') as string | null
    const file = formData.get('file') as File | null

    let imageBuffer: Buffer | undefined
    let imageMime: string | undefined

    if (file && file.size > 0) {
      const raw = Buffer.from(await file.arrayBuffer())
      // Compress before processing
      imageBuffer = await sharp(raw)
        .resize(1024, 1024, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 70 })
        .toBuffer()
      imageMime = 'image/jpeg'
    }

    const result = await triage({ text: text ?? undefined, url: url ?? undefined, imageBuffer, imageMime })

    // Persist InboxItem
    const item = await prisma.inboxItem.create({
      data: {
        sourceType: imageBuffer ? 'image' : url ? 'url' : 'text',
        rawContent: url ?? text ?? '',
        status: 'pending',
        triageType: result.triageType,
        suggestion: result.suggestion ? JSON.stringify(result.suggestion) : null,
        summary: result.summary,
        confidence: result.confidence,
        // imagePath set by separate image save step
      }
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Intake failed:', error)
    return NextResponse.json({ error: 'Intake failed' }, { status: 500 })
  }
}
```

### Web Share Target Manifest Addition

```typescript
// Source: Web Share Target API spec + Next.js manifest.ts pattern
// app/manifest.ts — add share_target to existing manifest
share_target: {
  action: '/api/intake',
  method: 'POST',
  enctype: 'multipart/form-data',
  params: {
    title: 'title',
    text: 'text',
    url: 'url',
    files: [{ name: 'file', accept: ['image/*'] }],
  },
}
```

Note: `MetadataRoute.Manifest` TypeScript type may not include `share_target` since it's not yet in the TypeScript DOM lib. Cast the return value: `return { ...manifest, share_target: {...} } as MetadataRoute.Manifest & { share_target: ... }`.

### BottomNav with Pending Count Badge

```typescript
// Source: existing BottomNav.tsx pattern
// Add 6th nav item with badge
{ href: '/inbox', label: 'Inbox', icon: Inbox, badgeCount: pendingCount }

// Badge render inline with icon:
<div className="relative">
  <Icon size={22} strokeWidth={isActive ? 2.5 : 2} />
  {item.badgeCount > 0 && (
    <span className="absolute -top-1 -right-1 bg-amber-500 text-stone-900 text-[9px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
      {item.badgeCount > 9 ? '9+' : item.badgeCount}
    </span>
  )}
</div>
```

The pending count needs to reach BottomNav. Since BottomNav is in the AppShell (a client component), the cleanest approach: fetch the count in a server layout and pass via props, OR have InboxClient emit a custom event / use a global state atom. For simplicity in a single-user app, a dedicated `/api/inbox/count` endpoint polled on page focus works.

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| @anthropic-ai/sdk | gear-from-image, classify-text, gear-from-url synthesis | Already in package.json | 0.80.0 | — |
| cheerio | gear-from-url product scraping | Already in package.json | 1.2.0 | — |
| sharp | image compression before Claude | Already in package.json | 0.34.5 | — |
| exif-parser | location-from-image EXIF GPS | Already in package.json | 0.1.12 | — |
| zod | Triage/suggestion schema validation | Already in package.json | 4.3.6 | — |
| ANTHROPIC_API_KEY | All AI features | Set in .env | — | Feature disabled, not blocking |

**Missing dependencies with no fallback:** None — all required packages are already installed.

**Missing dependencies with fallback:**
- If ANTHROPIC_API_KEY is missing, AI triage fails gracefully — return triageType: 'unknown' with low confidence.

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 6 (via @vitejs/plugin-react) |
| Config file | vitest.config.ts |
| Quick run command | `npx vitest run lib/__tests__/` |
| Full suite command | `npx vitest run` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INBOX-01 | POST /api/intake returns triaged InboxItem for text/url/image | unit (triage logic) | `npx vitest run lib/__tests__/triage.test.ts` | ❌ Wave 0 |
| INBOX-02 | AI classifies input into gear/location/knowledge/tip | unit (extractor mocks) | `npx vitest run lib/__tests__/triage.test.ts` | ❌ Wave 0 |
| INBOX-03 | Inbox page shows pending items with accept/edit/reject | component render | `npx vitest run components/__tests__/InboxClient.test.tsx` | ❌ Wave 0 |
| INBOX-04 | Accept creates real entity from AI suggestion | unit (accept handler) | `npx vitest run lib/__tests__/triage.test.ts` | ❌ Wave 0 |
| INBOX-05 | npm run build passes | build smoke | `npm run build` | — |

### Sampling Rate
- **Per task commit:** `npx vitest run lib/__tests__/triage.test.ts`
- **Per wave merge:** `npx vitest run`
- **Phase gate:** Full suite green + `npm run build` before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/triage.test.ts` — covers INBOX-01, INBOX-02, INBOX-04 (unit tests with mocked Claude client and Cheerio)
- [ ] `components/__tests__/InboxClient.test.tsx` — covers INBOX-03 (render test with mock inbox items)
- [ ] Framework already installed — vitest.config.ts exists, test patterns established

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Separate upload + form flows | Single intake → inbox → accept flow | Phase 24 | Reduces friction from ~8 taps to ~3 |
| Manual entity creation only | AI pre-fills form from any input | Phase 24 | Phone share-to-app becomes primary input method |
| Navigation Share API (custom) | PWA Web Share Target (manifest) | Phase 24 | iOS native share sheet routes directly to app |

**Deprecated/outdated:**
- Manual "add gear" as the only creation path: still valid, but inbox becomes preferred for new discoveries

## Open Questions

1. **BottomNav pending count — how to pass server data to client nav**
   - What we know: BottomNav is `'use client'`, rendered inside AppShell. Pending count requires a DB query.
   - What's unclear: Whether to poll `/api/inbox/count`, use a server layout prop, or just skip the badge until navigating to inbox.
   - Recommendation: Start with no badge count in BottomNav. Just show the inbox link. Add badge count in a follow-up if Will wants it. The badge requires a new fetch path that complicates the shell.

2. **Amazon URL handling — how to communicate low confidence to user**
   - What we know: Amazon blocks scrapers; pages are JS-rendered.
   - What's unclear: Whether to attempt scrape + AI synthesis (often works for product title at least) or fail fast with "manual entry needed".
   - Recommendation: Attempt the scrape. If extracted text is < 100 chars, set confidence = 0.2 and summary = "URL saved — product details need manual review". Store the raw URL in InboxItem.rawContent so Will can open it.

3. **Service worker share_target intercept — redirect after POST**
   - What we know: When a share_target POST completes, iOS expects to navigate the PWA to a page. The spec allows responding with a redirect.
   - What's unclear: Whether to redirect to `/inbox` (shows new item), or to a dedicated `/inbox/share-complete` page that auto-closes.
   - Recommendation: Redirect to `/inbox` after the POST completes. Will sees the new item at the top of the inbox immediately. The service worker should NOT intercept the intake POST — let it go to the network (network-first for `/api/`).

## Sources

### Primary (HIGH confidence)
- Existing codebase: `lib/rag/parsers/web.ts` — Cheerio scraping pattern already proven
- Existing codebase: `lib/parse-claude.ts` — parseClaudeJSON + Zod pattern confirmed
- Existing codebase: `lib/exif.ts` — EXIF extraction confirmed working
- Existing codebase: `lib/claude.ts` — Anthropic SDK vision message format (used for other features)
- Existing codebase: `lib/rag/ingest.ts` — RAG pipeline ingestion confirmed
- Existing codebase: `app/api/import/photos/route.ts` — sharp + file handling pattern
- Existing codebase: `components/GearForm.tsx` — accept pre-fill target form confirmed
- Existing codebase: `app/manifest.ts` — current manifest structure to extend
- `package.json` — all dependency versions verified locally

### Secondary (MEDIUM confidence)
- Web Share Target API MDN docs — share_target manifest schema (standard, well-documented)
- Anthropic API docs — vision message format (base64 image in content array)

### Tertiary (LOW confidence)
- iOS PWA share target behavior notes — based on known platform behavior as of 2025; may vary by iOS version

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all deps already in package.json, versions confirmed
- Architecture: HIGH — follows established project patterns exactly (parse-claude, sharp, exif, cheerio)
- Pitfalls: MEDIUM — Amazon scraping and iOS PWA share target behavior based on ecosystem knowledge, not live testing
- PWA share target: MEDIUM — spec is standard but iOS implementation quirks are platform-specific

**Research date:** 2026-04-03
**Valid until:** 2026-05-03 (30 days — stable APIs, no fast-moving dependencies)

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| INBOX-01 | POST endpoint accepts FormData with text, url, or file | FormData pattern via request.formData(), sharp for image compression, see Pattern 1 |
| INBOX-02 | AI triage classifies input into gear/location/knowledge/tip | Claude Vision for images, Cheerio+Claude for URLs, Claude Haiku for text; see Pattern 2-4 |
| INBOX-03 | Inbox page shows pending items with accept/edit/reject actions | InboxClient component following TripsClient/GearClient card patterns |
| INBOX-04 | Accept creates real entity (gear item, location, etc.) from AI suggestion | Suggestion JSON maps to existing /api/gear and /api/locations POST bodies; see Pattern 6 |
| INBOX-05 | npm run build passes | All deps already installed, no new packages needed; follow existing TypeScript patterns |
</phase_requirements>
