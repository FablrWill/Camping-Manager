import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/gear/:id/documents — list documents for a gear item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const documents = await prisma.gearDocument.findMany({
      where: { gearItemId: id },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(documents);
  } catch (error) {
    console.error('Failed to fetch gear documents:', error);
    return NextResponse.json({ error: 'Failed to fetch gear documents' }, { status: 500 });
  }
}

// POST /api/gear/:id/documents — create a new document
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body.url || !body.title) {
      return NextResponse.json(
        { error: 'URL and title are required' },
        { status: 400 }
      );
    }

    const document = await prisma.gearDocument.create({
      data: {
        gearItemId: id,
        url: body.url,
        title: body.title,
        type: body.type || 'support_link',
      },
    });

    return NextResponse.json(document, { status: 201 });
  } catch (error) {
    console.error('Failed to create gear document:', error);
    return NextResponse.json({ error: 'Failed to create gear document' }, { status: 500 });
  }
}
