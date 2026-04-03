import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isValidEmail } from '@/lib/validate';

const SETTINGS_ID = 'user_settings';

// GET /api/settings — load settings (or return defaults if not yet saved)
export async function GET() {
  try {
    const settings = await prisma.settings.findUnique({ where: { id: SETTINGS_ID } });
    return NextResponse.json(
      settings ?? { id: SETTINGS_ID, emergencyContactName: null, emergencyContactEmail: null }
    );
  } catch (error) {
    console.error('Failed to load settings:', error);
    return NextResponse.json({ error: 'Failed to load settings' }, { status: 500 });
  }
}

// PUT /api/settings — upsert settings (atomic singleton update)
export async function PUT(request: Request) {
  try {
    const body = await request.json() as { name?: string; email?: string };

    if (!body.name || !body.email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 });
    }

    if (!isValidEmail(body.email)) {
      return NextResponse.json({ error: 'Invalid email format' }, { status: 400 });
    }

    const settings = await prisma.settings.upsert({
      where: { id: SETTINGS_ID },
      create: {
        id: SETTINGS_ID,
        emergencyContactName: body.name,
        emergencyContactEmail: body.email,
      },
      update: {
        emergencyContactName: body.name,
        emergencyContactEmail: body.email,
      },
    });

    return NextResponse.json(settings);
  } catch (error) {
    console.error('Failed to save settings:', error);
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 });
  }
}
