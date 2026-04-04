import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// PATCH /api/gear/[id]/loans/[loanId] — mark a loan as returned
export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; loanId: string }> }
): Promise<NextResponse> {
  const { loanId } = await params
  try {
    const loan = await prisma.gearLoan.update({
      where: { id: loanId },
      data: { returnedAt: new Date() },
    })
    return NextResponse.json({
      ...loan,
      lentAt: loan.lentAt.toISOString(),
      returnedAt: loan.returnedAt?.toISOString() ?? null,
      createdAt: loan.createdAt.toISOString(),
    })
  } catch (error) {
    console.error('Failed to mark loan returned:', error)
    return NextResponse.json({ error: 'Failed to update loan' }, { status: 500 })
  }
}

// DELETE /api/gear/[id]/loans/[loanId] — remove a loan record
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string; loanId: string }> }
): Promise<NextResponse> {
  const { loanId } = await params
  try {
    await prisma.gearLoan.delete({ where: { id: loanId } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete gear loan:', error)
    return NextResponse.json({ error: 'Failed to delete loan' }, { status: 500 })
  }
}
