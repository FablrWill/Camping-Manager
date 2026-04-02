import { readFileSync } from 'fs';
import { extname } from 'path';
import matter from 'gray-matter';
import { encode } from 'gpt-tokenizer';
import { RawChunk, ChunkMetadata } from './types';
import { prisma } from '@/lib/db';
import { getVecDb } from './db';
import { embedTexts } from './embed';
import { chunkPdf } from './parsers/pdf';
import { chunkWebPage } from './parsers/web';

/**
 * Estimate token count for a text string using GPT tokenizer.
 */
export function estimateTokens(text: string): number {
  return encode(text).length;
}

/**
 * Split a long body text at paragraph boundaries into chunks of ~512 tokens max.
 */
function splitAtParagraphs(
  body: string,
  title: string,
  source: string,
  frontmatter: Record<string, string>,
  startIdx: number
): RawChunk[] {
  const paragraphs = body.split('\n\n').filter((p) => p.trim().length > 0);
  const chunks: RawChunk[] = [];
  let currentContent = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);

    // If adding this paragraph would exceed 512 tokens, flush current chunk
    if (currentContent && currentTokens + paraTokens > 512) {
      chunks.push({
        title,
        content: currentContent.trim(),
        source,
        metadata: buildMetadata(frontmatter, currentContent),
        chunkIdx: startIdx + chunks.length,
        tokenCount: currentTokens,
      });
      currentContent = '';
      currentTokens = 0;
    }

    currentContent += (currentContent ? '\n\n' : '') + paragraph;
    currentTokens += paraTokens;
  }

  // Flush remaining content
  if (currentContent.trim()) {
    chunks.push({
      title,
      content: currentContent.trim(),
      source,
      metadata: buildMetadata(frontmatter, currentContent),
      chunkIdx: startIdx + chunks.length,
      tokenCount: currentTokens,
    });
  }

  return chunks;
}

/**
 * Build ChunkMetadata from frontmatter and body content.
 */
function buildMetadata(
  fm: Record<string, string>,
  body: string
): ChunkMetadata {
  return {
    topic: fm.topic,
    region: fm.region,
    category: fm.category,
    confidence: fm.confidence,
    verifyFlag: body.includes('\u26A0\uFE0F VERIFY CURRENT STATUS'),
  };
}

/**
 * Chunk a markdown file by H2/H3 headings. Each section becomes one or more chunks.
 * Frontmatter is parsed with gray-matter and stored as metadata.
 */
export function chunkMarkdown(fileContent: string, filePath: string): RawChunk[] {
  const { data: fm, content } = matter(fileContent);

  // Split on H2/H3 headings (lookahead so heading stays with its section)
  const sections = content.split(/^(?=#{2,3}\s)/m).filter((s) => s.trim().length > 0);

  const chunks: RawChunk[] = [];
  let currentIdx = 0;

  for (const section of sections) {
    // Extract heading text
    const headingMatch = section.match(/^(#{2,3})\s+(.+)/);
    const title = headingMatch
      ? headingMatch[2].replace(/\*\*/g, '').trim()
      : (fm.topic as string) ?? 'Introduction';

    // Strip heading line from body
    const body = headingMatch
      ? section.replace(/^#{2,3}\s+.+\n?/, '').trim()
      : section.trim();

    // Skip sections with empty body
    if (!body) continue;

    const tokenCount = estimateTokens(body);

    // Skip sections that are too small (< 10 tokens)
    if (tokenCount < 10) {
      // Merge with previous chunk if possible
      if (chunks.length > 0) {
        const prev = chunks[chunks.length - 1];
        prev.content += '\n\n' + body;
        prev.tokenCount = estimateTokens(prev.content);
      }
      continue;
    }

    // If section is too large, split at paragraph boundaries
    if (tokenCount > 512) {
      const subChunks = splitAtParagraphs(body, title, filePath, fm, currentIdx);
      chunks.push(...subChunks);
      currentIdx += subChunks.length;
    } else {
      chunks.push({
        title,
        content: body,
        source: filePath,
        metadata: buildMetadata(fm, body),
        chunkIdx: currentIdx,
        tokenCount,
      });
      currentIdx++;
    }
  }

  return chunks;
}

/**
 * Read a file and chunk it based on file type.
 * Supports: .md (markdown), .pdf (PDF text extraction), http/https URLs (web scraping).
 */
export async function ingestFile(filePath: string): Promise<RawChunk[]> {
  // URL detection — route to web scraper
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return chunkWebPage(filePath);
  }

  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.md': {
      const content = readFileSync(filePath, 'utf-8');
      return chunkMarkdown(content, filePath);
    }
    case '.pdf':
      return chunkPdf(filePath);
    default:
      throw new Error(
        `Unsupported file type: .${ext}. Supported: .md, .pdf, or http/https URL`
      );
  }
}

/**
 * Ingest an array of RawChunks: embed them and write to both
 * KnowledgeChunk (Prisma) and vec_knowledge_chunks (vec0) tables.
 * Processes in batches of 20 for Voyage rate limits.
 */
export async function ingestChunks(
  chunks: RawChunk[]
): Promise<{ inserted: number }> {
  // Use smaller batches to stay under 10K TPM rate limit on free tier
  const BATCH_SIZE = 10;
  let totalInserted = 0;

  for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
    const batch = chunks.slice(i, i + BATCH_SIZE);

    // Get embeddings for batch
    const embeddings = await embedTexts(batch.map((c) => c.content));

    // Insert each chunk + embedding
    for (let j = 0; j < batch.length; j++) {
      const chunk = batch[j];
      const embedding = embeddings[j];

      // Insert into KnowledgeChunk via Prisma
      const row = await prisma.knowledgeChunk.create({
        data: {
          source: chunk.source,
          title: chunk.title,
          content: chunk.content,
          embedding: Buffer.from(embedding.buffer as ArrayBuffer),
          metadata: JSON.stringify(chunk.metadata),
          chunkIdx: chunk.chunkIdx,
          tokenCount: chunk.tokenCount,
        },
      });

      // Get the SQLite rowid for the just-inserted row
      const vecDb = await getVecDb();
      const rowIdResult = vecDb
        .prepare('SELECT rowid FROM KnowledgeChunk WHERE id = ?')
        .get(row.id) as { rowid: number };

      // Insert embedding into vec0 virtual table
      // vec0 requires BigInt for rowid with better-sqlite3
      vecDb
        .prepare(
          'INSERT INTO vec_knowledge_chunks(rowid, embedding) VALUES (?, ?)'
        )
        .run(BigInt(rowIdResult.rowid), Buffer.from(embedding.buffer));

      totalInserted++;
    }

    // Rate limit delay between batches
    // Voyage free tier: 3 RPM, so wait 21s between requests to stay safe
    if (i + BATCH_SIZE < chunks.length) {
      await new Promise((r) => setTimeout(r, 21000));
    }
  }

  return { inserted: totalInserted };
}
