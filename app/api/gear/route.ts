import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/gear — list all gear items, optional category/wishlist filters
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    const wishlist = searchParams.get('wishlist')
    const search = searchParams.get('search')

    const where: Record<string, unknown> = {}

    if (category) {
      where.category = category
    }
    if (wishlist !== null) {
      where.isWishlist = wishlist === 'true'
    }
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { brand: { contains: search } },
        { notes: { contains: search } },
      ]
    }

    const items = await prisma.gearItem.findMany({
      where,
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })

    return NextResponse.json(items)
  } catch (error) {
    console.error('Failed to fetch gear:', error)
    return NextResponse.json({ error: 'Failed to fetch gear' }, { status: 500 })
  }
}

// POST /api/gear — create a new gear item
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    if (!body.name || !body.category) {
      return NextResponse.json(
        { error: 'Name and category are required' },
        { status: 400 }
      )
    }

    const item = await prisma.gearItem.create({
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
        wattage: body.wattage ? parseFloat(body.wattage) : null,
        hoursPerDay: body.hoursPerDay ? parseFloat(body.hoursPerDay) : null,
        hasBattery: body.hasBattery ?? false,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Failed to create gear item:', error)
    return NextResponse.json({ error: 'Failed to create gear item' }, { status: 500 })
  }
}
