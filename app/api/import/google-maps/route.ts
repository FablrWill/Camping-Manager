import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

interface ParsedLocation {
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
}

// Parse pasted text for location data (names, coordinates, addresses)
function parseLocationsFromText(text: string): ParsedLocation[] {
  const locations: ParsedLocation[] = [];

  // Pattern 1: Google Maps URL coordinates — @lat,lon or /lat,lon
  const urlCoordPattern = /@(-?\d+\.\d+),(-?\d+\.\d+)/g;
  let match: RegExpExecArray | null;
  while ((match = urlCoordPattern.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (isValidCoord(lat, lon)) {
      locations.push({
        name: `Google Maps Pin (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
        latitude: lat,
        longitude: lon,
      });
    }
  }

  // Pattern 2: Decimal degree pairs on their own line or in parentheses
  // e.g. "35.5951, -82.5515" or "(35.5951, -82.5515)"
  const decimalDegreePattern = /\(?(-?\d{1,3}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})\)?/g;
  while ((match = decimalDegreePattern.exec(text)) !== null) {
    const lat = parseFloat(match[1]);
    const lon = parseFloat(match[2]);
    if (isValidCoord(lat, lon)) {
      // Avoid duplicating coords already found via URL pattern
      const isDuplicate = locations.some(
        (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
      );
      if (!isDuplicate) {
        locations.push({
          name: `Imported Pin (${lat.toFixed(4)}, ${lon.toFixed(4)})`,
          latitude: lat,
          longitude: lon,
        });
      }
    }
  }

  // Pattern 3: Google Maps place data with name + coordinates in structured text
  // Lines like "Place Name\n35.5951, -82.5515" or "Place Name - 35.5951, -82.5515"
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line has "Name — coords" or "Name - coords" pattern
    const inlinePattern = /^(.+?)\s*[-—–|]\s*(-?\d{1,3}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})/;
    const inlineMatch = line.match(inlinePattern);
    if (inlineMatch) {
      const name = inlineMatch[1].trim();
      const lat = parseFloat(inlineMatch[2]);
      const lon = parseFloat(inlineMatch[3]);
      if (name && isValidCoord(lat, lon)) {
        const isDuplicate = locations.some(
          (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
        );
        if (isDuplicate) {
          // Update existing entry with the name
          const existing = locations.find(
            (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
          );
          if (existing && (existing.name.startsWith('Google Maps Pin') || existing.name.startsWith('Imported Pin'))) {
            existing.name = name;
          }
        } else {
          locations.push({ name, latitude: lat, longitude: lon });
        }
        continue;
      }
    }

    // Check if next line has coordinates (name on one line, coords on next)
    if (i + 1 < lines.length) {
      const nextLine = lines[i + 1];
      const coordMatch = nextLine.match(/^(-?\d{1,3}\.\d{3,})[,\s]+(-?\d{1,3}\.\d{3,})$/);
      if (coordMatch && !line.match(/^-?\d/)) {
        const lat = parseFloat(coordMatch[1]);
        const lon = parseFloat(coordMatch[2]);
        if (isValidCoord(lat, lon)) {
          const isDuplicate = locations.some(
            (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
          );
          if (isDuplicate) {
            const existing = locations.find(
              (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
            );
            if (existing && (existing.name.startsWith('Google Maps Pin') || existing.name.startsWith('Imported Pin'))) {
              existing.name = line;
            }
          } else {
            locations.push({ name: line, latitude: lat, longitude: lon });
          }
        }
      }
    }
  }

  // Pattern 4: Google Maps short links with place ID — extract from /place/ URLs
  // e.g. https://www.google.com/maps/place/Pisgah+National+Forest/@35.3,-82.7,...
  const placeUrlPattern = /google\.com\/maps\/place\/([^/@]+)\/@(-?\d+\.\d+),(-?\d+\.\d+)/g;
  while ((match = placeUrlPattern.exec(text)) !== null) {
    const name = decodeURIComponent(match[1]).replace(/\+/g, ' ');
    const lat = parseFloat(match[2]);
    const lon = parseFloat(match[3]);
    if (isValidCoord(lat, lon)) {
      const isDuplicate = locations.some(
        (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
      );
      if (isDuplicate) {
        const existing = locations.find(
          (l) => Math.abs(l.latitude - lat) < 0.0001 && Math.abs(l.longitude - lon) < 0.0001
        );
        if (existing && (existing.name.startsWith('Google Maps Pin') || existing.name.startsWith('Imported Pin'))) {
          existing.name = name;
        }
      } else {
        locations.push({ name, latitude: lat, longitude: lon });
      }
    }
  }

  return locations;
}

function isValidCoord(lat: number, lon: number): boolean {
  return lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180;
}

// POST /api/import/google-maps — import locations from Google Maps list
// Body: { url?: string, text?: string }
// Returns: { locationsCreated, locationsSkipped, locations: [...] }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.url && !body.text) {
      return NextResponse.json(
        { error: 'Either url or text is required' },
        { status: 400 }
      );
    }

    let textToParse = '';

    // If URL provided, try to fetch and extract text
    if (body.url && typeof body.url === 'string') {
      try {
        const res = await fetch(body.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; OutlandOS/1.0)',
          },
          signal: AbortSignal.timeout(10000),
        });
        if (res.ok) {
          textToParse = await res.text();
        }
      } catch {
        // URL fetch failed — fall through to text parsing if text was also provided
        if (!body.text) {
          return NextResponse.json(
            { error: 'Could not fetch the Google Maps URL. Try pasting the list text instead.' },
            { status: 400 }
          );
        }
      }
    }

    // Append any pasted text
    if (body.text && typeof body.text === 'string') {
      textToParse = textToParse ? `${textToParse}\n${body.text}` : body.text;
    }

    if (!textToParse.trim()) {
      return NextResponse.json(
        { error: 'No parseable content found' },
        { status: 400 }
      );
    }

    const parsed = parseLocationsFromText(textToParse);

    if (parsed.length === 0) {
      return NextResponse.json(
        { error: 'No locations with coordinates found in the provided data. Try pasting text that includes latitude/longitude coordinates.' },
        { status: 400 }
      );
    }

    let locationsCreated = 0;
    let locationsSkipped = 0;
    const createdLocations: Array<{ id: string; name: string; latitude: number; longitude: number }> = [];

    for (const loc of parsed) {
      // Dedup: check for existing location at similar coordinates (within ~100m)
      const existing = await prisma.location.findFirst({
        where: {
          latitude: { gte: loc.latitude - 0.001, lte: loc.latitude + 0.001 },
          longitude: { gte: loc.longitude - 0.001, lte: loc.longitude + 0.001 },
        },
      });

      if (existing) {
        locationsSkipped++;
        continue;
      }

      const created = await prisma.location.create({
        data: {
          name: loc.name,
          latitude: loc.latitude,
          longitude: loc.longitude,
          type: 'campground',
          description: loc.address || null,
          notes: 'Imported from Google Maps',
        },
      });

      createdLocations.push({
        id: created.id,
        name: created.name,
        latitude: loc.latitude,
        longitude: loc.longitude,
      });
      locationsCreated++;
    }

    return NextResponse.json({
      locationsCreated,
      locationsSkipped,
      locations: createdLocations,
    });
  } catch (error) {
    console.error('Failed to import Google Maps data:', error);
    return NextResponse.json(
      { error: 'Failed to import Google Maps data' },
      { status: 500 }
    );
  }
}
