import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { isValidDate } from '@/lib/validate'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
        vehicle: { select: { id: true, name: true } },
        packingItems: { include: { gear: true } },
        photos: true,
        _count: { select: { packingItems: true, photos: true } },
      },
    })
    if (!trip) return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    return NextResponse.json(trip)
  } catch (error) {
    console.error('Failed to fetch trip:', error)
    return NextResponse.json({ error: 'Failed to fetch trip' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const data = await req.json()

    if (!data.name || !data.startDate || !data.endDate) {
      return NextResponse.json({ error: 'name, startDate, and endDate are required' }, { status: 400 })
    }

    const startDate = isValidDate(data.startDate)
    const endDate = isValidDate(data.endDate)
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const trip = await prisma.trip.update({
      where: { id },
      data: {
        name: data.name,
        startDate,
        endDate,
        locationId: data.locationId ?? null,
        vehicleId: data.vehicleId ?? null,
        notes: data.notes ?? null,
        weatherNotes: data.weatherNotes ?? null,
        bringingDog: data.bringingDog === true,
      },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
        vehicle: { select: { id: true, name: true } },
        _count: { select: { packingItems: true, photos: true } },
      },
    })
    return NextResponse.json(trip)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    console.error('Failed to update trip:', error)
    return NextResponse.json({ error: 'Failed to update trip' }, { status: 500 })
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.trip.delete({ where: { id } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    console.error('Failed to delete trip:', error)
    return NextResponse.json({ error: 'Failed to delete trip' }, { status: 500 })
  }
}
