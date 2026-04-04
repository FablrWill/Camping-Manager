import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()
    const medication = await prisma.medication.update({
      where: { id },
      data: {
        name: body.name,
        dosesPerDay: Number(body.dosesPerDay),
        unitsPerDose: Number(body.unitsPerDose),
        unit: body.unit,
        isForDog: body.isForDog,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(medication)
  } catch (error) {
    console.error('Failed to update medication:', error)
    return NextResponse.json({ error: 'Failed to update medication' }, { status: 500 })
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await prisma.medication.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Failed to delete medication:', error)
    return NextResponse.json({ error: 'Failed to delete medication' }, { status: 500 })
  }
}
