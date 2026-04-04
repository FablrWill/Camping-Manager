import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { runPreTripAlert, type PreTripAlertPayload } from '@/lib/agents/pre-trip-alert';

// POST /api/agent/jobs/trigger/pre-trip
// Creates a pre_trip_alert job and kicks off processing non-blocking.
// Body: { tripId: string }
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 });
    }

    const trip = await prisma.trip.findUnique({
      where: { id: body.tripId },
      select: {
        id: true,
        name: true,
        startDate: true,
        location: {
          select: {
            name: true,
            latitude: true,
            longitude: true,
          },
        },
      },
    });

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 });
    }

    if (!trip.location?.latitude || !trip.location?.longitude) {
      return NextResponse.json(
        { error: 'Trip must have a location with coordinates to run pre-trip check' },
        { status: 400 }
      );
    }

    const payload: PreTripAlertPayload = {
      tripId: trip.id,
      tripName: trip.name,
      locationName: trip.location.name,
      latitude: trip.location.latitude,
      longitude: trip.location.longitude,
      startDate: trip.startDate.toISOString().split('T')[0],
    };

    const job = await prisma.agentJob.create({
      data: {
        type: 'pre_trip_alert',
        payload: JSON.stringify(payload),
        triggeredBy: 'manual',
      },
    });

    // Kick off processing non-blocking — response returns immediately
    void runPreTripAlert(job.id, payload);

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Failed to trigger pre-trip alert:', error);
    return NextResponse.json({ error: 'Failed to trigger pre-trip alert' }, { status: 500 });
  }
}
