// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// Mock named export: route uses `import { prisma } from '@/lib/db'`
vi.mock('@/lib/db', () => ({
  prisma: {
    photo: {
      create: vi.fn().mockResolvedValue({ id: 'test-id' }),
    },
  },
}));

vi.mock('@/lib/exif', () => ({
  extractGps: vi.fn(),
}));

vi.mock('@/lib/paths', () => ({
  getPhotosDir: vi.fn().mockReturnValue('/tmp/test-photos'),
}));

// Sharp mock — default export is a function returning chainable builder
vi.mock('sharp', () => {
  const makeInstance = () => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  });
  return { default: vi.fn().mockImplementation(makeInstance) };
});

vi.mock('fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('fs/promises')>();
  return {
    ...actual,
    mkdir: vi.fn().mockResolvedValue(undefined),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

import { POST } from '@/app/api/photos/bulk-import/route';
import { extractGps } from '@/lib/exif';
import { prisma } from '@/lib/db';
import sharpModule from 'sharp';

function buildRequest(filename: string, buffer: Buffer): NextRequest {
  const fd = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  fd.append('photo', blob, filename);
  return new NextRequest('http://localhost/api/photos/bulk-import', {
    method: 'POST',
    body: fd,
  });
}

describe('bulk-import endpoint', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Restore prisma.photo.create mock after clearAllMocks
    vi.mocked(prisma.photo.create).mockResolvedValue({ id: 'test-id' } as unknown as Awaited<ReturnType<typeof prisma.photo.create>>);
    // Restore default sharp mock implementation after clearAllMocks
    vi.mocked(sharpModule).mockImplementation(() => ({
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockResolvedValue(undefined),
    }) as unknown as ReturnType<typeof sharpModule>);
  });

  it('processes valid JPEG: extractGps + sharp + prisma.create', async () => {
    vi.mocked(extractGps).mockReturnValue({
      latitude: 35.5,
      longitude: -82.5,
      altitude: null,
      takenAt: null,
    });

    const request = buildRequest('test-photo.jpg', Buffer.from('fake-jpeg-data'));
    const response = await POST(request);
    const data = await response.json();

    expect(data.added).toBe(1);
    expect(data.skipped).toBe(0);
    expect(data.errors).toHaveLength(0);
    expect(prisma.photo.create).toHaveBeenCalledTimes(1);
  });

  it('returns skipped when extractGps returns null (no GPS)', async () => {
    vi.mocked(extractGps).mockReturnValue(null);

    const request = buildRequest('no-gps.jpg', Buffer.from('fake-jpeg-data'));
    const response = await POST(request);
    const data = await response.json();

    expect(data).toEqual({ added: 0, skipped: 1, errors: [] });
    expect(prisma.photo.create).not.toHaveBeenCalled();
  });

  it('isolates per-file error: sharp failure returns 200 with error message', async () => {
    vi.mocked(extractGps).mockReturnValue({
      latitude: 35.5,
      longitude: -82.5,
      altitude: null,
      takenAt: null,
    });

    // Override sharp to return an instance whose toFile rejects
    vi.mocked(sharpModule).mockImplementationOnce(() => ({
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockRejectedValue(new Error('corrupt')),
    }) as unknown as ReturnType<typeof sharpModule>);

    const request = buildRequest('corrupt.jpg', Buffer.from('bad-data'));
    const response = await POST(request);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.errors).toHaveLength(1);
    expect(data.added).toBe(0);
  });
});
