#!/usr/bin/env npx tsx
/**
 * Validate knowledge base retrieval quality.
 * Usage:
 *   npx tsx tools/ingest/validate-retrieval.ts           -- full validation (10 queries, hybrid vs vector-only)
 *   npx tsx tools/ingest/validate-retrieval.ts --quick    -- smoke test (chunk count + 1 query + buildRagContext)
 *   npx tsx tools/ingest/validate-retrieval.ts --compare  -- side-by-side hybrid vs vector-only comparison
 *   npx tsx tools/ingest/validate-retrieval.ts --count    -- just report chunk count
 */
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { getVecDb, closeVecDb } from '../../lib/rag/db';
import { hybridSearch, vectorOnlySearch } from '../../lib/rag/search';
import { buildRagContext } from '../../lib/rag/context';
import { SearchResult } from '../../lib/rag/types';

const prisma = new PrismaClient();

const TEST_QUERIES = [
  // Campsite recommendations
  { query: 'best campgrounds near Asheville within 2 hours', expectTopics: ['campgrounds'] },
  { query: 'dispersed camping spots in Pisgah National Forest', expectTopics: ['campgrounds', 'regulations'] },
  // Regulation lookups
  { query: 'rules for dispersed camping on national forest land in NC', expectTopics: ['regulations'] },
  { query: 'bear canister requirements in North Carolina', expectTopics: ['safety'] },
  // Seasonal info
  { query: 'best time of year to camp in the NC mountains', expectTopics: ['seasonal'] },
  { query: 'winter camping conditions Blue Ridge Parkway', expectTopics: ['seasonal', 'roads'] },
  // Gear-related questions
  { query: 'water filtration and purification for backcountry camping', expectTopics: ['water-connectivity'] },
  { query: 'cell signal and Starlink coverage at NC campgrounds', expectTopics: ['water-connectivity'] },
  // Geographic searches
  { query: 'forest road conditions Nantahala National Forest', expectTopics: ['roads'] },
  { query: 'campgrounds with water access in western NC', expectTopics: ['campgrounds', 'water-connectivity'] },
];

/**
 * Check if a result is relevant to expected topics.
 * Matches against metadata.category or metadata.topic fields.
 */
function isRelevant(result: SearchResult, expectTopics: string[]): boolean {
  const cat = result.metadata.category?.toLowerCase() ?? '';
  const topic = result.metadata.topic?.toLowerCase() ?? '';
  const source = result.source?.toLowerCase() ?? '';
  return expectTopics.some(
    (t) =>
      cat.includes(t.toLowerCase()) ||
      topic.includes(t.toLowerCase()) ||
      source.includes(t.toLowerCase())
  );
}

/**
 * --count mode: report chunk counts and exit
 */
async function runCount(): Promise<void> {
  const prismaCount = await prisma.knowledgeChunk.count();
  const db = getVecDb();
  const vecRow = db.prepare('SELECT count(*) as cnt FROM vec_knowledge_chunks').get() as { cnt: number };

  console.log(`Prisma KnowledgeChunk count: ${prismaCount}`);
  console.log(`vec_knowledge_chunks count:  ${vecRow.cnt}`);

  if (prismaCount < 20 || vecRow.cnt < 20) {
    console.log('\nFAILED: Chunk count below minimum (20)');
    process.exit(1);
  }

  console.log('\nPASSED: Chunk counts OK');
}

/**
 * --quick mode: smoke test with 1 query + buildRagContext
 */
async function runQuick(): Promise<void> {
  await runCount();
  console.log('\n--- Quick Smoke Test ---\n');

  const testQuery = TEST_QUERIES[0];
  console.log(`Query: "${testQuery.query}"`);

  const results = await hybridSearch(testQuery.query, 5);
  console.log(`Results: ${results.length}`);

  if (results.length === 0) {
    console.log('\nFAILED: No results returned');
    process.exit(1);
  }

  console.log('\nTop-3 results:');
  for (let i = 0; i < Math.min(3, results.length); i++) {
    console.log(`  ${i + 1}. ${results[i].title} (score: ${results[i].score.toFixed(4)})`);
  }

  // buildRagContext smoke test
  console.log('\n--- buildRagContext Test ---\n');
  const contextString = buildRagContext(results);

  if (!contextString || contextString.length === 0) {
    console.log('buildRagContext: FAILED (empty output)');
    process.exit(1);
  }

  if (!contextString.startsWith('## Relevant Knowledge Base Results')) {
    console.log('buildRagContext: FAILED (missing header)');
    process.exit(1);
  }

  if (!contextString.includes('### 1.')) {
    console.log('buildRagContext: FAILED (missing section header)');
    process.exit(1);
  }

  console.log(`buildRagContext: OK (${contextString.length} chars)`);
  console.log('\nPASSED: Quick smoke test OK');
}

