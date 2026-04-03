# Phase 16: Photo Bulk Import - Research

**Researched:** 2026-04-02
**Domain:** Next.js App Router multipart file upload, client-side progress tracking, EXIF extraction, sharp compression
**Confidence:** HIGH

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|------------------|
| PHOTO-01 | User can select multiple photo files via browser file picker (`<input type=file multiple>`) | Already implemented in PhotoUpload.tsx — `multiple` attribute present, `accept="image/*"` set |
| PHOTO-02 | Each file processed through existing EXIF extraction + sharp compression pipeline | `lib/exif.ts` extractGps + sharp pipeline is fully reusable; upload/route.ts shows exact pattern |
| PHOTO-03 | Import shows per-file progress ("Importing 12 of 50...") | Must be client-side counter — send files one at a time in a loop, increment counter per response |
| PHOTO-04 | Individual file failures do not abort the batch — errors collected and reported at end | Try-catch per file, accumulate errors array, never throw from loop iteration |
| PHOTO-05 | Imported photos with GPS EXIF appear as pins on the Spots map | SpotMap reads photos prop; SpotsClient.refreshPhotos() refetches /api/photos; calling it after bulk import triggers map refresh |

</phase_requirements>

---

## Summary

Phase 16 adds bulk photo import with real-time per-file progress. The core pipeline (EXIF extraction, sharp compression, Prisma write) already exists in `app/api/photos/upload/route.ts` and is production-ready. The main work is (1) creating a new `bulk-import` endpoint that mirrors the upload logic, (2) changing the client to send files one-at-a-time and update a progress counter per response, and (3) wiring up the "Import Multiple" UI path in `PhotoUpload.tsx`.

The critical insight: **real-time progress requires per-file sequential fetch calls, not a single multipart request**. If all files are sent in one request, progress feedback is impossible until the entire response arrives. The client loop pattern sends each file in its own `FormData` POST, increments a counter on each response, and collects errors without aborting.

The existing `app/api/photos/upload/route.ts` already accepts multiple files in a single request and returns `{ added, skipped, errors }`. The new `bulk-import` endpoint processes a **single file per call** so the client can drive progress. The existing upload endpoint stays unchanged.

**Primary recommendation:** Client-driven per-file loop to `/api/photos/bulk-import` (single-file endpoint) — gives per-file progress, per-file error isolation, and simplest server code.

---

## Project Constraints (from CLAUDE.md)

- TypeScript throughout; functional components with hooks
- No `alert()` — state-based inline error messages
- All API routes: try-catch with `console.error` + JSON error response
- React hooks: correct, minimal dependency arrays — never include state the hook itself updates
- File size: 200-400 lines typical, 800 max
- Immutable state updates (spread, never mutate)
- Single quotes, 2-space indent, semicolons always
- No hardcoded values
- GSD workflow enforced — all work through gsd:execute-phase

---

## Standard Stack

### Core (all already in package.json — no new dependencies)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| sharp | 0.34.5 | JPEG compression + EXIF auto-rotate | Already in use in upload/route.ts |
| exif-parser (via lib/exif.ts) | 0.1.12 | GPS coordinate extraction | Already in use, tested |
| Next.js FormData / request.formData() | 16.2.1 | Multipart upload parsing | Built into Next.js App Router |
| Prisma | 6.19.2 | DB write for Photo model | Already in use |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `randomUUID` (Node crypto) | built-in | Generate unique filenames | Already used in upload/route.ts |
| `fs/promises` writeFile, mkdir | built-in | Save compressed file to disk | Already used in upload/route.ts |
| `lib/paths.ts` getPhotosDir | project | Resolve photos directory path | Already used — handles dev/prod difference |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Per-file sequential fetch loop | Single multipart POST with streaming | Streaming SSE from a single request is significantly more complex and provides no benefit for this use case |
| Client-driven progress counter | Server-sent events (SSE) | SSE requires a long-lived connection, `ReadableStream` on server, EventSource on client — far more code for same UX |

**Installation:** None required — no new dependencies.

---

## Architecture Patterns

### Recommended Structure

