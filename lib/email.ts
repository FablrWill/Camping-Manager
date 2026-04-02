// nodemailer is dynamically imported to avoid module resolution failures
// during Next.js static page data collection at build time.

async function createTransporter() {
  const nodemailer = (await import('nodemailer')).default;
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
}

export async function sendFloatPlan(params: {
  to: string;
  toName: string;
  subject: string;
  text: string;
}): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"Outland OS" <${process.env.GMAIL_USER}>`,
    to: `"${params.toName}" <${params.to}>`,
    subject: params.subject,
    text: params.text,
  });
}

export async function sendTestEmail(toEmail: string): Promise<void> {
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    throw new Error('Gmail credentials not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env');
  }
  const transporter = await createTransporter();
  await transporter.sendMail({
    from: `"Outland OS" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Outland OS - Test Email',
    text: 'This is a test email from Outland OS. If you received this, your Gmail SMTP configuration is working correctly.',
  });
}
