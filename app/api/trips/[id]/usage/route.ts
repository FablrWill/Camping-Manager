import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

const VALID_STATUSES = ['used', "didn't need", 'forgot but needed', null] as const
type UsageStatus = typeof VALID_STATUSES[number]

function isValidUsageStatus(value: unknown): value is UsageStatus {
  return (VALID_STATUSES as readonly (string | null)[]).includes(value as string | null)
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const body = await request.json()
    const { gearId, usageStatus } = body

    if (!gearId) {
      return NextResponse.json({ error: 'gearId is required' }, { status: 400 })
    }

    if (!isValidUsageStatus(usageStatus)) {
      return NextResponse.json(
        { error: 'Invalid usageStatus value. Must be "used", "didn\'t need", "forgot but needed", or null' },
        { status: 400 }
      )
    }

    const item = await prisma.packingItem.update({
      where: { tripId_gearId: { tripId, gearId } },
      data: { usageStatus },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update usage status:', error)
    return NextResponse.json({ error: 'Failed to update usage status' }, { status: 500 })
  }
}
