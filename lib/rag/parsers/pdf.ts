import pdfParse from 'pdf-parse';
import { readFileSync } from 'fs';
import { basename } from 'path';
import { encode } from 'gpt-tokenizer';
import { RawChunk, ChunkMetadata } from '../types';

/**
 * Estimate token count for a text string using GPT tokenizer.
 */
function estimateTokens(text: string): number {
  return encode(text).length;
}

/**
 * Parse a PDF file and split its text content into chunks of ~256-512 tokens.
 * Uses paragraph splitting (double newlines) to create natural chunk boundaries.
 */
export async function chunkPdf(filePath: string): Promise<RawChunk[]> {
  const buffer = readFileSync(filePath);
  const pdf = await pdfParse(buffer);

  const docTitle = pdf.info?.Title || basename(filePath, '.pdf').replace(/-/g, ' ');

  const metadata: ChunkMetadata = {
    topic: basename(filePath, '.pdf').replace(/-/g, ' '),
    category: 'external',
    confidence: 'official',
    verifyFlag: false,
  };

  // Split text on paragraph boundaries (double newlines)
  const paragraphs = pdf.text.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: RawChunk[] = [];
  let currentContent = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const cleaned = paragraph.replace(/\s+/g, ' ').trim();
    if (!cleaned) continue;

    const paraTokens = estimateTokens(cleaned);

    // If adding this paragraph would exceed 512 tokens, flush current chunk
    if (currentContent && currentTokens + paraTokens > 512) {
      chunks.push({
        title: docTitle,
        content: currentContent.trim(),
        source: filePath,
        metadata: { ...metadata },
        chunkIdx: chunks.length,
        tokenCount: currentTokens,
      });
      currentContent = '';
      currentTokens = 0;
    }

    currentContent += (currentContent ? '\n\n' : '') + cleaned;
    currentTokens += paraTokens;
  }

  // Flush remaining content
  if (currentContent.trim()) {
    chunks.push({
      title: docTitle,
      content: currentContent.trim(),
      source: filePath,
      metadata: { ...metadata },
      chunkIdx: chunks.length,
      tokenCount: currentTokens,
    });
  }

  return chunks;
}
