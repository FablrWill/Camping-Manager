import { encode } from 'gpt-tokenizer'
import { RawChunk, ChunkMetadata } from './types'

/**
 * Split plain text into ~512-token chunks at paragraph boundaries.
 * Used for ingesting screenshots, notes, and other non-URL content.
 */
export function chunkPlainText(
  text: string,
  title: string,
  source: string,
  metadata: Partial<ChunkMetadata> = {}
): RawChunk[] {
  const base: ChunkMetadata = {
    topic: title,
    category: 'external',
    confidence: 'official',
    verifyFlag: true,
    ...metadata,
  }

  const paragraphs = text
    .split(/\n\n+/)
    .map((p) => p.replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 20)

  const chunks: RawChunk[] = []
  let current = ''
  let currentTokens = 0

  for (const para of paragraphs) {
    const tokens = encode(para).length

    if (current && currentTokens + tokens > 512) {
      chunks.push({
        title,
        content: current.trim(),
        source,
        metadata: { ...base },
        chunkIdx: chunks.length,
        tokenCount: currentTokens,
      })
      current = ''
      currentTokens = 0
    }

    current += (current ? '\n\n' : '') + para
    currentTokens += tokens
  }

  if (current.trim() && currentTokens >= 10) {
    chunks.push({
      title,
      content: current.trim(),
      source,
      metadata: { ...base },
      chunkIdx: chunks.length,
      tokenCount: currentTokens,
    })
  }

  return chunks
}
