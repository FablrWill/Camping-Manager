import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

type MaintenanceEvent =
  | 'cleaned'
  | 'resealed'
  | 'serviced'
  | 'charged'
  | 'inspected'
  | 'repaired'
  | 'other'

interface MaintenanceLogEntry {
  id: string
  event: string
  notes: string | null
  loggedAt: string
}

interface MaintenanceResponse {
  lastMaintenanceAt: string | null
  maintenanceIntervalDays: number | null
  logs: MaintenanceLogEntry[]
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params

    const gearItem = await prisma.gearItem.findUnique({
      where: { id },
      select: {
        lastMaintenanceAt: true,
        maintenanceIntervalDays: true,
        maintenanceLogs: {
          orderBy: { loggedAt: 'desc' },
        },
      },
    })

    if (!gearItem) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 })
    }

    const response: MaintenanceResponse = {
      lastMaintenanceAt: gearItem.lastMaintenanceAt?.toISOString() ?? null,
      maintenanceIntervalDays: gearItem.maintenanceIntervalDays,
      logs: gearItem.maintenanceLogs.map((log) => ({
        id: log.id,
        event: log.event,
        notes: log.notes,
        loggedAt: log.loggedAt.toISOString(),
      })),
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Failed to fetch gear maintenance:', error)
    return NextResponse.json({ error: 'Failed to fetch maintenance data' }, { status: 500 })
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await req.json() as { event?: MaintenanceEvent; notes?: string }

    if (!body.event) {
      return NextResponse.json({ error: 'event is required' }, { status: 400 })
    }

    const validEvents: MaintenanceEvent[] = [
      'cleaned', 'resealed', 'serviced', 'charged', 'inspected', 'repaired', 'other',
    ]
    if (!validEvents.includes(body.event)) {
      return NextResponse.json({ error: 'Invalid event type' }, { status: 400 })
    }

    const now = new Date()

    const [log] = await prisma.$transaction([
      prisma.gearMaintenanceLog.create({
        data: {
          gearItemId: id,
          event: body.event,
          notes: body.notes ?? null,
          loggedAt: now,
        },
      }),
      prisma.gearItem.update({
        where: { id },
        data: { lastMaintenanceAt: now },
      }),
    ])

    return NextResponse.json(
      { id: log.id, event: log.event, notes: log.notes, loggedAt: log.loggedAt.toISOString() },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to log maintenance event:', error)
    return NextResponse.json({ error: 'Failed to log maintenance event' }, { status: 500 })
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params
    const body = await req.json() as { maintenanceIntervalDays?: number | null }

    // Allow null to clear the interval
    if (body.maintenanceIntervalDays !== undefined && body.maintenanceIntervalDays !== null) {
      if (
        typeof body.maintenanceIntervalDays !== 'number' ||
        body.maintenanceIntervalDays < 1
      ) {
        return NextResponse.json({ error: 'maintenanceIntervalDays must be a positive integer' }, { status: 400 })
      }
    }

    const updated = await prisma.gearItem.update({
      where: { id },
      data: { maintenanceIntervalDays: body.maintenanceIntervalDays ?? null },
      select: { id: true, maintenanceIntervalDays: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Failed to update maintenance interval:', error)
    return NextResponse.json({ error: 'Failed to update interval' }, { status: 500 })
  }
}
