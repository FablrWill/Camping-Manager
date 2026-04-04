import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// POST /api/agent/results — Mac mini writes completed job results here
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    if (!body.jobId || body.result === undefined) {
      return NextResponse.json(
        { error: 'jobId and result are required' },
        { status: 400 }
      );
    }

    const job = await prisma.agentJob.findUnique({
      where: { id: body.jobId },
    });

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (job.status === 'done') {
      return NextResponse.json({ error: 'Job already completed' }, { status: 400 });
    }

    const resultString = typeof body.result === 'string'
      ? body.result
      : JSON.stringify(body.result);

    const updatedJob = await prisma.agentJob.update({
      where: { id: body.jobId },
      data: {
        status: 'done',
        result: resultString,
        completedAt: new Date(),
      },
    });

    // For gear_enrichment jobs, write enriched fields back to GearItem
    if (job.type === 'gear_enrichment') {
      try {
        const payload = JSON.parse(job.payload);
        const result = typeof body.result === 'string' ? JSON.parse(body.result) : body.result;

        if (payload.gearItemId) {
          const updateData: Record<string, unknown> = {};
          if (result.brand) updateData.brand = result.brand;
          if (result.notes) updateData.notes = result.notes;
          if (result.weight !== undefined) updateData.weight = result.weight;
          if (result.description) updateData.description = result.description;

          if (Object.keys(updateData).length > 0) {
            await prisma.gearItem.update({
              where: { id: payload.gearItemId },
              data: updateData,
            });
          }
        }
      } catch (enrichError) {
        console.error('Failed to apply gear enrichment:', enrichError);
        // Don't fail the overall request — the job result is still saved
      }
    }

    return NextResponse.json(updatedJob);
  } catch (error) {
    console.error('Failed to write agent result:', error);
    return NextResponse.json({ error: 'Failed to write agent result' }, { status: 500 });
  }
}
