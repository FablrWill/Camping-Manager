import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { sendFloatPlan } from '@/lib/email'

function composeFloatPlanTemplate(params: {
  tripName: string;
  startDate: string;
  endDate: string;
  destinationName: string | null;
  vehicleName: string | null;
  notes: string | null;
  mapsLink: string | null;
}): { subject: string; body: string } {
  const destination = params.destinationName || params.tripName;

  const lines: string[] = [
    `Will is camping at ${destination} from ${params.startDate} to ${params.endDate}.`,
  ];

  if (params.vehicleName) {
    lines.push(`Vehicle: ${params.vehicleName}.`);
  }

  lines.push(`Expected return: ${params.endDate}.`);

  if (params.notes) {
    lines.push(`Notes: ${params.notes}`);
  }

  if (params.mapsLink) {
    lines.push(`Map: ${params.mapsLink}`);
  }

  return {
    subject: `Float Plan: ${params.tripName} (${params.startDate})`,
    body: lines.join('\n'),
  };
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env' },
        { status: 400 }
      )
    }

    // Fetch trip with vehicle and location only
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        vehicle: true,
        location: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Resolve emergency contact — trip-level override, then Settings default
    const settings = await prisma.settings.findUnique({
      where: { id: 'user_settings' },
    })

    const recipientEmail = trip.emergencyContactEmail ?? settings?.emergencyContactEmail ?? null
    const recipientName =
      trip.emergencyContactName ?? settings?.emergencyContactName ?? 'Emergency Contact'

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No emergency contact configured. Add one in Settings.' },
        { status: 400 }
      )
    }

    // Build Google Maps link if location has coordinates
    const hasCoords =
      trip.location?.latitude != null && trip.location?.longitude != null;
    const mapsLink = hasCoords
      ? `https://www.google.com/maps?q=${trip.location!.latitude},${trip.location!.longitude}`
      : null;

    const emailResult = composeFloatPlanTemplate({
      tripName: trip.name,
      startDate: trip.startDate.toISOString().split('T')[0],
      endDate: trip.endDate.toISOString().split('T')[0],
      destinationName: trip.location?.name ?? null,
      vehicleName: trip.vehicle?.name ?? null,
      notes: trip.notes ?? null,
      mapsLink,
    });

    // Send email as plain text (NOT html)
    await sendFloatPlan({
      to: recipientEmail,
      toName: recipientName,
      subject: emailResult.subject,
      text: emailResult.body,
    })

    // Log to FloatPlanLog — fire-and-forget (don't let log failure block response)
    prisma.floatPlanLog
      .create({
        data: {
          tripId,
          sentTo: recipientEmail,
          sentToName: recipientName,
          subject: emailResult.subject,
          body: emailResult.body,
        },
      })
      .catch((err: unknown) => console.error('Failed to log float plan:', err))

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      sentToName: recipientName,
      sentAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Float plan send failed:', error)
    return NextResponse.json(
      { error: 'Could not send email - check Gmail config in Settings' },
      { status: 500 }
    )
  }
}
