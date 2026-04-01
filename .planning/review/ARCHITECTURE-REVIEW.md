# Architecture Review: Outland OS

**Reviewer:** Claude (Opus 4.6)
**Date:** 2026-04-01
**Scope:** Full architecture audit after Milestone 1, Phases 2-5 complete
**Codebase State:** 14 models, 12 agent tools, RAG pipeline, streaming chat, voice debrief

---

## Architecture Diagram

```
                         +------------------+
                         |   Mobile Client  |
                         |  (Next.js React) |
                         +--------+---------+
                                  |
                    SSE (chat) / REST (CRUD)
                                  |
            +---------------------+---------------------+
            |                     |                     |
    +-------v-------+   +--------v--------+   +--------v--------+
    |   Pages/UI    |   |   API Routes    |   |  Chat Route     |
    | (App Router)  |   |  /api/gear,etc  |   |  /api/chat      |
    +-------+-------+   +--------+--------+   +--------+--------+
            |                     |                     |
            +----------+----------+          +----------+
                       |                     |
              +--------v--------+   +--------v--------+
              |  Prisma Client  |   | Anthropic SDK   |
              |  (SQLite ORM)   |   | (Claude Sonnet) |
              +--------+--------+   +--------+--------+
                       |                     |
              +--------v--------+   +--------v--------+
              |   SQLite DB     |   |  Agent Tools    |
              |   (dev.db)      |   |  (12 tools)     |
              +--------+--------+   +--------+--------+
                       |                     |
              +--------+--------+   +--------v--------+
              |  better-sqlite3 |   | RAG Pipeline    |
              |  + sqlite-vec   |   | (hybrid search) |
              |  (vec0, FTS5)   |   +--------+--------+
              +--------+--------+            |
                       |              +------v------+
                       +------<-------+  Voyage AI  |
                                      | (embeddings)|
                                      +-------------+
    External Services:
    +-------------+  +-----------+  +-------------+
    | Open-Meteo  |  | OpenAI    |  | Voyage AI   |
    | (weather)   |  | (Whisper) |  | (embed)     |
    +-------------+  +-----------+  +-------------+
```

**Key architectural characteristic:** Two separate SQLite connections to the same database file.
Prisma handles all relational CRUD; better-sqlite3 handles FTS5 and vec0 virtual tables.
WAL mode enables concurrent access, but this dual-connection pattern is the single most
migration-sensitive element in the codebase.

---

## 1. Schema Design

**Risk Rating: MEDIUM**

### Strengths
- Clean relational modeling with proper foreign keys
- PackingItem junction table with `@@unique([tripId, gearId])` prevents duplicates
- Appropriate use of cascading deletes (VehicleMod, PackingItem, Message)
- KnowledgeChunk stores embeddings as raw bytes -- efficient for SQLite
- AgentMemory with unique key constraint enables clean upsert pattern
- Good index coverage on foreign keys and timestamp-heavy tables

### Issues

**Missing cascading deletes (orphan risk):**
- `Photo.locationId` and `Photo.tripId` -- deleting a Location or Trip leaves orphaned Photo FK references. No `onDelete` specified, so Prisma defaults to `SetNull` for optional relations on some databases but errors on others. This will behave differently on Postgres.
- `Trip.locationId` and `Trip.vehicleId` -- same issue. Deleting a Location that a Trip references could fail or leave dangling references depending on the database.

**Missing indexes:**
- `Location` has no index on `latitude`/`longitude` -- any proximity query (recommend_spots, map viewport filtering) does full table scans. Acceptable now at small scale, but will hurt with 100+ locations.
- `KnowledgeChunk` has no index on `title` -- only on `source`. Title-based lookups in deduplication logic during ingest are unindexed.
- `GearItem` has no index on `category` or `isWishlist` -- every filtered gear query scans the full table.

