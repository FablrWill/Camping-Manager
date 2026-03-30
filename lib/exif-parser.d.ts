declare module "exif-parser" {
  interface ExifTags {
    GPSLatitude?: number;
    GPSLongitude?: number;
    GPSAltitude?: number;
    DateTimeOriginal?: number;
    [key: string]: unknown;
  }

  interface ExifResult {
    tags: ExifTags;
  }

  interface ExifParserInstance {
    parse(): ExifResult;
  }

  function create(buffer: Buffer): ExifParserInstance;

  export = { create };
}
