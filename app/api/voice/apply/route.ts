import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import type { ApplyInsightRequest } from '@/lib/voice/types'

export async function POST(request: NextRequest) {
  try {
    const body: ApplyInsightRequest = await request.json()

    if (!body.tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    const results: string[] = []

    // 1. Append whatWorked + whatDidnt to trip notes
    const hasNotes = (body.insights.whatWorked?.length || body.insights.whatDidnt?.length)
    if (hasNotes) {
      const trip = await prisma.trip.findUnique({ where: { id: body.tripId } })
      if (trip) {
        const debriefSection = `\n\n[Trip debrief ${new Date().toLocaleDateString()}]:\n` +
          (body.insights.whatWorked?.length ? `What worked: ${body.insights.whatWorked.join('; ')}\n` : '') +
          (body.insights.whatDidnt?.length ? `What didn't: ${body.insights.whatDidnt.join('; ')}` : '')
        await prisma.trip.update({
          where: { id: body.tripId },
          data: { notes: trip.notes ? trip.notes + debriefSection : debriefSection.trim() },
        })
        results.push('Trip notes updated')
      }
    }

    // 2. Append gear feedback to gear notes (NEVER overwrite — append with date prefix)
    for (const update of body.insights.gearUpdates || []) {
      const gear = await prisma.gearItem.findUnique({ where: { id: update.gearId } })
      if (gear) {
        const newNote = `[Trip debrief ${new Date().toLocaleDateString()}]: ${update.text}`
        await prisma.gearItem.update({
          where: { id: update.gearId },
          data: { notes: gear.notes ? `${gear.notes}\n\n${newNote}` : newNote },
        })
        results.push(`Gear "${gear.name}" notes updated`)
      }
    }

    // 3. Replace location rating (only when user confirmed in UI)
    if (body.insights.locationRating) {
      await prisma.location.update({
        where: { id: body.insights.locationRating.locationId },
        data: { rating: body.insights.locationRating.rating },
      })
      results.push('Location rating updated')
    }

    return NextResponse.json({ applied: results })
  } catch (error) {
    console.error('Failed to apply insights:', error)
    return NextResponse.json({ error: 'Failed to apply insights' }, { status: 500 })
  }
}