**Schema evolution pain points:**
- `KnowledgeChunk.embedding` as `Bytes` (BLOB) is SQLite-specific. Postgres would use `pgvector` with a native vector type. The entire vec0 virtual table strategy is SQLite-only -- this is the hardest migration path.
- `metadata` stored as JSON string in KnowledgeChunk. No ability to query metadata fields without deserializing. In Postgres, this should be `JSONB` with GIN indexes.
- Timeline models (TimelinePoint, PlaceVisit, ActivitySegment) use `BigInt` for millisecond timestamps alongside `DateTime`. The BigInt fields exist purely for SQLite query compatibility. Postgres would not need them.
- No `status` or `archived` field on Trip. Upcoming/past trips are distinguished purely by date comparison in queries. Adding trip states later requires a migration + backfill.

**SQLite-specific limitations that will bite:**
- `@@unique` constraints in SQLite use a different internal mechanism than Postgres. Migration tooling handles this, but test thoroughly.
- No native ENUM type -- `condition`, `type`, `role`, `cellSignal` etc. are all plain strings with no DB-level enforcement. Postgres migration should add CHECK constraints or enums.
- CUID IDs are fine for both databases, no issue there.

### Recommendation
Add explicit `onDelete: SetNull` to optional Photo/Trip foreign keys before migration. Add the missing indexes. The KnowledgeChunk/vec0 schema is a full rewrite for Postgres -- plan that separately.

---

## 2. AI Architecture

**Risk Rating: MEDIUM-HIGH**

### Chat Agent Structure
The chat agent at `app/api/chat/route.ts` is well-structured:
- Uses Anthropic's `BetaToolRunner` with `stream: true` for native tool-calling iteration
- `max_iterations: 8` hard caps tool call loops (prevents runaway costs)
- SSE streaming for responsive mobile UX
- Conversation persistence in DB with sliding window context

### Tool Abstraction
The tool registry pattern in `lib/agent/tools/index.ts` is clean:
- Each tool is a separate file with a schema definition + executor
- `AGENT_TOOLS` array + `executeAgentTool` switch dispatcher
- 12 tools covering read/write for all major entities + RAG search + recommendations

**Issues:**

**Dual tool registries:**
- `ALL_TOOLS` (legacy Plan 01) and `AGENT_TOOLS` (Plan 02) both exported. `ALL_TOOLS` and the legacy `executeTool` dispatcher are dead code but still exported. Should be removed to prevent confusion.

**No token budget tracking:**
- The system prompt is ~350 tokens. Each tool result is unbounded -- `list_gear` could return the entire inventory as JSON, `search_knowledge_base` returns up to 2000 tokens of RAG context. With a sliding window of 20 messages, the total context could easily exceed the 2048 `max_tokens` output budget while the INPUT context could balloon to 50K+ tokens.
- No mechanism to estimate input token cost before sending. A long conversation with several tool calls in history could cost $0.50+ per message.
- The memory extraction call uses Haiku (~$0.001/call) which is cost-effective, but fires on every message regardless of whether the user said anything preference-worthy. The `userMessage.length < 20` filter is the only guard.

**System prompt inconsistency:**
- `CAMPING_EXPERT_SYSTEM_PROMPT` (static string) is used by the chat route
- `buildSystemPrompt()` (dynamic, with live stats) exists but is never called by the chat route
- The dynamic version injects gear count, location count, upcoming trips -- but the chat route uses the static version and relies on tool calls to get this data instead
- This is arguably fine (tools are more accurate than stale stats in the prompt), but the unused `buildSystemPrompt` should be removed or documented as "for future use"

**JSON parsing without validation:**
- Both `generatePackingList` and `generateMealPlan` in `lib/claude.ts` parse Claude's JSON response with bare `JSON.parse()` -- no Zod validation, no try-catch around the parse specifically. The ROADMAP Phase 1 (Validation) calls for `parseClaudeJSON<T>` with Zod, but Phase 1 was never executed.
- If Claude returns malformed JSON (which happens occasionally with complex schemas), the entire request crashes with an unhelpful error.

