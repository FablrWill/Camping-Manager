import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { getDocsDir } from '@/lib/paths';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; docId: string }> }
) {
  try {
    const { docId } = await params;
    const doc = await prisma.gearDocument.findUnique({ where: { id: docId } });

    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    if (doc.localPath) {
      return NextResponse.json({ error: 'PDF already downloaded' }, { status: 400 });
    }

    // Fetch the PDF from the remote URL
    const response = await fetch(doc.url);
    if (!response.ok) {
      return NextResponse.json(
        { error: `Failed to fetch PDF: HTTP ${response.status}` },
        { status: 502 }
      );
    }

    // Validate content-type — reject HTML error pages masquerading as PDFs
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/pdf') && !contentType.includes('application/octet-stream')) {
      return NextResponse.json(
        { error: `URL did not return a PDF (content-type: ${contentType})` },
        { status: 422 }
      );
    }

    // Save to docs directory using getDocsDir() (mirrors getPhotosDir pattern)
    const filename = `${randomUUID()}.pdf`;
    const docsDir = getDocsDir();
    await mkdir(docsDir, { recursive: true });
    const filepath = join(docsDir, filename);
    const buffer = Buffer.from(await response.arrayBuffer());
    await writeFile(filepath, buffer);

    // Update document with local path
    const localPath = `/docs/${filename}`;
    const updated = await prisma.gearDocument.update({
      where: { id: docId },
      data: { localPath },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Failed to download PDF:', error);
    return NextResponse.json({ error: 'Failed to download PDF' }, { status: 500 });
  }
}
