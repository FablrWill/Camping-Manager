/**
 * SOURCES registry for the RAG knowledge base refresh pipeline.
 * Each entry defines a public URL and parse type for the corpus refresh script.
 *
 * Robots.txt status (verified 2026-04-04):
 *   - fs.usda.gov: RSS feed is a direct data file, not a crawled page — allowed
 *   - ncparks.gov: No disallow for /find-a-park in robots.txt — allowed
 *   - lnt.org: No disallow for /why/7-principles/ — allowed
 *   - campendium.com: /robots.txt disallows crawlers on some paths; verify before enabling
 *
 * NOTE: If a source fetch fails at runtime the refresh script logs the error and
 * continues to the next source — partial updates are preferred over full stops.
 */

export interface KnowledgeSource {
  name: string;
  url: string;
  type: 'rss' | 'html';
  /** Human-readable note about this source, for PM2 log context */
  note?: string;
}

export const SOURCES: KnowledgeSource[] = [
  {
    name: 'USFS Pisgah/Nantahala Forest Alerts',
    // Public RSS feed from the USFS for Pisgah & Nantahala National Forests (Western NC)
    // Verify this URL resolves before first production run; USFS occasionally rotates document IDs
    url: 'https://www.fs.usda.gov/Internet/FSE_DOCUMENTS/fseprd1265960.xml',
    type: 'rss',
    note: 'USFS RSS — verify URL on first run; USFS may rotate document IDs',
  },
  {
    name: 'NC State Parks — Find a Park',
    url: 'https://www.ncparks.gov/find-a-park',
    type: 'html',
    note: 'NC State Parks listing page — html scrape for park names and descriptions',
  },
  {
    name: 'Leave No Trace 7 Principles',
    url: 'https://lnt.org/why/7-principles/',
    type: 'html',
    note: 'LNT guidelines — stable educational content, low churn',
  },
  // iOverlander: no public bulk API or NC data export URL available as of 2026-04-04.
  // TODO: add when a public export URL is discovered. See iOverlander.com/maps for manual reference.
];
