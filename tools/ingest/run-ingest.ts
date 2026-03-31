#!/usr/bin/env npx tsx
/**
 * Ingest NC camping research files into the knowledge base.
 * Usage: npx tsx tools/ingest/run-ingest.ts [--clear] [--file path/to/file.md]
 *
 * --clear: Delete all existing chunks before ingesting (fresh start)
 * --file:  Ingest a single file instead of the full corpus
 */
import 'dotenv/config';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { chunkMarkdown, ingestChunks } from '../../lib/rag/ingest';
import { getVecDb, closeVecDb } from '../../lib/rag/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RESEARCH_DIR = 'data/research';
const SKIP_FILES = ['RESEARCH-PROMPT.md', 'CORPUS-MANIFEST.md'];

async function main() {
  const args = process.argv.slice(2);
  const clearFlag = args.includes('--clear');
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  // Clear existing data if requested
  if (clearFlag) {
    console.log('Clearing existing knowledge chunks...');
    const vecDb = getVecDb();
    vecDb.prepare('DELETE FROM vec_knowledge_chunks').run();
    await prisma.knowledgeChunk.deleteMany();
    // Also clear FTS5 (triggers handle it, but clear manually for safety)
    vecDb.prepare('DELETE FROM knowledge_chunks_fts').run();
    console.log('Cleared.');
  }

  // Determine files to ingest
  let files: string[];
  if (singleFile) {
    files = [singleFile];
  } else {
    files = readdirSync(RESEARCH_DIR)
      .filter((f) => f.endsWith('.md') && !SKIP_FILES.includes(f))
      .map((f) => join(RESEARCH_DIR, f));
  }

  console.log(`Ingesting ${files.length} file(s)...`);

  let totalChunks = 0;
  for (const filePath of files) {
    const content = readFileSync(filePath, 'utf-8');
    const chunks = chunkMarkdown(content, filePath);
    console.log(`  ${filePath}: ${chunks.length} chunks`);

    const result = await ingestChunks(chunks);
    totalChunks += result.inserted;
  }

  // Report
  const count = await prisma.knowledgeChunk.count();
  console.log(`\nDone. Inserted ${totalChunks} chunks this run.`);
  console.log(`Total chunks in database: ${count}`);

  closeVecDb();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
