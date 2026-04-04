import { NextRequest } from 'next/server';
import { prisma } from '@/lib/db';
import { refreshMemorySummary } from '@/lib/agent/memory';

export const dynamic = 'force-dynamic';

/** GET /api/agent/memory — list all memory entries (excluding the internal summary row) */
export async function GET(): Promise<Response> {
  try {
    const memories = await prisma.agentMemory.findMany({
      where: { key: { not: '__summary__' } },
      orderBy: { updatedAt: 'desc' },
      select: { id: true, key: true, value: true, createdAt: true, updatedAt: true },
    });

    return Response.json({ memories });
  } catch (error) {
    console.error('Failed to fetch memories:', error);
    return Response.json({ error: 'Failed to fetch memories' }, { status: 500 });
  }
}

/** DELETE /api/agent/memory — clear all memory entries and reset the summary */
export async function DELETE(req: NextRequest): Promise<Response> {
  try {
    const body = await req.json().catch(() => ({})) as { id?: string };

    if (body.id) {
      // Delete a single memory entry by ID
      await prisma.agentMemory.delete({ where: { id: body.id } });

      // Refresh summary after deletion (fire-and-forget)
      refreshMemorySummary().catch((err: unknown) =>
        console.error('Memory summary refresh failed after delete:', err)
      );

      return Response.json({ success: true });
    }

    // Delete all memory entries (full clear)
    await prisma.agentMemory.deleteMany({});

    return Response.json({ success: true, cleared: true });
  } catch (error) {
    console.error('Failed to delete memory:', error);
    return Response.json({ error: 'Failed to delete memory' }, { status: 500 });
  }
}
