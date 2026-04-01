import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { unlink } from 'fs/promises';
import path from 'path';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const photo = await prisma.photo.findUnique({ where: { id } });
    if (!photo) {
      return NextResponse.json({ error: 'Photo not found' }, { status: 404 });
    }

    // Delete file from disk first (best effort -- file may already be gone)
    if (photo.imagePath) {
      const filePath = path.join(process.cwd(), 'public', photo.imagePath);
      try {
        await unlink(filePath);
      } catch {
        // File may already be deleted or missing -- non-fatal
      }
    }

    await prisma.photo.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error('Failed to delete photo:', error);
    return NextResponse.json({ error: 'Failed to delete photo' }, { status: 500 });
  }
}
