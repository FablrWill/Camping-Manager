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

// PATCH /api/agent/jobs/[id] — update job (mark read, change status)
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id } = await params;

    let body: Record<string, unknown> = {};
    try { body = await request.json(); } catch { /* empty body = mark as read */ }

    const data: Record<string, unknown> = {};

    // Mark as read (default behavior if no body or explicit read flag)
    if (body.read || (!body.status && Object.keys(body).length === 0)) {
      data.readAt = new Date();
    }

    // Status transition (pending → running, etc.)
    const validStatuses = ['pending', 'running', 'done', 'failed'];
    if (typeof body.status === 'string' && validStatuses.includes(body.status)) {
      data.status = body.status;
    }

    // Advance scheduledFor (used by scheduler to set next run time on template jobs)
    if (typeof body.scheduledFor === 'string') {
      const parsed = new Date(body.scheduledFor);
      if (!isNaN(parsed.getTime())) {
        data.scheduledFor = parsed;
      }
    }

    if (Object.keys(data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }

    const job = await prisma.agentJob.update({
      where: { id },
      data,
    });

    return NextResponse.json(job);
  } catch (error) {
    console.error('Failed to update agent job:', error);
    return NextResponse.json({ error: 'Failed to update agent job' }, { status: 500 });
  }
}
