import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { extractGps } from "@/lib/exif";
import sharp from "sharp";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const files = formData.getAll("photos") as File[];

  if (files.length === 0) {
    return NextResponse.json(
      { added: 0, skipped: 0, errors: ["No files provided"] },
      { status: 400 }
    );
  }

  const photosDir = join(process.cwd(), "public", "photos");
  await mkdir(photosDir, { recursive: true });

  let added = 0;
  let skipped = 0;
  const errors: string[] = [];

  for (const file of files) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const gps = extractGps(buffer);

      if (!gps) {
        skipped++;
        continue;
      }

      // Compress to ~100KB JPEG
      const id = randomUUID();
      const filename = `${id}.jpg`;
      const filepath = join(photosDir, filename);

      await sharp(buffer)
        .rotate() // auto-orient based on EXIF
        .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
        .jpeg({ quality: 75 })
        .toFile(filepath);

      // Clean up the title
      const title = file.name.replace(/\.[^.]+$/, "");

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

      added++;
    } catch (err) {
      errors.push(`Failed to process ${file.name}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return NextResponse.json({ added, skipped, errors });
}
