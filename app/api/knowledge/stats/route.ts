import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { SOURCES } from '@/lib/rag/sources';

export async function GET(): Promise<NextResponse> {
  try {
    const [chunkCount, latestRefresh] = await Promise.all([
      prisma.knowledgeChunk.count(),
      prisma.knowledgeChunk.findFirst({
        orderBy: { refreshedAt: 'desc' },
        select: { refreshedAt: true },
      }),
    ]);

    return NextResponse.json({
      chunkCount,
      lastRefreshed: latestRefresh?.refreshedAt?.toISOString() ?? null,
      sourceCount: SOURCES.length,
    });
  } catch (error) {
    console.error('Failed to fetch knowledge stats:', error);
    return NextResponse.json({ error: 'Failed to fetch knowledge stats' }, { status: 500 });
  }
}
