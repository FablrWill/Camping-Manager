import { NextResponse } from 'next/server';
import { sendTestEmail } from '@/lib/email';

// POST /api/settings/test-email — send a test email to verify SMTP config
export async function POST() {
  try {
    if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
      return NextResponse.json(
        { error: 'Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env' },
        { status: 400 }
      );
    }

    await sendTestEmail(process.env.GMAIL_USER);
    return NextResponse.json({ success: true, sentTo: process.env.GMAIL_USER });
  } catch (error) {
    console.error('Failed to send test email:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: `SMTP test failed: ${message}` }, { status: 500 });
  }
}
