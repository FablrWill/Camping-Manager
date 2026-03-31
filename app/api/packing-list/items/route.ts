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

    const item = await prisma.packingItem.upsert({
      where: { tripId_gearId: { tripId, gearId } },
      update: { packed },
      create: { tripId, gearId, packed },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update packing item:', error)
    return NextResponse.json({ error: 'Failed to update packing item' }, { status: 500 })
  }
}
