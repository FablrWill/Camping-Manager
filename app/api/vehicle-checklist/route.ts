import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { generateVehicleChecklist } from '@/lib/claude'
import { safeJsonParse } from '@/lib/safe-json'
import type { VehicleChecklistResult } from '@/lib/parse-claude'

export async function GET(request: NextRequest) {
  try {
    const tripId = request.nextUrl.searchParams.get('tripId')
    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      select: {
        vehicleChecklistResult: true,
        vehicleChecklistGeneratedAt: true,
      },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (!trip.vehicleChecklistResult) {
      return NextResponse.json({ result: null, generatedAt: null })
    }

    const result = safeJsonParse<VehicleChecklistResult>(trip.vehicleChecklistResult)
    return NextResponse.json({
      result,
      generatedAt: trip.vehicleChecklistGeneratedAt?.toISOString() ?? null,
    })
  } catch (error) {
    console.error('Failed to fetch vehicle checklist:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle checklist' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const { tripId } = await request.json()

    if (!tripId) {
      return NextResponse.json({ error: 'tripId is required' }, { status: 400 })
    }

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Claude API key not configured' }, { status: 500 })
    }

    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: { vehicle: true, location: true },
    })

    if (!trip) {
      return NextResponse.json({ error: 'Trip not found' }, { status: 404 })
    }

    if (trip.vehicle === null) {
      return NextResponse.json({ error: 'No vehicle assigned to this trip' }, { status: 400 })
    }

    const tripDays = Math.max(
      1,
      Math.ceil((trip.endDate.getTime() - trip.startDate.getTime()) / 86400000)
    )

    let result: VehicleChecklistResult
    try {
      result = await generateVehicleChecklist({
        vehicleYear: trip.vehicle.year,
        vehicleMake: trip.vehicle.make,
        vehicleModel: trip.vehicle.model,
        drivetrain: trip.vehicle.drivetrain,
        groundClearance: trip.vehicle.groundClearance,
        tripDays,
        destinationName: trip.location?.name ?? null,
        roadCondition: trip.location?.roadCondition ?? null,
        clearanceNeeded: trip.location?.clearanceNeeded ?? null,
      })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate checklist'
      if (message.includes('schema mismatch') || message.includes('non-JSON')) {
        console.error('Vehicle checklist Zod validation failed:', error)
        return NextResponse.json({ error: message }, { status: 422 })
      }
      throw error
    }

    const generatedAt = new Date()
    await prisma.trip.update({
      where: { id: tripId },
      data: {
        vehicleChecklistResult: JSON.stringify(result),
        vehicleChecklistGeneratedAt: generatedAt,
      },
    })

    return NextResponse.json({ result, generatedAt: generatedAt.toISOString() })
  } catch (error) {
    console.error('Failed to generate vehicle checklist:', error)
    return NextResponse.json({ error: 'Failed to generate vehicle checklist' }, { status: 500 })
  }
}
