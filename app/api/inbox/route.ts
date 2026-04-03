import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') ?? 'pending';

    const items = await prisma.inboxItem.findMany({
      where: { status },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error('GET /api/inbox error:', error);
    return NextResponse.json({ error: 'Failed to fetch inbox' }, { status: 500 });
  }
}
