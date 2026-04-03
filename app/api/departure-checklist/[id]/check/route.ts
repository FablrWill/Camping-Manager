import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { safeJsonParse } from '@/lib/safe-json'
import type { DepartureChecklistResult } from '@/lib/parse-claude'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const { itemId, checked } = body as { itemId?: string; checked?: boolean }

    if (!itemId || checked === undefined) {
      return NextResponse.json(
        { error: 'itemId and checked are required' },
        { status: 400 }
      )
    }

    // Wrap read-modify-write in $transaction to prevent race conditions on rapid check-off taps
    await prisma.$transaction(async (tx) => {
      const checklist = await tx.departureChecklist.findUnique({ where: { id } })
      if (!checklist) throw new Error('NOT_FOUND')

      const result = safeJsonParse<DepartureChecklistResult>(checklist.result)
      if (!result) throw new Error('PARSE_ERROR')

      let found = false
      for (const slot of result.slots) {
        for (const item of slot.items) {
          if (item.id === itemId) {
            item.checked = checked
            found = true
            break
          }
        }
        if (found) break
      }

      if (!found) throw new Error('ITEM_NOT_FOUND')

      await tx.departureChecklist.update({
        where: { id },
        data: { result: JSON.stringify(result) },
      })
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'NOT_FOUND') {
        return NextResponse.json({ error: 'Checklist not found' }, { status: 404 })
      }
      if (error.message === 'PARSE_ERROR') {
        return NextResponse.json({ error: 'Checklist data corrupted' }, { status: 500 })
      }
      if (error.message === 'ITEM_NOT_FOUND') {
        return NextResponse.json({ error: 'Item not found in checklist' }, { status: 400 })
      }
    }
    console.error('Failed to update checklist item:', error)
    return NextResponse.json({ error: 'Failed to update checklist item' }, { status: 500 })
  }
}
