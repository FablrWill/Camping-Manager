import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function GET() {
  const vehicles = await prisma.vehicle.findMany({
    include: { mods: { orderBy: { installedAt: "desc" } } },
  });
  return NextResponse.json(vehicles);
}

export async function POST(req: Request) {
  const data = await req.json();
  const vehicle = await prisma.vehicle.create({ data });
  return NextResponse.json(vehicle, { status: 201 });
}