### Cost Exposure
- **Chat:** claude-sonnet-4 at ~$3/M input, $15/M output. With 20-message context windows and tool results, each chat message could cost $0.02-0.10. Frequent chatting could reach $5-10/day.
- **Memory extraction:** claude-3-5-haiku on every message, ~$0.001/call. Negligible.
- **Packing list + Meal plan:** One-shot calls, $0.01-0.05 each. Infrequent.
- **Embeddings:** Voyage-3-lite free tier (3 RPM, 10K TPM). Ingestion is rate-limited already. Runtime search embeds one query at a time -- fine.
- **Voice:** OpenAI Whisper, ~$0.006/minute. Occasional use, negligible.
- **No cost monitoring or alerting exists.** If something goes wrong (infinite loop in toolRunner despite max_iterations, or a prompt injection that triggers many tool calls), there is no circuit breaker beyond the SDK's built-in limits.

### Recommendation
Add Zod validation to all Claude JSON responses (this was Phase 1 work that was skipped). Remove dead code. Add basic cost tracking (log estimated tokens per chat message). Consider reducing the sliding window from 20 to 10 messages to cut costs.

---

## 3. RAG Pipeline

**Risk Rating: HIGH (broken dependency)**

### Critical Finding: Missing Dependencies

**`better-sqlite3` and `sqlite-vec` are NOT in `package.json` and are NOT installed in `node_modules`.** The entire `lib/rag/` directory imports these packages, meaning:
- `lib/rag/db.ts` will fail at runtime with `Cannot find module 'better-sqlite3'`
- All RAG search, ingest, and the `search_knowledge_base` agent tool are non-functional
- The `recommend_spots` tool calls `hybridSearch` which also depends on these packages
- **Any chat message that triggers knowledge base search will crash the tool call**

This likely means these packages were installed in a different worktree or the main branch, and the worktree's `node_modules` is stale or was never fully set up.

### Pipeline Design (assuming deps are installed)
The RAG pipeline design is solid:

**Ingestion:**
- Markdown chunking by H2/H3 headings with paragraph-level splits for long sections
- PDF parsing and web scraping support
- Target chunk size: 256-512 tokens (good for retrieval quality)
- Frontmatter metadata extraction with `gray-matter`
- Batch embedding with Voyage-3-lite (512 dims)
- Dual-write: Prisma for relational data + vec0 for vector index

**Search:**
- Hybrid retrieval: FTS5 (BM25) + vec0 (cosine similarity)
- Reciprocal Rank Fusion (k=60) merge -- textbook implementation
- FTS5 query escaping handles special characters
- Results capped at configurable topK with 2x oversampling before RRF merge

**Integration with chat agent:**
- `search_knowledge_base` tool wraps `hybridSearch`
- `buildRagContext` formats results with title, source, verify flags
- Token budget of 2000 for RAG context injection -- reasonable

### Issues (beyond missing deps)

**Dual-database connection fragility:**
- Prisma and better-sqlite3 both open `dev.db`. WAL mode enables this, but:
  - If Prisma runs a migration while better-sqlite3 has the connection open, corruption is possible
  - The vec0 virtual table is created via `CREATE VIRTUAL TABLE IF NOT EXISTS` on every connection open -- not via Prisma migrations. This means the vec0 table state is invisible to Prisma's migration system.
  - FTS5 triggers (mentioned in ROADMAP Phase 3 Plan 01) are also outside Prisma's control

**No re-embedding pipeline:**
- If the embedding model changes (e.g., upgrading from voyage-3-lite to a better model), there is no script to re-embed existing chunks. The ingest pipeline only handles new documents.

**Ingestion is CLI-only:**
- No admin UI or API route for ingesting new knowledge. A developer must run scripts manually. For a personal tool this is acceptable, but it means the knowledge base won't grow during normal use.

**Rate limiting is aggressive:**
- 21-second delays between batches of 10 during ingestion. This is correct for the free Voyage tier, but means ingesting 100 chunks takes ~3.5 minutes. Upgrading to a paid Voyage plan would require code changes to adjust these timers.

### Recommendation
**Immediate:** Run `npm install better-sqlite3 sqlite-vec` in the working tree. Add both to `package.json` dependencies. This is a blocking issue -- RAG and two agent tools are broken without it.

