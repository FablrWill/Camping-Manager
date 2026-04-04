import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET() {
  try {
    const medications = await prisma.medication.findMany({
      orderBy: { createdAt: 'asc' },
    })
    return NextResponse.json(medications)
  } catch (error) {
    console.error('Failed to fetch medications:', error)
    return NextResponse.json({ error: 'Failed to fetch medications' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    if (!body.name || body.dosesPerDay == null) {
      return NextResponse.json({ error: 'name and dosesPerDay are required' }, { status: 400 })
    }
    const medication = await prisma.medication.create({
      data: {
        name: body.name,
        dosesPerDay: Number(body.dosesPerDay),
        unitsPerDose: Number(body.unitsPerDose ?? 1),
        unit: body.unit ?? 'pill',
        isForDog: body.isForDog ?? false,
        notes: body.notes ?? null,
      },
    })
    return NextResponse.json(medication, { status: 201 })
  } catch (error) {
    console.error('Failed to create medication:', error)
    return NextResponse.json({ error: 'Failed to create medication' }, { status: 500 })
  }
}
