#!/usr/bin/env tsx
/**
 * refresh-corpus.ts — Standalone corpus refresh script for the Mac mini.
 *
 * Fetches each registered source, computes SHA-256 hashes, and only re-embeds
 * chunks that have changed. This keeps Voyage free-tier API calls minimal.
 *
 * Usage:
 *   tsx scripts/refresh-corpus.ts
 *
 * Environment (required):
 *   DATABASE_URL    — SQLite connection string (e.g. file:/path/to/dev.db)
 *   VOYAGE_API_KEY  — Voyage AI embedding API key
 *
 * Exit codes:
 *   0 — all sources processed (some may have been skipped/failed; check logs)
 *   1 — fatal startup error (missing env var) or all sources failed
 */

import { createHash } from 'crypto';
import { SOURCES } from '../lib/rag/sources';
import { prisma } from '../lib/db';
import { getVecDb, closeVecDb } from '../lib/rag/db';
import { ingestChunks } from '../lib/rag/ingest';
import { chunkRssFeed } from '../lib/rag/parsers/rss';
import { chunkWebPage } from '../lib/rag/parsers/web';
import type { RawChunk } from '../lib/rag/types';

// ─── Startup checks ───────────────────────────────────────────────────

if (!process.env.VOYAGE_API_KEY) {
  console.error('[refresh-corpus] VOYAGE_API_KEY is required — set it in your environment or .env file');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('[refresh-corpus] DATABASE_URL is required — set it in your environment or .env file');
  process.exit(1);
}

// ─── Helpers ─────────────────────────────────────────────────────────

function sha256(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

/** Parse robots.txt content and return a set of disallowed path prefixes for User-agent: * */
function parseRobotsDisallowed(robotsTxt: string): string[] {
  const disallowed: string[] = [];
  let inWildcardSection = false;

  for (const rawLine of robotsTxt.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    if (line.toLowerCase().startsWith('user-agent:')) {
      const agent = line.slice('user-agent:'.length).trim();
      inWildcardSection = agent === '*';
    } else if (inWildcardSection && line.toLowerCase().startsWith('disallow:')) {
      const path = line.slice('disallow:'.length).trim();
      if (path) disallowed.push(path);
    }
  }

  return disallowed;
}

/** Check robots.txt for a given URL. Returns true if the path is allowed. */
async function isAllowedByRobots(
  url: string,
  robotsCache: Map<string, string[]>
): Promise<boolean> {
  try {
    const parsed = new URL(url);
    const origin = parsed.origin;

    if (!robotsCache.has(origin)) {
      const robotsUrl = `${origin}/robots.txt`;
      const res = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'OutlandOS/1.0' },
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        // No robots.txt or unreachable — assume allowed
        robotsCache.set(origin, []);
      } else {
        const txt = await res.text();
        robotsCache.set(origin, parseRobotsDisallowed(txt));
      }
    }

    const disallowed = robotsCache.get(origin) ?? [];
    const urlPath = parsed.pathname + parsed.search;

    for (const prefix of disallowed) {
      if (prefix === '/' || urlPath.startsWith(prefix)) {
        return false;
      }
    }
    return true;
  } catch {
    // If robots.txt check fails, err on the side of caution — allow the fetch
    return true;
  }
}

/**
 * Delete vec0 rows for a source BEFORE deleting Prisma rows.
 * Pitfall: vec0 uses SQLite rowids that point to the main table rows.
 * If you delete Prisma rows first, the rowids are gone and you can't clean vec0.
 */
async function deleteSourceFromVec0(sourceUrl: string): Promise<void> {
  const vecDb = await getVecDb();

  // Get the SQLite rowids for all chunks from this source
  const rows = vecDb
    .prepare('SELECT rowid FROM KnowledgeChunk WHERE source = ?')
    .all(sourceUrl) as Array<{ rowid: number }>;

  if (rows.length === 0) return;

  // Delete from vec0 virtual table first
  const deleteStmt = vecDb.prepare('DELETE FROM vec_knowledge_chunks WHERE rowid = ?');
  for (const row of rows) {
    deleteStmt.run(BigInt(row.rowid));
  }
}

// ─── Main ─────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log(`[refresh-corpus] Starting — ${SOURCES.length} source(s) registered`);

  const robotsCache = new Map<string, string[]>();
  let successCount = 0;
  let skipCount = 0;
  let failCount = 0;

  for (const source of SOURCES) {
    console.log(`[refresh-corpus] Processing: ${source.name} (${source.url})`);

    try {
      // 1. Check robots.txt
      const allowed = await isAllowedByRobots(source.url, robotsCache);
      if (!allowed) {
        console.warn(`[refresh-corpus] Skipped (robots.txt disallows): ${source.url}`);
        skipCount++;
        continue;
      }

      // 2. Fetch and chunk the source
      let chunks: RawChunk[];
      if (source.type === 'rss') {
        chunks = await chunkRssFeed(source.url);
      } else {
        chunks = await chunkWebPage(source.url);
      }

      if (chunks.length === 0) {
        console.warn(`[refresh-corpus] No chunks extracted from: ${source.url}`);
        skipCount++;
        continue;
      }

      // 3. Hash each chunk and compare with stored hashes
      const existing = await prisma.knowledgeChunk.findMany({
        where: { source: source.url },
        select: { id: true, contentHash: true, chunkIdx: true },
      });

      const existingHashByIdx = new Map<number, string | null>(
        existing.map((r) => [r.chunkIdx, r.contentHash])
      );

      const changedChunks = chunks.filter((chunk) => {
        const hash = sha256(chunk.content);
        const storedHash = existingHashByIdx.get(chunk.chunkIdx);
        return storedHash !== hash; // null/undefined !== hash → include
      });

      if (changedChunks.length === 0) {
        console.log(`[refresh-corpus] No changes detected in: ${source.name} (${chunks.length} chunks)`);
        skipCount++;
        continue;
      }

      console.log(`[refresh-corpus] ${changedChunks.length}/${chunks.length} chunk(s) changed — re-ingesting: ${source.name}`);

      // 4. Clean up vec0 rows BEFORE deleting Prisma rows (orphan prevention)
      await deleteSourceFromVec0(source.url);

      // 5. Delete existing Prisma rows for this source
      await prisma.knowledgeChunk.deleteMany({ where: { source: source.url } });

      // 6. Re-ingest changed chunks (this embeds and inserts into both tables)
      await ingestChunks(changedChunks);

      // 7. Update contentHash and refreshedAt for the newly inserted chunks
      const refreshedAt = new Date();
      for (const chunk of changedChunks) {
        const hash = sha256(chunk.content);
        await prisma.knowledgeChunk.updateMany({
          where: { source: source.url, chunkIdx: chunk.chunkIdx },
          data: { contentHash: hash, refreshedAt },
        });
      }

      console.log(`[refresh-corpus] Completed: ${source.name} — ${changedChunks.length} chunk(s) updated`);
      successCount++;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`[refresh-corpus] Failed: ${source.name} — ${message}`);
      failCount++;
      // Continue to next source — partial refreshes are acceptable
    }
  }

  console.log(`[refresh-corpus] Done — ${successCount} updated, ${skipCount} skipped, ${failCount} failed`);

  // Cleanup
  closeVecDb();
  await prisma.$disconnect();

  if (failCount > 0 && successCount === 0 && skipCount === 0) {
    // All sources failed — signal error to caller
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[refresh-corpus] Fatal error:', err instanceof Error ? err.message : String(err));
  closeVecDb();
  prisma.$disconnect().finally(() => process.exit(1));
});