/**
 * --compare mode: side-by-side hybrid vs vector-only comparison
 */
async function runCompare(): Promise<void> {
  let hybridBetter = 0;
  let vectorBetter = 0;
  let tie = 0;

  for (const testCase of TEST_QUERIES) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Query: "${testCase.query}"`);
    console.log(`Expected topics: ${testCase.expectTopics.join(', ')}`);
    console.log('='.repeat(60));

    const [hybridResults, vectorResults] = await Promise.all([
      hybridSearch(testCase.query, 5),
      vectorOnlySearch(testCase.query, 5),
    ]);

    // Print hybrid results
    console.log('\n  HYBRID results:');
    for (let i = 0; i < hybridResults.length; i++) {
      const r = hybridResults[i];
      const relevant = isRelevant(r, testCase.expectTopics) ? ' [RELEVANT]' : '';
      console.log(`    ${i + 1}. ${r.title} | ${r.source} | score: ${r.score.toFixed(4)}${relevant}`);
    }

    // Print vector-only results
    console.log('\n  VECTOR-ONLY results:');
    for (let i = 0; i < vectorResults.length; i++) {
      const r = vectorResults[i];
      const relevant = isRelevant(r, testCase.expectTopics) ? ' [RELEVANT]' : '';
      console.log(`    ${i + 1}. ${r.title} | ${r.source} | score: ${r.score.toFixed(4)}${relevant}`);
    }

    // Score: count relevant results in top 5
    const hybridRelevant = hybridResults.filter((r) => isRelevant(r, testCase.expectTopics)).length;
    const vectorRelevant = vectorResults.filter((r) => isRelevant(r, testCase.expectTopics)).length;

    let verdict: string;
    if (hybridRelevant > vectorRelevant) {
      hybridBetter++;
      verdict = 'HYBRID BETTER';
    } else if (vectorRelevant > hybridRelevant) {
      vectorBetter++;
      verdict = 'VECTOR BETTER';
    } else {
      tie++;
      verdict = 'TIE';
    }

    console.log(`\n  Verdict: ${verdict} (hybrid: ${hybridRelevant} relevant, vector: ${vectorRelevant} relevant)`);
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log('COMPARISON SUMMARY');
  console.log('='.repeat(60));
  console.log(`Hybrid better: ${hybridBetter}/10`);
  console.log(`Vector better: ${vectorBetter}/10`);
  console.log(`Tie:           ${tie}/10`);

  if (hybridBetter + tie < 7) {
    console.log('\nFAILED: Hybrid did not win or tie on at least 7/10 queries');
    process.exit(1);
  }

  console.log('\nPASSED: Hybrid outperforms or ties vector-only on 7+ queries');
}

/**
 * Default mode: full validation of all 10 queries
 */
async function runFull(): Promise<void> {
  let passed = 0;

  for (const testCase of TEST_QUERIES) {
    console.log(`\nQuery: "${testCase.query}"`);
    console.log(`  Expected topics: ${testCase.expectTopics.join(', ')}`);

    const results = await hybridSearch(testCase.query, 5);

    for (let i = 0; i < results.length; i++) {
      const r = results[i];
      const snippet = r.content.substring(0, 100).replace(/\n/g, ' ');
      console.log(`  ${i + 1}. ${r.title} | ${r.source} | ${snippet}...`);
    }

    const hasRelevant = results.some((r) => isRelevant(r, testCase.expectTopics));

    if (hasRelevant) {
      console.log('  >> PASS');
      passed++;
    } else {
      console.log('  >> FAIL (no relevant results in top-5)');
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Passed: ${passed}/10`);

  if (passed < 10) {
    console.log('\nFAILED: Not all queries returned relevant results');
    process.exit(1);
  }

  console.log('\nPASSED: All 10 queries returned relevant results');
}

async function main(): Promise<void> {
  const mode = process.argv[2];

  try {
    if (mode === '--count') {
      await runCount();
    } else if (mode === '--quick') {
      await runQuick();
    } else if (mode === '--compare') {
      await runCompare();
    } else {
      await runFull();
    }
  } finally {
    closeVecDb();
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error('Validation failed:', err);
  process.exit(1);
});
