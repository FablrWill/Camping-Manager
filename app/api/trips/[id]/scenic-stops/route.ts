import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'
import { fetchScenicStops } from '@/lib/overpass'

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
      return NextResponse.json({ stops: [] })
    }
    const stops = await fetchScenicStops(trip.location.latitude, trip.location.longitude)
    return NextResponse.json({ stops })
  } catch (error) {
    console.error('Failed to fetch scenic stops:', error)
    return NextResponse.json({ error: 'Failed to fetch scenic stops' }, { status: 500 })
  }
}
