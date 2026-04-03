import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/db', () => ({
  default: {
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

vi.mock('sharp', () => ({
  default: vi.fn(() => ({
    rotate: vi.fn().mockReturnThis(),
    resize: vi.fn().mockReturnThis(),
    jpeg: vi.fn().mockReturnThis(),
    toFile: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('fs/promises', () => ({
  mkdir: vi.fn().mockResolvedValue(undefined),
}));

// This import will fail (RED state) because the endpoint does not exist yet
import { POST } from '@/app/api/photos/bulk-import/route';
import { extractGps } from '@/lib/exif';
import prisma from '@/lib/db';

function buildRequest(filename: string, buffer: Buffer): Request {
  const fd = new FormData();
  const blob = new Blob([buffer], { type: 'image/jpeg' });
  const file = new File([blob], filename, { type: 'image/jpeg' });
  fd.append('photo', file);
  return new Request('http://localhost/api/photos/bulk-import', {
    method: 'POST',
    body: fd,
  });
}

describe('bulk-import endpoint', () => {
  beforeEach(() => vi.clearAllMocks());

  it('processes valid JPEG: extractGps + sharp + prisma.create', async () => {
    vi.mocked(extractGps).mockReturnValue({
      latitude: 35.5,
      longitude: -82.5,
      altitude: null,
      takenAt: null,
    });

    const request = buildRequest('test-photo.jpg', Buffer.from('fake-jpeg-data'));
    const response = await POST(request as unknown as import('next/server').NextRequest);
    const data = await response.json();

    expect(data.added).toBe(1);
    expect(data.skipped).toBe(0);
    expect(data.errors).toHaveLength(0);
    expect(prisma.photo.create).toHaveBeenCalledTimes(1);
  });

  it('returns skipped when extractGps returns null (no GPS)', async () => {
    vi.mocked(extractGps).mockReturnValue(null);

    const request = buildRequest('no-gps.jpg', Buffer.from('fake-jpeg-data'));
    const response = await POST(request as unknown as import('next/server').NextRequest);
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

    const sharpMock = await import('sharp');
    const sharpInstance = {
      rotate: vi.fn().mockReturnThis(),
      resize: vi.fn().mockReturnThis(),
      jpeg: vi.fn().mockReturnThis(),
      toFile: vi.fn().mockRejectedValue(new Error('corrupt')),
    };
    vi.mocked(sharpMock.default).mockReturnValueOnce(sharpInstance as unknown as ReturnType<typeof sharpMock.default>);

    const request = buildRequest('corrupt.jpg', Buffer.from('bad-data'));
    const response = await POST(request as unknown as import('next/server').NextRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.errors).toHaveLength(1);
    expect(data.added).toBe(0);
  });
});
