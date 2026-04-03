import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";
import { safeParseInt, safeParseFloat } from '@/lib/validate';

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vehicle = await prisma.vehicle.findUnique({
      where: { id },
      include: { mods: { orderBy: { installedAt: "desc" } } },
    });
    if (!vehicle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Failed to fetch vehicle:', error)
    return NextResponse.json({ error: 'Failed to fetch vehicle' }, { status: 500 })
  }
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();
    const vehicle = await prisma.vehicle.update({
      where: { id },
      data: {
        name: data.name,
        year: safeParseInt(data.year),
        make: data.make ?? null,
        model: data.model ?? null,
        drivetrain: data.drivetrain ?? null,
        fuelEconomy: data.fuelEconomy ?? null,
        groundClearance: safeParseFloat(data.groundClearance),
        towingCapacity: safeParseInt(data.towingCapacity),
        cargoVolume: safeParseFloat(data.cargoVolume),
        cargoLength: safeParseFloat(data.cargoLength),
        cargoWidth: safeParseFloat(data.cargoWidth),
        notes: data.notes ?? null,
      },
    });
    return NextResponse.json(vehicle);
  } catch (error) {
    console.error('Failed to update vehicle:', error)
    return NextResponse.json({ error: 'Failed to update vehicle' }, { status: 500 })
  }
}