```
app/
  api/
    photos/
      upload/route.ts        (EXISTING — accepts multiple files, unchanged)
      bulk-import/route.ts   (NEW — accepts single file, returns per-file result)
components/
  PhotoUpload.tsx             (MODIFIED — add "Import Multiple" button + progress state)
```

### Pattern 1: Single-File Endpoint + Client Loop for Progress

**What:** New endpoint accepts exactly one file per request. Client sends files sequentially in a loop, incrementing a counter after each response.

**When to use:** Any time real-time progress feedback is needed for multi-file operations without SSE/WebSocket complexity.

**Example (client loop):**
```typescript
// In PhotoUpload.tsx handleBulkImport()
const results = { added: 0, skipped: 0, errors: [] as string[] };
for (let i = 0; i < files.length; i++) {
  setProgress({ current: i + 1, total: files.length });
  const fd = new FormData();
  fd.append('photo', files[i]);
  try {
    const res = await fetch('/api/photos/bulk-import', { method: 'POST', body: fd });
    const data = await res.json();
    results.added += data.added ?? 0;
    results.skipped += data.skipped ?? 0;
    if (data.error) results.errors.push(`${files[i].name}: ${data.error}`);
    if (data.errors?.length) results.errors.push(...data.errors);
  } catch {
    results.errors.push(`${files[i].name}: network error`);
  }
}
setResult(results);
onUploadComplete(); // triggers refreshPhotos() in SpotsClient
```

**Example (server — single-file endpoint):**
```typescript
// app/api/photos/bulk-import/route.ts
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const gps = extractGps(buffer);
    if (!gps) return NextResponse.json({ added: 0, skipped: 1, errors: [] });

    const id = randomUUID();
    const filename = `${id}.jpg`;
    const photosDir = getPhotosDir();
    await mkdir(photosDir, { recursive: true });
    await sharp(buffer).rotate().resize(1200, 1200, { fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 75 }).toFile(join(photosDir, filename));

    const title = file.name.replace(/\.[^.]+$/, '');
    await prisma.photo.create({
      data: { title, latitude: gps.latitude, longitude: gps.longitude, altitude: gps.altitude, takenAt: gps.takenAt, imagePath: `/photos/${filename}` },
    });
    return NextResponse.json({ added: 1, skipped: 0, errors: [] });
  } catch (error) {
    console.error('Failed to process photo in bulk import:', error);
    return NextResponse.json({ added: 0, skipped: 0, errors: [error instanceof Error ? error.message : 'Unknown error'] }, { status: 200 });
    // 200 not 500 — caller aggregates errors, batch should not abort
  }
}
```

Note: returning 200 even on per-file errors so the client can aggregate — the HTTP error path in `fetch` throws, which loses the error message.

### Pattern 2: Progress State in PhotoUpload Component

**What:** Add a `progress` state `{ current: number, total: number } | null` alongside existing `uploading` boolean. Render "Importing X of Y..." when progress is non-null.

**When to use:** Any multi-step operation where granular feedback helps user confidence.

**Example:**
```typescript
const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

// In JSX:
{progress && (
  <p className="text-sm text-stone-600">Importing {progress.current} of {progress.total}...</p>
)}
```

### Anti-Patterns to Avoid

- **Sending all files in one multipart request to get "progress":** The response only arrives after all files are processed. No progress is possible.
- **Aborting on first error:** PHOTO-04 requires resilience. Wrap each file in try-catch, continue loop.
- **Calling `onUploadComplete()` per file:** Triggers a map re-render and fetch for every file. Call once at the end.
- **Using `window.location.reload()` after bulk import:** SpotsClient already has `refreshPhotos()` callback — use it.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| EXIF GPS extraction | Custom EXIF parser | `lib/exif.ts` (wraps exif-parser) | Already handles 0,0 guard, null cases, unix timestamp conversion |
| Image compression + rotation | Custom resize/rotate | `sharp` pipeline already in upload/route.ts | sharp handles all EXIF rotation edge cases |
| Photos directory resolution | Hardcoded paths | `lib/paths.ts` getPhotosDir() | Handles dev/prod path differences correctly |
| UUID filename generation | Custom naming | `randomUUID()` from Node crypto | Already used consistently in codebase |
| Path traversal guard on serve | Custom validator | Follow existing DELETE pattern in [id]/route.ts | resolvePhotoPath + startsWith check already solved |

