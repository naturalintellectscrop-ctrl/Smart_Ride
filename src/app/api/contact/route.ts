/**
 * Public contact form endpoint.
 * POST /api/contact - forwards a website enquiry to the support inbox.
 *
 * Unauthenticated by design (it is the public contact form), so it is rate
 * limited per IP and the payload is length-capped before it reaches Resend.
 */

import { NextRequest, NextResponse } from 'next/server';
import { sendEmail, isConfigured } from '@/lib/email';
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from '@/lib/security/rate-limit';
import { logger } from '@/lib/logging/logger';

const SUPPORT_INBOX = process.env.SUPPORT_EMAIL || 'support@smartride.ug';

const LIMITS = {
  name: 100,
  email: 200,
  subject: 150,
  message: 4000,
} as const;

const CONTACT_RATE_LIMIT = {
  windowMs: 60 * 60 * 1000,
  maxRequests: 5,
  keyPrefix: 'contact:submit',
  message: 'Too many messages sent from this network. Please try again in an hour.',
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function POST(request: NextRequest) {
  const rateResult = checkRateLimit(request, CONTACT_RATE_LIMIT);
  if (!rateResult.success) {
    return rateLimitResponse(rateResult, CONTACT_RATE_LIMIT);
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Invalid request body.' },
      { status: 400 }
    );
  }

  const name = String(body.name ?? '').trim();
  const email = String(body.email ?? '').trim();
  const subject = String(body.subject ?? '').trim();
  const message = String(body.message ?? '').trim();

  if (!name || !email || !message) {
    return NextResponse.json(
      { success: false, error: 'Please fill in your name, email, and message.' },
      { status: 400 }
    );
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { success: false, error: 'Please enter a valid email address.' },
      { status: 400 }
    );
  }

  if (
    name.length > LIMITS.name ||
    email.length > LIMITS.email ||
    subject.length > LIMITS.subject ||
    message.length > LIMITS.message
  ) {
    return NextResponse.json(
      { success: false, error: 'That message is too long to send.' },
      { status: 400 }
    );
  }

  // Without a mail provider the message would be silently dropped. Say so
  // rather than showing the sender a success screen.
  if (!isConfigured()) {
    logger.error('Contact form submitted but email service is not configured');
    return NextResponse.json(
      {
        success: false,
        error: `We could not send that right now. Please email us directly at ${SUPPORT_INBOX}.`,
      },
      { status: 503 }
    );
  }

  const heading = subject || 'Website enquiry';
  const result = await sendEmail({
    to: SUPPORT_INBOX,
    replyTo: email,
    subject: `[Website] ${heading}`,
    html: `
      <p><strong>From:</strong> ${escapeHtml(name)} &lt;${escapeHtml(email)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(heading)}</p>
      <hr />
      <p style="white-space: pre-wrap">${escapeHtml(message)}</p>
    `,
    text: `From: ${name} <${email}>\nSubject: ${heading}\n\n${message}`,
  });

  if (!result.success) {
    logger.error('Contact form delivery failed', { error: result.error });
    return NextResponse.json(
      {
        success: false,
        error: `We could not send that right now. Please email us directly at ${SUPPORT_INBOX}.`,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ success: true });
}
