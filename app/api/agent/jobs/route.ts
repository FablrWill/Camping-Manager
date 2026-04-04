import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agent/jobs — list jobs, optional status filter + unread flag
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const unread = searchParams.get('unread');

    const where: Record<string, unknown> = {};

    if (status) {
      where.status = status;
    }
    if (unread === 'true') {
      where.readAt = null;
    }

    const jobs = await prisma.agentJob.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return NextResponse.json(jobs);
  } catch (error) {
    console.error('Failed to fetch agent jobs:', error);
    return NextResponse.json({ error: 'Failed to fetch agent jobs' }, { status: 500 });
  }
}

// POST /api/agent/jobs — create a new job
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.type || !body.payload) {
      return NextResponse.json(
        { error: 'type and payload are required' },
        { status: 400 }
      );
    }

    const job = await prisma.agentJob.create({
      data: {
        type: body.type,
        payload: typeof body.payload === 'string' ? body.payload : JSON.stringify(body.payload),
        triggeredBy: body.triggeredBy || 'manual',
      },
    });

    return NextResponse.json(job, { status: 201 });
  } catch (error) {
    console.error('Failed to create agent job:', error);
    return NextResponse.json({ error: 'Failed to create agent job' }, { status: 500 });
  }
}
