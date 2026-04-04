import * as cheerio from 'cheerio';
import { RawChunk, ChunkMetadata } from '../types';
import { estimateTokens } from '../ingest';

const MAX_CHUNK_TOKENS = 512;

/**
 * Split text at paragraph boundaries into chunks of at most MAX_CHUNK_TOKENS each.
 * Used when a single RSS item body exceeds the token limit.
 */
function splitItemAtParagraphs(
  text: string,
  title: string,
  source: string,
  metadata: ChunkMetadata,
  startIdx: number
): RawChunk[] {
  const paragraphs = text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: RawChunk[] = [];
  let currentContent = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const paraTokens = estimateTokens(paragraph);
    if (currentContent && currentTokens + paraTokens > MAX_CHUNK_TOKENS) {
      chunks.push({
        title,
        content: currentContent.trim(),
        source,
        metadata,
        chunkIdx: startIdx + chunks.length,
        tokenCount: currentTokens,
      });
      currentContent = '';
      currentTokens = 0;
    }
    currentContent += (currentContent ? '\n\n' : '') + paragraph;
    currentTokens += paraTokens;
  }

  if (currentContent.trim()) {
    chunks.push({
      title,
      content: currentContent.trim(),
      source,
      metadata,
      chunkIdx: startIdx + chunks.length,
      tokenCount: currentTokens,
    });
  }

  return chunks;
}

/**
 * Fetch an RSS/Atom feed and split each item into RawChunks.
 * Uses cheerio with xmlMode:true to parse XML correctly (prevents HTML entity
 * mangling and mis-parsing of self-closing tags).
 *
 * Each item becomes at least one chunk. Items exceeding MAX_CHUNK_TOKENS are
 * split at paragraph boundaries.
 */
export async function chunkRssFeed(url: string): Promise<RawChunk[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OutlandOS/1.0 (camping knowledge base)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch RSS feed ${url}: ${response.status} ${response.statusText}`);
  }

  const xml = await response.text();

  // MUST use xmlMode: true — HTML mode mangles XML self-closing tags and entities
  const $ = cheerio.load(xml, { xmlMode: true });

  const items = $('item');
  if (items.length === 0) {
    // Try Atom format fallback
    const entries = $('entry');
    if (entries.length === 0) {
      return [];
    }
  }

  const chunks: RawChunk[] = [];
  let chunkIdx = 0;

  items.each((_i, el) => {
    const itemTitle = $(el).find('title').first().text().trim() || 'Untitled';
    const description = $(el).find('description').first().text().trim();
    const pubDate = $(el).find('pubDate').first().text().trim();

    // Build chunk content: title + date + description
    const parts: string[] = [];
    if (itemTitle) parts.push(itemTitle);
    if (pubDate) parts.push(`Published: ${pubDate}`);
    if (description) parts.push(description);

    const content = parts.join('\n\n');
    if (!content || content.length < 10) return;

    const metadata: ChunkMetadata = {
      topic: itemTitle,
      category: 'external',
      confidence: 'official',
      verifyFlag: true,
    };

    const tokenCount = estimateTokens(content);

    if (tokenCount > MAX_CHUNK_TOKENS) {
      // Split oversized items at paragraph boundaries
      const subChunks = splitItemAtParagraphs(content, itemTitle, url, metadata, chunkIdx);
      chunks.push(...subChunks);
      chunkIdx += subChunks.length;
    } else {
      chunks.push({
        title: itemTitle,
        content,
        source: url,
        metadata,
        chunkIdx,
        tokenCount,
      });
      chunkIdx++;
    }
  });

  return chunks;
}