**Key insight:** The upload pipeline is complete and correct. Phase 16 is primarily about the UI interaction pattern (progress feedback + error collection), not new backend logic.

---

## Common Pitfalls

### Pitfall 1: Next.js App Router default body size limit (4MB)

**What goes wrong:** Next.js App Router routes have a default 4MB body size limit for `request.formData()`. Uploading a single large JPEG may hit this.

**Why it happens:** Next.js sets `api.bodyParser.sizeLimit` at 4MB by default for App Router. The existing upload endpoint already works — suggesting files being uploaded are under 4MB each (or sharp compression keeps them manageable). However, bulk import sends one file per request, which is the same as the existing endpoint — no regression here.

**How to avoid:** Accept files one at a time (client loop pattern), each well under the limit. If a file exceeds the limit, the 413 response triggers the catch block and adds an error to the list. No special config needed.

**Warning signs:** 413 errors in the error list for large files. If this becomes common, add `export const config = { api: { bodyParser: { sizeLimit: '20mb' } } }` — but App Router does not use the Pages Router `config` export; instead check `next.config.ts` for `experimental.serverMaxBodySize` if needed.

### Pitfall 2: `onUploadComplete` called inside the loop triggers N map refreshes

**What goes wrong:** Calling `onUploadComplete()` after each file causes `refreshPhotos()` to fire N times, triggering N API calls and N re-renders.

**Why it happens:** Easy mistake when lifting the error-handling pattern from single-file upload.

**How to avoid:** Call `onUploadComplete()` exactly once after the entire loop completes.

### Pitfall 3: Sharp processes corrupt/non-image files and throws

**What goes wrong:** A user selects a .txt file or a corrupt JPEG. Sharp throws "Input buffer contains unsupported image format."

**Why it happens:** Browser `accept="image/*"` is advisory, not enforced — users can bypass it on desktop.

**How to avoid:** The try-catch around each file already catches this. The error message from sharp is user-readable enough to include in the errors list. No special handling needed beyond the existing per-file try-catch.

### Pitfall 4: EXIF parser throws on corrupt buffer, not returns null

**What goes wrong:** `extractGps` is expected to return null on failure but may throw on deeply malformed buffers.

**Why it happens:** The exif-parser library can throw on certain corrupt file headers before the catch in `extractGps` can run — though `lib/exif.ts` already wraps in try/catch and returns null.

**How to avoid:** Already handled in `lib/exif.ts` — the entire parse is wrapped in try/catch returning null. No additional handling needed.

### Pitfall 5: "Import Multiple" button vs existing drag-drop area

**What goes wrong:** Adding a second upload trigger creates confusion about which button does what, or accidentally double-triggers.

**Why it happens:** PhotoUpload.tsx currently has one `<input type=file multiple>` ref. Adding a second flow using the same input ref causes state confusion.

**How to avoid:** Reuse the same `<input>` element (already has `multiple` attribute). The distinction between "normal upload" and "bulk import" is only in which handler processes the files — or more simply, since the new `/api/photos/bulk-import` endpoint does the same thing as `/api/photos/upload` with per-file progress, the simplest approach is to **replace** the existing upload flow with the new loop-based flow. No second input element needed.

### Pitfall 6: Progress state left non-null after error/completion

**What goes wrong:** If the loop throws at the outer level (network down entirely), `progress` stays set and shows stale "Importing X of Y..." state.

**Why it happens:** Progress reset only in the happy path.

**How to avoid:** Reset `progress` to null in the `finally` block alongside `setUploading(false)`.

---

## Code Examples

Verified from existing codebase patterns:

### Existing single-file pipeline (source: app/api/photos/upload/route.ts)
```typescript
const buffer = Buffer.from(await file.arrayBuffer());
const gps = extractGps(buffer);
if (!gps) { skipped++; continue; }

const id = randomUUID();
const filename = `${id}.jpg`;
await sharp(buffer)
  .rotate()
  .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
  .jpeg({ quality: 75 })
  .toFile(join(photosDir, filename));

await prisma.photo.create({
  data: {
    title,
    latitude: gps.latitude,
    longitude: gps.longitude,
    altitude: gps.altitude,
    takenAt: gps.takenAt,
    imagePath: `/photos/${filename}`,
  },
});
```

