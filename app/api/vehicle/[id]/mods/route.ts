import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const data = await req.json();

    if (!data.name) {
      return NextResponse.json({ error: 'Mod name is required' }, { status: 400 })
    }

    const mod = await prisma.vehicleMod.create({
      data: { ...data, vehicleId: id },
    });
    return NextResponse.json(mod, { status: 201 });
  } catch (error) {
    console.error('Failed to create vehicle mod:', error)
    return NextResponse.json({ error: 'Failed to create vehicle mod' }, { status: 500 })
  }
}
