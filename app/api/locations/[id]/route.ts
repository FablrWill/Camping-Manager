import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const location = await prisma.location.findUnique({ where: { id } });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...location,
    visitedAt: location.visitedAt?.toISOString() ?? null,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  const location = await prisma.location.update({
    where: { id },
    data: {
      name: body.name ?? existing.name,
      latitude: body.latitude ?? existing.latitude,
      longitude: body.longitude ?? existing.longitude,
      type: body.type !== undefined ? body.type : existing.type,
      description:
        body.description !== undefined
          ? body.description
          : existing.description,
      rating: body.rating !== undefined ? body.rating : existing.rating,
      roadCondition:
        body.roadCondition !== undefined
          ? body.roadCondition
          : existing.roadCondition,
      clearanceNeeded:
        body.clearanceNeeded !== undefined
          ? body.clearanceNeeded
          : existing.clearanceNeeded,
      cellSignal:
        body.cellSignal !== undefined ? body.cellSignal : existing.cellSignal,
      starlinkSignal:
        body.starlinkSignal !== undefined
          ? body.starlinkSignal
          : existing.starlinkSignal,
      waterAccess:
        body.waterAccess !== undefined
          ? body.waterAccess
          : existing.waterAccess,
      visitedAt:
        body.visitedAt !== undefined
          ? body.visitedAt
            ? new Date(body.visitedAt)
            : null
          : existing.visitedAt,
      notes: body.notes !== undefined ? body.notes : existing.notes,
    },
  });

  return NextResponse.json({
    ...location,
    visitedAt: location.visitedAt?.toISOString() ?? null,
    createdAt: location.createdAt.toISOString(),
    updatedAt: location.updatedAt.toISOString(),
  });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const existing = await prisma.location.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  await prisma.location.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
