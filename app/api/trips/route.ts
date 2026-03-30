import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const trips = await prisma.trip.findMany({
    include: {
      location: { select: { id: true, name: true } },
      vehicle: { select: { id: true, name: true } },
      _count: { select: { packingItems: true, photos: true } },
    },
    orderBy: { startDate: "desc" },
  });
  return NextResponse.json(trips);
}

export async function POST(req: Request) {
  const data = await req.json();

  const trip = await prisma.trip.create({
    data: {
      name: data.name,
      startDate: new Date(data.startDate),
      endDate: new Date(data.endDate),
      locationId: data.locationId || null,
      vehicleId: data.vehicleId || null,
      notes: data.notes || null,
      weatherNotes: data.weatherNotes || null,
    },
    include: {
      location: { select: { id: true, name: true } },
      vehicle: { select: { id: true, name: true } },
      _count: { select: { packingItems: true, photos: true } },
    },
  });
  return NextResponse.json(trip, { status: 201 });
}