### Existing refreshPhotos pattern (source: app/spots/spots-client.tsx)
```typescript
const refreshPhotos = useCallback(async () => {
  // fetches /api/photos and calls setPhotos(data)
}, []);
// ...
<PhotoUpload onUploadComplete={refreshPhotos} />
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Single request, all files | Per-file sequential loop | Phase 16 | Enables real-time progress counter |
| Generic "uploading" spinner | "Importing X of Y..." counter | Phase 16 | PHOTO-03 requirement |

---

## Open Questions

1. **Should the new bulk-import endpoint replace or coexist with /api/photos/upload?**
   - What we know: The spec says "add 'Import Multiple' button alongside existing upload"
   - What's unclear: Whether the existing upload endpoint is used elsewhere (photo import from trip modal, etc.)
   - Recommendation: Keep both. New `bulk-import` is the per-file endpoint for the progress loop. Existing `upload` stays for any other callers. The PhotoUpload component uses bulk-import internally but the interface (onUploadComplete callback) stays the same.

2. **What is the right Next.js App Router body size limit for single-file JPEG uploads?**
   - What we know: Default is 4MB. Sharp input is the original file buffer (pre-compression). A raw camera JPEG can be 8-20MB.
   - What's unclear: Whether existing uploads from phones work under 4MB after iOS/Android compression, or whether Will's phone photos already exceed this.
   - Recommendation: Document in plan that if 413 errors appear, add `experimental.serverMaxBodySize: '25mb'` to next.config.ts. For now, the per-file loop means only one file's size matters per request — same as the existing upload endpoint which already works.

---

## Environment Availability

Step 2.6: SKIPPED (no new external dependencies — sharp, exif-parser, Prisma already installed and working)

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 3.2.4 |
| Config file | vitest.config.ts |
| Quick run command | `npm test` |
| Full suite command | `npm test` |

### Phase Requirements to Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| PHOTO-01 | File input accepts multiple files | manual (browser) | n/a — input attribute | N/A |
| PHOTO-02 | EXIF extraction + sharp compression runs per file | unit | `npm test -- --grep "bulk-import"` | Wave 0 |
| PHOTO-03 | Progress counter increments per file | manual (browser) | n/a — UI state | N/A |
| PHOTO-04 | One corrupt file does not abort batch | unit | `npm test -- --grep "bulk-import"` | Wave 0 |
| PHOTO-05 | Photos with GPS show on Spots map | manual (browser) | n/a — map rendering | N/A |

### Sampling Rate

- **Per task commit:** `npm test`
- **Per wave merge:** `npm test`
- **Phase gate:** Full suite green before `/gsd:verify-work`

### Wave 0 Gaps

- [ ] `lib/__tests__/bulk-import.test.ts` — unit tests for PHOTO-02 and PHOTO-04 (mock extractGps, sharp, prisma; verify per-file error isolation)

---

## Sources

### Primary (HIGH confidence)
- Direct codebase read: `app/api/photos/upload/route.ts` — complete upload pipeline
- Direct codebase read: `lib/exif.ts` — GPS extraction interface
- Direct codebase read: `lib/paths.ts` — photos directory resolution
- Direct codebase read: `components/PhotoUpload.tsx` — current upload UI
- Direct codebase read: `app/spots/spots-client.tsx` — refreshPhotos callback pattern
- Direct codebase read: `app/spots/page.tsx` — how photos reach the map
- Direct codebase read: `prisma/schema.prisma` — Photo model fields

### Secondary (MEDIUM confidence)
- Next.js App Router body size limit: default 4MB per request body — verified consistent with known Next.js behavior

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies; all libraries already in use and verified working
- Architecture: HIGH — per-file loop pattern is verified by existing upload endpoint; client progress counter is standard React state
- Pitfalls: HIGH — identified from direct code reading of existing patterns

**Research date:** 2026-04-02
**Valid until:** 2026-05-02 (stable stack, no fast-moving dependencies)
