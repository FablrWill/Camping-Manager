import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET /api/agent/jobs/[id] — fetch a single job
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const job = await prisma.agentJob.findUnique({ where: { id } });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to fetch agent job:', error);
    return NextResponse.json({ error: 'Failed to fetch agent job' }, { status: 500 });
  }
}

// PATCH /api/agent/jobs/[id] — mark job as read
export async function PATCH(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    const job = await prisma.agentJob.update({
      where: { id },
      data: { readAt: new Date() },
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to update agent job:', error);
    return NextResponse.json({ error: 'Failed to update agent job' }, { status: 500 });
  }
}
