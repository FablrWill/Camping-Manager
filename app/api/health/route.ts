import { NextResponse } from 'next/server';
import { readdirSync, statSync } from 'fs';
import path from 'path';

const BACKUP_DIR = process.env.DATA_DIR
  ? path.join(process.env.DATA_DIR, 'backups')
  : path.join(process.env.HOME || '', 'outland-data', 'backups');

export async function GET(): Promise<NextResponse> {
  try {
    const uptimeSeconds = Math.round(process.uptime());

    let lastBackup: string | null = null;
    try {
      const files = readdirSync(BACKUP_DIR)
        .filter((f: string) => f.endsWith('.sqlite'))
        .sort()
        .reverse();
      if (files.length > 0) {
        const mtime = statSync(path.join(BACKUP_DIR, files[0])).mtime;
        lastBackup = mtime.toISOString();
      }
    } catch {
      // Backup dir may not exist yet -- non-fatal
    }

    return NextResponse.json({
      status: 'ok',
      uptime: uptimeSeconds,
      lastBackup,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json(
      { status: 'error' },
      { status: 500 }
    );
  }
}
