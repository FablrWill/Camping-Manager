-- Add altitude column to Location (meters, from EXIF on photo import)
ALTER TABLE "Location" ADD COLUMN "altitude" REAL;
