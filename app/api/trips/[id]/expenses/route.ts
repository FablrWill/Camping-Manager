import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const expenses = await prisma.tripExpense.findMany({
      where: { tripId },
      orderBy: { paidAt: 'desc' },
    })

    const total = expenses.reduce((sum, e) => sum + e.amount, 0)

    const byCategory: Record<string, number> = {}
    for (const expense of expenses) {
      byCategory[expense.category] = (byCategory[expense.category] ?? 0) + expense.amount
    }

    return NextResponse.json({ expenses, total, byCategory })
  } catch (error) {
    console.error('Failed to fetch trip expenses:', error)
    return NextResponse.json({ error: 'Failed to fetch trip expenses' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params
    const body = await request.json()

    if (!body.category || !body.description || body.amount == null) {
      return NextResponse.json(
        { error: 'Category, description, and amount are required' },
        { status: 400 }
      )
    }

    if (typeof body.amount !== 'number' || body.amount < 0) {
      return NextResponse.json(
        { error: 'Amount must be a non-negative number' },
        { status: 400 }
      )
    }

    const expense = await prisma.tripExpense.create({
      data: {
        tripId,
        category: body.category,
        description: body.description,
        amount: body.amount,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (error) {
    console.error('Failed to create trip expense:', error)
    return NextResponse.json({ error: 'Failed to create trip expense' }, { status: 500 })
  }
}
