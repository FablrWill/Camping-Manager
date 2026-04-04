import { NextRequest, NextResponse } from 'next/server'

// PATCH /api/trips/:id/meal-plan/shopping-list/:itemId — toggle checked state
// Note: checked state is managed client-side; this endpoint validates the request
// and returns the updated item for optimistic update confirmation.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params

    const body = await request.json() as { checked?: unknown }

    if (typeof body.checked !== 'boolean') {
      return NextResponse.json(
        { error: 'checked must be a boolean' },
        { status: 400 }
      )
    }

    // Shopping list items are aggregated on-the-fly from meal ingredients
    // (no ShoppingListItem DB model). Client manages checked state locally.
    return NextResponse.json({ id: itemId, checked: body.checked })
  } catch (error) {
    console.error('Failed to update shopping list item:', error)
    return NextResponse.json({ error: 'Failed to update shopping list item' }, { status: 500 })
  }
}

// DELETE /api/trips/:id/meal-plan/shopping-list/:itemId — remove item
// Note: since items are aggregated on-the-fly, deletion is acknowledged
// but the client is responsible for removing the item from its local state.
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    const { itemId } = await params

    if (!itemId) {
      return NextResponse.json({ error: 'Item ID required' }, { status: 400 })
    }

    return NextResponse.json({ success: true, id: itemId })
  } catch (error) {
    console.error('Failed to delete shopping list item:', error)
    return NextResponse.json({ error: 'Failed to delete shopping list item' }, { status: 500 })
  }
}
