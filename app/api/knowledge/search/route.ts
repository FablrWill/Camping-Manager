import { NextResponse } from 'next/server';
import { hybridSearch } from '@/lib/rag/search';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { query, topK } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'query is required and must be a string' },
        { status: 400 }
      );
    }

    const results = await hybridSearch(query, topK ?? 10);

    return NextResponse.json({ results, count: results.length });
  } catch (error) {
    console.error('Knowledge search failed:', error);
    return NextResponse.json(
      { error: 'Knowledge search failed' },
      { status: 500 }
    );
  }
}
