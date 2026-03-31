import { SearchResult } from './types';

/**
 * Build a context string from search results for injection into a Claude prompt.
 * Format: numbered chunks with title, source, and content.
 * Includes a freshness warning if any chunk has verifyFlag: true.
 */
export function buildRagContext(
  results: SearchResult[],
  maxTokens: number = 4000
): string {
  let context = '## Relevant Knowledge Base Results\n\n';
  let estimatedTokens = 0;

  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const section =
      `### ${i + 1}. ${r.title}\n` +
      `**Source:** ${r.source}\n` +
      (r.metadata.verifyFlag
        ? '⚠️ Some data in this section may need freshness verification.\n'
        : '') +
      `\n${r.content}\n\n`;

    // Rough token estimate: ~4 chars per token
    const sectionTokens = Math.ceil(section.length / 4);
    if (estimatedTokens + sectionTokens > maxTokens) break;

    context += section;
    estimatedTokens += sectionTokens;
  }

  return context;
}
