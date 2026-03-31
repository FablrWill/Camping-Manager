import * as cheerio from 'cheerio';
import { encode } from 'gpt-tokenizer';
import { RawChunk, ChunkMetadata } from '../types';

/**
 * Estimate token count for a text string using GPT tokenizer.
 */
function estimateTokens(text: string): number {
  return encode(text).length;
}

/**
 * Fetch a web page, extract its main content, and split into chunks.
 * Removes non-content elements (scripts, nav, footer, etc.) before extraction.
 * Sets verifyFlag: true since web content may change over time.
 */
export async function chunkWebPage(url: string): Promise<RawChunk[]> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': 'OutlandOS/1.0 (camping knowledge base)',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const $ = cheerio.load(html);

  // Extract page title
  const pageTitle = $('h1').first().text().trim() || $('title').text().trim() || url;

  // Remove non-content elements
  $('script, style, nav, footer, header, .sidebar, #menu, .nav, .footer, .header, iframe, noscript').remove();

  // Extract main content — prefer semantic content elements, fallback to body
  let textContent = '';
  const contentSelectors = ['main', 'article', '#content', '.content', '[role="main"]'];
  for (const selector of contentSelectors) {
    const el = $(selector);
    if (el.length && el.text().trim().length > 100) {
      textContent = el.text();
      break;
    }
  }
  if (!textContent) {
    textContent = $('body').text();
  }

  // Clean extracted text: collapse whitespace, normalize line breaks
  textContent = textContent
    .replace(/\t/g, ' ')
    .replace(/ {2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (!textContent || textContent.length < 50) {
    return []; // Not enough content to chunk
  }

  const metadata: ChunkMetadata = {
    topic: pageTitle,
    category: 'external',
    confidence: 'official',
    verifyFlag: true, // Web content may change — flag for freshness checks
  };

  // Split at paragraph boundaries (double newlines or significant whitespace breaks)
  const paragraphs = textContent.split(/\n\n+/).filter((p) => p.trim().length > 0);
  const chunks: RawChunk[] = [];
  let currentContent = '';
  let currentTokens = 0;

  for (const paragraph of paragraphs) {
    const cleaned = paragraph.replace(/\s+/g, ' ').trim();
    if (!cleaned || cleaned.length < 10) continue;

    const paraTokens = estimateTokens(cleaned);

    // If adding this paragraph would exceed 512 tokens, flush current chunk
    if (currentContent && currentTokens + paraTokens > 512) {
      chunks.push({
        title: pageTitle,
        content: currentContent.trim(),
        source: url,
        metadata: { ...metadata },
        chunkIdx: chunks.length,
        tokenCount: currentTokens,
      });
      currentContent = '';
      currentTokens = 0;
    }

    currentContent += (currentContent ? '\n\n' : '') + cleaned;
    currentTokens += paraTokens;
  }

  // Flush remaining content
  if (currentContent.trim() && estimateTokens(currentContent.trim()) >= 10) {
    chunks.push({
      title: pageTitle,
      content: currentContent.trim(),
      source: url,
      metadata: { ...metadata },
      chunkIdx: chunks.length,
      tokenCount: estimateTokens(currentContent.trim()),
    });
  }

  return chunks;
}
