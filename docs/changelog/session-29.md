# Session 29 — 2026-04-03
## Mobile Gear Entry + iMessage Knowledge Ingestion

### Summary
Two major quality-of-life features built: (1) AI-powered gear identification in the Add Gear form — paste a link or upload a photo and Claude fills in all the fields. (2) A full iMessage-to-knowledge-base pipeline — send the app any link, screenshot, or text from your phone and it classifies, saves, and/or ingests it into the knowledge base so the chat agent can reference it when planning trips.

---

### 1. AI Gear Identification in Add Gear Form

**New endpoint: `POST /api/gear/identify`**
- Accepts `{ url }` or `{ image, mimeType }` (base64)
- For URLs: fetches page HTML server-side, strips markup, sends text to Claude Haiku
- For images: sends base64 directly to Claude vision
- Returns structured gear fields: `name`, `brand`, `category`, `description`, `weight`, `price`, `notes`, `wattage`, `purchaseUrl`
- Falls back gracefully: if URL fetch fails (e.g. Amazon blocks), still sends URL to Claude for best-effort identification

**Updated: `components/GearForm.tsx`**
- All form fields converted from uncontrolled (`defaultValue`) to controlled (`useState`) so AI results can pre-fill them
- New "Add with AI" panel shown at top of form when adding new gear (hidden when editing)
- Two tabs: **Paste a link** and **Upload photo**
- Link tab: URL input + Go button, Enter key submits
- Photo tab: styled file input — works with camera, photo library, or screenshots on mobile
- Images are resized client-side to max 1200px JPEG before sending (handles large camera photos)
- Loading states, success banner ("Found: [name] — fields pre-filled below"), and error messages
- Identified `purchaseUrl` is stamped into the Purchase Link field automatically

---

### 2. iMessage-to-App Pipeline

**New endpoint: `POST /api/incoming-message`**

Receives messages forwarded from an iOS/macOS Shortcut and:
1. Classifies content type (gear, location, article, reddit, map, other)
2. Takes action based on type
3. Returns a `{ reply }` string the Shortcut sends back as an iMessage

**Accepts:**
```json
{ "text": "optional caption or URL", "image": "<base64>", "mimeType": "image/jpeg" }
```
Both `text` and `image` are optional but at least one is required. `image` triggers Claude vision path.

**Classification prompt** (Claude Haiku) extracts:
- `contentType`, `title`, `summary`, `region` (geographic region if mentioned)
- Type-specific `extractedData`: gear specs, location coords, key points for articles

**Per content type:**

| Type | Action |
|------|--------|
| `gear` | Creates `GearItem` as wishlist entry with all identified fields |
| `location` | Creates `Location` record + fires background knowledge ingest |
| `article` / `reddit` | Fires background knowledge ingest (full URL crawl or screenshot text) |
| `map` | Summarizes + fires background knowledge ingest |
| `other` | Summarizes + fires background knowledge ingest |

**Background ingestion (`ingestInBackground`):**
- For URLs: calls `ingestFile(url)` → `ingestChunks()` (the existing RAG pipeline — cheerio scrape → paragraph chunking → Voyage embedding → SQLite vec0 storage)
- For screenshots/text: calls new `chunkPlainText()` → `ingestChunks()`
- Stamps `region` metadata on chunks when Claude detected a geographic region
- Fire-and-forget — iMessage reply is returned immediately (ingestion can take 1-2 min due to Voyage rate limits)
- Skips silently if `VOYAGE_API_KEY` not set, and tells the user via the reply

**Optional webhook auth:** Set `WEBHOOK_SECRET` in `.env`, then include `x-webhook-secret: <value>` header in the Shortcut.

**New file: `lib/rag/ingestText.ts`**
- `chunkPlainText(text, title, source, metadata)` → `RawChunk[]`
- Splits at paragraph boundaries into ~512-token chunks (same logic as the existing web and markdown chunkers)
- Used for screenshots and plain-text message ingestion

---

### 3. Voyage AI API Key Configured

- `VOYAGE_API_KEY` added to `.env`
- Knowledge base ingestion now live — anything sent via iMessage will be embedded and stored for semantic retrieval by the chat agent

---

### How to Set Up the iMessage Shortcut

On Mac mini (always-on), open **Shortcuts → Automation → New Automation → Message**:

**For text/link messages:**
1. Trigger: when message received from [yourself or a contact]
2. Action: Get Contents of URL
   - URL: `http://localhost:3000/api/incoming-message`
   - Method: POST
   - Body (JSON): `{ "text": "[Message Content]" }`
3. Action: Send Message → reply with result

**For screenshot/image attachments:**
1. Same trigger
2. Encode attachment: Base64 Encode the attachment
3. Action: Get Contents of URL
   - Body: `{ "text": "[Message Content]", "image": "[Base64 encoded attachment]", "mimeType": "image/jpeg" }`
4. Action: Send Message → reply with result

The app auto-detects content type and replies with what it did:
- `⛺ Added to wishlist: Big Agnes Copper Spur HV UL2 — $549.95, 2.06 lbs [shelter]`
- `📍 Saved location: Black Balsam Knob Dispersed Camping`
- `📚 Saved to knowledge base: "Best Dispersed Camping in Pisgah National Forest" — your agent can now reference this when planning trips.`

---

### Files Changed
| File | Change |
|------|--------|
| `app/api/gear/identify/route.ts` | **New** — gear identification endpoint |
| `app/api/incoming-message/route.ts` | **New** — iMessage webhook with classification + ingest |
| `lib/rag/ingestText.ts` | **New** — plain text chunker for screenshots |
| `components/GearForm.tsx` | **Updated** — AI identification panel + controlled inputs |
| `.env` | **Updated** — `VOYAGE_API_KEY` added |
