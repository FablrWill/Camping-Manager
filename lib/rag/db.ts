import { resolve, join } from 'path';

// better-sqlite3 and sqlite-vec are dynamically imported to avoid native binding
// resolution failures during Next.js static page data collection at build time.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
let vecDb: any = null;

/**
 * Resolve the DATABASE_URL to an absolute path.
 * Prisma resolves `file:` paths relative to the schema file location (prisma/),
 * so we replicate that behavior for better-sqlite3.
 */
function resolveDbPath(): string {
  const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
  const relativePath = dbUrl.replace(/^file:/, '');

  // If it's already absolute, use it directly
  if (relativePath.startsWith('/')) return relativePath;

  // Prisma resolves relative paths from the schema directory (prisma/)
  const schemaDir = resolve(process.cwd(), 'prisma');
  return join(schemaDir, relativePath);
}

/**
 * Get a better-sqlite3 connection with sqlite-vec extension loaded.
 * This is a separate connection from Prisma's internal SQLite connection.
 * Both point to the same dev.db file. WAL mode allows concurrent access.
 */
export async function getVecDb() {
  if (!vecDb) {
    const Database = (await import('better-sqlite3')).default;
    const sqliteVec = await import('sqlite-vec');
    const dbPath = resolveDbPath();
    vecDb = new Database(dbPath);
    vecDb.pragma('journal_mode = WAL');
    sqliteVec.load(vecDb);
    // Create vec0 virtual table if it doesn't exist
    // (can't be in Prisma migrations because Prisma's SQLite engine doesn't have sqlite-vec)
    vecDb.exec(`
      CREATE VIRTUAL TABLE IF NOT EXISTS vec_knowledge_chunks
        USING vec0(embedding float[512]);
    `);
  }
  return vecDb;
}

/**
 * Close the vec database connection. Call during cleanup/shutdown.
 */
export function closeVecDb(): void {
  if (vecDb) {
    vecDb.close();
    vecDb = null;
  }
}
