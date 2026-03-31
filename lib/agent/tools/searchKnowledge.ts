import { hybridSearch } from '@/lib/rag/search';
import { buildRagContext } from '@/lib/rag/context';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const searchKnowledgeTool: Tool = {
  name: 'search_knowledge_base',
  description: 'Search NC camping knowledge base for spots, regulations, gear tips, and local info.',
  input_schema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'Search query — be specific about location names, seasons, or activity types',
      },
      topK: {
        type: 'number',
        description: 'Number of results to return (default 5, max 10)',
      },
    },
    required: ['query'],
  },
};

export async function executeSearchKnowledge(input: { query: string; topK?: number }): Promise<string> {
  try {
    const results = await hybridSearch(input.query, Math.min(input.topK ?? 5, 10));
    return buildRagContext(results, 2000);
  } catch (error) {
    return `Error: Failed to search knowledge base — ${(error as Error).message}`;
  }
}
