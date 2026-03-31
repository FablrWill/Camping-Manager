import Database from 'better-sqlite3';
import * as sqliteVec from 'sqlite-vec';

let vecDb: Database.Database | null = null;

/**
 * Get a better-sqlite3 connection with sqlite-vec extension loaded.
 * This is a separate connection from Prisma's internal SQLite connection.
 * Both point to the same dev.db file. WAL mode allows concurrent access.
 */
export function getVecDb(): Database.Database {
  if (!vecDb) {
    const dbUrl = process.env.DATABASE_URL ?? 'file:./prisma/dev.db';
    const dbPath = dbUrl.replace('file:', '');
    vecDb = new Database(dbPath);
    vecDb.pragma('journal_mode = WAL');
    sqliteVec.load(vecDb);
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
