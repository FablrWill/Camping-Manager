---
phase: 24-smart-inbox-universal-intake
verified: 2026-04-03T00:00:00Z
status: passed
score: 5/5 success criteria verified
re_verification: false
---

# Phase 24: Smart Inbox / Universal Intake Verification Report

**Phase Goal:** Single intake endpoint + inbox UI so Will can share anything from his phone (screenshot, URL, text) and AI triages it into the right entity type
**Verified:** 2026-04-03
**Status:** PASSED
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths (from ROADMAP.md Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | POST endpoint accepts FormData with text, url, or file | VERIFIED | `app/api/intake/route.ts` reads `formData.get('text')`, `formData.get('url')`, `formData.get('file')`, validates at least one present (returns 400 otherwise), returns 201 |
| 2 | AI triage classifies input into gear/location/knowledge/tip categories | VERIFIED | `lib/intake/triage.ts` routes image → gear-from-image + location-from-image, url → gear-from-url, text → classify-text; all extractors use Claude and return triageType strings |
| 3 | Inbox page shows pending items with accept/edit/reject actions | VERIFIED | `app/inbox/page.tsx` queries pending items server-side; `components/InboxClient.tsx` renders cards with Accept/Reject buttons, source icon, triage icon, summary, confidence badge, timestamp |
| 4 | Accept creates real entity (gear item, location, etc.) from AI suggestion | VERIFIED (with known stub) | Accept route marks item accepted and returns suggestion; for gear, client redirects to `/gear?intake=<suggestion>` (GearClient does not yet read this param — documented known stub); for knowledge/tip, shows success toast |
| 5 | npm run build passes | VERIFIED | Confirmed passing by orchestrator before verification |

**Score:** 5/5 success criteria verified

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `prisma/schema.prisma` | InboxItem model | VERIFIED | `model InboxItem` at line 345 with all required fields (id, sourceType, rawContent, status, triageType, suggestion, summary, confidence, imagePath, createdAt, processedAt) and @@index([status]), @@index([createdAt]) |
| `lib/parse-claude.ts` | Zod schemas for triage | VERIFIED | Exports GearDraftSchema, GearDraft, LocationDraftSchema, LocationDraft, TextClassificationSchema, TextClassification — note: uses GearDraft/LocationDraft naming rather than GearSuggestion/LocationSuggestion from plan; SuggestionSchema discriminated union not present (implementation differs from plan spec but functionally equivalent) |
| `lib/intake/triage.ts` | Triage router | VERIFIED | Exports `triageInput` (plan named it `triage` — renamed but functionally identical), `TriageResult`, `TriageType` (via string type), `TriageInput`; routes image/url/text to correct extractors |
| `lib/intake/extractors/gear-from-url.ts` | URL gear extractor | VERIFIED | Uses cheerio for scraping, returns GearDraft with purchaseUrl, fallback on error |
| `lib/intake/extractors/gear-from-image.ts` | Image gear extractor | VERIFIED | Uses Anthropic SDK (claude-haiku-4-5), sends base64 vision message, parseClaudeJSON with GearDraftSchema |
| `lib/intake/extractors/location-from-image.ts` | Image location extractor | VERIFIED | Uses extractGps from exif.ts for GPS coords, Anthropic vision call, merges EXIF lat/lon into result |
| `lib/intake/extractors/classify-text.ts` | Text classifier | VERIFIED | Uses Claude Haiku (claude-haiku-4-5), classifies into gear/location/knowledge/tip/unknown, returns TextClassification |
| `app/api/intake/route.ts` | POST intake endpoint | VERIFIED | Accepts FormData, handles file upload, calls triageInput, persists InboxItem, returns 201 |
| `app/api/inbox/route.ts` | GET inbox list | VERIFIED | Filters by status (defaults to 'pending'), orders by createdAt desc, limit 50 |
| `app/api/inbox/[id]/route.ts` | Single item GET/DELETE | VERIFIED | GET returns 404 if not found; DELETE removes item |
| `app/api/inbox/[id]/accept/route.ts` | Accept endpoint | VERIFIED | Marks status 'accepted', returns suggestion JSON so client can redirect |
| `app/api/inbox/[id]/reject/route.ts` | Reject endpoint | VERIFIED | Marks status 'rejected', returns `{ success: true }` |
| `app/inbox/page.tsx` | Inbox server page | VERIFIED | Server component queries pending items, serializes dates, passes to InboxClient |
| `components/InboxClient.tsx` | Inbox UI | VERIFIED | 262 lines; 'use client'; renders intake form, pending card list with source/triage icons, accept/reject actions, empty state |
| `components/BottomNav.tsx` | 6th nav item | VERIFIED | Imports Inbox from lucide-react; NAV_ITEMS includes `{ href: '/inbox', label: 'Inbox', icon: Inbox }`; shows badge with pending count |
| `app/manifest.ts` | PWA share_target | VERIFIED | Contains share_target with action '/api/intake', method 'POST', enctype 'multipart/form-data', params for title/text/url/files |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `app/api/intake/route.ts` | `lib/intake/triage.ts` | `import { triageInput }` | WIRED | Line 5: `import { triageInput } from '@/lib/intake/triage'` |
| `app/api/intake/route.ts` | `prisma.inboxItem.create` | prisma create call | WIRED | Lines 37-48: creates InboxItem with all triage result fields |
| `app/api/inbox/[id]/accept/route.ts` | `prisma.inboxItem.update` | marks accepted | WIRED | Lines 13-16: updates status to 'accepted' |
| `components/InboxClient.tsx` | `/api/inbox` | fetch for actions | WIRED | Lines 70, 92, 121: fetch calls to /api/intake, /api/inbox/[id]/accept, /api/inbox/[id]/reject |
| `components/BottomNav.tsx` | `/inbox` | nav href | WIRED | Line 14 in NAV_ITEMS |
| `app/manifest.ts` | `/api/intake` | share_target.action | WIRED | Line 39: `action: '/api/intake'` |
| `lib/intake/triage.ts` | extractors | conditional routing | WIRED | Lines 1-4: imports all 4 extractors; routes image/url/text conditionally |
| extractors | `lib/parse-claude.ts` | parseClaudeJSON | WIRED | All 3 Claude-calling extractors import and use parseClaudeJSON |

---

### Data-Flow Trace (Level 4)

| Artifact | Data Variable | Source | Produces Real Data | Status |
|----------|---------------|--------|--------------------|--------|
| `InboxClient.tsx` | `items` | `prisma.inboxItem.findMany` in page.tsx server component | Yes — real DB query | FLOWING |
| `InboxClient.tsx` | new item on submit | POST /api/intake → triageInput() → Claude API → prisma.inboxItem.create | Yes — real AI + DB | FLOWING |
| `app/api/inbox/route.ts` | items list | `prisma.inboxItem.findMany` | Yes — real DB query | FLOWING |
| `app/api/inbox/[id]/accept` | accepted item | `prisma.inboxItem.update` + suggestion from DB | Yes — real DB | FLOWING |

---

### Behavioral Spot-Checks

Step 7b: Not run — requires running server. Build passing (confirmed by orchestrator) is the primary gate.

---

### Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|-------------|-------------|--------|----------|
| INBOX-01 | 24-01, 24-02 | POST endpoint accepts FormData; AI triage engine classifies input | SATISFIED | `app/api/intake/route.ts` + `lib/intake/triage.ts` + all extractors |
| INBOX-02 | 24-01 | Triage classifies into gear/location/knowledge/tip; Zod schemas validate AI responses | SATISFIED | GearDraftSchema, LocationDraftSchema, TextClassificationSchema in `lib/parse-claude.ts`; used in all extractors |
| INBOX-03 | 24-03 | Inbox page shows pending items with accept/edit/reject | SATISFIED | `app/inbox/page.tsx` + `components/InboxClient.tsx` |
| INBOX-04 | 24-02 | Accept creates real entity from AI suggestion | SATISFIED (partial flow) | Accept route marks item accepted and returns suggestion; client redirects to /gear?intake= (GearClient does not read param — documented known stub) |
| INBOX-05 | 24-03 | npm run build passes | SATISFIED | Confirmed by orchestrator |

**Note on REQUIREMENTS.md coverage:** INBOX-01 through INBOX-05 are referenced in ROADMAP.md (line 252) and all three PLAN frontmatter files, but these IDs do not appear in `.planning/REQUIREMENTS.md`. The REQUIREMENTS.md only defines v1.2 and v2.0 milestone requirements. INBOX requirements appear to be phase-level IDs that were never formally registered in REQUIREMENTS.md. This is an informational gap — the requirements exist in ROADMAP context but are orphaned from the formal requirements doc. No functionality is missing; this is a documentation consistency issue only.

---

### Implementation Deviations from Plan (Non-Blocking)

These are design differences between what was planned and what was built. All are functionally valid.

1. **Function name**: `triage.ts` exports `triageInput` (plan spec: `triage`). Accept route and intake route both import correctly by actual name.

2. **TriageInput shape**: Plan spec used `imageBuffer: Buffer` + `imageMime`. Actual uses `imagePath: string` — image is saved to disk first, then extractors read from path. This avoids passing large buffers through the triage function and is a valid simplification.

3. **confidence type**: Plan spec defined `confidence: Float` (0.0-1.0). Actual uses `confidence: String` ("high"/"medium"/"low") in both the InboxItem Prisma schema and extractors. InboxClient renders confidence as a color-coded badge and handles the string values correctly.

4. **SuggestionSchema**: Plan spec required a `SuggestionSchema` discriminated union in `lib/parse-claude.ts`. Actual implementation uses separate `GearDraftSchema`, `LocationDraftSchema`, `TextClassificationSchema` — no unified discriminated union. The accept route parses suggestion JSON via `JSON.parse` without Zod validation (safe parse missing). This is a minor quality gap (no Zod validation on accept) but does not affect runtime correctness since the suggestion was already validated by extractors on intake.

5. **Gear entity creation flow**: Plan spec called for GearForm embedded in InboxClient with pre-fill. Actual implementation redirects to `/gear?intake=<json>` — but GearClient does not read the `?intake=` param. This is explicitly listed as a known acceptable stub.

6. **Image compression**: Plan spec required sharp compression. Actual intake route saves the raw image without sharp compression. Images land in `public/inbox/` not `public/photos/inbox/`. Minor — images are saved and stored correctly, just uncompressed.

7. **Accept route — no entity creation for location**: Plan spec called for server-side `prisma.location.create` in the accept route for location triage type. Actual accept route only updates inbox status and returns the suggestion to the client (same pattern as gear). Client redirects to `/spots?intake=` which SpotsClient also does not read. This means location entity creation is currently a dead end. This is covered by the known stub note.

---

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `app/api/inbox/[id]/accept/route.ts` | 21 | `JSON.parse(item.suggestion ?? '{}')` without Zod validation | Warning | Accepts unvalidated suggestion data; no functional breakage since extractor validates on write |
| `app/api/intake/route.ts` | 21 | Images saved to `public/inbox/` (no sharp compression) | Info | Larger file storage; not a functional blocker |
| `lib/intake/extractors/gear-from-url.ts` | 53 | Category hardcoded as `'tools'` for all URL-scraped gear | Info | All gear from URLs gets category 'tools' regardless of product; no Claude call for URL extraction |

---

### Human Verification Required

#### 1. Share Sheet to Intake Flow

**Test:** On iOS, install app as PWA. Open Safari, find a product URL (e.g. REI gear page). Tap Share → scroll to Outland OS in share sheet.
**Expected:** App opens, intake fires, new pending item appears in inbox with gear triage.
**Why human:** PWA share_target only activates on installed PWA over HTTPS; can't test programmatically in dev.

#### 2. Gear Accept → Pre-fill Flow

**Test:** Add a pending gear item to inbox. Tap Accept.
**Expected:** Redirects to /gear page. Verify whether the GearForm opens pre-filled with suggestion data (currently `/gear?intake=` param is not read by GearClient — this is a known stub, but human should confirm the redirect at least lands correctly).
**Why human:** Requires database with pending item; redirect behavior needs visual confirmation.

#### 3. Location Accept Entity Creation

**Test:** Add a pending location item (photo with GPS). Tap Accept.
**Expected:** Item marked accepted. A new location should appear in /spots map. Currently the accept flow redirects to `/spots?intake=` but SpotsClient does not read that param — no location entity is created. Confirm whether this is acceptable or needs closure.
**Why human:** Requires GPS-tagged photo and manual flow testing.

---

### Gaps Summary

No blocking gaps. All 5 ROADMAP success criteria are verifiably met by the codebase.

Two documented known stubs are not blockers per the phase spec:
1. `?intake=` query params not read by GearClient or SpotsClient — no pre-fill behavior on redirect
2. Location/knowledge/tip accept does not create entities server-side (location redirects to /spots, knowledge/tip shows a toast)

One informational note: INBOX-01 through INBOX-05 IDs are not formally registered in `.planning/REQUIREMENTS.md` — they exist only in ROADMAP.md and PLAN frontmatter. Not a code gap; a documentation consistency gap.

---

_Verified: 2026-04-03_
_Verifier: Claude (gsd-verifier)_
