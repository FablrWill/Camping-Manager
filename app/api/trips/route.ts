import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { isValidDate } from "@/lib/validate";

export async function GET() {
  try {
    const trips = await prisma.trip.findMany({
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
        vehicle: { select: { id: true, name: true } },
        _count: { select: { packingItems: true, photos: true, alternatives: true } },
      },
      orderBy: { startDate: "desc" },
    });
    return NextResponse.json(trips);
  } catch (error) {
    console.error('Failed to fetch trips:', error)
    return NextResponse.json({ error: 'Failed to fetch trips' }, { status: 500 })
  }
}

export async function POST(req: Request) {
  try {
    const data = await req.json();

    if (!data.name || !data.startDate || !data.endDate) {
      return NextResponse.json(
        { error: 'Name, startDate, and endDate are required' },
        { status: 400 }
      )
    }

    const startDate = isValidDate(data.startDate)
    const endDate = isValidDate(data.endDate)
    if (!startDate || !endDate) {
      return NextResponse.json({ error: 'Invalid date format' }, { status: 400 })
    }

    const trip = await prisma.trip.create({
      data: {
        name: data.name,
        startDate,
        endDate,
        locationId: data.locationId || null,
        vehicleId: data.vehicleId || null,
        notes: data.notes || null,
        weatherNotes: data.weatherNotes || null,
        bringingDog: data.bringingDog === true,
        fallbackFor: data.fallbackFor || null,
        fallbackOrder: data.fallbackOrder ? Number(data.fallbackOrder) : null,
      },
      include: {
        location: { select: { id: true, name: true, latitude: true, longitude: true } },
        vehicle: { select: { id: true, name: true } },
        _count: { select: { packingItems: true, photos: true, alternatives: true } },
      },
    });
    return NextResponse.json(trip, { status: 201 });
  } catch (error) {
    console.error('Failed to create trip:', error)
    return NextResponse.json({ error: 'Failed to create trip' }, { status: 500 })
  }
}
