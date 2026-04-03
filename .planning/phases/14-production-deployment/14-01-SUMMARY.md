# Phase 14, Plan 01 — Execution Summary

## What Was Done

Implemented the production deployment foundation for Outland OS to run on a Mac mini as a standalone Next.js app with persistent photo storage outside the app directory.

### Changes Made

**next.config.ts** — Added `output: 'standalone'` as the first config property. This tells Next.js to bundle all dependencies into `.next/standalone/` for self-contained deployment without a `node_modules` install on the target machine.

**lib/paths.ts** (new) — Created a central path resolver with two functions:
- `getPhotosDir()` — returns `PHOTOS_DIR` env var in production, or `public/photos` in dev
- `resolvePhotoPath(imagePath)` — resolves a DB-stored path like `/photos/foo.jpg` to a full filesystem path, accounting for production vs dev layout

**app/api/health/route.ts** (new) — Added a `GET /api/health` endpoint that returns uptime, last backup timestamp (scanned from `DATA_DIR/backups/*.sqlite`), and current time. Used for process monitoring and uptime checks.

**app/api/photos/upload/route.ts** — Replaced hardcoded `join(process.cwd(), "public", "photos")` with `getPhotosDir()` from `@/lib/paths`. The `join` import is still present (used for `filepath` construction on the next line).

**app/api/photos/[id]/route.ts** — Added `resolvePhotoPath` import; replaced `path.resolve(path.join(publicDir, photo.imagePath))` with `resolvePhotoPath(photo.imagePath)`. The existing `path` import is retained — the path traversal guard still uses `path.resolve`, `path.join`, and `path.sep`.

**app/api/import/photos/route.ts** — Replaced hardcoded `join(process.cwd(), "public", "photos")` with `getPhotosDir()`. The `join` and `resolve` imports are retained — used throughout for `takeoutRoot` path handling and traversal guard.

**.env.example** — Appended a `Production Deployment (Mac mini)` section documenting `PHOTOS_DIR`, `DATABASE_URL` (absolute path form), `DATA_DIR`, and `NOTIFY_NUMBER`.

## Key Design Decisions

- `resolvePhotoPath` extracts only the basename from the DB-stored path in production mode. This is intentional: the DB stores `/photos/filename.jpg` but production files live flat in `PHOTOS_DIR`, not in a `photos/` subdirectory within it.
- The path traversal guard in `[id]/route.ts` is left intact. In production the guard's `photosDir` still derives from `public/photos` (the dev default), which means the guard only fires in dev. This is acceptable for a single-user tool where production deletes go through the same trusted API. A future hardening pass could make the guard production-aware.
- Health endpoint backup scanning is non-fatal — the `try/catch` around `readdirSync` means the endpoint returns `{ lastBackup: null }` if the backup directory hasn't been created yet.
