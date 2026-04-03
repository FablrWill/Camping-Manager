import * as cheerio from 'cheerio';
import type { GearDraft } from '@/lib/parse-claude';

export async function extractGearFromUrl(url: string): Promise<{ draft: GearDraft; summary: string; confidence: string }> {
  let html = '';
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; OutlandOS/1.0)' },
      signal: AbortSignal.timeout(8000),
    });
    html = await res.text();
  } catch {
    return {
      draft: { name: 'Unknown Product', isWishlist: true, category: 'tools' },
      summary: 'Could not fetch URL',
      confidence: 'low',
    };
  }

  const $ = cheerio.load(html);

  // Extract product name from common selectors
  const name =
    $('h1').first().text().trim() ||
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('title').text().trim().split('|')[0].trim() ||
    'Unknown Product';

  // Extract price
  const priceText =
    $('[class*="price"]').first().text().trim() ||
    $('meta[property="product:price:amount"]').attr('content') ||
    '';
  const priceMatch = priceText.match(/[\d,]+\.?\d*/);
  const price = priceMatch ? parseFloat(priceMatch[0].replace(',', '')) : null;

  // Extract description
  const description =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    $('[class*="description"]').first().text().trim().slice(0, 300) ||
    null;

  // Extract brand
  const brand =
    $('meta[property="og:site_name"]').attr('content')?.trim() ||
    $('[class*="brand"]').first().text().trim() ||
    null;

  const draft: GearDraft = {
    name: name.slice(0, 200),
    brand: brand?.slice(0, 100) || null,
    category: 'tools',
    description: description?.slice(0, 500) || null,
    price,
    purchaseUrl: url,
    isWishlist: true,
  };

  return {
    draft,
    summary: `${name}${price ? ` — $${price}` : ''}`,
    confidence: name !== 'Unknown Product' ? 'medium' : 'low',
  };
}
