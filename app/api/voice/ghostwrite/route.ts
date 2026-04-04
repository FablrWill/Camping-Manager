import { NextRequest, NextResponse } from 'next/server'
import { ghostwriteJournal } from '@/lib/voice/ghostwrite'
import { db } from '@/lib/db'

export async function POST(request: NextRequest) {
  try {
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: 'Voice ghostwriter requires an Anthropic API key. Add ANTHROPIC_API_KEY to your .env file.' },
        { status: 503 }
      )
    }

    const body = await request.json() as { tripId?: string; transcription?: string }
    const { tripId, transcription } = body

    if (!tripId || !transcription) {
      return NextResponse.json({ error: 'tripId and transcription are required' }, { status: 400 })
    }

    const trip = await db.trip.findUnique({
      where: { id: tripId },
      select: {
        id: true,
        name: true,
        startDate: true,
        endDate: true,
        location: { select: { name: true } },
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    const startStr = trip.startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const endStr = trip.endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    const dates = startStr === endStr ? startStr : `${startStr} – ${endStr}`

    const journalEntry = await ghostwriteJournal(transcription, {
      tripName: trip.name,
      locationName: trip.location?.name ?? null,
      dates,
    })

    const updated = await db.trip.update({
      where: { id: tripId },
      data: {
        journalEntry,
        journalEntryAt: new Date(),
      },
      select: { journalEntry: true, journalEntryAt: true },
    })

    return NextResponse.json({ journalEntry: updated.journalEntry })
  } catch (error) {
    console.error('Failed to ghostwrite journal entry:', error)
    return NextResponse.json({ error: 'Failed to generate journal entry' }, { status: 500 })
  }
}
