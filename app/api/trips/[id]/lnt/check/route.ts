import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { safeJsonParse } from '@/lib/safe-json'
import type { LNTChecklistResult } from '@/lib/parse-claude'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const { itemId, checked } = await request.json()

    if (!itemId || typeof checked !== 'boolean') {
      return NextResponse.json(
        { error: 'itemId and checked (boolean) are required' },
        { status: 400 }
      )
    }

    // Wrap read-modify-write in $transaction to prevent race conditions on rapid taps
    await prisma.$transaction(async (tx) => {
      const trip = await tx.trip.findUnique({ where: { id: tripId } })
      if (!trip) throw new Error('NOT_FOUND')
      if (!trip.lntChecklistResult) throw new Error('NO_CHECKLIST')

      const result = safeJsonParse<LNTChecklistResult>(trip.lntChecklistResult)
      if (!result) throw new Error('PARSE_ERROR')

      const item = result.items.find((i) => i.id === itemId)
      if (!item) throw new Error('ITEM_NOT_FOUND')

      const updatedItems = result.items.map((i) =>
        i.id === itemId ? { ...i, checked } : i
      )

      await tx.trip.update({
        where: { id: tripId },
        data: { lntChecklistResult: JSON.stringify({ items: updatedItems }) },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    if (message === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }
    if (message === 'NO_CHECKLIST' || message === 'PARSE_ERROR') {
      return NextResponse.json({ error: 'No LNT checklist found for this trip' }, { status: 400 })
    }
    if (message === 'ITEM_NOT_FOUND') {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 400 })
    }
    console.error('Failed to update LNT checklist item:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}
