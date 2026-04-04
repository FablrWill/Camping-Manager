import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { suggestDestinations } from '@/lib/destination-discovery';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const bringingDog = searchParams.get('bringingDog') === 'true';
    const maxResults = Math.min(
      parseInt(searchParams.get('maxResults') ?? '5', 10) || 5,
      10,
    );

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required (YYYY-MM-DD)' },
        { status: 400 },
      );
    }

    // Validate date format
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(startDate) || !datePattern.test(endDate)) {
      return NextResponse.json(
        { error: 'startDate and endDate must be in YYYY-MM-DD format' },
        { status: 400 },
      );
    }

    if (startDate > endDate) {
      return NextResponse.json(
        { error: 'startDate must be before or equal to endDate' },
        { status: 400 },
      );
    }

    // Fetch all saved locations
    const locations = await prisma.location.findMany({
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        rating: true,
        visitedAt: true,
        notes: true,
        type: true,
      },
    });

    if (locations.length === 0) {
      return NextResponse.json({ suggestions: [], message: 'No saved locations found.' });
    }

    const suggestions = await suggestDestinations({
      locations,
      startDate,
      endDate,
      maxResults,
      bringingDog,
    });

    return NextResponse.json({ suggestions });
  } catch (error) {
    console.error('Failed to suggest destinations:', error);
    return NextResponse.json(
      { error: 'Failed to generate destination suggestions' },
      { status: 500 },
    );
  }
}
