import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import * as path from 'path';
import { prisma } from '@/lib/db';
import { triageInput } from '@/lib/intake/triage';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const text = formData.get('text') as string | null;
    const url = formData.get('url') as string | null;
    const file = formData.get('file') as File | null;

    if (!text && !url && !file) {
      return NextResponse.json({ error: 'Provide text, url, or file' }, { status: 400 });
    }

    let imagePath: string | undefined;

    if (file) {
      const uploadsDir = path.join(process.cwd(), 'public', 'inbox');
      await mkdir(uploadsDir, { recursive: true });
      const ext = path.extname(file.name) || '.jpg';
      const filename = `${Date.now()}${ext}`;
      const filePath = path.join(uploadsDir, filename);
      const bytes = await file.arrayBuffer();
      await writeFile(filePath, Buffer.from(bytes));
      imagePath = filePath;
    }

    const result = await triageInput({
      text: text ?? undefined,
      url: url ?? undefined,
      imagePath,
    });

    const item = await prisma.inboxItem.create({
      data: {
        sourceType: result.sourceType,
        rawContent: result.rawContent,
        triageType: result.triageType,
        suggestion: result.suggestion,
        summary: result.summary,
        confidence: result.confidence,
        imagePath: result.imagePath ?? null,
        processedAt: new Date(),
      },
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('POST /api/intake error:', error);
    return NextResponse.json({ error: 'Intake failed' }, { status: 500 });
  }
}
