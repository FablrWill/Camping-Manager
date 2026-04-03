import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const updated = await prisma.inboxItem.update({
      where: { id },
      data: { status: 'accepted' },
    });

    // Return the suggestion so the client can open the pre-filled form
    let suggestion: Record<string, unknown> = {};
    try {
      suggestion = JSON.parse(item.suggestion ?? '{}');
    } catch {
      // non-fatal parse failure — return empty suggestion
    }

    return NextResponse.json({
      item: updated,
      triageType: item.triageType,
      suggestion,
    });
  } catch (error) {
    console.error('POST /api/inbox/[id]/accept error:', error);
    return NextResponse.json({ error: 'Failed to accept inbox item' }, { status: 500 });
  }
}
