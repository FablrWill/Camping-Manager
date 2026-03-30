import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const { tripId, gearId, packed } = body

    if (!tripId || !gearId || packed === undefined) {
      return NextResponse.json(
        { error: 'tripId, gearId, and packed are required' },
        { status: 400 }
      )
    }

    const item = await prisma.packingItem.update({
      where: { tripId_gearId: { tripId, gearId } },
      data: { packed },
    })

    return NextResponse.json(item)
  } catch (error) {
    // Prisma P2025 = record not found
    if (
      error instanceof Error &&
      'code' in error &&
      (error as { code: string }).code === 'P2025'
    ) {
      return NextResponse.json({ error: 'Packing item not found' }, { status: 404 })
    }
    console.error('Failed to update packing item:', error)
    return NextResponse.json({ error: 'Failed to update packing item' }, { status: 500 })
  }
}
