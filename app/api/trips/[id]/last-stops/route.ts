import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { fetchLastStops } from '@/lib/overpass'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const trip = await prisma.trip.findUnique({
      where: { id },
      include: { location: { select: { latitude: true, longitude: true } } },
    })
    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (!trip.location?.latitude || !trip.location?.longitude) {
      return NextResponse.json({ fuel: [], grocery: [], outdoor: [] })
    }
    const result = await fetchLastStops(trip.location.latitude, trip.location.longitude)
    return NextResponse.json(result)
  } catch (error) {
    console.error('Failed to fetch last stops:', error)
    return NextResponse.json({ error: 'Failed to fetch last stops' }, { status: 500 })
  }
}
