import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/trips/:id/meal-plan/shopping-list/:itemId — toggle checked state
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    const body = await request.json() as { checked?: boolean }

    if (typeof body.checked !== 'boolean') {
      return NextResponse.json({ error: 'checked (boolean) is required' }, { status: 400 })
    }

    const item = await prisma.shoppingListItem.update({
      where: { id: itemId },
      data: { checked: body.checked },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update shopping list item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/trips/:id/meal-plan/shopping-list/:itemId — remove item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params
    await prisma.shoppingListItem.delete({ where: { id: itemId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete shopping list item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
