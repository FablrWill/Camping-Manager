import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const item = await prisma.inboxItem.findUnique({ where: { id } });
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  } catch (error) {
    console.error('GET /api/inbox/[id] error:', error);
    return NextResponse.json({ error: 'Failed to fetch inbox item' }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.inboxItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('DELETE /api/inbox/[id] error:', error);
    return NextResponse.json({ error: 'Failed to delete inbox item' }, { status: 500 });
  }
}
