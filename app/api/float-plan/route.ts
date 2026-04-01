import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { composeFloatPlanEmail } from '@/lib/claude'
import { sendFloatPlan } from '@/lib/email'
import type { DepartureChecklistResult } from '@/lib/parse-claude'

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env' },
        { status: 400 }
      )
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    // Fetch trip with all related data
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        packingItems: { include: { gear: true } },
        mealPlan: true,
        vehicle: true,
        location: true,
        departureChecklist: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    // Resolve emergency contact — trip-level override, then Settings default
    const settings = await prisma.settings.findUnique({
      where: { id: 'user_settings' },
    })

    const recipientEmail = trip.emergencyContactEmail ?? settings?.emergencyContactEmail ?? null
    const recipientName =
      trip.emergencyContactName ?? settings?.emergencyContactName ?? 'Emergency Contact'

    if (!recipientEmail) {
      return NextResponse.json(
        { error: 'No emergency contact configured. Add one in Settings.' },
        { status: 400 }
      )
    }

    // Build packed gear summary grouped by category
    const packedItems = trip.packingItems.filter((item) => item.packed)
    const gearByCategory: Record<string, string[]> = {}
    for (const item of packedItems) {
      const cat = item.gear.category || 'misc'
      if (!gearByCategory[cat]) gearByCategory[cat] = []
      gearByCategory[cat].push(item.gear.name)
    }
    const packedGearSummary =
      Object.entries(gearByCategory)
        .map(([cat, names]) => `${cat}: ${names.join(', ')}`)
        .join('; ') || 'No items marked as packed yet.'

    // Build checklist status string
    let checklistStatus = 'Departure checklist not yet generated.'
    if (trip.departureChecklist) {
      try {
        const checklistResult = JSON.parse(trip.departureChecklist.result) as DepartureChecklistResult
        const totalItems = checklistResult.slots.reduce(
          (sum, slot) => sum + slot.items.length,
          0
        )
        const checkedItems = checklistResult.slots.reduce(
          (sum, slot) => sum + slot.items.filter((i) => i.checked).length,
          0
        )
        checklistStatus = `${checkedItems} of ${totalItems} departure tasks completed`
      } catch {
        // Ignore parse errors — fall back to default message
      }
    }

    // Build Google Maps link if location has coordinates
    const hasCoords =
      trip.location?.latitude !== null &&
      trip.location?.latitude !== undefined &&
      trip.location?.longitude !== null &&
      trip.location?.longitude !== undefined

    const mapsLink = hasCoords
      ? `https://www.google.com/maps?q=${trip.location!.latitude},${trip.location!.longitude}`
      : null

    // Compose email via Claude
    let emailResult
    try {
      emailResult = await composeFloatPlanEmail({
        tripName: trip.name,
        startDate: trip.startDate.toISOString().split('T')[0],
        endDate: trip.endDate.toISOString().split('T')[0],
        destinationName: trip.location?.name ?? null,
        destinationLat: trip.location?.latitude ?? null,
        destinationLon: trip.location?.longitude ?? null,
        packedGearSummary,
        vehicleName: trip.vehicle?.name ?? null,
        weatherNotes: trip.weatherNotes ?? null,
        tripNotes: trip.notes ?? null,
        emergencyContactName: recipientName,
        checklistStatus,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to compose email'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('Float plan Claude parse error:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    // Append Google Maps link to body if coordinates exist
    let emailBody = emailResult.body
    if (mapsLink && trip.location?.name) {
      emailBody = `${emailBody}\n\nDestination: ${trip.location.name} - ${mapsLink}`
    } else if (mapsLink) {
      emailBody = `${emailBody}\n\nDestination map: ${mapsLink}`
    }

    // Send email as plain text (NOT html)
    await sendFloatPlan({
      to: recipientEmail,
      toName: recipientName,
      subject: emailResult.subject,
      text: emailBody,
    })

    // Log to FloatPlanLog — fire-and-forget (don't let log failure block response)
    prisma.floatPlanLog
      .create({
        data: {
          tripId,
          sentTo: recipientEmail,
          sentToName: recipientName,
          subject: emailResult.subject,
          body: emailBody,
        },
      })
      .catch((err: unknown) => console.error('Failed to log float plan:', err))

    return NextResponse.json({
      success: true,
      sentTo: recipientEmail,
      sentToName: recipientName,
      sentAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Float plan send failed:', error)
    return NextResponse.json(
      { error: 'Could not send email - check Gmail config in Settings' },
      { status: 500 }
    )
  }
}
