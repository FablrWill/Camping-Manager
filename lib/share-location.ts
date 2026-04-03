import { randomBytes } from 'crypto';
import type { PrismaClient } from '@prisma/client';

// ---------------------------------------------------------------------------
// Slug generation
// ---------------------------------------------------------------------------

/**
 * Generates an 11-character URL-safe base64url slug for a shared location.
 * Uses 8 random bytes → 11 base64url characters (no padding).
 */
export function generateSlug(): string {
  return randomBytes(8).toString('base64url');
}

// ---------------------------------------------------------------------------
// Human-readable elapsed time
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable "time ago" string for a given date.
 * Used to display how recently the shared location was updated.
 */
export function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

// ---------------------------------------------------------------------------
// Prisma client subset type
// ---------------------------------------------------------------------------

type SharedLocationClient = Pick<PrismaClient, 'sharedLocation'>;

// ---------------------------------------------------------------------------
// Upsert logic (singleton — one shared location at a time)
// ---------------------------------------------------------------------------

interface UpsertData {
  lat: number;
  lon: number;
  label: string | null;
}

interface SharedLocationResult {
  id: string;
  slug: string;
  lat: number;
  lon: number;
  label: string | null;
  updatedAt: Date;
  createdAt: Date;
}

/**
 * Creates or updates the single SharedLocation row.
 * The app supports only one shared location at a time (singleton pattern).
 * If a row exists, updates lat/lon/label in place — slug never changes.
 * If no row exists, creates a new one with a fresh slug.
 */
export async function upsertSharedLocation(
  prismaClient: SharedLocationClient,
  data: UpsertData
): Promise<SharedLocationResult> {
  const existing = await prismaClient.sharedLocation.findFirst();
  if (existing) {
    return prismaClient.sharedLocation.update({
      where: { id: existing.id },
      data: {
        lat: data.lat,
        lon: data.lon,
        label: data.label,
      },
    });
  }
  return prismaClient.sharedLocation.create({
    data: {
      slug: generateSlug(),
      lat: data.lat,
      lon: data.lon,
      label: data.label,
    },
  });
}

// ---------------------------------------------------------------------------
// Delete logic
// ---------------------------------------------------------------------------

interface DeleteResult {
  deleted: boolean;
}

/**
 * Deletes the SharedLocation row if it exists.
 * Idempotent — returns { deleted: false } if no row was found.
 */
export async function deleteSharedLocation(
  prismaClient: SharedLocationClient
): Promise<DeleteResult> {
  const existing = await prismaClient.sharedLocation.findFirst();
  if (!existing) return { deleted: false };
  await prismaClient.sharedLocation.delete({ where: { id: existing.id } });
  return { deleted: true };
}
