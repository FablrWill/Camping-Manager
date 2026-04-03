import { prisma } from '@/lib/db'
import { NextRequest, NextResponse } from 'next/server'

type Params = { params: Promise<{ id: string }> }

export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const alternatives = await prisma.trip.findMany({
      where: { fallbackFor: id },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
      },
      orderBy: { fallbackOrder: 'asc' },
    })
    return NextResponse.json(alternatives)
  } catch (error) {
    console.error('Failed to fetch alternatives:', error)
    return NextResponse.json({ error: 'Failed to fetch alternatives' }, { status: 500 })
  }
}
