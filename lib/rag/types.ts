/** Metadata stored as JSON string in KnowledgeChunk.metadata */
export interface ChunkMetadata {
  topic?: string;
  region?: string;
  category?: string;
  confidence?: string;
  verifyFlag: boolean; // true if chunk contains "⚠️ VERIFY CURRENT STATUS"
}

/** Raw chunk before embedding — output of the chunking step */
export interface RawChunk {
  title: string;
  content: string;
  source: string;
  metadata: ChunkMetadata;
  chunkIdx: number;
  tokenCount: number;
}

/** Row from KnowledgeChunk table (Prisma shape) */
export interface KnowledgeChunkRow {
  id: string;
  source: string;
  title: string;
  content: string;
  embedding: Buffer;
  metadata: string; // JSON string of ChunkMetadata
  chunkIdx: number;
  tokenCount: number;
  createdAt: Date;
}

/** Search result returned from hybrid search */
export interface SearchResult {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata: ChunkMetadata;
  score: number; // RRF combined score
}

/** Result from a single retrieval method (FTS5 or vec0) before merge */
export interface RankedResult {
  id: string;
  title: string;
  content: string;
  source: string;
  metadata: string; // JSON string
  rank: number; // 1-based position
}
