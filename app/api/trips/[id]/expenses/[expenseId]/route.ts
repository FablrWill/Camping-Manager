import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params
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

    const expense = await prisma.tripExpense.update({
      where: { id: expenseId },
      data: {
        category: body.category,
        description: body.description,
        amount: body.amount,
        paidAt: body.paidAt ? new Date(body.paidAt) : null,
        notes: body.notes ?? null,
      },
    })

    return NextResponse.json(expense)
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    console.error('Failed to update trip expense:', error)
    return NextResponse.json({ error: 'Failed to update trip expense' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; expenseId: string }> }
) {
  try {
    const { expenseId } = await params
    await prisma.tripExpense.delete({ where: { id: expenseId } })
    return new NextResponse(null, { status: 204 })
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as { code: string }).code === 'P2025') {
      return NextResponse.json({ error: 'Expense not found' }, { status: 404 })
    }
    console.error('Failed to delete trip expense:', error)
    return NextResponse.json({ error: 'Failed to delete trip expense' }, { status: 500 })
  }
}
