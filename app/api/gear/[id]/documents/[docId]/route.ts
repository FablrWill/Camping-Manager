import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDocsDir } from '@/lib/paths';
import { unlink } from 'fs/promises';
import { join, basename } from 'path';

// PATCH /api/gear/:id/documents/:docId — update document title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const body = await request.json();

    if (!body.title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const document = await prisma.gearDocument.update({
      where: { id: docId },
      data: { title: body.title },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error('Failed to update gear document:', error);
    return NextResponse.json({ error: 'Failed to update gear document' }, { status: 500 });
  }
}

// DELETE /api/gear/:id/documents/:docId — delete a document and its local PDF file if any
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const document = await prisma.gearDocument.findUnique({ where: { id: docId } });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete local PDF file if it was downloaded
    if (document.localPath) {
      try {
        const filepath = join(getDocsDir(), basename(document.localPath));
        await unlink(filepath);
      } catch {
        // File may already be gone — log but don't block the DB delete
        console.error('Failed to delete local PDF file for document:', docId);
      }
    }

    await prisma.gearDocument.delete({ where: { id: docId } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete gear document:', error);
    return NextResponse.json({ error: 'Failed to delete gear document' }, { status: 500 });
  }
}
