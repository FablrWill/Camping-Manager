import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { extractGps } from '@/lib/exif';
import { getPhotosDir } from '@/lib/paths';
import sharp from 'sharp';
import { mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('photo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const gps = extractGps(buffer);

    if (!gps) {
      return NextResponse.json({ added: 0, skipped: 1, errors: [] });
    }

    const id = randomUUID();
    const filename = `${id}.jpg`;
    const photosDir = getPhotosDir();
    await mkdir(photosDir, { recursive: true });

    await sharp(buffer)
      .rotate()
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 75 })
      .toFile(join(photosDir, filename));

    const title = file.name.replace(/\.[^.]+$/, '');

    await prisma.photo.create({
      data: {
        title,
        latitude: gps.latitude,
        longitude: gps.longitude,
        altitude: gps.altitude,
        takenAt: gps.takenAt,
        imagePath: `/photos/${filename}`,
      },
    });

    return NextResponse.json({ added: 1, skipped: 0, errors: [] });
  } catch (error) {
    console.error('Failed to process photo in bulk import:', error);
    return NextResponse.json(
      {
        added: 0,
        skipped: 0,
        errors: [error instanceof Error ? error.message : 'Unknown error'],
      },
      { status: 200 }
    );
  }
}
