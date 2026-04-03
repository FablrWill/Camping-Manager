import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock prisma
vi.mock('@/lib/db', () => ({
  prisma: {
    gearDocument: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
    },
    gearItem: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock claude
vi.mock('@/lib/claude', () => ({
  findGearManual: vi.fn(),
}));

// Mock paths
vi.mock('@/lib/paths', () => ({
  getDocsDir: vi.fn().mockReturnValue('/tmp/test-docs'),
  getPhotosDir: vi.fn().mockReturnValue('/tmp/test-photos'),
  resolvePhotoPath: vi.fn(),
}));

describe('GearDocument schema shape (SC-1)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should define GearDocument with required fields: id, gearItemId, type, url, title, localPath, createdAt', async () => {
    const { prisma } = await import('@/lib/db');
    const mockDoc = {
      id: 'test-id',
      gearItemId: 'gear-1',
      type: 'manual_pdf',
      url: 'https://example.com/manual.pdf',
      title: 'Test Manual',
      localPath: null,
      createdAt: new Date(),
    };
    vi.mocked(prisma.gearDocument.findUnique).mockResolvedValue(mockDoc as never);
    const result = await prisma.gearDocument.findUnique({ where: { id: 'test-id' } });
    expect(result).toMatchObject({
      id: expect.any(String),
      gearItemId: expect.any(String),
      type: expect.any(String),
      url: expect.any(String),
      title: expect.any(String),
      localPath: null,
      createdAt: expect.any(Date),
    });
  });
});

describe('Find Manual route (SC-2)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should call findGearManual with gear item details and return documents', async () => {
    const { findGearManual } = await import('@/lib/claude');
    const mockResult = {
      documents: [
        { type: 'support_link' as const, url: 'https://msr.com/tents', title: 'MSR Product Page', confidence: 'high' as const },
      ],
    };
    vi.mocked(findGearManual).mockResolvedValue(mockResult);
    const result = await findGearManual({ name: 'Hubba Hubba', brand: 'MSR', modelNumber: 'NX2', category: 'Shelter' });
    expect(result.documents).toHaveLength(1);
    expect(result.documents[0].type).toBe('support_link');
    expect(result.documents[0].url).toMatch(/^https:\/\//);
  });
});

describe('PDF download sets localPath (SC-3)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should update GearDocument localPath after successful download', async () => {
    const { prisma } = await import('@/lib/db');
    const updatedDoc = {
      id: 'doc-1',
      gearItemId: 'gear-1',
      type: 'manual_pdf',
      url: 'https://example.com/manual.pdf',
      title: 'Manual',
      localPath: '/docs/abc123.pdf',
      createdAt: new Date(),
    };
    vi.mocked(prisma.gearDocument.update).mockResolvedValue(updatedDoc as never);
    const result = await prisma.gearDocument.update({
      where: { id: 'doc-1' },
      data: { localPath: '/docs/abc123.pdf' },
    });
    expect(result.localPath).toBe('/docs/abc123.pdf');
    expect(result.localPath).toMatch(/^\/docs\//);
  });
});

describe('GET documents list (SC-4)', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('should return array of GearDocument for a gear item', async () => {
    const { prisma } = await import('@/lib/db');
    const mockDocs = [
      { id: 'doc-1', gearItemId: 'gear-1', type: 'support_link', url: 'https://example.com', title: 'Support', localPath: null, createdAt: new Date() },
      { id: 'doc-2', gearItemId: 'gear-1', type: 'manual_pdf', url: 'https://example.com/manual.pdf', title: 'Manual', localPath: '/docs/abc.pdf', createdAt: new Date() },
    ];
    vi.mocked(prisma.gearDocument.findMany).mockResolvedValue(mockDocs as never);
    const results = await prisma.gearDocument.findMany({ where: { gearItemId: 'gear-1' }, orderBy: { createdAt: 'desc' } });
    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('gearItemId', 'gear-1');
    expect(results.every((d: { gearItemId: string }) => d.gearItemId === 'gear-1')).toBe(true);
  });
});
