import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const logs = await prisma.signalLog.findMany({
      where: { locationId: id },
      orderBy: { loggedAt: 'desc' },
    });

    return NextResponse.json(
      logs.map((log) => ({
        ...log,
        loggedAt: log.loggedAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      }))
    );
  } catch (error) {
    console.error('Failed to fetch signal logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch signal logs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    // Verify location exists
    const location = await prisma.location.findUnique({ where: { id } });
    if (!location) {
      return NextResponse.json(
        { error: 'Location not found' },
        { status: 404 }
      );
    }

    // Validate cellBars range
    if (body.cellBars != null && (body.cellBars < 0 || body.cellBars > 4)) {
      return NextResponse.json(
        { error: 'cellBars must be between 0 and 4' },
        { status: 400 }
      );
    }

    const log = await prisma.signalLog.create({
      data: {
        locationId: id,
        carrier: body.carrier || null,
        cellBars: body.cellBars ?? null,
        cellType: body.cellType || null,
        signalStrength: body.signalStrength != null ? parseInt(body.signalStrength) : null,
        starlinkQuality: body.starlinkQuality || null,
        speedDown: body.speedDown != null ? parseFloat(body.speedDown) : null,
        speedUp: body.speedUp != null ? parseFloat(body.speedUp) : null,
        notes: body.notes || null,
      },
    });

    return NextResponse.json(
      {
        ...log,
        loggedAt: log.loggedAt.toISOString(),
        createdAt: log.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Failed to create signal log:', error);
    return NextResponse.json(
      { error: 'Failed to create signal log' },
      { status: 500 }
    );
  }
}