**Soon:** Add a re-embedding script. Document the FTS5 trigger and vec0 table creation outside of Prisma migrations so they aren't lost during schema resets.

---

## 4. State Management

**Risk Rating: LOW-MEDIUM**

### Where State Lives

| State | Location | Persistence | Notes |
|-------|----------|-------------|-------|
| Gear, Trips, Locations, etc. | SQLite via Prisma | Persistent | Well-modeled |
| Conversation history | SQLite (Message model) | Persistent | Sliding window caps memory |
| Agent memories | SQLite (AgentMemory) | Persistent | Upsert by key |
| Knowledge base | SQLite + vec0 | Persistent | Dual-connection pattern |
| UI filter state | React useState | Session only | Lost on page reload |
| Dark mode | localStorage | Persistent (client) | Good pattern |
| Chat streaming state | React useState | Transient | Expected |
| Voice recording | MediaRecorder + Blob | Transient | Expected |

### What Should Be Persisted But Isn't

- **Filter/search state on gear page:** If Will filters to "clothing" category and navigates away, the filter resets. URL search params would fix this.
- **Last-viewed conversation in chat:** Navigating away from chat loses the active conversation. The user must manually select it again.
- **Trip prep status calculations:** Weather, packing, meal plan readiness are recalculated every time the prep page loads. These could be cached with a TTL.

### Race Conditions

- **Conversation creation in chat route:** The check-then-create pattern for conversations has a narrow race window if two requests fire simultaneously with `conversationId: null`. Both could create new conversations. Unlikely with a single user but technically possible with rapid double-taps on mobile.
- **Memory extraction fire-and-forget:** `extractAndSaveMemory` runs asynchronously after the response streams. If the user sends another message before extraction completes, and both messages trigger memory upserts on the same key, last-write-wins. This is acceptable behavior but worth noting.
- **Packing list generation + persistence:** If triggered twice in rapid succession for the same trip, both requests could try to create PackingItem records, potentially violating the unique constraint. The `@@unique([tripId, gearId])` index would catch this and error, but the error handling is a generic 500.

### Recommendation
Add URL search params for gear/trip filters. Consider debouncing the packing list generation button. The race conditions are low-risk for a single-user app.

---

## 5. Deployment Readiness

**Risk Rating: HIGH**

### What Blocks Deploying to Vercel

1. **SQLite is not supported on Vercel.** Vercel serverless functions run in ephemeral containers with read-only filesystems. SQLite needs a writable file. Options:
   - Turso (SQLite-compatible edge database) -- easiest migration path
   - Postgres (Neon, Supabase) -- most conventional but requires more schema changes
   - PlanetScale (MySQL) -- would require significant schema changes

2. **`better-sqlite3` is a native Node addon.** It compiles C code during `npm install`. Vercel's serverless environment can run native addons, but:
   - `sqlite-vec` is also a native extension that loads a `.so`/`.dylib` at runtime
   - Both need to be compiled for the Vercel deployment target (Amazon Linux 2)
   - This is a non-trivial deployment challenge

3. **File-based photo storage in `public/photos/`.** Vercel's filesystem is ephemeral -- uploaded photos would be lost on redeployment. Need to migrate to:
   - Vercel Blob Storage
   - AWS S3 / Cloudflare R2
   - Any external object storage

4. **No build tested.** The `STRUCTURE.md` notes "Testing: Not yet implemented." There is no CI, no `npm run build` verification. The build might fail due to the missing better-sqlite3/sqlite-vec deps, TypeScript errors, or other issues.

### SQLite to Postgres Migration: What Breaks

