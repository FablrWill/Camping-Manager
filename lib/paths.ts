import path from 'path';

/**
 * Resolves the directory where uploaded photos are stored.
 * Production: /data/outland/photos (set via PHOTOS_DIR env var)
 * Development: process.cwd()/public/photos (default)
 */
export function getPhotosDir(): string {
  if (process.env.PHOTOS_DIR) {
    return process.env.PHOTOS_DIR;
  }
  return path.join(process.cwd(), 'public', 'photos');
}

/**
 * Resolves the directory where downloaded gear document PDFs are stored.
 * Production: /data/outland/docs (set via DOCS_DIR env var)
 * Development: process.cwd()/public/docs (default)
 */
export function getDocsDir(): string {
  if (process.env.DOCS_DIR) {
    return process.env.DOCS_DIR;
  }
  return path.join(process.cwd(), 'public', 'docs');
}

/**
 * Resolves the full filesystem path for a photo's imagePath.
 * imagePath is stored in the DB as "/photos/filename.jpg".
 * Production: PHOTOS_DIR + "/filename.jpg"
 * Development: process.cwd()/public + "/photos/filename.jpg"
 */
export function resolvePhotoPath(imagePath: string): string {
  if (process.env.PHOTOS_DIR) {
    // imagePath = "/photos/filename.jpg", extract just "filename.jpg"
    const filename = path.basename(imagePath);
    return path.join(process.env.PHOTOS_DIR, filename);
  }
  return path.join(process.cwd(), 'public', imagePath);
}
