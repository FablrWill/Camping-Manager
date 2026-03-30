import { prisma } from "@/lib/db";
import { NextResponse } from "next/server";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const data = await req.json();
  const mod = await prisma.vehicleMod.create({
    data: { ...data, vehicleId: id },
  });
  return NextResponse.json(mod, { status: 201 });
}
