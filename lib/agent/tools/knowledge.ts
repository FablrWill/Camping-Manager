import { hybridSearch } from '@/lib/rag/search';
import type { Tool } from '@anthropic-ai/sdk/resources/messages';

export const knowledgeTool: Tool = {
  name: 'search_knowledge',
  description: 'Search the NC camping knowledge base using hybrid retrieval (keyword + semantic). Use for questions about specific locations, regulations, seasonal conditions, permit requirements, trail info, or camping tips. Returns the most relevant chunks from the knowledge corpus.',
  input_schema: {
    type: 'object',
    properties: {
      query: { type: 'string', description: 'The search query — be specific about location names, seasons, or activity types' },
      topK: { type: 'number', description: 'Number of results to return (default 5, max 10)' },
    },
    required: ['query'],
  },
};

export async function executeKnowledgeTool(input: { query: string; topK?: number }) {
  const topK = Math.min(input.topK ?? 5, 10);
  const results = await hybridSearch(input.query, topK);

  return {
    query: input.query,
    resultCount: results.length,
    results: results.map((r) => ({
      title: r.title,
      content: r.content,
      source: r.source,
      score: r.score,
      verifyFlag: r.metadata.verifyFlag,
    })),
  };
}