| Component | Impact | Effort |
|-----------|--------|--------|
| Prisma schema `provider` | Change "sqlite" to "postgresql" | Trivial |
| All BigInt timestamp fields | Remove (Postgres DateTime handles milliseconds) | Low |
| FTS5 virtual table + triggers | Rewrite to Postgres `tsvector` + `GIN` index | High |
| vec0 virtual table | Rewrite to `pgvector` extension | High |
| `better-sqlite3` connection | Remove entirely, use Prisma for everything or pg-based vector lib | High |
| `lib/rag/db.ts` | Complete rewrite | High |
| `lib/rag/search.ts` | Rewrite FTS and vector queries for Postgres syntax | High |
| `lib/rag/ingest.ts` | Rewrite vec0 insert to pgvector insert | Medium |
| `CUID` IDs | Compatible with Postgres | None |
| JSON string metadata | Migrate to JSONB column | Low |
| `Bytes` embedding column | Migrate to `vector(512)` pgvector type | Medium |

**Estimated total migration effort: 3-5 sessions** focused solely on database migration, assuming familiarity with pgvector.

**Alternative: Turso migration** would preserve most SQLite-specific code (FTS5, potentially sqlite-vec via Turso extensions). Effort: 1-2 sessions. This is the recommended path for first deployment.

### Environment Variables and Secrets

- `.env.example` documents 4 keys (DATABASE_URL, ANTHROPIC_API_KEY, OPENAI_API_KEY, VOYAGE_API_KEY)
- No runtime validation that required keys exist (except voice transcription checks OPENAI_API_KEY)
- The Anthropic SDK silently fails or throws if the key is missing -- no graceful degradation
- No `.env.local` in `.gitignore` check performed (assumed standard Next.js gitignore covers it)

### Recommendation
**For first deployment:** Use Turso (SQLite edge) + Vercel Blob for photos. This minimizes migration effort while getting the app online. Postgres migration can happen later if needed for scale or pgvector features.

---

## 6. Technical Debt Map (Ranked)

| # | Debt Item | Why It Matters | Effort | Risk If Not Fixed |
|---|-----------|---------------|--------|-------------------|
| 1 | **Missing better-sqlite3 + sqlite-vec in package.json** | RAG search, knowledge tool, and recommend tool are broken at runtime. Two of 12 agent tools will crash. | 15 min | **CRITICAL** -- chat agent is partially broken |
| 2 | **No Claude JSON response validation (Phase 1 skipped)** | Packing list and meal plan generation can crash on malformed LLM output. No Zod schemas, no try-catch around JSON.parse. | 2-3 hours | HIGH -- user-facing errors on AI features |
| 3 | **Dual SQLite connection pattern (Prisma + better-sqlite3)** | FTS5 and vec0 tables exist outside Prisma's migration system. Schema resets lose them. Blocks clean Postgres migration. | 2-3 sessions to resolve fully | HIGH -- migration blocker, operational fragility |
| 4 | **No test suite** | Zero tests across 14+ models, 12 tools, 3 AI features, and a streaming chat route. Any refactor is blind. | 3-5 sessions for baseline coverage | HIGH -- compounds every future change |
| 5 | **Photo storage in public/ filesystem** | Photos lost on Vercel deploy. No backup strategy. | 1 session | HIGH -- data loss on deployment |
| 6 | **No cost monitoring for AI APIs** | Three paid APIs (Anthropic, OpenAI, Voyage) with no usage tracking or alerting. A bug or prompt injection could spike costs. | 1-2 hours | MEDIUM -- financial risk |
| 7 | **Dead code: ALL_TOOLS + legacy executeTool** | Confusing dual registries in tools/index.ts. Legacy pattern from Plan 01 still exported. | 30 min | LOW -- confusion, not breakage |
| 8 | **Unused buildSystemPrompt function** | Dynamic system prompt builder exists but chat route uses static prompt. Misleading for future developers. | 30 min (remove or wire up) | LOW |
| 9 | **Missing orphan protection on Photo/Trip FKs** | Deleting a Location referenced by Photos or Trips has undefined behavior. | 1 hour | MEDIUM -- data integrity on delete |
| 10 | **No URL state for filters** | Gear/trip filter state lost on navigation. Minor UX friction. | 2-3 hours | LOW -- UX annoyance |
| 11 | **BigInt timestamp fields (Timeline models)** | Redundant with DateTime fields. SQLite workaround that adds schema noise. | 1 hour + migration | LOW -- cleanup, no functional impact |
| 12 | **Rate limiting hardcoded for Voyage free tier** | 21-second delays baked into ingest.ts. Upgrading to paid tier requires code changes. | 30 min | LOW -- only affects ingestion speed |

