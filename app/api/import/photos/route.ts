import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import sharp from "sharp";
import { mkdir, readFile } from "fs/promises";
import { join, resolve } from "path";
import { randomUUID } from "crypto";
import { existsSync } from "fs";

interface TakeoutPhoto {
  title: string;
  lat: number | null;
  lon: number | null;
  altitude: number | null;
  timestamp: string;
  imagePath: string | null;
  googleUrl: string | null;
  locationSource: string | null;
  locationDescription: string | null;
  locationConfidence: string | null;
  visionApproximate: boolean;
  noGps: boolean;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { photos, takeoutRoot } = body as {
      photos: TakeoutPhoto[];
      takeoutRoot: string;
    };

    if (!photos || !Array.isArray(photos)) {
      return NextResponse.json(
        { error: "Expected { photos: [...], takeoutRoot: string }" },
        { status: 400 }
      );
    }

    const photosDir = join(process.cwd(), "public", "photos");
    await mkdir(photosDir, { recursive: true });

    let imported = 0;
    let skipped = 0;
    let noGpsImported = 0;
    const errors: string[] = [];

    for (const photo of photos) {
      try {
        // Try to copy and compress the image if imagePath exists
        let savedPath: string | null = null;

        if (photo.imagePath && takeoutRoot) {
          const resolvedRoot = resolve(takeoutRoot);
          const sourcePath = resolve(join(takeoutRoot, photo.imagePath));
          // Path traversal guard: resolved source must stay within takeoutRoot
          if (!sourcePath.startsWith(resolvedRoot + "/") && sourcePath !== resolvedRoot) {
            errors.push(`${photo.title}: Rejected — path outside takeout root`);
            skipped++;
            continue;
          }
          if (existsSync(sourcePath)) {
            const id = randomUUID();
            const filename = `${id}.jpg`;
            const destPath = join(photosDir, filename);

            try {
              const buffer = await readFile(sourcePath);
              await sharp(buffer)
                .rotate()
                .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
                .jpeg({ quality: 75 })
                .toFile(destPath);
              savedPath = `/photos/${filename}`;
            } catch {
              // HEIC or unsupported format — skip image, still save metadata
              savedPath = null;
            }
          }
        }

        // Skip if no image and no GPS — not useful on the map
        if (!savedPath && photo.noGps) {
          skipped++;
          continue;
        }

        await prisma.photo.create({
          data: {
            title: photo.title,
            latitude: photo.lat,
            longitude: photo.lon,
            altitude: photo.altitude,
            takenAt: photo.timestamp ? new Date(photo.timestamp) : null,
            imagePath: savedPath ?? "/photos/placeholder.jpg",
            locationSource: photo.locationSource,
            locationDescription: photo.locationDescription,
            locationConfidence: photo.locationConfidence,
            visionApproximate: photo.visionApproximate ?? false,
            googleUrl: photo.googleUrl,
          },
        });

        imported++;
        if (photo.noGps) noGpsImported++;
      } catch (err) {
        errors.push(
          `${photo.title}: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return NextResponse.json({
      imported,
      skipped,
      noGpsImported,
      errors: errors.slice(0, 20), // Cap error list
      total: photos.length,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Import failed" },
      { status: 500 }
    );
  }
}
