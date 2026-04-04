import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// GET /api/gear/[id]/loans — list all loans for a gear item
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  try {
    const loans = await prisma.gearLoan.findMany({
      where: { gearItemId: id },
      orderBy: { lentAt: 'desc' },
    })
    const serialized = loans.map((loan) => ({
      ...loan,
      lentAt: loan.lentAt.toISOString(),
      returnedAt: loan.returnedAt?.toISOString() ?? null,
      createdAt: loan.createdAt.toISOString(),
    }))
    return NextResponse.json(serialized)
  } catch (error) {
    console.error('Failed to fetch gear loans:', error)
    return NextResponse.json({ error: 'Failed to fetch loans' }, { status: 500 })
  }
}

// POST /api/gear/[id]/loans — create a new loan
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params
  try {
    const body = await req.json()
    const { borrowerName, lentAt, notes } = body

    if (!borrowerName || typeof borrowerName !== 'string' || !borrowerName.trim()) {
      return NextResponse.json({ error: 'borrowerName is required' }, { status: 400 })
    }

    const loan = await prisma.gearLoan.create({
      data: {
        gearItemId: id,
        borrowerName: borrowerName.trim(),
        lentAt: lentAt ? new Date(lentAt) : new Date(),
        notes: notes?.trim() || null,
      },
    })

    return NextResponse.json(
      {
        ...loan,
        lentAt: loan.lentAt.toISOString(),
        returnedAt: loan.returnedAt?.toISOString() ?? null,
        createdAt: loan.createdAt.toISOString(),
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Failed to create gear loan:', error)
    return NextResponse.json({ error: 'Failed to create loan' }, { status: 500 })
  }
}
