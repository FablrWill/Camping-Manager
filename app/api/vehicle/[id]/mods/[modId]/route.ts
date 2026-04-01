import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string; modId: string }> }
) {
  try {
    const { modId } = await params;
    await prisma.vehicleMod.delete({ where: { id: modId } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Mod not found' }, { status: 404 });
    }
    console.error('Failed to delete vehicle mod:', error);
    return NextResponse.json({ error: 'Failed to delete vehicle mod' }, { status: 500 });
  }
}
