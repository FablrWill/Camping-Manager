import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchGmapsList } from '../lib/gmaps-import';

const FIXTURE_HTML = `
<!DOCTYPE html><html><head><title>Test List</title></head><body>
<script>window.APP_INITIALIZATION_STATE=[["en",null,null,null,null,null,null,null,null,null,
"Rough Ridge Parking",null,null,null,null,null,[null,null,35.5951,-82.5515],
"Linville Gorge",null,null,null,null,null,[null,null,35.9443,-81.9231]
]];</script>
</body></html>`;

const EMPTY_HTML = `<!DOCTYPE html><html><body><p>Nothing here</p></body></html>`;

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fetchGmapsList', () => {
  it('extracts places from [null,null,lat,lng] pattern in HTML', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      url: 'https://www.google.com/maps/collections/abc123',
      text: () => Promise.resolve(FIXTURE_HTML),
    });

    const result = await fetchGmapsList('https://maps.app.goo.gl/abc123');

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThanOrEqual(1);
    expect(result[0].lat).toBe(35.5951);
    expect(result[0].lng).toBe(-82.5515);
  });

  it('extracted coordinates are numbers not strings', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      url: 'https://www.google.com/maps/collections/abc123',
      text: () => Promise.resolve(FIXTURE_HTML),
    });

    const result = await fetchGmapsList('https://maps.app.goo.gl/abc123');

    expect(typeof result[0].lat).toBe('number');
    expect(typeof result[0].lng).toBe('number');
  });

  it('throws descriptive error when no places found', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      url: 'https://www.google.com/maps/collections/empty',
      text: () => Promise.resolve(EMPTY_HTML),
    });

    await expect(
      fetchGmapsList('https://maps.app.goo.gl/empty')
    ).rejects.toThrow(/No places found/);
  });

  it('throws error when redirected to Google sign-in', async () => {
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      url: 'https://accounts.google.com/signin',
      text: () => Promise.resolve(''),
    });

    await expect(
      fetchGmapsList('https://maps.app.goo.gl/private')
    ).rejects.toThrow(/sign-in/i);
  });
});
