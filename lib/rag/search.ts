import { getVecDb } from './db';
import { embedTexts } from './embed';
import { SearchResult, RankedResult, ChunkMetadata } from './types';

/**
 * Escape FTS5 special characters and wrap each word in double quotes
 * for exact token matching. Prevents syntax errors from apostrophes
 * and special characters in camping location names.
 */
export function escapeFts5Query(query: string): string {
  // Remove FTS5 special characters that cause syntax errors
  const cleaned = query
    .replace(/[*()"':+\-^~]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  // Wrap each remaining word in double quotes for exact token matching
  return cleaned
    .split(' ')
    .filter((w) => w.length > 0)
    .map((w) => `"${w}"`)
    .join(' ');
}

/**
 * Full-text search using FTS5 index. Returns ranked results by BM25.
 */
function ftsSearch(query: string, topK: number): RankedResult[] {
  const db = getVecDb();
  const escaped = escapeFts5Query(query);
  if (!escaped.trim()) return [];

  const rows = db
    .prepare(
      `
    SELECT kc.id, kc.title, kc.content, kc.source, kc.metadata
    FROM knowledge_chunks_fts fts
    JOIN KnowledgeChunk kc ON kc.id = fts.id
    WHERE knowledge_chunks_fts MATCH ?
    ORDER BY rank
    LIMIT ?
  `
    )
    .all(escaped, topK) as Array<{
    id: string;
    title: string;
    content: string;
    metadata: string;
  }>;

  return rows.map((r, idx) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    source: (r as { source?: string }).source ?? '',
    metadata: r.metadata,
    rank: idx + 1,
  }));
}

/**
 * Vector similarity search using vec0 index. Returns ranked results by distance.
 */
function vecSearch(queryEmbedding: Float32Array, topK: number): RankedResult[] {
  const db = getVecDb();

  const rows = db
    .prepare(
      `
    SELECT kc.id, kc.title, kc.content, kc.source, kc.metadata, vt.distance
    FROM vec_knowledge_chunks vt
    JOIN KnowledgeChunk kc ON kc.rowid = vt.rowid
    WHERE vt.embedding MATCH ?
    AND k = ?
    ORDER BY vt.distance
  `
    )
    .all(queryEmbedding, topK) as Array<{
    id: string;
    title: string;
    content: string;
    metadata: string;
    distance: number;
  }>;

  return rows.map((r, idx) => ({
    id: r.id,
    title: r.title,
    content: r.content,
    source: (r as { source?: string }).source ?? '',
    metadata: r.metadata,
    rank: idx + 1,
  }));
}

/**
 * Merge FTS5 and vec0 results using Reciprocal Rank Fusion (RRF).
 * RRF score = sum of 1/(k + rank) across retrieval methods.
 * k=60 is the standard smoothing constant from the RRF paper.
 */
function mergeRRF(
  ftsResults: RankedResult[],
  vecResults: RankedResult[],
  k: number = 60
): SearchResult[] {
  const scores = new Map<string, number>();
  const resultData = new Map<string, RankedResult>();

  // Score FTS5 results
  for (let idx = 0; idx < ftsResults.length; idx++) {
    const r = ftsResults[idx];
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (k + idx + 1));
    if (!resultData.has(r.id)) resultData.set(r.id, r);
  }

  // Score vec0 results
  for (let idx = 0; idx < vecResults.length; idx++) {
    const r = vecResults[idx];
    scores.set(r.id, (scores.get(r.id) ?? 0) + 1 / (k + idx + 1));
    if (!resultData.has(r.id)) resultData.set(r.id, r);
  }

  // Sort by descending RRF score
  const sorted = [...scores.entries()].sort((a, b) => b[1] - a[1]);

  // Map to SearchResult with parsed metadata
  return sorted.map(([id, score]) => {
    const data = resultData.get(id)!;
    let metadata: ChunkMetadata;
    try {
      metadata = JSON.parse(data.metadata) as ChunkMetadata;
    } catch {
      metadata = { verifyFlag: false };
    }

    return {
      id,
      title: data.title,
      content: data.content,
      source: data.source,
      metadata,
      score,
    };
  });
}

/**
 * Hybrid search combining FTS5 keyword search and vec0 vector similarity,
 * merged via Reciprocal Rank Fusion (RRF, k=60).
 */
export async function hybridSearch(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  const [queryEmb] = await embedTexts([query]);

  const [ftsResults, vecResults] = await Promise.all([
    Promise.resolve(ftsSearch(query, topK * 2)),
    Promise.resolve(vecSearch(queryEmb, topK * 2)),
  ]);

  return mergeRRF(ftsResults, vecResults).slice(0, topK);
}

/**
 * Vector-only search for comparison with hybrid.
 * Used by the validation script to demonstrate hybrid outperforms vector-only.
 */
export async function vectorOnlySearch(
  query: string,
  topK: number = 10
): Promise<SearchResult[]> {
  const [queryEmb] = await embedTexts([query]);
  const results = vecSearch(queryEmb, topK);

  return results.map((r) => {
    let metadata: ChunkMetadata;
    try {
      metadata = JSON.parse(r.metadata) as ChunkMetadata;
    } catch {
      metadata = { verifyFlag: false };
    }

    return {
      id: r.id,
      title: r.title,
      content: r.content,
      source: r.source,
      metadata,
      score: 1 / (60 + r.rank),
    };
  });
}
