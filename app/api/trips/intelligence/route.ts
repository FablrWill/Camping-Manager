import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { generateTripIntelligence } from '@/lib/trip-intelligence';

export async function GET(): Promise<NextResponse> {
  try {
    const profile = await prisma.campingProfile.findUnique({
      where: { id: 'singleton' },
    });

    if (!profile) {
      return NextResponse.json({ report: null });
    }

    const report = JSON.parse(profile.reportJson) as unknown;
    return NextResponse.json({ report });
  } catch (error) {
    console.error('Failed to fetch camping profile:', error);
    return NextResponse.json({ error: 'Failed to fetch camping profile' }, { status: 500 });
  }
}

export async function POST(): Promise<NextResponse> {
  try {
    const tripCount = await prisma.trip.count();

    if (tripCount < 3) {
      return NextResponse.json(
        { error: 'Not enough trips yet. You need at least 3 trips for a camping profile.' },
        { status: 400 }
      );
    }

    const report = await generateTripIntelligence();

    await prisma.campingProfile.upsert({
      where: { id: 'singleton' },
      create: {
        id: 'singleton',
        reportJson: JSON.stringify(report),
        generatedAt: new Date(),
      },
      update: {
        reportJson: JSON.stringify(report),
        generatedAt: new Date(),
      },
    });

    return NextResponse.json({ report });
  } catch (error) {
    console.error('Failed to generate camping profile:', error);
    return NextResponse.json({ error: 'Failed to generate camping profile' }, { status: 500 });
  }
}
