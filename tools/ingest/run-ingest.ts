#!/usr/bin/env npx tsx
/**
 * Ingest NC camping research files into the knowledge base.
 * Usage: npx tsx tools/ingest/run-ingest.ts [--clear] [--file path/to/file.md|url]
 *
 * --clear: Delete all existing chunks before ingesting (fresh start)
 * --file:  Ingest a single file or URL instead of the full corpus
 */
import 'dotenv/config';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';
import { ingestFile, ingestChunks } from '../../lib/rag/ingest';
import { getVecDb, closeVecDb } from '../../lib/rag/db';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RESEARCH_DIR = 'data/research';
const EXTERNAL_DIR = 'data/external';
const SKIP_FILES = ['RESEARCH-PROMPT.md', 'CORPUS-MANIFEST.md', 'README.md'];

/**
 * External URLs for web scraping ingestion.
 * Add USFS, recreation.gov, or other camping resource URLs here.
 */
const EXTERNAL_URLS: string[] = [
  // Blue Ridge Parkway camping info — NPS (near Asheville, highly relevant)
  'https://www.nps.gov/blri/planyourvisit/camping.htm',
];

async function main() {
  const args = process.argv.slice(2);
  const clearFlag = args.includes('--clear');
  const fileIdx = args.indexOf('--file');
  const singleFile = fileIdx !== -1 ? args[fileIdx + 1] : null;

  // Clear existing data if requested
  if (clearFlag) {
    console.log('Clearing existing knowledge chunks...');
    const vecDb = await getVecDb();
    vecDb.prepare('DELETE FROM vec_knowledge_chunks').run();
    await prisma.knowledgeChunk.deleteMany();
    vecDb.prepare('DELETE FROM knowledge_chunks_fts').run();
    console.log('Cleared.');
  }

  // Single file/URL mode
  if (singleFile) {
    console.log(`Ingesting single source: ${singleFile}`);
    const chunks = await ingestFile(singleFile);
    console.log(`  ${singleFile}: ${chunks.length} chunks`);
    const result = await ingestChunks(chunks);
    console.log(`Done. Inserted ${result.inserted} chunks.`);
    closeVecDb();
    await prisma.$disconnect();
    return;
  }

  // --- Full corpus ingestion ---

  // 1. Research markdown files
  const mdFiles = readdirSync(RESEARCH_DIR)
    .filter((f) => f.endsWith('.md') && !SKIP_FILES.includes(f))
    .map((f) => join(RESEARCH_DIR, f));

  console.log(`\n--- Research Files (${mdFiles.length}) ---`);
  let researchChunks = 0;
  for (const filePath of mdFiles) {
    const chunks = await ingestFile(filePath);
    console.log(`  ${filePath}: ${chunks.length} chunks`);
    const result = await ingestChunks(chunks);
    researchChunks += result.inserted;
  }

  // 2. External PDF files
  let externalChunks = 0;
  let externalSources = 0;
  const pdfFiles: string[] = [];
  if (existsSync(EXTERNAL_DIR)) {
    const extFiles = readdirSync(EXTERNAL_DIR)
      .filter((f) => f.endsWith('.pdf'))
      .map((f) => join(EXTERNAL_DIR, f));
    pdfFiles.push(...extFiles);
  }

  if (pdfFiles.length > 0 || EXTERNAL_URLS.length > 0) {
    console.log(`\n--- External Sources (${pdfFiles.length} PDFs, ${EXTERNAL_URLS.length} URLs) ---`);
  }

  for (const pdfPath of pdfFiles) {
    try {
      const chunks = await ingestFile(pdfPath);
      console.log(`  ${pdfPath}: ${chunks.length} chunks`);
      const result = await ingestChunks(chunks);
      externalChunks += result.inserted;
      externalSources++;
    } catch (err) {
      console.warn(`  WARNING: Failed to ingest PDF ${pdfPath}:`, (err as Error).message);
    }
  }

  // 3. External URLs
  for (const url of EXTERNAL_URLS) {
    try {
      const chunks = await ingestFile(url);
      console.log(`  ${url}: ${chunks.length} chunks`);
      if (chunks.length > 0) {
        const result = await ingestChunks(chunks);
        externalChunks += result.inserted;
        externalSources++;
      } else {
        console.warn(`  WARNING: No extractable content from ${url}`);
      }
    } catch (err) {
      console.warn(`  WARNING: Failed to ingest URL ${url}:`, (err as Error).message);
    }
  }

  // Report
  const count = await prisma.knowledgeChunk.count();
  console.log(`\n--- Summary ---`);
  console.log(`Research files: ${mdFiles.length} files, ${researchChunks} chunks`);
  console.log(`External sources: ${externalSources} sources, ${externalChunks} chunks`);
  console.log(`Total chunks in database: ${count}`);

  closeVecDb();
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error('Ingest failed:', err);
  process.exit(1);
});
