import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/gear/:id — single gear item
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const item = await prisma.gearItem.findUnique({ where: { id } })

    if (!item) {
      return NextResponse.json({ error: 'Gear item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to fetch gear item:', error)
    return NextResponse.json({ error: 'Failed to fetch gear item' }, { status: 500 })
  }
}

// PUT /api/gear/:id — update a gear item
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    const item = await prisma.gearItem.update({
      where: { id },
      data: {
        name: body.name,
        brand: body.brand || null,
        category: body.category,
        description: body.description || null,
        condition: body.condition || null,
        weight: body.weight ? parseFloat(body.weight) : null,
        photoUrl: body.photoUrl || null,
        storageLocation: body.storageLocation || null,
        isWishlist: body.isWishlist ?? false,
        purchaseUrl: body.purchaseUrl || null,
        price: body.price ? parseFloat(body.price) : null,
        notes: body.notes || null,
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Failed to update gear item:', error)
    return NextResponse.json({ error: 'Failed to update gear item' }, { status: 500 })
  }
}

// DELETE /api/gear/:id — delete a gear item
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.gearItem.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete gear item:', error)
    return NextResponse.json({ error: 'Failed to delete gear item' }, { status: 500 })
  }
}
