import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateLNTChecklist } from '@/lib/claude'
import { safeJsonParse } from '@/lib/safe-json'
import type { LNTChecklistResult } from '@/lib/parse-claude'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        lntChecklistResult: true,
        lntChecklistGeneratedAt: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (!trip.lntChecklistResult) {
      return NextResponse.json({ result: null, generatedAt: null })
    }

    const result = safeJsonParse<LNTChecklistResult>(trip.lntChecklistResult)
    return NextResponse.json({
      result,
      generatedAt: trip.lntChecklistGeneratedAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('Failed to fetch LNT checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch LNT checklist' }, { status: 500 })
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: tripId } = await params

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { location: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    let result: LNTChecklistResult
    try {
      result = await generateLNTChecklist({
        locationName: trip.location?.name ?? null,
        locationType: trip.location?.type ?? null,
        locationNotes: trip.location?.notes ?? null,
        tripNotes: trip.notes ?? null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate checklist'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('LNT checklist Zod validation failed:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    const generatedAt = new Date()
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        lntChecklistResult: JSON.stringify(result),
        lntChecklistGeneratedAt: generatedAt,
      },
    })

    return NextResponse.json({ result, generatedAt: generatedAt.toISOString() })
  } catch (error) {
    console.error('Failed to generate LNT checklist:', error)
    return NextResponse.json({ error: 'Failed to generate LNT checklist' }, { status: 500 })
  }
}