---

## Migration Readiness Checklist

### Before First Deployment

- [ ] Install missing dependencies: `npm install better-sqlite3 sqlite-vec @types/better-sqlite3`
- [ ] Add both to `package.json` dependencies
- [ ] Run `npm run build` and fix any build errors
- [ ] Add Zod validation to `generatePackingList` and `generateMealPlan` JSON parsing
- [ ] Add explicit `onDelete: SetNull` to Photo.locationId, Photo.tripId, Trip.locationId, Trip.vehicleId
- [ ] Add startup validation for required environment variables (ANTHROPIC_API_KEY, DATABASE_URL)
- [ ] Test all 12 agent tools end-to-end
- [ ] Verify FTS5 triggers and vec0 table survive a `prisma migrate reset`

### For Vercel Deployment (Turso Path)

- [ ] Set up Turso database and migrate schema
- [ ] Verify FTS5 and sqlite-vec extension availability in Turso
- [ ] Replace `file:./dev.db` with Turso connection URL
- [ ] Replace `public/photos/` with Vercel Blob or S3
- [ ] Update photo upload/serve routes for remote storage
- [ ] Update `better-sqlite3` connection to use Turso's `@libsql/client`
- [ ] Add `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` to env
- [ ] Run full end-to-end test on deployed instance

### For Postgres Migration (Alternative Path)

- [ ] Change Prisma provider to `postgresql`
- [ ] Remove all BigInt timestamp fields from timeline models
- [ ] Install and configure `pgvector` extension
- [ ] Rewrite `lib/rag/db.ts` to use Prisma or pg client for vector ops
- [ ] Rewrite FTS5 queries to use Postgres `tsvector` + `GIN` index
- [ ] Rewrite `lib/rag/search.ts` for Postgres query syntax
- [ ] Migrate `KnowledgeChunk.embedding` from `Bytes` to `vector(512)`
- [ ] Migrate `KnowledgeChunk.metadata` from `String` to `Json` (JSONB)
- [ ] Re-run all ingestion to populate pgvector index
- [ ] Verify hybrid search quality matches SQLite implementation

---

## Recommendations for Next Milestone

### Immediate (Before Building New Features)

1. **Fix the broken dependencies.** This is 15 minutes of work that unblocks RAG and recommendations.
2. **Execute Phase 1 (Validation).** It was skipped but its requirements are still valid: Zod parsing, edge case handling, and the `parseClaudeJSON<T>` utility. Every AI feature is fragile without it.
3. **Add basic cost logging.** Even just `console.log` of estimated tokens per chat message gives visibility into spend.

### For Milestone 2

4. **Decide on Turso vs Postgres early.** This decision affects every database-touching feature going forward. Turso is the path of least resistance. Postgres is the more conventional long-term choice. Don't build more SQLite-specific features until this is decided.
5. **Start a minimal test suite.** Focus on the agent tools -- they are the highest-risk, most-changed code. A test for each of the 12 tools that verifies the executor returns valid JSON would catch regressions.
6. **Photo storage migration.** Move to object storage before deployment. This is a one-time effort that unblocks going live.

### Architecture Notes for Will

The codebase is in surprisingly good shape for a learning project at this stage. The agent tool pattern is clean and extensible. The RAG pipeline uses proper techniques (RRF, FTS5+vector hybrid). The streaming chat implementation is well-structured.

The main risks are all around the **edges** -- the boundary between Prisma and raw SQLite, the boundary between Node.js and native extensions, and the boundary between development and production environments. The core application logic is sound.

The biggest decision ahead is the database migration strategy. Every session that adds more SQLite-specific code (FTS5 queries, vec0 operations) deepens the migration cost. If deployment is a priority, make the database decision first.

---

*Review completed: 2026-04-01*
